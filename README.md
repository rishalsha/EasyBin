# EasyBin

EasyBin is an instant over-the-internet clipboard. It allows sharing text/code snippets across devices instantly with a simple 6-character alphanumeric code, using both a clean web interface, dedicated CLI tools, and `curl`.

---

## ⚡ EasyBin CLI Tool

### Installation

#### Standalone Binary (Linux / macOS / Windows):
Download standalone executables directly from [GitHub Releases](https://github.com/rishalsha/EasyBin/releases).

**Linux (Ubuntu, Fedora, Arch, Debian):**
```bash
sudo curl -sSL https://github.com/rishalsha/EasyBin/releases/latest/download/easybin-linux-x64 -o /usr/local/bin/easybin && sudo chmod +x /usr/local/bin/easybin
```

**macOS:**
```bash
sudo curl -sSL https://github.com/rishalsha/EasyBin/releases/latest/download/easybin-macos-arm64 -o /usr/local/bin/easybin && sudo chmod +x /usr/local/bin/easybin
```

**Windows:**
Download `easybin-windows-x64.exe` from GitHub Releases and add it to your PATH.

---

### 💻 CLI Commands & Short Flags

| Operation | Commands / Aliases / Short Flags | Example |
| :--- | :--- | :--- |
| **Create Bin** | `create`, `c`, `-c`, `new`, `-n` | `easybin c "hello world"` |
| **Copy to Clipboard** | `copy`, `cp`, `-y` | `easybin cp 3x9f2a` |
| **Get (stdout)** | `get`, `g`, `-g` | `easybin g 3x9f2a` |
| **Paste from Clipboard** | `paste`, `-p`, `--paste` | `easybin -p` |
| **Piped Upload** | `echo "..." \| easybin` | `echo "hi" \| easybin` |
| **Version** | `-v`, `--version` | `easybin -v` |
| **Help** | `-h`, `--help` | `easybin -h` |

---

## 🌐 `curl` Integration (Zero Installation Needed)

```bash
# Create bin
curl -d "Hello world" https://easybin-4w30.onrender.com/

# Fetch bin
curl https://easybin-4w30.onrender.com/3x9f2a
```

---

## 🛠️ Server Development & Setup

### Prerequisites
- Node.js (v18+)
- npm

### Installation & Execution
```bash
npm install
npm start
```
