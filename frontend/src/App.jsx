import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  FileText,
  UploadCloud,
  Send,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Settings,
  ShieldCheck,
  AlertCircle,
  BookOpen,
  Sparkles,
  ChevronRight,
  X,
  FileCode,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Layers,
  Sliders,
  ExternalLink
} from 'lucide-react';
import './App.css';

const API_BASE = '/api';

export default function App() {
  const [sessionId, setSessionId] = useState(null);
  const [activeDocument, setActiveDocument] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [streamingPages, setStreamingPages] = useState([]);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Source upload state
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'paste'
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pastedTitle, setPastedTitle] = useState('');
  const [pastedText, setPastedText] = useState('');

  // Modals state
  const [showSettings, setShowSettings] = useState(false);
  const [showTestSuite, setShowTestSuite] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [config, setConfig] = useState({
    has_api_key: false,
    masked_key: '',
    model_name: 'gemini-3.5-flash-lite',
    temperature: 0.2,
    max_upload_size_mb: 20,
    system_prompt: ''
  });
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [tempInput, setTempInput] = useState(0.2);
  const [modelInput, setModelInput] = useState('gemini-3.5-flash-lite');

  // Test suite state
  const [testResults, setTestResults] = useState(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const messagesAreaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll chat to bottom strictly within the messages container
  const scrollToBottom = () => {
    if (messagesAreaRef.current) {
      messagesAreaRef.current.scrollTop = messagesAreaRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  // Initialize or restore session on mount
  useEffect(() => {
    initSession();
    fetchConfig();
  }, []);

  const initSession = async () => {
    try {
      const storedSession = localStorage.getItem('docu_session_id');
      if (storedSession) {
        setSessionId(storedSession);
        // Verify and fetch existing document and chat history
        const docRes = await fetch(`${API_BASE}/documents?session_id=${storedSession}`);
        if (docRes.ok) {
          const docData = await docRes.json();
          if (docData.document) {
            setActiveDocument(docData.document);
          }
        }
        const chatRes = await fetch(`${API_BASE}/chat/${storedSession}`);
        if (chatRes.ok) {
          const chatData = await chatRes.json();
          setMessages(chatData.messages || []);
        }
        return;
      }

      // Create new session
      await createNewSession();
    } catch (err) {
      console.error('Session init error:', err);
      createNewSession();
    }
  };

  const createNewSession = async () => {
    try {
      const res = await fetch(`${API_BASE}/session`, { method: 'POST' });
      const data = await res.json();
      setSessionId(data.session_id);
      localStorage.setItem('docu_session_id', data.session_id);
      setActiveDocument(null);
      setMessages([]);
      setError(null);
    } catch (err) {
      setError('Failed to establish session with backend.');
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/config`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setTempInput(data.temperature);
        setModelInput(data.model_name);
      }
    } catch (err) {
      console.error('Config fetch error:', err);
    }
  };

  // 1. Load Pre-packaged College Policy Handbook
  const handleLoadDefaultPolicy = async () => {
    if (!sessionId) return;
    setIsUploading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          load_default: true
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load policy handbook');
      }

      setActiveDocument(data.document);
      setMessages([]); // Clears old context (FR-5)
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // 2. Handle Custom File Upload (PDF, DOCX, TXT)
  const handleFileUpload = async (file) => {
    if (!file || !sessionId) return;
    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/documents`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload document');
      }

      setActiveDocument(data.document);
      setMessages([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 3. Handle Pasted Text Submission
  const handlePastedTextSubmit = async (e) => {
    e.preventDefault();
    if (!pastedText.trim() || !sessionId) return;

    setIsUploading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          title: pastedTitle.trim() || 'Pasted Document',
          text: pastedText.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process pasted text');
      }

      setActiveDocument(data.document);
      setMessages([]);
      setPastedText('');
      setPastedTitle('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // 4. Remove / Replace Document (FR-5)
  const handleRemoveDocument = async () => {
    if (!activeDocument) return;
    try {
      await fetch(`${API_BASE}/documents/${activeDocument.id}`, { method: 'DELETE' });
      setActiveDocument(null);
      setMessages([]);
    } catch (err) {
      console.error('Error removing document:', err);
    }
  };

  // 5. Send Question to Gemini Chat
  const handleSendMessage = async (customMessage = null) => {
    const questionText = (customMessage || inputMessage).trim();
    if (!questionText || isLoading || isStreaming || !sessionId) return;

    if (!activeDocument) {
      setError('Please upload or load a document first before asking questions.');
      return;
    }

    const optimisticUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: questionText,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimisticUserMsg]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);
    setStreamingText('');
    setStreamingPages([]);

    try {
      // Try streaming response (FR-16)
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          message: questionText,
          stream: true
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to get answer from chatbot');
      }

      // Check if streaming content type
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream')) {
        setIsStreaming(true);
        setIsLoading(false);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullAnswer = '';
        let finalPages = [];
        let finalPassages = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const chunkData = JSON.parse(line.substring(6));
                if (chunkData.token) {
                  fullAnswer += chunkData.token;
                  setStreamingText(fullAnswer);
                }
                if (chunkData.done) {
                  finalPages = chunkData.pages || [];
                  finalPassages = chunkData.passages || [];
                }
              } catch (parseErr) {
                console.error('SSE JSON parse error:', parseErr);
              }
            }
          }
        }

        // Add final assistant message
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: fullAnswer,
            cited_pages: finalPages,
            cited_passages: finalPassages,
            created_at: new Date().toISOString()
          }
        ]);
        setStreamingText('');
        setIsStreaming(false);
      } else {
        // Fallback standard JSON
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            id: data.id || `msg-${Date.now()}`,
            role: 'assistant',
            content: data.content,
            cited_pages: data.cited_pages || [],
            cited_passages: data.cited_passages || [],
            created_at: data.created_at || new Date().toISOString()
          }
        ]);
        setIsLoading(false);
      }
    } catch (err) {
      setError(err.message || 'Error communicating with assistant. Please try again.');
      setIsLoading(false);
      setIsStreaming(false);
      setStreamingText('');
    }
  };

  // Clear Chat History (FR-17)
  const handleClearChat = async () => {
    if (!sessionId) return;
    try {
      await fetch(`${API_BASE}/chat/${sessionId}`, { method: 'DELETE' });
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear chat:', err);
    }
  };

  // Copy Answer
  const handleCopyMessage = (id, content) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Save Settings
  const handleSaveSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKeyInput,
          model_name: modelInput,
          temperature: parseFloat(tempInput)
        })
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setShowSettings(false);
      }
    } catch (err) {
      console.error('Settings save error:', err);
    }
  };

  // Run SRS Acceptance Tests
  const handleRunAcceptanceTests = async () => {
    setIsRunningTests(true);
    setTestResults(null);
    try {
      const res = await fetch(`${API_BASE}/test-suite`, { method: 'POST' });
      const data = await res.json();
      setTestResults(data);
    } catch (err) {
      console.error('Test suite run error:', err);
    } finally {
      setIsRunningTests(false);
    }
  };

  // Dynamic Suggestion Prompts for ANY document
  const getSuggestionPrompts = () => {
    if (!activeDocument) return [];
    if (activeDocument.is_default_policy) {
      return [
        {
          title: 'Summarize Policy Handbook',
          subtitle: 'Complete document overview (T-2)',
          query: 'Summarize the whole document'
        },
        {
          title: 'Attendance Requirements',
          subtitle: 'Exam eligibility & condonation (T-1)',
          query: 'What is the minimum attendance required to appear for end-semester examinations?'
        },
        {
          title: 'Refund Schedule',
          subtitle: 'UGC-aligned withdrawal refund (T-1)',
          query: 'What is the refund schedule if a student withdraws or cancels admission?'
        },
        {
          title: 'Placement Upgrade Rule',
          subtitle: 'One-offer-and-upgrade policy (T-3)',
          query: 'Explain the one-offer-and-upgrade placement rule'
        },
        {
          title: 'Anti-Ragging Penalties',
          subtitle: 'Zero tolerance measures (T-4)',
          query: 'Give me the exact text of Section 7 on Anti-Ragging and its penalties'
        },
        {
          title: 'Caution Deposit',
          subtitle: 'Amount and return timeline (T-7)',
          query: 'What is the caution deposit amount and when is it returned?'
        }
      ];
    }
    // Dynamic prompts for ANY custom uploaded document (PDF, DOCX, TXT)
    return [
      {
        title: 'Summarize This Document',
        subtitle: `Overview of ${activeDocument.filename} & core highlights`,
        query: 'Summarize the whole document'
      },
      {
        title: 'Table of Contents & Outline',
        subtitle: 'Detect and list all sections with page numbers',
        query: 'List all sections and table of contents in this document'
      },
      {
        title: 'Key Rules & Requirements',
        subtitle: 'Extract the most important rules, terms or policies',
        query: 'What are the main rules, requirements, or key points in this document?'
      },
      {
        title: 'Explain Primary Guidelines',
        subtitle: 'In-depth explanation of core sections',
        query: 'Explain the primary guidelines and purpose of this document in detail'
      },
      {
        title: 'Verbatim Passage Extraction',
        subtitle: 'Quote key excerpts directly with page numbers',
        query: 'Quote the opening passage or main conclusion verbatim with page citations'
      },
      {
        title: 'Document Scope & Audience',
        subtitle: 'Who does this document apply to?',
        query: 'What is the scope of this document and who is it intended for?'
      }
    ];
  };

  return (
    <div className="app-container">
      {/* 1. Header */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">
            <BookOpen size={20} />
          </div>
          <div className="brand-info">
            <h1>
              DocuRAG <span className="brand-badge">Gemini RAG</span>
            </h1>
            <p>
              {activeDocument
                ? `Active Document: ${activeDocument.filename}`
                : 'Document Q&A & Policy Handbook Chatbot'}
            </p>
          </div>
        </div>

        <div className="header-actions">
          <button
            className={`btn-header ${sidebarOpen ? 'primary' : ''}`}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle Source Document Panel"
          >
            <Layers size={15} />
            <span>{sidebarOpen ? 'Hide Source' : 'Show Source'}</span>
          </button>

          <button
            className="btn-header"
            onClick={() => {
              setShowTestSuite(true);
              if (!testResults) handleRunAcceptanceTests();
            }}
            title="Execute SRS Section 9.1 Acceptance Tests"
          >
            <ShieldCheck size={16} color="#10b981" />
            <span>SRS Acceptance Tests</span>
          </button>

          <button
            className="btn-header"
            onClick={() => setShowSettings(true)}
            title="Configure Gemini Model & API Settings"
          >
            <Settings size={16} />
            <span>Settings</span>
          </button>

          <button
            className="btn-header"
            onClick={createNewSession}
            title="Start fresh session"
          >
            <RefreshCw size={15} />
            <span>New Session</span>
          </button>
        </div>
      </header>

      {/* 2. Main Body: Left Source Panel & Right Chat Panel */}
      <main className="app-main">
        {/* LEFT PANEL: Knowledge Source Management */}
        <section className={`source-panel ${sidebarOpen ? 'open' : 'closed'}`} aria-label="Document Knowledge Source Panel">
          <div className="panel-section-title">
            <span>Knowledge Source</span>
            {activeDocument && <span className="active-badge"><Check size={12} /> Loaded</span>}
          </div>

          {/* Pre-fed College Policy Card */}
          <div className="policy-card">
            <div className="policy-card-header">
              <div className="policy-card-icon">
                <BookOpen size={18} />
              </div>
              <div>
                <h3 className="policy-card-title">College Policy Handbook</h3>
                <p className="policy-card-sub">Academic Year 2026-27 • 12 Pages</p>
              </div>
            </div>

            <div className="policy-tags">
              <span className="policy-tag">Admissions</span>
              <span className="policy-tag">Academics</span>
              <span className="policy-tag">Attendance</span>
              <span className="policy-tag">Placements</span>
              <span className="policy-tag">Anti-Ragging</span>
              <span className="policy-tag">Refunds</span>
            </div>

            <button
              className="btn-load-policy"
              onClick={handleLoadDefaultPolicy}
              disabled={isUploading || (activeDocument && activeDocument.is_default_policy)}
            >
              {isUploading ? (
                <>
                  <RefreshCw size={14} className="spin" />
                  <span>Indexing Document...</span>
                </>
              ) : activeDocument && activeDocument.is_default_policy ? (
                <>
                  <CheckCircle2 size={15} />
                  <span>Handbook Loaded for RAG</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>Feed College Policy PDF for RAG</span>
                </>
              )}
            </button>
          </div>

          {/* Active Document Details (FR-4) */}
          {activeDocument ? (
            <div className="active-doc-card">
              <div className="active-doc-header">
                <span className="panel-section-title">Active Knowledge Source</span>
                <span className="active-badge">
                  <CheckCircle2 size={12} /> RAG Ready
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <FileText size={22} color="#818cf8" />
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {activeDocument.filename}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    {activeDocument.file_type.toUpperCase()} • {Math.round(activeDocument.file_size / 1024)} KB
                  </div>
                </div>
              </div>

              <div className="doc-info-grid">
                <div className="doc-stat">
                  <span className="doc-stat-label">Pages</span>
                  <span className="doc-stat-value">{activeDocument.page_count}</span>
                </div>
                <div className="doc-stat">
                  <span className="doc-stat-label">RAG Chunks</span>
                  <span className="doc-stat-value">{activeDocument.chunk_count}</span>
                </div>
              </div>

              <div className="active-doc-actions">
                <button
                  type="button"
                  className="btn-action-pill"
                  onClick={() => handleSendMessage('Summarize the whole document')}
                  title="Generate structured summary of this document"
                >
                  <BookOpen size={12} /> Summarize
                </button>
                <button
                  type="button"
                  className="btn-action-pill"
                  onClick={() => handleSendMessage('List all sections and table of contents in this document')}
                  title="List all sections and chapters"
                >
                  <Layers size={12} /> Outline
                </button>
              </div>

              <button
                className="btn-remove-doc"
                onClick={handleRemoveDocument}
                title="Remove source document and clear chat history (FR-5)"
              >
                <Trash2 size={14} />
                <span>Remove Source & Clear Context</span>
              </button>
            </div>
          ) : (
            /* Upload or Paste Document Tabs (FR-1, FR-2) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="input-tabs">
                <button
                  className={`input-tab ${activeTab === 'upload' ? 'active' : ''}`}
                  onClick={() => setActiveTab('upload')}
                >
                  Upload File
                </button>
                <button
                  className={`input-tab ${activeTab === 'paste' ? 'active' : ''}`}
                  onClick={() => setActiveTab('paste')}
                >
                  Paste Text
                </button>
              </div>

              {activeTab === 'upload' ? (
                <div
                  className={`dropzone ${isDragging ? 'drag-active' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                    }}
                  />
                  <div className="dropzone-icon">
                    <UploadCloud size={24} />
                  </div>
                  <div className="dropzone-text">
                    <strong>Click to upload</strong> or drag & drop
                  </div>
                  <div className="dropzone-subtext">
                    PDF, DOCX, TXT (Max 20 MB)
                  </div>
                </div>
              ) : (
                <form className="paste-container" onSubmit={handlePastedTextSubmit}>
                  <input
                    type="text"
                    className="paste-title-input"
                    placeholder="Document Title (e.g. Lab Safety Rules)"
                    value={pastedTitle}
                    onChange={(e) => setPastedTitle(e.target.value)}
                  />
                  <textarea
                    className="paste-textarea"
                    placeholder="Paste plain text document content here..."
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="btn-load-policy"
                    disabled={isUploading || !pastedText.trim()}
                  >
                    Load Pasted Document
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Section 5 Grounding Notice */}
          <div className="guardrail-note">
            <ShieldCheck size={18} color="#6366f1" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Strict Grounding Enforcement:</strong> Gemini is constrained by the Appendix A system prompt to answer ONLY from the loaded document. Questions outside the source are politely declined.
            </div>
          </div>
        </section>

        {/* RIGHT PANEL: Chat Workspace */}
        <section className="chat-panel" aria-label="Interactive Chatbot Conversation">
          {/* Grounding Banner */}
          <div className="chat-banner">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={14} color="#10b981" />
              <span>Grounded Mode: Model answers strictly from current source</span>
            </span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Model: {config.model_name} • Temp: {config.temperature}
            </span>
          </div>

          {/* Quick Actions Bar for ANY Loaded Document */}
          {activeDocument && (
            <div className="chat-quick-actions-bar">
              <span className="quick-actions-label">Actions:</span>
              <button
                type="button"
                className="quick-action-chip"
                onClick={() => handleSendMessage('Summarize the whole document')}
                title="Generate structured summary of this document"
              >
                📝 Summarize Document
              </button>
              <button
                type="button"
                className="quick-action-chip"
                onClick={() => handleSendMessage('List all sections and table of contents in this document')}
                title="Extract outline and all sections"
              >
                📑 Table of Contents
              </button>
              <button
                type="button"
                className="quick-action-chip"
                onClick={() => handleSendMessage('What are the main rules, requirements, or key points in this document?')}
                title="Extract key points"
              >
                💡 Key Points
              </button>
              <button
                type="button"
                className="quick-action-chip"
                onClick={() => handleSendMessage('Explain the primary guidelines and purpose of this document in detail')}
                title="Explain core guidelines"
              >
                🔍 Explain
              </button>
              <button
                type="button"
                className="quick-action-chip"
                onClick={() => handleSendMessage('Quote the opening passage or main conclusion verbatim with page citations')}
                title="Extract verbatim quote"
              >
                📜 Quote
              </button>
            </div>
          )}

          {/* Messages Area */}
          <div className="messages-area" ref={messagesAreaRef}>
            {messages.length === 0 && !streamingText ? (
              <div className="empty-chat-state">
                <div className="empty-icon">
                  <Sparkles size={32} />
                </div>
                <h2 className="empty-title">
                  {activeDocument ? `Ask anything about ${activeDocument.filename}` : 'No Document Loaded Yet'}
                </h2>
                <p className="empty-desc">
                  {activeDocument
                    ? `The chatbot has indexed "${activeDocument.filename}" into ${activeDocument.chunk_count} RAG chunks. Click any action below or type your question.`
                    : 'Click "Feed College Policy PDF for RAG", upload any PDF/DOCX/TXT file, or paste text to begin.'}
                </p>

                {activeDocument && (
                  <div className="suggestions-grid">
                    {getSuggestionPrompts().map((item, idx) => (
                      <button
                        key={idx}
                        className="suggestion-btn"
                        onClick={() => handleSendMessage(item.query)}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: '#fff' }}>{item.title}</div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{item.subtitle}</div>
                        </div>
                        <ChevronRight size={16} color="#818cf8" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`message-row ${msg.role}`}>
                  <div className={`avatar ${msg.role}`}>
                    {msg.role === 'user' ? 'U' : <Sparkles size={16} />}
                  </div>
                  <div className="message-content-wrapper">
                    <div className="message-bubble">
                      <div className="markdown-body">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    </div>

                    <div className="message-footer">
                      {msg.role === 'assistant' && (
                        <>
                          <div className="citation-tags">
                            {msg.cited_pages && msg.cited_pages.length > 0 ? (
                              msg.cited_pages.map((p, idx) => (
                                <span key={idx} className="citation-tag">
                                  <Layers size={10} /> Page {p}
                                </span>
                              ))
                            ) : (
                              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Passage Retrieval Grounded</span>
                            )}
                          </div>

                          <button
                            className="btn-copy"
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            title="Copy answer to clipboard (FR-17)"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check size={12} color="#34d399" />
                                <span style={{ color: '#34d399' }}>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Live Streaming Message Display (FR-16) */}
            {isStreaming && (
              <div className="message-row assistant">
                <div className="avatar assistant">
                  <Sparkles size={16} />
                </div>
                <div className="message-content-wrapper">
                  <div className="message-bubble">
                    <div className="markdown-body">
                      <ReactMarkdown>{streamingText}</ReactMarkdown>
                      <span className="cursor-blink"></span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && !isStreaming && (
              <div className="message-row assistant">
                <div className="avatar assistant">
                  <RefreshCw size={14} className="spin" />
                </div>
                <div className="message-bubble" style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  Retrieving passages and generating grounded answer...
                </div>
              </div>
            )}

            {/* Error Banner with Retry (FR-18) */}
            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                color: '#f87171',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
                <button
                  onClick={() => setError(null)}
                  style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar (FR-19: Disabled when no source loaded) */}
          <div className="chat-input-bar">
            <div className={`input-container ${!activeDocument ? 'disabled' : ''}`}>
              <input
                type="text"
                className="chat-input"
                placeholder={
                  activeDocument
                    ? `Ask anything about ${activeDocument.filename}...`
                    : 'Please load a document or the Policy Handbook to enable chat (FR-19)'
                }
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={!activeDocument || isLoading || isStreaming}
              />
              <button
                className="btn-send"
                onClick={() => handleSendMessage()}
                disabled={!activeDocument || !inputMessage.trim() || isLoading || isStreaming}
                title="Send message (Enter)"
              >
                <Send size={16} />
              </button>
            </div>

            <div className="input-helper">
              <span>Press Enter to send. Strictly answers from loaded document.</span>
              {messages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.72rem' }}
                >
                  Clear Chat History
                </button>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* MODAL 1: Settings & Config (FR-20) */}
      {showSettings && (
        <div className="modal-backdrop" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <Sliders size={18} color="#6366f1" />
                <span>Chatbot & Gemini Settings (FR-20)</span>
              </div>
              <button className="btn-close-modal" onClick={() => setShowSettings(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Google Gemini API Key</label>
                <div className="form-desc">
                  Stored securely on the backend server. Leave empty to use the built-in Grounded RAG reasoning engine.
                </div>
                <input
                  type="password"
                  className="form-input"
                  placeholder={config.has_api_key ? `Configured (${config.masked_key})` : 'Enter GEMINI_API_KEY...'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Gemini Model (AI-1)</label>
                <select
                  className="form-select"
                  value={modelInput}
                  onChange={(e) => setModelInput(e.target.value)}
                >
                  <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite (Active - From settings.py)</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Temperature: <strong>{tempInput}</strong> (AI-11: 0.0 to 0.3)
                </label>
                <div className="form-desc">
                  Low temperature reduces invented content and maximizes grounding in the source document.
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.3"
                  step="0.05"
                  value={tempInput}
                  onChange={(e) => setTempInput(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Fixed System Prompt (Appendix A)</label>
                <div className="form-desc">
                  Enforced on the server for all requests. Protected against prompt injection (AI-9, AI-10).
                </div>
                <textarea
                  readOnly
                  className="form-input"
                  style={{ height: '110px', fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}
                  value={config.system_prompt}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-header" onClick={() => setShowSettings(false)}>
                Cancel
              </button>
              <button className="btn-header primary" onClick={handleSaveSettings}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SRS Section 9.1 Acceptance Tests Runner */}
      {showTestSuite && (
        <div className="modal-backdrop" onClick={() => setShowTestSuite(false)}>
          <div className="modal-content" style={{ maxWidth: '820px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <ShieldCheck size={20} color="#10b981" />
                <span>SRS Acceptance Test Suite (Section 9.1)</span>
              </div>
              <button className="btn-close-modal" onClick={() => setShowTestSuite(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h4 style={{ color: '#fff', fontSize: '0.95rem' }}>Automated Verification (T-1 to T-13)</h4>
                  <p style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                    Runs all test cases from the SRS against the College Policy Handbook document.
                  </p>
                </div>
                <button
                  className="btn-header primary"
                  onClick={handleRunAcceptanceTests}
                  disabled={isRunningTests}
                >
                  {isRunningTests ? (
                    <>
                      <RefreshCw size={14} className="spin" />
                      <span>Executing Tests...</span>
                    </>
                  ) : (
                    <span>Run All Tests</span>
                  )}
                </button>
              </div>

              {testResults && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  background: testResults.all_passed ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  border: `1px solid ${testResults.all_passed ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  color: testResults.all_passed ? '#34d399' : '#f87171',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  {testResults.all_passed ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                  <span>{testResults.summary} — Full Compliance Verified</span>
                </div>
              )}

              {testResults && (
                <div style={{ overflowX: 'auto', maxHeight: '420px' }}>
                  <table className="test-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Scenario</th>
                        <th>Expected Result</th>
                        <th>Actual Output</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testResults.tests.map((t) => (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 700, color: '#fff' }}>{t.id}</td>
                          <td>{t.scenario}</td>
                          <td style={{ color: '#cbd5e1' }}>{t.expected}</td>
                          <td style={{ color: '#94a3b8', fontSize: '0.74rem' }}>{t.actual}</td>
                          <td>
                            <span className={t.passed ? 'badge-pass' : 'badge-fail'}>
                              {t.passed ? 'PASS' : 'FAIL'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-header" onClick={() => setShowTestSuite(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
