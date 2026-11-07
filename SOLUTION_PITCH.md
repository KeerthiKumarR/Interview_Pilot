# 🚀 InterviewPilot: Autonomous AI Placement Readiness Copilot & Mock Interviewer
### *Powered by Gnani.ai Voice Foundation Models (Prisma ASR & Timbre TTS)*

---

### 1. Problem Statement
Over 1.5 million engineering students graduate annually in India, yet fewer than 20% are deemed industry-ready. Students face three critical bottlenecks:
1. **The Architecture Gap**: Candidates list keywords on resumes without deep architectural comprehension, faltering under senior engineering cross-examination.
2. **Scarcity of Realistic Viva Practice**: Human mock technical vivas cost \$100+/hr and lack consistent, objective evaluation rubrics.
3. **Accent & Linguistic Anxiety**: Most speech models penalize regional Indian accents and struggle with mixed technical vernacular (code-switching / Hinglish).

---

### 2. The Solution: InterviewPilot
**InterviewPilot** is an end-to-end autonomous Placement Readiness Copilot tailored specifically for Indian engineering candidates. It ingests resumes, analyzes live portfolio projects, conducts voice-to-voice structured 4-stage technical placement vivas, executes real code in a cloud sandbox, and generates an executive hiring evaluation in under 60 seconds.

---

### 3. Core Gnani.ai Voice Integration & Innovations
InterviewPilot deeply integrates **Gnani.ai’s Speech AI Suite** as its core acoustic backbone:
* **Gnani.ai Prisma ASR**: High-accuracy speech recognition fine-tuned for Indian English and 8 regional Indic languages (Hindi, Kannada, Tamil, Telugu, Marathi, Bengali, Gujarati, Malayalam). Accurately transcribes technical jargon (e.g., Redis, Kafka, Big-O, Docker, TTL) across regional accents without phonetic distortion.
* **Gnani.ai Timbre TTS Engine**: Ultra-low-latency, high-fidelity neural voice synthesis powering realistic interviewer personas:
  * **Nalini (Female)**: Senior Staff Systems Architect (warm, articulate, systems design focus).
  * **Arun (Male)**: Principal Engineering Lead (incisive, composed, trade-offs focus).
* **0ms Gapless Conversational Audio**: Token-stream chunking and server-side LRU audio caching yield immediate, lifelike conversational latency (<350ms) with full barge-in and microphone interrupt capability.

---

### 4. Technical Architecture & System Highlights
* **Full-Stack Next.js 16 & React 19**: Server Components, edge routes, and real-time Server-Sent Events (SSE).
* **Monaco Code Editor & Cloud Sandbox**: In-browser code editing with real-time test execution via Judge0.
* **Computer Vision Proctoring**: Client-side face tracking and tab-switch detection to ensure test integrity.
* **Comprehensive Diagnostic Scorecard**: 6-metric benchmark (Technical Depth, Architecture, Problem Solving, Communication, Code Quality, Optimization) with personalized remediation roadmaps and matched hiring openings.

---

### 5. Impact & Vision
InterviewPilot democratizes elite engineering interview coaching for every student across Tier-1, Tier-2, and Tier-3 institutions in India. By fusing Gnani.ai's voice intelligence with rigorous full-stack evaluation, it empowers students to know they are placement-ready before meeting human hiring panels.
