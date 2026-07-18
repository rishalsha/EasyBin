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

### 💻 CLI Usage

#### 1. Create a Bin
```bash
easybin create "Hello from my terminal!"
```
*Output:*
```text
✔ Bin created successfully!
Code: 3x9f2a
URL:  https://easybin-4w30.onrender.com/3x9f2a
```

#### 2. Copy Bin Content directly to Clipboard
```bash
easybin copy 3x9f2a
```
*Output:*
```text
Hello from my terminal!
✔ Copied content to system clipboard!
```

#### 3. Print Content to stdout
```bash
easybin get 3x9f2a
```

#### 4. Pipe Input
```bash
echo "Hello from pipe" | easybin
```

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
