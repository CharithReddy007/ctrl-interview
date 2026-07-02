from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from core.database import get_db
from core.security import get_current_user
from models.schemas import StartInterviewRequest, SubmitAnswerRequest
from services.llm import generate_first_question, score_answer_and_next_question, generate_final_report, analyze_audio_with_llm
from services.audio import analyze_audio_physical
from datetime import datetime
from bson import ObjectId
import json
import os
import uuid

router = APIRouter(prefix="/interview", tags=["interview"])

TOTAL_QUESTIONS = 5

def serialize(obj):
    if isinstance(obj, ObjectId):
        return str(obj)
    return obj

@router.post("/start")
async def start_interview(
    body: StartInterviewRequest,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    
    first_q = await generate_first_question(body.resume_context, body.role.dict())
    
    session = {
        "user_id": str(current_user["_id"]),
        "role": body.role.dict(),
        "resume_context": body.resume_context,
        "status": "in_progress",
        "current_question_number": 1,
        "total_questions": TOTAL_QUESTIONS,
        "qa_log": [],
        "current_question": first_q,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    
    result = await db["sessions"].insert_one(session)
    session_id = str(result.inserted_id)
    
    return {
        "session_id": session_id,
        "question": first_q,
        "question_number": 1,
        "total_questions": TOTAL_QUESTIONS,
    }

@router.post("/answer")
async def submit_answer(
    body: SubmitAnswerRequest,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    
    session = await db["sessions"].find_one({"_id": ObjectId(body.session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if str(session["user_id"]) != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Forbidden")
    if session["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Session already completed")
    
    question_number = session["current_question_number"]
    prior_qa = session["qa_log"]
    
    result = await score_answer_and_next_question(
        resume_context=session["resume_context"],
        role=session["role"],
        question={"id": body.question_id, "text": body.question_text},
        answer=body.answer_text,
        prior_qa=prior_qa,
        question_number=question_number,
        total_questions=TOTAL_QUESTIONS,
        audio_metrics=body.audio_metrics,
        visual_metrics=body.visual_metrics,
    )
    
    qa_entry = {
        "question_number": question_number,
        "question_id": body.question_id,
        "question": body.question_text,
        "answer": body.answer_text,
        "correctness": result.get("correctness", 0),
        "depth": result.get("depth", 0),
        "structure": result.get("structure", 0),
        "judgment": result.get("judgment", ""),
        "audio_metrics": body.audio_metrics,
        "visual_metrics": body.visual_metrics,
        "category": session["current_question"].get("category", "TECHNICAL"),
        "difficulty": session["current_question"].get("difficulty", "MEDIUM"),
    }
    
    updated_qa = prior_qa + [qa_entry]
    is_complete = result.get("interview_complete", False) or question_number >= TOTAL_QUESTIONS
    
    if is_complete:
        audio_avg = _average_metrics([q.get("audio_metrics") for q in updated_qa if q.get("audio_metrics")])
        visual_avg = _average_metrics([q.get("visual_metrics") for q in updated_qa if q.get("visual_metrics")])
        
        report = await generate_final_report(
            resume_context=session["resume_context"],
            role=session["role"],
            all_qa=updated_qa,
            audio_avg=audio_avg,
            visual_avg=visual_avg,
        )
        
        await db["sessions"].update_one(
            {"_id": ObjectId(body.session_id)},
            {"$set": {
                "qa_log": updated_qa,
                "status": "completed",
                "report": report,
                "updated_at": datetime.utcnow(),
            }}
        )
        
        return {
            "score": result,
            "interview_complete": True,
            "session_id": body.session_id,
        }
    else:
        next_q = result.get("next_question")
        await db["sessions"].update_one(
            {"_id": ObjectId(body.session_id)},
            {"$set": {
                "qa_log": updated_qa,
                "current_question": next_q,
                "current_question_number": question_number + 1,
                "updated_at": datetime.utcnow(),
            }}
        )
        
        return {
            "score": result,
            "interview_complete": False,
            "next_question": next_q,
            "question_number": question_number + 1,
            "total_questions": TOTAL_QUESTIONS,
        }

def _average_metrics(metrics_list: list) -> dict:
    if not metrics_list:
        return {}
    result = {}
    for m in metrics_list:
        if m:
            for k, v in m.items():
                if isinstance(v, (int, float)):
                    result[k] = result.get(k, [])
                    result[k].append(v)
    return {k: sum(v)/len(v) for k, v in result.items()}

@router.get("/sessions")
async def get_sessions(current_user: dict = Depends(get_current_user)):
    db = get_db()
    cursor = db["sessions"].find(
        {"user_id": str(current_user["_id"])},
        {"report": 0, "qa_log": 0}
    ).sort("created_at", -1)
    
    sessions = []
    async for s in cursor:
        sessions.append({
            "session_id": str(s["_id"]),
            "role": s.get("role", {}).get("title", "Unknown"),
            "full_role": s.get("role"),
            "status": s.get("status", "unknown"),
            "score": s.get("report", {}).get("overall_score", 0) if s.get("status") == "completed" else None,
            "created_at": s.get("created_at"),
            "resume_context": s.get("resume_context"),
            "current_question": s.get("current_question"),
            "current_question_number": s.get("current_question_number"),
            "total_questions": s.get("total_questions"),
        })
    return sessions

@router.get("/report/{session_id}")
async def get_report(session_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    session = await db["sessions"].find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if str(session["user_id"]) != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Forbidden")
    if session["status"] != "completed":
        raise HTTPException(status_code=400, detail="Interview not completed yet")
    
    report = session.get("report", {})
    report["session_id"] = str(session["_id"])
    report["role"] = session.get("role", {}).get("title", "Unknown")
    report["created_at"] = session.get("created_at")
    report["questions"] = session.get("qa_log", [])
    report["resume_context"] = session.get("resume_context", {})
    
    return report

@router.post("/{session_id}/end")
async def end_interview(session_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    session = await db["sessions"].find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if str(session["user_id"]) != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Forbidden")
    if session["status"] == "completed":
        return {"status": "already_completed"}
    
    updated_qa = session.get("qa_log", [])
    
    audio_avg = _average_metrics([q.get("audio_metrics") for q in updated_qa if q.get("audio_metrics")])
    visual_avg = _average_metrics([q.get("visual_metrics") for q in updated_qa if q.get("visual_metrics")])
    
    report = await generate_final_report(
        resume_context=session["resume_context"],
        role=session["role"],
        all_qa=updated_qa,
        audio_avg=audio_avg,
        visual_avg=visual_avg,
    )
    
    await db["sessions"].update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {
            "status": "completed",
            "report": report,
            "updated_at": datetime.utcnow(),
        }}
    )
    
    return {"status": "completed"}

@router.post("/audio-analysis")
async def audio_analysis(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    temp_path = f"/tmp/{uuid.uuid4()}_{file.filename}"
    try:
        with open(temp_path, "wb") as f:
            f.write(await file.read())
            
        physical_metrics = analyze_audio_physical(temp_path)
        llm_metrics = await analyze_audio_with_llm(temp_path)
        
        return {
            "transcript": llm_metrics.get("transcript", ""),
            "tone": llm_metrics.get("tone", "Unknown"),
            "pitch_variation": physical_metrics.get("pitch_variation", "Unknown"),
            "pauses": physical_metrics.get("pauses", 0)
        }
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
