#!/usr/bin/env node

const { exec } = require('child_process');

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

function showHelp() {
  console.log(`
EasyBin CLI Tool

Usage:
  easybin create "<text>"         Create a new bin with text and return code & URL
  easybin copy <code>            Fetch bin content and copy directly to clipboard
  easybin get <code>             Print bin content to terminal output
  easybin <code>                 Fetch bin content to terminal output (shortcut)
  easybin -p, --paste            Upload text from system clipboard
  echo "text" | easybin          Upload from piped stdin
  easybin --help                 Show this help menu

Environment Variables:
  EASYBIN_SERVER                 Custom backend URL (default: ${DEFAULT_SERVER})
  `);
  process.exit(0);
}

// Create a new bin
async function createBin(content) {
  try {
    const res = await fetch(`${DEFAULT_SERVER}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'User-Agent': 'easybin-cli/1.0.0'
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

    console.log(`✔ Bin created successfully!`);
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
    console.error(`Error: '${code}' is not a valid 6-character code.`);
    process.exit(1);
  }

  try {
    const res = await fetch(`${DEFAULT_SERVER}/${cleanCode}`, {
      headers: {
        'Accept': 'text/plain',
        'User-Agent': 'easybin-cli/1.0.0'
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
  } else if (command === 'create') {
    const text = args.slice(1).join(' ');
    if (!text) {
      console.error('Error: Please specify text to create a bin. Example: easybin create "hello world"');
      process.exit(1);
    }
    await createBin(text);
  } else if (command === 'copy' && args[1]) {
    await getBin(args[1], true);
  } else if (command === 'get' && args[1]) {
    await getBin(args[1], false);
  } else if (command === '-p' || command === '--paste') {
    pasteFromClipboard(async (text) => {
      if (!text) {
        console.error('Clipboard is empty.');
        process.exit(1);
      }
      await createBin(text);
    });
  } else if (command && command.length === 6 && /^[a-zA-Z0-9]+$/.test(command)) {
    const shouldCopy = args.includes('-c') || args.includes('--copy');
    await getBin(command, shouldCopy);
  } else {
    showHelp();
  }
}

main();
