#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const VERSION = '1.0.4';

const DEFAULT_SERVER = (process.env.EASYBIN_SERVER || 'https://easybin-4w30.onrender.com').replace(/\/$/, '');

const args = process.argv.slice(2);
const command = args[0];

// Clipboard copying utility
function copyToClipboard(text) {
  const platform = process.platform;
  let cmd = '';
  if (platform === 'darwin') {
    cmd = 'pbcopy';
  } else if (platform === 'win32') {
    cmd = 'clip';
  } else {
    // Linux (xclip, xsel, or wl-clipboard)
    cmd = 'xclip -selection clipboard 2>/dev/null || xsel --clipboard --input 2>/dev/null || wl-copy 2>/dev/null';
  }

  const proc = exec(cmd, (err) => {
    if (err) {
      console.error('⚠️ Could not auto-copy to system clipboard (install xclip/xsel/wl-clipboard on Linux).');
    } else {
      console.log('✔ Copied content to system clipboard!');
    }
  });
  proc.stdin.write(text);
  proc.stdin.end();
}

// Clipboard pasting utility
function pasteFromClipboard(callback) {
  const platform = process.platform;
  let cmd = '';
  if (platform === 'darwin') {
    cmd = 'pbpaste';
  } else if (platform === 'win32') {
    cmd = 'powershell -command "Get-Clipboard"';
  } else {
    cmd = 'xclip -selection clipboard -o 2>/dev/null || xsel --clipboard --output 2>/dev/null || wl-paste 2>/dev/null';
  }

  exec(cmd, (err, stdout) => {
    if (err) {
      console.error('Failed to read system clipboard.');
      process.exit(1);
    } else {
      callback(stdout.trim());
    }
  });
}

function isTextFile(filePath) {
  try {
    if (!filePath || typeof filePath !== 'string') return false;
    if (!fs.existsSync(filePath)) return false;
    const stat = fs.statSync(filePath);
    return stat.isFile();
  } catch (err) {
    return false;
  }
}

