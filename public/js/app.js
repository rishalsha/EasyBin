let ws = null;
let currentCode = null;
let saveTimeout = null;

const statusBadge = document.getElementById('status-badge');
const saveStatus = document.getElementById('save-status');
const editor = document.getElementById('editor');
const binCodeDisplay = document.getElementById('current-bin-code');
const curlExample = document.getElementById('curl-example');

const homeView = document.getElementById('home-view');
const editorView = document.getElementById('editor-view');

// Check the URL path to load the correct view/bin
function checkRoute() {
  const path = window.location.pathname;
  const match = path.match(/^\/([a-z0-9]{6})$/i);

  if (match) {
    currentCode = match[1].toLowerCase();
    showEditorView();
    connectWebSocket();
  } else {
    showHomeView();
  }
}

function showHomeView() {
  homeView.classList.add('active');
  editorView.classList.remove('active');
}

function showEditorView() {
  homeView.classList.remove('active');
  editorView.classList.add('active');
  binCodeDisplay.textContent = currentCode;
  
  // Set up dynamic curl example snippet
  const origin = window.location.origin;
  curlExample.textContent = `curl -X POST -d "your content" ${origin}/${currentCode}`;
}

function goHome() {
  if (ws) {
    ws.close();
  }
  currentCode = null;
  window.history.pushState({}, '', '/');
  showHomeView();
}

async function createNewBin() {
  try {
    const res = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '' })
    });
    const data = await res.json();
    currentCode = data.code;
    window.history.pushState({}, '', `/${currentCode}`);
    showEditorView();
    connectWebSocket();
  } catch (err) {
    console.error(err);
    alert('Failed to create bin. Is the server running?');
  }
}

function accessBin() {
  const input = document.getElementById('bin-code-input').value.trim().toLowerCase();
  if (input.length !== 6 || !/^[a-z0-9]+$/.test(input)) {
    alert('Please enter a valid 6-character alphanumeric code.');
    return;
  }
  currentCode = input;
  window.history.pushState({}, '', `/${currentCode}`);
  showEditorView();
  connectWebSocket();
}

// WS client implementation
function connectWebSocket() {
  if (ws) {
    ws.close();
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  
  statusBadge.className = 'badge disconnected';
  statusBadge.textContent = '● Connecting...';
  
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    statusBadge.className = 'badge connected';
    statusBadge.textContent = '● Live Syncing';
    
    // Join room
    ws.send(JSON.stringify({
      type: 'join',
      code: currentCode
    }));
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'init') {
        editor.value = data.content;
        saveStatus.textContent = 'Saved';
        saveStatus.className = 'save-status';
      }
      
      if (data.type === 'update') {
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        editor.value = data.content;
        // Keep selection range
        editor.setSelectionRange(start, end);
        
        saveStatus.textContent = 'Updated';
        saveStatus.className = 'save-status';
      }

      if (data.type === 'error') {
        console.error('Server error:', data.message);
      }
    } catch (e) {
      console.error('Error handling WebSocket message:', e);
    }
  };

  ws.onclose = () => {
    statusBadge.className = 'badge disconnected';
    statusBadge.textContent = '● Disconnected';
    // Reconnect in 3 seconds if we're still viewing a bin
    if (currentCode) {
      setTimeout(connectWebSocket, 3000);
    }
  };
}

// Handle Editor Input with Debouncing
editor.addEventListener('input', () => {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  saveStatus.textContent = 'Saving...';
  saveStatus.className = 'save-status saving';

  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    ws.send(JSON.stringify({
      type: 'edit',
      content: editor.value
    }));
    saveStatus.textContent = 'Saved';
    saveStatus.className = 'save-status';
  }, 400); // 400ms debounce
});

// Clipboard / copy functions
function copyBinLink() {
  const url = window.location.href;
  navigator.clipboard.writeText(url)
    .then(() => alert('Bin URL copied to clipboard!'))
    .catch(err => console.error('Error copying URL:', err));
}

function copyBinCode() {
  if (!currentCode) return;
  navigator.clipboard.writeText(currentCode)
    .then(() => alert('Bin code copied to clipboard!'))
    .catch(err => console.error('Error copying bin code:', err));
}

function copyBinContent() {
  navigator.clipboard.writeText(editor.value)
    .then(() => alert('Content copied to clipboard!'))
    .catch(err => console.error('Error copying content:', err));
}

function copyCurlExample() {
  navigator.clipboard.writeText(curlExample.textContent)
    .then(() => alert('Curl command copied to clipboard!'))
    .catch(err => console.error('Error copying curl command:', err));
}

// Handle browser navigation
window.onpopstate = checkRoute;

// Initialize
checkRoute();
