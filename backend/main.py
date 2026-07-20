from fastapi import FastAPI, Query # <-- Import Query
from fastapi.middleware.cors import CORSMiddleware
import time
from schemas.schemas import AnalyzeRequest, AnalyzeResponse, OverallStats
from services.ml_service import analyze_reviews_batch
from services.summary import generate_audience_summary

app = FastAPI(
    title="MovieMind AI API",
    version="1.0.0"
)

# CORS configuration for the Chrome Extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"status": "success", "message": "MovieMind Backend Running 🚀"}

@app.get("/health")
def health():
    return {"status": "healthy"}

# Added 'skip_summary' as an optional query parameter for speed testing
@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_movie_reviews(
    request: AnalyzeRequest, 
    skip_summary: bool = Query(False, description="Set to true to skip LLM summary and test raw ML speed")
):
    start_time = time.time()
    
    # 1. Run ML Inference
    reviews_data = [{"id": r.id, "text": r.text} for r in request.reviews]
    predictions = analyze_reviews_batch(reviews_data)
    
    # 2. Calculate Statistics
    total_reviews = len(predictions)
    positive_count = sum(1 for p in predictions if p["sentiment"] == "Positive")
    negative_count = total_reviews - positive_count
    
    vibe_counts = {}
    for p in predictions:
        vibe_counts[p["vibe"]] = vibe_counts.get(p["vibe"], 0) + 1

    pos_pct = int((positive_count / total_reviews) * 100) if total_reviews > 0 else 0
    neg_pct = 100 - pos_pct if total_reviews > 0 else 0

    vibe_stats = {
        vibe: int((count / total_reviews) * 100) 
        for vibe, count in vibe_counts.items()
    }

    # --- BUNDLE THE STATS FOR GEMINI ---
    stats_payload = {
        "total_reviews_analyzed": total_reviews,
        "overall_stats": {
            "positive_pct": pos_pct,
            "negative_pct": neg_pct
        },
        "vibe_stats": vibe_stats
    }

    # 3. Generate Summary using the calculated stats bundle
    if skip_summary:
        # FAST PATH: Bypasses the summary generator completely to measure raw backend speed
        summary = "Summary generation skipped for performance testing."
    else:
        # NORMAL PATH: Runs the LLM summary
        try:
            summary = generate_audience_summary(request.movie_title, stats_payload)
        except Exception:
            summary = (
                f"Audience reaction is {pos_pct}% positive and {neg_pct}% negative. "
                f"Most viewers describe the movie as {vibe_stats}."
            )

    print(f"Processed {total_reviews} reviews in {time.time() - start_time:.2f} seconds")

    return AnalyzeResponse(
        summary=summary,
        overall_stats=OverallStats(
            total=total_reviews, 
            positive_pct=pos_pct, 
            negative_pct=neg_pct
        ),
        vibe_stats=vibe_stats,
        review_predictions=predictions
    )