import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

function Popup() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Assistant State
  const [pageDetected, setPageDetected] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [recommendedResume, setRecommendedResume] = useState<any>(null);
  const [checklist, setChecklist] = useState<any>(null);
  const [readinessScore, setReadinessScore] = useState(0);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // AI draft states
  const [draftingFieldId, setDraftingFieldId] = useState<string | null>(null);

  useEffect(() => {
    chrome.storage.local.get(['token', 'user'], (store) => {
      if (store.token) {
        setToken(store.token);
        setUser(store.user);
      }
    });
  }, []);

  const handleConnect = () => {
    if (!email || !password) {
      setError('Please fill in email and password');
      return;
    }
    setLoading(true);
    setError(null);

    chrome.runtime.sendMessage(
      { type: 'extension_auth_connect', payload: { email, password } },
      (res) => {
        setLoading(false);
        if (res.success) {
          setToken('authenticated'); // Trigger state update
          setUser(res.user);
        } else {
          setError(res.error || 'Connection failed. Check credentials.');
        }
      }
    );
  };

  const handleDisconnect = () => {
    chrome.runtime.sendMessage({ type: 'extension_auth_disconnect' }, () => {
      setToken(null);
      setUser(null);
      setPageDetected(false);
      setSuggestions([]);
      setSession(null);
      setAlreadyApplied(false);
      setSubmitted(false);
    });
  };

  const handleScanPage = () => {
    setLoading(true);
    setError(null);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id) {
        setLoading(false);
        setError('No active tab found');
        return;
      }

      // 1. Send scan request to content script
      chrome.tabs.sendMessage(activeTab.id, { type: 'content_scan_page' }, (res) => {
        if (!res || !res.success) {
          setLoading(false);
          setError('Please reload the page and try again.');
          return;
        }

        // 2. Create assist session in backend
        chrome.runtime.sendMessage(
          {
            type: 'extension_create_session',
            payload: { url: res.url, jobId: null }, // Optional jobId
          },
          (sessionRes) => {
            if (!sessionRes || !sessionRes.success) {
              setLoading(false);
              setError(sessionRes?.error || 'Failed to initialize session');
              return;
            }

            const sessionData = sessionRes.data.session;
            setSession(sessionData);
            setAlreadyApplied(sessionRes.data.alreadyApplied);

            // 3. Analyze detected fields with backend mapping
            chrome.runtime.sendMessage(
              {
                type: 'extension_detect_fields',
                payload: {
                  sessionId: sessionData.id,
                  fields: res.fields,
                },
              },
              (detectRes) => {
                setLoading(false);
                if (detectRes && detectRes.success) {
                  setPageDetected(true);
                  setSuggestions(detectRes.data.suggestions);
                  setRecommendedResume(detectRes.data.recommendedResume);
                  setChecklist(detectRes.data.checklist);
                  setReadinessScore(detectRes.data.readinessScore);
                } else {
                  setError(detectRes?.error || 'Field analysis failed');
                }
              }
            );
          }
        );
      });
    });
  };

  const handleApproveField = (fieldId: string, value: string) => {
    chrome.runtime.sendMessage({
      type: 'extension_approve_field',
      payload: { sessionId: session.id, fieldId, value },
    });

    setSuggestions((prev) =>
      prev.map((s) => (s.id === fieldId ? { ...s, status: 'APPROVED', approvedVal: value } : s))
    );
  };

  const handleDraftAI = (fieldId: string, label: string) => {
    setDraftingFieldId(fieldId);
    chrome.runtime.sendMessage(
      {
        type: 'extension_field_suggestions',
        payload: {
          sessionId: session.id,
          fieldId,
          questionText: label,
        },
      },
      (res) => {
        setDraftingFieldId(null);
        if (res && res.success) {
          setSuggestions((prev) =>
            prev.map((s) => (s.id === fieldId ? { ...s, suggestedVal: res.data.draftText } : s))
          );
        } else {
          setError(res?.error || 'AI draft generation failed');
        }
      }
    );
  };

  const handleAutofill = () => {
    setLoading(true);
    const approvedFields = suggestions
      .filter((s) => s.status === 'APPROVED' || (s.suggestedVal && s.status !== 'MANUAL_REQUIRED'))
      .map((s) => ({
        selector: s.selector || `input[name="${s.fieldName}"]`,
        value: s.approvedVal || s.suggestedVal || '',
      }));

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && activeTab.id) {
        chrome.tabs.sendMessage(
          activeTab.id,
          { type: 'content_fill_fields', payload: { fields: approvedFields } },
          (res) => {
            setLoading(false);
            if (res && res.success) {
              chrome.runtime.sendMessage({
                type: 'extension_fill_complete',
                payload: { sessionId: session.id, fieldsFilled: approvedFields },
              });
            } else {
              setError('Failed to fill form inputs');
            }
          }
        );
      }
    });
  };

  const handleConfirmSubmission = () => {
    chrome.runtime.sendMessage(
      {
        type: 'extension_submission_confirmation',
        payload: { sessionId: session.id, jobId: session.jobId },
      },
      (res) => {
        if (res && res.success) {
          setSubmitted(true);
        } else {
          setError(res?.error || 'Submission confirmation failed');
        }
      }
    );
  };

  if (!token) {
    return (
      <div className="container">
        <div>
          <div className="header">
            <span className="logo-text">INTERNTRACKER AI</span>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Extension</span>
          </div>
          <div className="card">
            <h3 className="card-title">Connect Account</h3>
            {error && <div style={{ color: 'red', fontSize: '11px', marginBottom: '8px' }}>{error}</div>}
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@gmail.com"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button className="btn" onClick={handleConnect} disabled={loading}>
              {loading ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </div>
        <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-secondary)' }}>
          Assists you in filling forms. Does not submit automatically.
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ overflowY: 'auto' }}>
      <div>
        <div className="header">
          <span className="logo-text">ASSISTANT</span>
          <button className="btn btn-secondary" style={{ width: 'auto', padding: '4px 8px', fontSize: '11px' }} onClick={handleDisconnect}>
            Disconnect
          </button>
        </div>

        {error && <div style={{ color: 'red', fontSize: '11px', marginBottom: '8px' }}>{error}</div>}

        {!pageDetected ? (
          <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Navigate to an internship application form page to begin.
            </p>
            <button className="btn" onClick={handleScanPage} disabled={loading}>
              {loading ? 'Scanning page...' : 'Scan & Analyze Form'}
            </button>
          </div>
        ) : (
          <div>
            {alreadyApplied && (
              <div className="card" style={{ border: '1px solid var(--warning-color)', background: 'rgba(245,158,11,0.05)' }}>
                <div style={{ fontSize: '12px', color: 'var(--warning-color)', fontWeight: 'bold' }}>
                  Already Applied
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  You have already logged an application to this company.
                </div>
              </div>
            )}

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span>Application Readiness</span>
                <span style={{ fontWeight: 'bold', color: 'var(--accent-color)' }}>{readinessScore}%</span>
              </div>
              <div className="readiness-bar-container">
                <div className="readiness-bar" style={{ width: `${readinessScore}%` }}></div>
              </div>

              {checklist && (
                <div style={{ marginTop: '12px' }}>
                  <div className="checklist-item">
                    <span className={`checklist-icon ${checklist.resumeSelected ? 'icon-checked' : 'icon-pending'}`}>
                      {checklist.resumeSelected ? '✓' : '⚠'}
                    </span>
                    <span>Resume recommendation loaded</span>
                  </div>
                  <div className="checklist-item">
                    <span className={`checklist-icon ${checklist.emailVerified ? 'icon-checked' : 'icon-pending'}`}>
                      {checklist.emailVerified ? '✓' : '⚠'}
                    </span>
                    <span>Profile verified (Email & Details)</span>
                  </div>
                  {checklist.workAuthManual && (
                    <div className="checklist-item">
                      <span className="checklist-icon icon-pending">⚠</span>
                      <span style={{ color: 'var(--warning-color)' }}>Sensitive work-auth questions flagged</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {recommendedResume && (
              <div className="card">
                <h4 className="card-title" style={{ marginBottom: '4px' }}>Recommended Resume</h4>
                <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{recommendedResume.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {recommendedResume.reason}
                </div>
              </div>
            )}

            <div className="card">
              <h4 className="card-title">Field Approvals</h4>
              <div className="scroll-area">
                {suggestions.map((s) => (
                  <div key={s.id} className="field-suggestion">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontWeight: 'bold' }}>{s.fieldName}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                        {s.status === 'MANUAL_REQUIRED' ? 'Manual response required' : s.suggestedVal || 'Empty'}
                      </span>
                    </div>
                    <div>
                      {s.status === 'MANUAL_REQUIRED' ? (
                        <span className="tag tag-sensitive">Sensitive</span>
                      ) : s.status === 'APPROVED' ? (
                        <span style={{ color: 'var(--success-color)' }}>✓ Ready</span>
                      ) : (
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          {s.fieldName.toLowerCase().includes('why') || s.fieldName.toLowerCase().includes('cover') ? (
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '2px 6px', fontSize: '10px', width: 'auto' }}
                              onClick={() => handleDraftAI(s.id, s.fieldName)}
                              disabled={draftingFieldId === s.id}
                            >
                              {draftingFieldId === s.id ? 'Drafting...' : 'AI Draft'}
                            </button>
                          ) : null}
                          <button
                            className="btn"
                            style={{ padding: '2px 8px', fontSize: '10px', width: 'auto' }}
                            onClick={() => handleApproveField(s.id, s.suggestedVal || '')}
                          >
                            Approve
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button className="btn" onClick={handleAutofill} disabled={loading}>
                Fill Approved Fields
              </button>
            </div>

            {pageDetected && !submitted && (
              <div className="card" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid var(--success-color)' }}>
                <p style={{ fontSize: '12px', margin: '0 0 12px 0' }}>Did you submit this application manually?</p>
                <button className="btn" style={{ background: 'var(--success-color)' }} onClick={handleConfirmSubmission}>
                  Yes, Log Application
                </button>
              </div>
            )}

            {submitted && (
              <div className="card" style={{ background: 'rgba(16,185,129,0.1)', textAlign: 'center' }}>
                <span style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>✓ Application Saved to Tracker!</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}
export default Popup;
