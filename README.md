# CTRL+INTERVIEW — Agentic Mock Interviewer

> Your resume meets an intelligent, multimodal mock interviewer.

## Stack

- **Frontend**: React + Vite + Zustand + Recharts + Framer Motion + `face-api.js`
- **Backend**: FastAPI + Motor (async MongoDB) + PyMuPDF + Librosa
- **AI**: Gemini 1.5 Flash & Gemini 2.5 Flash via Google Generative AI
- **Database**: MongoDB Atlas
- **Auth**: JWT (username + password)

---

## Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB Atlas account (free tier works)
- Google Gemini API key ([aistudio.google.com](https://aistudio.google.com/))
- System dependencies for Librosa (e.g., `ffmpeg` or `libsndfile` depending on OS)

---

## Setup Instructions

### 1. Clone / Unzip the project

```
ctrl-interview/
├── backend/
└── frontend/
```

---

### 2. Configure Backend Environment

```bash
cd backend
cp .env .env.local   # or just edit .env directly
```

Edit `backend/.env`:
```env
GEMINI_API_KEY=AIzaSy...your-key-here
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/ctrl_interview?retryWrites=true&w=majority
JWT_SECRET=any-long-random-string-here
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080
```

**MongoDB Atlas Setup:**
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Under **Database Access** → Add a user with password
4. Under **Network Access** → Add IP `0.0.0.0/0` (allow all, for dev)
5. Under **Clusters** → Connect → Drivers → Copy connection string
6. Replace `<password>` with your DB user password in the URI

---

### 3. Install & Run Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Mac/Linux
# venv\Scripts\activate         # Windows

# Install dependencies (FastAPI, Motor, Google GenAI, Librosa, etc.)
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload --port 8000
```

You should see:
```
✅ Connected to MongoDB Atlas
INFO: Uvicorn running on http://127.0.0.1:8000
```

Test it: [http://localhost:8000/health](http://localhost:8000/health)

---

### 4. Install & Run Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

App runs at: [http://localhost:5173](http://localhost:5173)

---

## Usage Flow

1. **Register** — create a username + password
2. **Upload resume** — PDF or paste text
3. **Pick a role** — Gemini infers 3–5 roles with match scores
4. **Grant mic + camera** (or use fallback text mode)
5. **Answer 5 adaptive questions**:
   - Manually click **Record Answer** when you are ready.
   - When finished, stop recording to receive an LLM evaluation of your answer (Correctness, Depth, Structure).
   - Review your feedback, then explicitly click **Next Question**.
   - You can also optionally choose to end the interview early and generate a report.
6. **View bento scorecard** — overall score, radar chart, per-question breakdown, coaching tips

---

## Features

| Feature | Details |
|---|---|
| Resume parsing | PyMuPDF extracts text → Gemini extracts skills/projects/seniority |
| Role inference | 3–5 realistic roles with match_score, reasoning, focus_areas |
| Adaptive questions | Each Q generated from prior scores — harder if doing well, redirects if off-topic |
| Visual Intelligence | `face-api.js` client-side computer vision extracts facial landmarks and expressions for Stress, Face Presence, and Eye Contact metrics. |
| Audio Intelligence | Backend uses `librosa` to analyze Pitch Variance and Pauses. Gemini natively processes the recorded `WebM` audio blob for perfectly accurate transcription and semantic Tone analysis. |
| Live evaluation | The live meters dynamically transform into Answer Correctness, Technical Depth, and Response Structure metrics as soon as you submit your answer. |
| Fallback mode | Full functionality without camera/mic — type answers directly |
| Bento report | Radar chart, bar chart, strengths/weaknesses, coaching tips, transcript |
| History | All past sessions stored in MongoDB, viewable anytime. Resume incomplete sessions with a single click. |

---

## API Endpoints

```
POST /auth/register              — Create account
POST /auth/login                 — Login, get JWT

POST /resume/parse-pdf           — Upload PDF, get parsed resume + roles
POST /resume/parse-text          — Paste text, get parsed resume + roles

POST /interview/start            — Start session, get first question
POST /interview/audio-analysis   — Upload audio blob for librosa + gemini analysis
POST /interview/answer           — Submit answer, get score + next question
POST /interview/{id}/end         — End interview early and generate report
GET  /interview/sessions         — List past sessions
GET  /interview/report/{id}      — Get full report for completed session
```

---

## Troubleshooting

**Camera not working?**
- Make sure you're on `http://localhost:5173` (not file://)
- Allow permissions when prompted by your browser.
- If denied or failing, use fallback text mode — all features still work.

**Gemini API errors?**
- Check your API key in `backend/.env` under `GEMINI_API_KEY`.
- Models used: `gemini-1.5-flash` for audio analysis and `gemini-2.5-flash` for general reasoning.

**MongoDB connection errors?**
- Verify your Atlas URI is correct
- Check Network Access whitelist includes your IP
- Confirm DB user has `readWrite` permissions

---

## Architecture

```
Browser
  └── React SPA (Vite)
        ├── face-api.js    →  client-side vision model (engagement)
        ├── MediaRecorder  →  audio blob capture
        └── Axios          →  /api proxy to FastAPI

FastAPI (port 8000)
  ├── /auth        →  JWT login/register
  ├── /resume      →  PyMuPDF + Gemini parsing
  └── /interview   → Adaptive Q generation, scoring, reports, librosa analysis
        └── google.generativeai → Gemini Flash Models

MongoDB Atlas
  ├── users        (username, hashed_password)
  └── sessions     (resume, role, qa_log, report, current_question)
```