async function handleFileCreation(filePath) {
  try {
    const fullPath = path.resolve(filePath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const filename = path.basename(fullPath);
    await createBin(content, filename);
  } catch (err) {
    console.error(`Error reading file '${filePath}':`, err.message);
    process.exit(1);
  }
}

function showVersion() {
  console.log(`easybin v${VERSION}`);
  process.exit(0);
}

function showHelp() {
  console.log(`
EasyBin CLI Tool (v${VERSION})

Usage:
  easybin <filename>             Upload file content (.c, .txt, .py, .js, etc.)
  easybin create "<text>"         Create a new bin with text or file (alias: c, -c, new, -n)
  easybin copy <code>            Fetch bin content & copy to clipboard (alias: cp, -y)
  easybin get <code>             Print bin content to terminal stdout (alias: g, -g)
  easybin <code>                 Fetch bin content to terminal output (shortcut)
  easybin -p, --paste            Upload text directly from system clipboard (alias: paste)
  easybin completion             Output bash/zsh autocomplete script
  echo "text" | easybin          Upload from piped stdin
  easybin -v, --version          Show version
  easybin -h, --help             Show this help menu

Examples:
  easybin main.c                 Upload C source code file
  easybin script.py              Upload Python script file
  easybin notes.txt              Upload text document file
  easybin c "Hello World"        Quick create bin from text string
  easybin cp 3x9f2a              Fetch & copy to system clipboard
  easybin g 3x9f2a               Print bin content
  easybin -p                     Create bin from system clipboard
  `);
  process.exit(0);
}

function showCompletion() {
  console.log(`
# EasyBin Bash/Zsh Tab Autocompletion Script
# Add to ~/.bashrc or ~/.zshrc: eval "$(easybin completion)"

_easybin_completion() {
  local cur prev opts
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  opts="create copy get paste completion -p -v --version -h --help"

  if [[ \${cur} == -* ]] ; then
    COMPREPLY=( $(compgen -W "\${opts}" -- \${cur}) )
    return 0
  fi

  case "\${prev}" in
    create|c|-c|new|-n|easybin)
      COMPREPLY=( $(compgen -f -- \${cur}) )
      return 0
      ;;
  esac

  COMPREPLY=( $(compgen -f -- \${cur}) )
}
complete -F _easybin_completion easybin
  `);
  process.exit(0);
}

// Create a new bin
async function createBin(content, fileLabel = null) {
  try {
    const res = await fetch(`${DEFAULT_SERVER}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'User-Agent': `easybin-cli/${VERSION}`
      },
      body: content
    });

    if (!res.ok) {
      console.error(`Error creating bin: HTTP ${res.status}`);
      process.exit(1);
    }

    const text = await res.text();
    const url = text.trim();
    const code = url.split('/').pop();

    if (fileLabel) {
      console.log(`✔ Bin created successfully from file '${fileLabel}'!`);
    } else {
      console.log(`✔ Bin created successfully!`);
    }
    console.log(`Code: ${code}`);
    console.log(`URL:  ${url}`);
  } catch (err) {
    console.error(`Failed to connect to server (${DEFAULT_SERVER}):`, err.message);
    process.exit(1);
  }
}

// Fetch content from code
async function getBin(code, shouldCopy = false) {
  const cleanCode = code.toLowerCase().trim();
  if (cleanCode.length !== 6 || !/^[a-z0-9]+$/.test(cleanCode)) {
    console.error(`Error: '${code}' is not a valid 6-character code or file.`);
    process.exit(1);
  }

  try {
    const res = await fetch(`${DEFAULT_SERVER}/${cleanCode}`, {
      headers: {
        'Accept': 'text/plain',
        'User-Agent': `easybin-cli/${VERSION}`
      }
    });

    if (res.status === 404) {
      console.error(`Error: Bin '${cleanCode}' not found.`);
      process.exit(1);
    }

    if (!res.ok) {
      console.error(`Error fetching bin: HTTP ${res.status}`);
      process.exit(1);
    }

    const text = await res.text();

    if (shouldCopy) {
      process.stdout.write(text);
      if (!text.endsWith('\n')) console.log();
      copyToClipboard(text);
    } else {
      process.stdout.write(text);
      if (!text.endsWith('\n')) console.log();
    }
  } catch (err) {
    console.error(`Failed to fetch bin (${DEFAULT_SERVER}):`, err.message);
    process.exit(1);
  }
}

// MAIN COMMAND ROUTER
async function main() {
  if (!process.stdin.isTTY) {
    let buffer = '';
    for await (const chunk of process.stdin) {
      buffer += chunk;
    }
    if (buffer.trim()) {
      await createBin(buffer);
    } else {
      showHelp();
    }
    return;
  }

  if (args.length === 0 || command === '-h' || command === '--help' || command === 'help') {
    showHelp();
  }

  if (command === '-v' || command === '--version' || command === 'version') {
    showVersion();
  }

  if (command === 'completion' || command === '--completion') {
    showCompletion();
  }

  // 1. Direct file upload: easybin main.c or easybin notes.txt
  if (isTextFile(command)) {
    await handleFileCreation(command);
    return;
  }

  // 2. Create commands: create, c, -c, new, -n
  if (['create', 'c', '-c', 'new', '-n'].includes(command)) {
    const arg2 = args[1];
    if (arg2 && isTextFile(arg2)) {
      await handleFileCreation(arg2);
      return;
    }

    const text = args.slice(1).join(' ');
    if (!text) {
      console.error('Error: Please specify text or a filename. Example: easybin main.c or easybin c "hello world"');
      process.exit(1);
    }
    await createBin(text);
    return;
  }

  // 3. Copy commands: copy, cp, -y
  if (['copy', 'cp', '-y'].includes(command) && args[1]) {
    await getBin(args[1], true);
    return;
  }

  // 4. Get commands: get, g, -g
  if (['get', 'g', '-g'].includes(command) && args[1]) {
    await getBin(args[1], false);
    return;
  }

  // 5. Paste from system clipboard commands: paste, -p, --paste
  if (['paste', '-p', '--paste'].includes(command)) {
    pasteFromClipboard(async (text) => {
      if (!text) {
        console.error('Clipboard is empty.');
        process.exit(1);
      }
      await createBin(text);
    });
    return;
  }

  // 6. Direct 6-character code lookup: easybin 3x9f2a or easybin 3x9f2a -c
  if (command && command.length === 6 && /^[a-zA-Z0-9]+$/.test(command)) {
    const shouldCopy = args.includes('-c') || args.includes('--copy') || args.includes('-y');
    await getBin(command, shouldCopy);
    return;
  }

  showHelp();
}

main();
