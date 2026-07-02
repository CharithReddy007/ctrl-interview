from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from fastapi.responses import JSONResponse
from models.schemas import ResumeParseRequest
from services.llm import parse_resume_with_llm
from core.security import get_current_user
import fitz  # pymupdf
import io

router = APIRouter(prefix="/resume", tags=["resume"])

@router.post("/parse-pdf")
async def parse_pdf(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if not file.filename.lower().endswith((".pdf", ".txt")):
        raise HTTPException(status_code=400, detail="Only PDF or TXT files accepted")
    
    content = await file.read()
    
    if file.filename.lower().endswith(".pdf"):
        try:
            doc = fitz.open(stream=content, filetype="pdf")
            text = ""
            for page in doc:
                text += page.get_text()
            doc.close()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {str(e)}")
    else:
        text = content.decode("utf-8", errors="ignore")
    
    if len(text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Could not extract sufficient text from file")
    
    result = await parse_resume_with_llm(text)
    result["raw_resume"] = text
    return result

@router.post("/parse-text")
async def parse_text(
    body: ResumeParseRequest,
    current_user: dict = Depends(get_current_user)
):
    if len(body.text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Resume text too short")
    
    result = await parse_resume_with_llm(body.text)
    result["raw_resume"] = body.text
    return result
