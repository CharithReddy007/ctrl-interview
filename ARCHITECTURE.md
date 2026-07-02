# Architecture & Design Document: CTRL+INTERVIEW

## 1. Problem Summary and User Journey

**Problem Summary**
Traditional mock interview platforms often rely on static question banks or simple text-based LLM chatbots, failing to capture the multidimensional nature of a real interview. A true mock interview requires not just technical evaluation, but also an understanding of the candidate's communication style, confidence, and engagement. CTRL+INTERVIEW solves this by providing a multimodal, adaptive AI interviewer that evaluates technical correctness alongside audio and visual heuristics, delivering a brutally honest and comprehensive feedback scorecard.

**User Journey**
1. **Context Initialization:** The user registers/logs in and provides their resume (via PDF upload or text paste).
2. **Role Inference:** The system parses the resume and suggests 3–5 realistic roles with match scores and focus areas.
3. **Setup & Fallback:** The user grants microphone and camera permissions. If denied, a text-only fallback mode is available.
4. **Adaptive Interview:** 
   - The Orchestrator Agent asks a contextually relevant question.
   - The user records their answer. Visual and audio signals are captured.
   - The Technical Evaluator Agent instantly scores the answer (Correctness, Depth, Structure) and adapts the next question's difficulty.
5. **Scorecard & Coaching:** After 5 questions (or early termination), the Coaching Agent generates a comprehensive Bento report containing an overall score, radar charts, strengths/weaknesses, behavioral insights, and actionable study topics.

---

## 2. High-Level Architecture

The system follows a client-server architecture, decoupled into a React SPA frontend and a FastAPI backend, utilizing specialized AI agents for different tasks.

### Modules / Agents
- **Context Module:** Parses resumes using PyMuPDF and utilizes an LLM to extract skills, seniority, and infer potential roles.
- **Orchestrator Agent:** Generates questions dynamically, adapting difficulty based on the real-time scoring of previous answers.
- **Technical Evaluator:** Analyzes the transcript of the user's answer against the current question to output quantitative metrics (Correctness, Depth, Structure) and a qualitative judgment.
- **Visual Heuristics Engine:** A client-side module using `face-api.js` to compute physical presence, stress, and eye contact.
- **Audio Intelligence Engine:** A hybrid module using backend `librosa` for acoustic analysis (pitch, pauses) and Gemini 1.5 Flash for semantic audio processing (transcription, tone).
- **Coaching Agent:** Synthesizes the entire Q&A log and multimodal averages to generate the final assessment report.

### Data Flow & Interfaces
1. **Frontend ↔ Backend (REST API via Axios):** 
   - JSON payloads for session management, resume uploads, and Q&A interactions.
   - `multipart/form-data` for audio blob uploads (`WebM`).
2. **Backend ↔ Database (Motor Async):**
   - MongoDB Atlas stores users, hashed passwords (JWT Auth), and complete session states (resume context, current question, Q&A log, final report).
3. **Backend ↔ AI Services:**
   - FastAPI communicates with Google Generative AI asynchronously to retrieve structured JSON from Gemini models.

---

## 3. Key Design Choices and Trade-offs

### Client-Side Visual Heuristics vs. Backend Processing
- **Choice:** Running computer vision (`face-api.js`) directly in the browser rather than streaming video to the backend.
- **Trade-off:** Saving massive server costs, bandwidth, and latency at the expense of client-device CPU usage. For low-end devices, this could cause frame drops, but it ensures total privacy (no video leaves the device) and infinite scalability.

### Model Selection: Gemini Flash Pipeline
- **Choice:** Utilizing Gemini 2.5 Flash for reasoning (Context, Evaluator, Coach) and Gemini 1.5 Flash for native audio processing.
- **Trade-off:** We prioritized **Latency and Cost over maximum reasoning depth** (e.g., Gemini Pro or GPT-4o). In a live interview, waiting 10 seconds for an evaluation breaks immersion. The Flash models provide sub-second JSON responses and excellent native audio transcription, eliminating the need for a separate, heavy Speech-to-Text pipeline (like Whisper).

### Stateless Audio Evaluation
- **Choice:** We record audio per answer, send the WebM blob to the backend, analyze it, and delete it immediately.
- **Trade-off:** This is simpler to implement and highly private compared to a persistent WebRTC audio stream. However, it prevents "interruptions" or highly conversational back-and-forth interactions within a single answer block.

---

## 4. Scoring Approach and Aggregation

CTRL+INTERVIEW uses a multi-layered scoring approach that fuses technical accuracy with behavioral signals.

### Technical Scoring (LLM)
For every answer submitted, the Technical Evaluator returns:
- **Correctness (0-100):** How factually accurate the answer is. If Correctness > 80, the next question is forced to "HARD". If < 40, it drops to "EASY".
- **Depth (0-100):** Did the candidate explain the "why" and "how"?
- **Structure (0-100):** Is the answer coherent and logically organized?

### Audio and Video Signals
- **Visual Metrics (Browser):** `face-api.js` tracks facial landmarks. 
  - *Stress Score:* Aggregated probabilities of fear, sadness, disgust, and anger expressions.
  - *Eye Contact:* Calculated via a heuristic ratio measuring nose deviation from the center of the eyes.
- **Audio Metrics (Backend):**
  - *Physical (Librosa):* Computes f0 standard deviation to determine Pitch Variation (Monotone vs. Dynamic) and detects >1 second silence gaps for Hesitation/Pauses.
  - *Semantic (Gemini 1.5 Flash):* Processes the raw audio natively to extract the transcript and infer speaker Tone (e.g., Confident, Nervous).

### Aggregation
The individual Q&A technical scores and the averages of the audio/visual signals are stored in the MongoDB session object. When the interview ends, the Coaching Agent is prompted with the entire aggregated log. It evaluates the holistic performance, balancing the raw correctness with behavioral context, to output an overarching score (0-100), a categorized breakdown (Technical, Communication, Confidence, Engagement), and explicit study topics.

---

## 5. Limitations, Assumptions, and Next Steps

**Assumptions**
- The candidate is interviewing in English.
- The candidate's browser supports `MediaRecorder` API and WebGL for client-side CV inference.
- The user will position their camera appropriately in a well-lit environment.

**Limitations**
- **Subjectivity:** LLM-based technical evaluation can occasionally be subjective or penalize valid, niche alternative solutions.
- **Device Dependency:** The `face-api.js` local models may perform poorly or fail to initialize on strictly locked-down corporate devices or very old hardware.
- **Turn-based Flow:** The current interview flow is strictly turn-based. The AI cannot interrupt a rambling candidate mid-sentence.

**Next Steps**
1. **WebRTC Streaming:** Upgrade the audio pipeline to a bidirectional WebRTC stream to enable real-time interruptions and a more natural conversational flow.
2. **Integrated Code Execution:** Add an embedded IDE (like Monaco) paired with a sandbox (e.g., Docker/Piston) to support live LeetCode-style technical rounds.
3. **Custom Personas:** Allow users to specify the "personality" of the interviewer (e.g., "Google Senior SWE - Harsh", "Startup Founder - Visionary") to tailor the Orchestrator's prompt.
