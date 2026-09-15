import os
from groq import Groq
from google.genai import types # Import types for configuration
from dotenv import load_dotenv

# Load variables from .env
load_dotenv()

# Configure Gemini with the NEW SDK
api_key = os.getenv("GROQ_API_KEY")
if api_key:
    client = Groq(api_key=api_key) # Initialize Groq client
else:
    client = None
    print("WARNING: GRAQ_API_KEY not found in .env")

def _generate_local_fallback(movie_title: str, positive_pct: int, negative_pct: int, total_reviews: int, vibe_stats: dict) -> str:
    """
    Algorithmic fallback that constructs a punchy, natural 2-sentence summary 
    using local aggregation metrics when cloud endpoints are rate-limited.
    """
    # 1. Extract and sort vibes to discover the absolute dominant viewer emotion
    sorted_vibes = sorted(vibe_stats.items(), key=lambda item: item[1], reverse=True)
    top_vibe = sorted_vibes[0][0].lower() if sorted_vibes else "mixed"
    
    # 2. Determine narrative direction based on sentiment thresholds
    if positive_pct >= 75:
        sentiment_narrative = "an overwhelmingly positive reception, leaving viewers thoroughly captivated"
    elif positive_pct >= 60:
        sentiment_narrative = "a highly favorable response, with the general audience leaning heavily toward praise"
    elif negative_pct >= 75:
        sentiment_narrative = "a intensely critical reception, with audiences widely panning the execution"
    elif negative_pct >= 60:
        sentiment_narrative = "a mostly critical response, leaving large segments of the audience underwhelmed"
    else:
        sentiment_narrative = "a highly polarizing split, igniting fierce debate among viewers"

    # 3. Construct a seamless 2-sentence critic-style consensus summary
    sentence_one = f"Audiences tracking '{movie_title}' have delivered {sentiment_narrative}."
    sentence_two = f"Across the {total_reviews} reviews evaluated, the absolute core of the collective consensus highlights the film's intensely {top_vibe} execution."
    
    return f"{sentence_one} {sentence_two}"

def generate_audience_summary(movie_title: str, stats_data: dict) -> str:
    """Generates a lightning-fast summary using aggregated metrics instead of raw reviews."""
    if not stats_data:
        return "No stats available to summarize."
    
    # Extract calculations from the local analysis pipeline
    overall = stats_data.get("overall_stats", {})
    positive_pct = overall.get("positive_pct", 50)
    negative_pct = overall.get("negative_pct", 50)
    total_reviews = stats_data.get("total_reviews_analyzed", 0)
    vibe_stats = stats_data.get("vibe_stats", {})
    
    # Format vibes string (e.g., "Exciting (87%), Frustrating (6%)")
    vibe_strings = [f"{vibe} ({pct}%)" for vibe, pct in vibe_stats.items() if pct > 0]
    vibes_summary = ", ".join(vibe_strings) if vibe_strings else "Mixed vibes"

    # The user prompt: Strictly provides the data and the task
    prompt = (
        f"Based on the following audience data for '{movie_title}', write a punchy, natural 2-sentence consensus summary. "
        f"Weave the dominant sentiment and top vibes into the narrative smoothly. Avoid sounding like a math report.\n\n"
        f"Data:\n"
        f"- Total Reviews: {total_reviews}\n"
        f"- Sentiment: {positive_pct}% Positive, {negative_pct}% Negative\n"
        f"- Vibes: {vibes_summary}"
    )
        
    # Check for client existence before attempting the remote network call
    if not client:
        print("⚠️ GRAQ Client uninitialized. Diverting immediately to local synthesis engine.")
        return _generate_local_fallback(movie_title, positive_pct, negative_pct, total_reviews, vibe_stats)

    try:
        print(f"DEBUG: Sending prompt to Groq:\n{prompt}\n")
        
        # Using Llama 3.3 70B for highly capable, fast text generation
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert movie critic and data analyst. Your job is to translate raw review metrics into highly engaging, readable summaries for a browser extension."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
        )
        # Parse the structured response
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        print(f"⚠️ GRAQ API Exception Intercepted: {e}")
        print("🔄 Gracefully degrading to local aggregation engine to safeguard UI integrity.")
        
        # Engage the dynamic local generation framework instead of returning an error string
        return _generate_local_fallback(movie_title, positive_pct, negative_pct, total_reviews, vibe_stats)
