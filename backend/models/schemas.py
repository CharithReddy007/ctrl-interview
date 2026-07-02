from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime

# Auth
class UserRegister(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str

# Resume
class ResumeParseRequest(BaseModel):
    text: str

class Role(BaseModel):
    id: str
    title: str
    match_score: int
    reasoning: str
    focus_areas: List[str]

class ResumeParseResponse(BaseModel):
    candidate_name: str
    seniority: str
    domain: List[str]
    detected_skills: List[str]
    roles: List[Role]
    raw_resume: str

# Interview
class StartInterviewRequest(BaseModel):
    resume_context: dict
    role: Role

class Question(BaseModel):
    id: str
    text: str
    category: str
    difficulty: str

class SubmitAnswerRequest(BaseModel):
    session_id: str
    question_id: str
    question_text: str
    answer_text: str
    audio_metrics: Optional[dict] = None
    visual_metrics: Optional[dict] = None
    prior_scores: Optional[List[dict]] = None

class AnswerScore(BaseModel):
    correctness: int
    depth: int
    structure: int
    judgment: str
    next_question: Optional[Question] = None
    interview_complete: bool = False

# Session / Report
class SessionSummary(BaseModel):
    session_id: str
    role: str
    status: str
    score: int
    created_at: datetime

class FullReport(BaseModel):
    session_id: str
    role: str
    overall_score: int
    verdict: str
    technical: int
    communication: int
    confidence: int
    engagement: int
    strengths: List[str]
    weaknesses: List[str]
    coaching_tips: List[str]
    behavioral_insights: str
    study_topics: List[str]
    questions: List[dict]
    created_at: datetime
