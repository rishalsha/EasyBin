#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const { exec } = require('child_process');
const WebSocket = require('ws');

const DEFAULT_SERVER = process.env.EASYBIN_SERVER || 'http://localhost:3000';

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
    // Linux/BSD
    cmd = 'xclip -selection clipboard || xsel --clipboard --input';
  }

  const proc = exec(cmd, (err) => {
    if (err) {
      console.error('Failed to copy to system clipboard. Make sure xclip or xsel is installed.');
    } else {
      console.log('✔ Copied to system clipboard!');
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
    cmd = 'xclip -selection clipboard -o || xsel --clipboard --output';
  }

  exec(cmd, (err, stdout) => {
    if (err) {
      console.error('Failed to paste from system clipboard.');
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
  easybin                        Upload from piped input (e.g. echo "hello" | easybin)
  easybin <code>                  Download paste content to stdout
  easybin <code> -c, --copy       Download paste and copy to system clipboard
  easybin -p, --paste            Upload text from system clipboard
  easybin watch <code>            Watch a bin in real-time for live changes
  easybin -h, --help             Show this help menu
  `);
  process.exit(0);
}

// Upload content from text
function upload(content) {
  const serverUrl = new URL(DEFAULT_SERVER);
  const options = {
    hostname: serverUrl.hostname,
    port: serverUrl.port || (serverUrl.protocol === 'https:' ? 443 : 80),
    path: '/',
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'Content-Length': Buffer.byteLength(content),
      'User-Agent': 'easybin-cli/1.0.0'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      process.stdout.write(data);
    });
  });

  req.on('error', (e) => {
    console.error(`Upload failed: ${e.message}`);
    process.exit(1);
  });

  req.write(content);
  req.end();
}

// Download content from code
function download(code, shouldCopy = false) {
  const serverUrl = new URL(DEFAULT_SERVER);
  const options = {
    hostname: serverUrl.hostname,
    port: serverUrl.port,
    path: `/${code}`,
    method: 'GET',
    headers: {
      'Accept': 'text/plain',
      'User-Agent': 'easybin-cli/1.0.0'
    }
  };

  const req = http.request(options, (res) => {
    if (res.statusCode === 404) {
      console.error(`Error: Bin '${code}' not found.`);
      process.exit(1);
    }
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (shouldCopy) {
        copyToClipboard(data);
      } else {
        process.stdout.write(data);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`Download failed: ${e.message}`);
    process.exit(1);
  });

  req.end();
}

// Live WebSocket watch function
function watchBin(code) {
  const serverUrl = new URL(DEFAULT_SERVER);
  const wsProtocol = serverUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${serverUrl.host}`;
  const ws = new WebSocket(wsUrl);

  console.log(`Connecting to watch bin: ${code}...`);

  ws.on('open', () => {
    console.log(`✔ Watching bin '${code}' live. Press Ctrl+C to exit.\n`);
    ws.send(JSON.stringify({ type: 'join', code }));
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'init') {
        console.log(`--- Initial Content ---`);
        console.log(data.content);
        console.log(`-----------------------\n`);
      } else if (data.type === 'update') {
        console.log(`--- Update Received ---`);
        console.log(data.content);
        console.log(`-----------------------\n`);
      }
    } catch (err) {
      // Ignore parse errors
    }
  });

  ws.on('close', () => {
    console.log('Disconnected from server. Reconnecting in 3s...');
    setTimeout(() => watchBin(code), 3000);
  });

  ws.on('error', (err) => {
    console.error('WS Error:', err.message);
  });
}

// MAIN EXECUTION LOGIC
if (!process.stdin.isTTY) {
  // Piped input upload mode
  let buffer = '';
  process.stdin.on('data', chunk => buffer += chunk);
  process.stdin.on('end', () => {
    upload(buffer);
  });
} else {
  if (args.length === 0 || command === '-h' || command === '--help') {
    showHelp();
  }

  if (command === '-p' || command === '--paste') {
    pasteFromClipboard((text) => {
      upload(text);
    });
  } else if (command === 'watch' && args[1]) {
    watchBin(args[1]);
  } else if (command && command.length === 6) {
    const shouldCopy = args.includes('-c') || args.includes('--copy');
    download(command, shouldCopy);
  } else {
    showHelp();
  }
}
