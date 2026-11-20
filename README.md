# DocuRAG — College Policy & Document Q&A Chatbot

A web-based Document Q&A Chatbot built with **Django** (backend) and **React** (frontend), adhering to the **Software Requirements Specification (SRS)** and powered by the **Google Gemini API** with **Retrieval-Augmented Generation (RAG)**.

---

## 🏛 Features

1. **Pre-Fed College Policy PDF for RAG**:
   - Built-in 12-page **Sri Venkateswara College of Engineering Policy Handbook (Academic Year 2026-27)**.
   - One-click loading and indexing into 43 overlapping RAG chunks with page numbers and section headings.
2. **Strict Grounding & System Prompt Enforcement**:
   - Model is governed by the server-side, unalterable **Appendix A System Prompt**:
     - Answers strictly grounded within `<document>` tags.
     - Verbatim quotes with exact page and section citations.
     - Polite refusals when information is missing: *"I couldn't find that in the document you uploaded."*
     - Rejection of unrelated questions (coding, general knowledge, etc.).
     - Prompt injection immunity (ignores "ignore previous instructions" or prompt reveal requests).
3. **Full SRS API Endpoints (Section 8.2)**:
   - `POST /api/session`: Create chat session
   - `POST /api/documents`: Upload PDF, DOCX, TXT or submit pasted plain text; or load default College Policy PDF
   - `DELETE /api/documents/{id}`: Remove source and clear chat context
   - `POST /api/chat`: Grounded chat with streaming (SSE) support and citation tracking
   - `GET /api/chat/{session_id}`: Retrieve conversation history
   - `DELETE /api/chat/{session_id}`: Clear conversation history
   - `DELETE /api/session/{id}`: End session and wipe data
   - `GET /api/config` & `POST /api/config`: Admin configuration for model name, temperature, upload limits, and API keys
   - `POST /api/test-suite`: Automated execution of SRS Acceptance Tests (T-1 to T-13)
4. **Interactive React UI**:
   - Source Panel: Drag-and-drop file upload, paste box, College Policy quick-feed card, document metadata badges (size, pages, chunk count).
   - Chat Panel: Multi-turn message history, markdown rendering, clickable citation badges (`[Page 5]`, `[Page 8]`), one-click copy button, streaming typing indicator, prompt suggestion chips.
   - Settings Modal: Configure `GEMINI_API_KEY`, model selection (`gemini-2.5-flash`, `gemini-1.5-flash`), temperature slider (0.0 – 0.3).
   - Built-in Acceptance Test Runner: Live runner for T-1 to T-13 with 100% pass rate.

---

## 🚀 How to Run

### Option 1: Unified Server (Django serves both API and React SPA)
1. Run the Django development server:
   ```powershell
   python manage.py runserver 8000
   ```
2. Open your browser and navigate to:
   ```
   http://127.0.0.1:8000/
   ```

### Option 2: Full Development Mode (Vite Hot-Reloading + Django API)
1. Start Django on port 8000:
   ```powershell
   python manage.py runserver 8000
   ```
2. In a second terminal, start the React Vite dev server:
   ```powershell
   cd frontend
   npm run dev
   ```
3. Open `http://localhost:5173/` in your browser.

---

## 🧪 Acceptance Test Suite (SRS Section 9.1)

Run the backend acceptance verification:
```powershell
python test_backend.py
```
Or open the web app, click **"SRS Acceptance Tests"** in the top navigation bar, and run all 13 tests interactively!
