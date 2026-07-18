let currentCode = null;
let saveTimeout = null;

const statusBadge = document.getElementById('status-badge');
const saveStatus = document.getElementById('save-status');
const editor = document.getElementById('editor');
const binCodeDisplay = document.getElementById('current-bin-code');

const homeView = document.getElementById('home-view');
const editorView = document.getElementById('editor-view');

// Check the URL path to load the correct view/bin
function checkRoute() {
  const path = window.location.pathname;
  const match = path.match(/^\/([a-z0-9]{6})$/i);

  if (match) {
    currentCode = match[1].toLowerCase();
    showEditorView();
    loadBinContent(currentCode);
  } else {
    showHomeView();
  }
}

function showHomeView() {
  homeView.classList.add('active');
  editorView.classList.remove('active');
  if (statusBadge) {
    statusBadge.className = 'badge connected';
    statusBadge.textContent = '● Ready';
  }
}

function showEditorView() {
  homeView.classList.remove('active');
  editorView.classList.add('active');
  if (binCodeDisplay) {
    binCodeDisplay.textContent = currentCode;
  }
  if (statusBadge) {
    statusBadge.className = 'badge connected';
    statusBadge.textContent = '● Auto-Save Active';
  }
}

function goHome() {
  currentCode = null;
  window.history.pushState({}, '', '/');
  showHomeView();
}

async function loadBinContent(code) {
  saveStatus.textContent = 'Loading...';
  saveStatus.className = 'save-status saving';
  try {
    const res = await fetch(`/api/bin/${code}`);
    if (res.ok) {
      const data = await res.json();
      editor.value = data.content || '';
      saveStatus.textContent = 'Saved';
      saveStatus.className = 'save-status';
    } else {
      saveStatus.textContent = 'Error loading';
      saveStatus.className = 'save-status error';
    }
  } catch (err) {
    console.error('Error loading bin:', err);
    saveStatus.textContent = 'Error loading';
    saveStatus.className = 'save-status error';
  }
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
    loadBinContent(currentCode);
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
  loadBinContent(currentCode);
}

// Handle Editor Input with HTTP Auto-Save Debouncing
editor.addEventListener('input', () => {
  if (!currentCode) return;

  saveStatus.textContent = 'Saving...';
  saveStatus.className = 'save-status saving';

  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    try {
      const res = await fetch(`/${currentCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editor.value })
      });
      if (res.ok) {
        saveStatus.textContent = 'Saved';
        saveStatus.className = 'save-status';
      } else {
        saveStatus.textContent = 'Save failed';
        saveStatus.className = 'save-status error';
      }
    } catch (err) {
      console.error('Auto-save error:', err);
      saveStatus.textContent = 'Save failed';
      saveStatus.className = 'save-status error';
    }
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

// Handle browser navigation
window.onpopstate = checkRoute;

// Initialize
checkRoute();
