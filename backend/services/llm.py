import json
import google.generativeai as genai
from core.config import settings

def _get_model():
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return genai.GenerativeModel("gemini-2.5-flash")

async def call_llm(system: str, user_message: str) -> str:
    model = _get_model()
    prompt = f"{system}\n\n{user_message}"
    response = model.generate_content(prompt)
    return response.text

def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    return json.loads(text.strip())

async def parse_resume_with_llm(resume_text: str) -> dict:
    system = """You are an expert technical recruiter and resume analyst.
Analyze the resume and return ONLY valid JSON with this exact structure (no markdown, no backticks):
{
  "candidate_name": "string",
  "seniority": "junior|mid|senior|staff",
  "domain": ["Backend", "Frontend", "DevOps"],
  "detected_skills": ["Python", "Go"],
  "roles": [
    {
      "id": "role_1",
      "title": "Role Title",
      "match_score": 95,
      "reasoning": "2-3 sentence reasoning",
      "focus_areas": ["topic1", "topic2", "topic3", "topic4", "topic5"]
    }
  ]
}
Generate 3-5 realistic roles ordered by match score. Return ONLY the JSON object, nothing else."""
    content = await call_llm(system, f"Analyze this resume:\n\n{resume_text}")
    return _extract_json(content)

async def analyze_audio_with_llm(file_path: str) -> dict:
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        audio_file = genai.upload_file(path=file_path)
        system = """You are an expert audio analyst and transcriptionist. 
Listen to this audio clip and return ONLY valid JSON (no markdown, no backticks).
Analyze the tone of the speaker (e.g., Confident, Nervous, Calm, Frustrated, Professional).
Transcribe the speech accurately. If there is no speech, leave transcript empty.
Format:
{
  "transcript": "The spoken words here",
  "tone": "Confident"
}"""
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content([system, audio_file])
        
        # Cleanup file from google storage
        try:
            genai.delete_file(audio_file.name)
        except:
            pass
            
        return _extract_json(response.text)
    except Exception as e:
        print(f"Error in LLM audio analysis: {e}")
        return {"transcript": "", "tone": "Unknown"}

async def generate_first_question(resume_context: dict, role: dict) -> dict:
    system = f"""You are a fair, balanced, and constructive technical interviewer for a {role['title']} position.
Candidate background: {json.dumps(resume_context)}
Focus areas: {', '.join(role.get('focus_areas', []))}

Return ONLY valid JSON (no markdown, no backticks):
{{"id": "q1", "text": "question text", "category": "PROJECT|TECHNICAL|BEHAVIORAL|SYSTEM_DESIGN", "difficulty": "EASY|MEDIUM|HARD"}}
Start with a project-based question. Return ONLY the JSON object."""
    content = await call_llm(system, "Generate the first interview question.")
    return _extract_json(content)

async def score_answer_and_next_question(
    resume_context: dict, role: dict, question: dict, answer: str,
    prior_qa: list, question_number: int, total_questions: int = 7,
    audio_metrics: dict = None, visual_metrics: dict = None
) -> dict:
    prior_summary = "\n".join([
        f"Q{i+1}: {qa['question']} -> correctness={qa.get('correctness',0)}, depth={qa.get('depth',0)}"
        for i, qa in enumerate(prior_qa)
    ]) if prior_qa else "None yet"

    is_last = question_number >= total_questions

    if is_last:
        next_q_str = '"interview_complete": true'
    else:
        next_q_str = f'"interview_complete": false, "next_question": {{"id": "q{question_number+1}", "text": "FILL", "category": "TECHNICAL", "difficulty": "EASY|MEDIUM|HARD"}}'

    system = f"""You are a supportive and realistic technical interviewer for {role['title']}. Assume you are a senior engineer who already understands the basics, technical shorthand, and context.
Prior performance: {prior_summary}
Question {question_number} of {total_questions}.

Return ONLY valid JSON (no markdown, no backticks):
{{"correctness": 0-100, "depth": 0-100, "structure": 0-100, "judgment": "2-3 sentences", {next_q_str}}}

Rules: 
1. If the candidate accurately identifies the core concepts or fundamental challenges, assign a minimum of 70 for correctness and depth.
2. Do not penalize for brevity, high-level explanations, or skipping fundamental definitions. 
3. Understand that verbal answers are informal and concise; score generously based on technical accuracy.
4. Off-topic answer = correctness 0-20. One-word answer = all zeros.
5. CRITICAL: You MUST adjust the 'difficulty' of the next_question. Use HARD if correctness > 80, stay MEDIUM if 40-80, and drop to EASY if < 40.
Return ONLY the JSON."""
    content = await call_llm(system, f"Question: {question['text']}\n\nAnswer: {answer}")
    return _extract_json(content)

async def generate_final_report(
    resume_context: dict, role: dict, all_qa: list,
    audio_avg: dict = None, visual_avg: dict = None
) -> dict:
    system = f"""You are a fair, objective, and constructive interview coach for {role['title']}.
Candidate: {resume_context.get('candidate_name', 'Candidate')}
Q&A log: {json.dumps(all_qa, indent=2)}

Return ONLY valid JSON (no markdown, no backticks):
{{
  "overall_score": 0-100,
  "verdict": "2-3 sentence verdict",
  "technical": 0-100, "communication": 0-100, "confidence": 0-100, "engagement": 0-100,
  "strengths": ["s1","s2","s3"],
  "weaknesses": ["w1","w2","w3","w4","w5"],
  "coaching_tips": ["t1","t2","t3","t4","t5","t6"],
  "behavioral_insights": "1-2 paragraph analysis",
  "study_topics": ["topic1","topic2","topic3","topic4","topic5","topic6"]
}}
Provide fair and balanced grading. Give a realistic assessment of the candidate's skills without being overly harsh or artificially inflating scores. Return ONLY the JSON object."""
    content = await call_llm(system, "Generate the final report.")
    return _extract_json(content)