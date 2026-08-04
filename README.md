# 🎬 MovieMind AI

> **Real-Time IMDb Sentiment & Vibe Analyzer**
> A highly optimized, serverless Chrome Extension that extracts, analyzes, and synthesizes audience sentiment and emotional "vibes" directly on IMDb pages without heavy GPU requirements.

---

## 📖 Table of Contents

* [Overview](#overview)
* [System Architecture](#system-architecture)
* [Core Features](#core-features)
* [Tech Stack](#tech-stack)
* [Local Setup & Installation](#local-setup--installation)
* [Cloud Deployment (Render)](#cloud-deployment-render)
* [API Documentation](#api-documentation)
* [License & Contact](#license--contact)

---

## <a id="overview"></a>🚀 Overview

MovieMind AI bridges the gap between traditional statistical machine learning and modern Generative AI. It reads up to 350 audience reviews directly from the DOM of an IMDb movie page, analyzes the raw text using lightweight classification models, and synthesizes the statistical output into a natural, critic-style summary using Groq's ultra-fast **Llama 3.3 70B** model.

Designed for high performance and low overhead, the backend strips out massive transformer libraries in favor of `scikit-learn` algorithms (`LinearSVC` and `SGDClassifier`), serialized via `joblib` for instantaneous cold starts on cloud containers.

---

## <a id="system-architecture"></a>🏗 System Architecture

```text
 [ Chrome Extension ] --(Manifest V3)--> [ Render Cloud Gateway ]
  - content.js (DOM Extract)                    |
  - 350-review safety limit                     v
  - Cache-first storage                  [ FastAPI (main.py) ]
                                                |
                 +------------------------------+------------------------------+
                 |                                                             |
                 v                                                             v
   [ ML Engine (ml_service.py) ]                 [ Summary Engine (summary.py) ]
     - Joblib Serialization                       - Groq AI SDK (Llama 3.3)
     - LinearSVC (Sentiment)                      - 70B Versatile Model
     - SGDClassifier (Vibes)                      - Rule-Based Fallback Script

```

---

## <a id="core-features"></a>✨ Core Features

* **CPU-Efficient ML Inference:** Utilizes `LinearSVC` and `SGDClassifier` for rapid, accurate NLP classification, eliminating the need for expensive GPU-bound compute instances.
* **Resilient AI Synthesis:** Leverages the Groq API for sub-second generative summaries, backed by an algorithmic text compilation failover system ensuring zero UI downtime during network drops or API rate limits.
* **Browser Memory Protection:** Implements a hard constraint limiting extraction to 350 reviews per cycle paired with a local storage cache-first lookup, preventing V8 engine crashes during heavy DOM parsing.
* **Automated Asset Bootstrapping:** Programmatic downloading of NLTK dependencies (`stopwords`, `wordnet`, `omw-1.4`) during application startup, ensuring smooth deployments on ephemeral serverless platforms.
* **Monetization Framework Ready:** Architecture is primed for Google Chrome Identity API integration and DynamoDB credit tracking for hybrid freemium models.

---

## <a id="tech-stack"></a>💻 Tech Stack

| Domain | Technologies |
| --- | --- |
| **Frontend** | JavaScript, HTML/CSS, Chrome Extensions API (Manifest V3) |
| **Backend** | Python 3, FastAPI, Uvicorn, NLTK, Joblib |
| **Machine Learning** | Scikit-Learn (`LinearSVC`, `SGDClassifier`) |
| **Generative AI** | Groq API (`llama-3.3-70b-versatile`) |
| **Deployment** | Render.com, GitHub Actions (CI/CD) |

---

## <a id="local-setup--installation"></a>🛠 Local Setup & Installation

### 1. Backend Service Initialization

Clone the repository and isolate the Python environment:

```bash
git clone https://github.com/yourusername/moviemind-ai.git
cd moviemind-ai/backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

```

Install the dependencies:

```bash
pip install -r requirements.txt

```

Set up your environmental variables by creating a `.env` file in the `/backend` directory:

```env
GROQ_API_KEY=your_groq_api_key_here

```

Start the FastAPI development server:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000

```

### 2. Chrome Extension Installation

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer Mode** in the top right corner.
3. Click **Load unpacked** and select the `/extension` folder from this repository.
4. Pin the MovieMind AI icon to your browser toolbar.

---

## <a id="cloud-deployment-render"></a>☁️ Cloud Deployment (Render)

This project is optimized for deployment as a Web Service on **Render.com**.

1. Connect your GitHub repository to a new Render Web Service.
2. Set the **Build Command**:
```bash
pip install -r backend/requirements.txt

```


3. Set the **Start Command**:
```bash
cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT

```


4. Navigate to the **Environment** tab on Render and inject your `GROQ_API_KEY`.
5. Update your Chrome Extension's `manifest.json` host permissions and `fetch()` URLs to point to your live Render `*.onrender.com` domain.

---

## <a id="api-documentation"></a>📡 API Documentation

### **Analyze Reviews**

Processes an array of raw review strings and returns synthesized sentiment analytics.

* **URL:** `/api/analyze`
* **Method:** `POST`
* **Headers:** `Content-Type: application/json`
* **Body:**
```json
{
  "reviews": [
    "This movie was an absolute masterpiece with stunning visuals.",
    "The pacing was terrible and I fell asleep halfway through."
  ]
}

```


* **Success Response:** `200 OK`
```json
{
  "status": "success",
  "metrics": {
    "total_analyzed": 2,
    "positive_pct": 50.0,
    "negative_pct": 50.0,
    "top_vibes": ["Visual", "Boring"]
  },
  "summary": "The audience is highly divided on this film. While many praise the stunning visual elements, a significant portion of viewers found the pacing too slow and ultimately boring."
}

```



---

## <a id="license--contact"></a>📜 License & Contact

**License:** Distributed under the MIT License. See `LICENSE` for more information.

**Author:** Mohit

**Contact:** [mg53689@gmail.com](https://www.google.com/search?q=mailto%3Amg53689%40gmail.com) | 📞 8104884384
