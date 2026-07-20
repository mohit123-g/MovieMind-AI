import os
import pandas as pd
from datasets import load_dataset

# 1. Create the dataset directory
DATA_DIR = "dataset"
os.makedirs(DATA_DIR, exist_ok=True)
print(f"📁 Created directory: {DATA_DIR}/")

# 2. Define the exact mapping from GoEmotions (28 classes) to MovieMind (7 Vibes)
# GoEmotions uses integers 0-27 for its labels.
VIBE_MAPPING = {
    # Funny
    1: "Funny",       # amusement
    
    # Exciting
    13: "Exciting",   # excitement
    17: "Exciting",   # joy
    20: "Exciting",   # optimism
    
    # Heartwarming
    0: "Heartwarming",  # admiration
    4: "Heartwarming",  # approval
    5: "Heartwarming",  # caring
    8: "Heartwarming",  # desire
    15: "Heartwarming", # gratitude
    18: "Heartwarming", # love
    21: "Heartwarming", # pride
    23: "Heartwarming", # relief
    
    # Emotional
    16: "Emotional",  # grief
    24: "Emotional",  # remorse
    25: "Emotional",  # sadness
    
    # Scary
    14: "Scary",      # fear
    19: "Scary",      # nervousness
    
    # Frustrating
    2: "Frustrating", # anger
    3: "Frustrating", # annoyance
    9: "Frustrating", # disappointment
    10: "Frustrating",# disapproval
    11: "Frustrating",# disgust
    12: "Frustrating",# embarrassment
    
    # Mind-blowing
    6: "Mind-blowing",  # confusion
    7: "Mind-blowing",  # curiosity
    22: "Mind-blowing", # realization
    26: "Mind-blowing", # surprise
}

def process_go_emotions():
    print("⏳ Downloading Google 'GoEmotions' dataset from Hugging Face...")
    # Load the simplified version which has clean train/val/test splits
    dataset = load_dataset("go_emotions", "simplified")
    
    # We will combine train, validation, and test for maximum training data
    df_train = pd.DataFrame(dataset["train"])
    df_val = pd.DataFrame(dataset["validation"])
    df_test = pd.DataFrame(dataset["test"])
    df_all = pd.concat([df_train, df_val, df_test], ignore_index=True)
    
    processed_data = []
    
    print("🔄 Mapping 27 distinct emotions to your 7 MovieMind Vibes...")
    for _, row in df_all.iterrows():
        text = row["text"]
        labels = row["labels"] # This is a list of integers
        
        # A single text can have multiple labels in GoEmotions. 
        # We check if any of the text's labels match our defined Vibes.
        assigned_vibes = set()
        for label in labels:
            if label in VIBE_MAPPING:
                assigned_vibes.add(VIBE_MAPPING[label])
                
        # If the text matches our vibes, we add it to our new dataset
        for vibe in assigned_vibes:
            processed_data.append({
                "text": text,
                "vibe": vibe
            })
            
    # Save the mapped dataset to CSV
    vibe_df = pd.DataFrame(processed_data)
    vibe_csv_path = os.path.join(DATA_DIR, "vibe_dataset.csv")
    vibe_df.to_csv(vibe_csv_path, index=False)
    print(f"✅ Vibe dataset successfully saved to: {vibe_csv_path} ({len(vibe_df)} rows)")

if __name__ == "__main__":
    process_go_emotions()
    print("\n🚀 SETUP COMPLETE!")
    print(f"👉 Please move your 'imdb_reviews.csv' into the '{DATA_DIR}/' folder to finish preparation.")