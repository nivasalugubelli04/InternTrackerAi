const BACKEND_URL = 'http://localhost:3000/api';

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'extension_auth_connect') {
    fetch(`${BACKEND_URL}/v1/extension/auth/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.payload),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Authentication failed');
        return res.json();
      })
      .then((data) => {
        chrome.storage.local.set({ token: data.accessToken, user: data.user }, () => {
          sendResponse({ success: true, user: data.user });
        });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep channel open for async response
  }

  if (request.type === 'extension_auth_disconnect') {
    chrome.storage.local.remove(['token', 'user'], () => {
      sendResponse({ success: true });
    });
    return true;
  }

  // Handle all authenticated API proxy requests
  chrome.storage.local.get(['token'], (store) => {
    const token = store.token;
    if (!token) {
      sendResponse({ success: false, error: 'Unauthorized' });
      return;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    if (request.type === 'extension_create_session') {
      fetch(`${BACKEND_URL}/v1/extension/session`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request.payload),
      })
        .then((res) => res.json())
        .then((data) => sendResponse({ success: true, data }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
    } else if (request.type === 'extension_detect_fields') {
      fetch(`${BACKEND_URL}/v1/extension/detect`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request.payload),
      })
        .then((res) => res.json())
        .then((data) => sendResponse({ success: true, data }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
    } else if (request.type === 'extension_field_suggestions') {
      fetch(`${BACKEND_URL}/v1/extension/field-suggestions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request.payload),
      })
        .then((res) => res.json())
        .then((data) => sendResponse({ success: true, data }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
    } else if (request.type === 'extension_approve_field') {
      fetch(`${BACKEND_URL}/v1/extension/approve`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request.payload),
      })
        .then((res) => res.json())
        .then((data) => sendResponse({ success: true, data }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
    } else if (request.type === 'extension_fill_complete') {
      fetch(`${BACKEND_URL}/v1/extension/fill-complete`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request.payload),
      })
        .then((res) => res.json())
        .then((data) => sendResponse({ success: true, data }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
    } else if (request.type === 'extension_submission_confirmation') {
      fetch(`${BACKEND_URL}/v1/extension/submission-confirmation`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request.payload),
      })
        .then((res) => res.json())
        .then((data) => sendResponse({ success: true, data }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
    } else if (request.type === 'extension_get_settings') {
      fetch(`${BACKEND_URL}/v1/extension/settings`, {
        method: 'GET',
        headers,
      })
        .then((res) => res.json())
        .then((data) => sendResponse({ success: true, data }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
    }
  });

  return true; // Keep channel open for async response
});
