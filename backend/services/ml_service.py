
import os
import re
import joblib
import numpy as np
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

class MovieMindMLService:
    def __init__(self):
        # NEW CRITICAL FIX FOR DEPLOYMENT:
        # Automatically download required NLTK assets if they are missing on Render
        print("📥 Verifying local NLTK assets...")
        try:
            nltk.download('stopwords', quiet=True)
            nltk.download('wordnet', quiet=True)
            nltk.download('omw-1.4', quiet=True) # Ensures lemmatizer stability
        except Exception as e:
            print(f"Warning: NLTK download optimization bypassed: {e}")
            
        # 1. Resolve paths dynamically based on your directory structure
        # __file__ is backend/services/ml_service.py
        # We need to go up two levels to reach the MovieMind-AI root, then into ml/models
        BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        MODELS_DIR = os.path.join(BASE_DIR, "ml", "models")
        
        print("⏳ Loading lightweight Scikit-Learn assets into memory...")
        
        # 2. Load the Sentiment Engine
        self.sentiment_model = joblib.load(os.path.join(MODELS_DIR, "sentiment_model.pkl"))
        self.sentiment_vectorizer = joblib.load(os.path.join(MODELS_DIR, "sentiment_vectorizer.pkl"))
        
        # 3. Load the Dual-Engine Vibe Engine
        self.vibe_model = joblib.load(os.path.join(MODELS_DIR, "vibe_model.pkl"))
        self.vibe_vectorizer = joblib.load(os.path.join(MODELS_DIR, "vibe_vectorizer.pkl"))
        
        # 4. Initialize Linguistic Tools
        self.lemmatizer = WordNetLemmatizer()
        base_stopwords = set(stopwords.words('english'))
        # Retain critical context modifiers for accurate classification
        negation_words = {'not', 'no', 'never', 'but', 'very', 'too', 'only', 'what', 'why'}
        self.custom_stopwords = base_stopwords - negation_words
        
        print("🚀 Serverless-ready ML Engine Loaded.")

    def _clean_text(self, text: str) -> str:
        """Preprocesses text identically to the Jupyter Notebook training phase."""
        if not text:
            return ""
        text = text.lower()
        text = re.sub(r'<br\s*/?>', ' ', text)
        text = re.sub(r'[^a-z\s]', '', text)
        words = text.split()
        cleaned = [self.lemmatizer.lemmatize(w) for w in words if w not in self.custom_stopwords]
        return " ".join(cleaned)

    def analyze_reviews_batch(self, reviews: list) -> list:
        """
        Takes a list of reviews, cleans the text, and processes them in a single 
        highly optimized sparse matrix operation without needing a GPU.
        """
        valid_ids = []
        texts_to_process = []
        
        # Step 1: Extract and clean all text
        for review_obj in reviews:
            # Handle both Pydantic models and standard dictionaries
            review_dict = review_obj.dict() if hasattr(review_obj, "dict") else review_obj
            if not isinstance(review_dict, dict):
                continue
                
            review_id = review_dict.get("id", "")
            review_text = review_dict.get("text", "")
            
            # Skip completely empty reviews
            if review_text and review_text.strip():
                valid_ids.append(review_id)
                texts_to_process.append(self._clean_text(review_text.strip()))

        if not texts_to_process:
            return []

        # Step 2: High-speed vectorization for the entire batch at once
        sent_vecs = self.sentiment_vectorizer.transform(texts_to_process)
        vibe_vecs = self.vibe_vectorizer.transform(texts_to_process)

        # Step 3: CPU matrix predictions
        sentiment_preds = self.sentiment_model.predict(sent_vecs)
        
        # For Vibe, extract native probabilities from the SGDClassifier
        vibe_probs = self.vibe_model.predict_proba(vibe_vecs)
        vibe_classes = self.vibe_model.classes_
        vibe_max_indices = vibe_probs.argmax(axis=1)

       # Step 4: Re-map the predictions back to their original IDs
        results = []
        for i, review_id in enumerate(valid_ids):
            
            # FORCE TITLE CASE: Converts 'positive' -> 'Positive'
            formatted_sentiment = str(sentiment_preds[i]).capitalize()
            
            results.append({
                "id": review_id,
                "sentiment": formatted_sentiment, 
                "vibe": vibe_classes[vibe_max_indices[i]] # Vibes are already capitalized
            })
            
        return results

# Instantiate a singleton instance on server boot
ml_engine = MovieMindMLService()

# Expose the legacy function name so main.py/routers don't break
def analyze_reviews_batch(reviews: list):
    return ml_engine.analyze_reviews_batch(reviews)


#
# this is transformer code which is used for sentiment and vibe analysis

# import os
# from transformers import pipeline

# # 1. Setup paths to your local custom models
# BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# SENTIMENT_MODEL_PATH = os.path.join(BASE_DIR, "models", "sentiment")
# VIBE_MODEL_PATH = os.path.join(BASE_DIR, "models", "vibe")

# # 2. Load the models into memory
# # Note: Added device=0 to explicitly ensure GPU routing (optional, defaults to CPU if GPU fails)
# print("Loading custom Sentiment model...")
# sentiment_analyzer = pipeline(
#     "text-classification", 
#     model=SENTIMENT_MODEL_PATH, 
#     tokenizer=SENTIMENT_MODEL_PATH,
#     device=0 
# )

# print("Loading custom Vibe model...")
# vibe_classifier = pipeline(
#     "text-classification", 
#     model=VIBE_MODEL_PATH, 
#     tokenizer=VIBE_MODEL_PATH,
#     device=0
# )

# # 3. Label Mappings
# SENTIMENT_LABELS = {
#     "LABEL_0": "Negative",
#     "LABEL_1": "Positive"
# }

