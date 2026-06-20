from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CheckInCreate(BaseModel):
    client_id: str
    mood_score: int  # 1-5
    mood_label: Optional[str] = None
    entry_date: Optional[str] = None      # YYYY-MM-DD, user-selected
    journal_entry: Optional[str] = None
    slider_values: Optional[dict] = None  # {"anxiety": 7, "energy": 4, ...}
    button_selections: Optional[dict] = None  # {"grapes": ["Exercise","Social"], ...}


class CheckIn(CheckInCreate):
    id: str
    timestamp: str
    sentiment_score: Optional[float] = None
    sentiment_label: Optional[str] = None


class TherapistContext(BaseModel):
    therapist_id: str
    client_id: str
    client_name: str
    treatment_goals: List[str]
    diagnoses: Optional[List[str]] = []
    medications: Optional[List[str]] = []
    triggers: Optional[List[str]] = []
    strengths: Optional[List[str]] = []
    notes: Optional[str] = None
    last_session_date: Optional[str] = None
    last_session_summary: Optional[str] = None


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[str] = None


class ChatRequest(BaseModel):
    client_id: str
    message: str
    conversation_id: Optional[str] = None


class JournalPromptRequest(BaseModel):
    client_id: str
    mood_score: int
    mood_label: Optional[str] = None
    previous_prompt: Optional[str] = None  # passed on regen so Claude generates a different one
