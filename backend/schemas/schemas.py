from pydantic import BaseModel
from typing import List, Dict

# --- Request Schemas ---
class ReviewItem(BaseModel):
    id: str
    text: str

class AnalyzeRequest(BaseModel):
    movie_title: str
    reviews: List[ReviewItem]

# --- Response Schemas ---
class ReviewPrediction(BaseModel):
    id: str
    sentiment: str
    vibe: str

class OverallStats(BaseModel):
    total: int
    positive_pct: int
    negative_pct: int

class AnalyzeResponse(BaseModel):
    summary: str
    overall_stats: OverallStats
    vibe_stats: Dict[str, int]
    review_predictions: List[ReviewPrediction]