# VIBE_LABELS = {
#     "LABEL_0": "Funny",
#     "LABEL_1": "Exciting",
#     "LABEL_2": "Heartwarming",
#     "LABEL_3": "Emotional",
#     "LABEL_4": "Scary",
#     "LABEL_5": "Frustrating",
#     "LABEL_6": "Mind-blowing"
# }

# # 4. Core Prediction Functions (Kept for single-text testing if needed)
# def analyze_sentiment(text: str):
#     result = sentiment_analyzer(text, truncation=True, max_length=512)[0]
#     return {
#         "label": SENTIMENT_LABELS.get(result["label"], "Unknown"),
#         "confidence": result["score"]
#     }

# def analyze_vibe(text: str):
#     result = vibe_classifier(text, truncation=True, max_length=256)[0]
#     return {
#         "label": VIBE_LABELS.get(result["label"], "Unknown"),
#         "confidence": result["score"]
#     }

# # 5. The Updated Batch Processor
# def analyze_reviews_batch(reviews: list):
#     """
#     Takes a list of reviews, extracts the text, and processes them in bulk
#     using the GPU efficiently to avoid sequential pipeline warnings.
#     """
#     valid_ids = []
#     texts_to_process = []
    
#     # Step 1: Clean and extract all text into a single flat list
#     for review_obj in reviews:
#         if hasattr(review_obj, "dict"):
#             review_dict = review_obj.dict()
#         elif isinstance(review_obj, dict):
#             review_dict = review_obj
#         else:
#             continue
            
#         review_id = review_dict.get("id", "")
#         review_text = review_dict.get("text", "")
        
#         # Skip empty strings
#         if review_text and review_text.strip():
#             valid_ids.append(review_id)
#             texts_to_process.append(review_text.strip())

#     if not texts_to_process:
#         return []

#     # Step 2: Pass the entire list of strings to the pipelines at once
#     # The batch_size tells the GPU how many strings to process simultaneously.
#     # You can tweak batch_size (e.g., 16, 32, 64) depending on your GPU's VRAM.
#     sentiment_results = sentiment_analyzer(
#         texts_to_process, 
#         batch_size=32, 
#         truncation=True, 
#         max_length=512
#     )
    
#     vibe_results = vibe_classifier(
#         texts_to_process, 
#         batch_size=32, 
#         truncation=True, 
#         max_length=256
#     )

#     # Step 3: Re-map the pipeline results back to their original IDs
#     results = []
#     for i, review_id in enumerate(valid_ids):
#         # Pipeline results are returned as a list in the exact same order as the input
#         s_label = SENTIMENT_LABELS.get(sentiment_results[i]["label"], "Unknown")
#         v_label = VIBE_LABELS.get(vibe_results[i]["label"], "Unknown")
        
#         results.append({
#             "id": review_id,
#             "sentiment": s_label,
#             "vibe": v_label
#         })
        
#     return results



#this is old 1 code which is not used now

# import os
# from transformers import pipeline

# # 1. Setup paths to your local custom models
# BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# SENTIMENT_MODEL_PATH = os.path.join(BASE_DIR, "models", "sentiment")
# VIBE_MODEL_PATH = os.path.join(BASE_DIR, "models", "vibe")

# # 2. Load the models into memory
# print("Loading custom Sentiment model...")
# sentiment_analyzer = pipeline(
#     "text-classification", 
#     model=SENTIMENT_MODEL_PATH, 
#     tokenizer=SENTIMENT_MODEL_PATH
# )

# print("Loading custom Vibe model...")
# vibe_classifier = pipeline(
#     "text-classification", 
#     model=VIBE_MODEL_PATH, 
#     tokenizer=VIBE_MODEL_PATH
# )

# # 3. Label Mappings
# SENTIMENT_LABELS = {
#     "LABEL_0": "Negative",
#     "LABEL_1": "Positive"
# }

# VIBE_LABELS = {
#     "LABEL_0": "Funny",
#     "LABEL_1": "Exciting",
#     "LABEL_2": "Heartwarming",
#     "LABEL_3": "Emotional",
#     "LABEL_4": "Scary",
#     "LABEL_5": "Frustrating",
#     "LABEL_6": "Mind-blowing"
# }

# # 4. Core Prediction Functions
# def analyze_sentiment(text: str):
#     result = sentiment_analyzer(text, truncation=True, max_length=512)[0]
#     return {
#         "label": SENTIMENT_LABELS.get(result["label"], "Unknown"),
#         "confidence": result["score"]
#     }

# def analyze_vibe(text: str):
#     result = vibe_classifier(text, truncation=True, max_length=256)[0]
#     return {
#         "label": VIBE_LABELS.get(result["label"], "Unknown"),
#         "confidence": result["score"]
#     }

# # 5. The Missing Batch Processor for main.py
# def analyze_reviews_batch(reviews: list):
#     """
#     Takes a list of review dictionaries/objects from the API request,
#     runs them through both custom models, and maps them to the response schema.
#     """
#     results = []
#     for review_obj in reviews:
#         # Handle if it arrives as a dictionary or a Pydantic object
#         if hasattr(review_obj, "dict"):
#             review_dict = review_obj.dict()
#         elif isinstance(review_obj, dict):
#             review_dict = review_obj
#         else:
#             continue
            
#         review_id = review_dict.get("id", "")
#         review_text = review_dict.get("text", "")
        
#         # Skip empty strings
#         if not review_text or not review_text.strip():
#             continue
            
#         # Execute custom models
#         sentiment_data = analyze_sentiment(review_text)
#         vibe_data = analyze_vibe(review_text)
        
#         # Structure perfectly to match your ReviewPrediction schema
#         results.append({
#             "id": review_id,
#             "sentiment": sentiment_data["label"],
#             "vibe": vibe_data["label"]
#         })
        
#     return results