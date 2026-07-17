# EasyBin

EasyBin is an instant, real-time over-the-internet clipboard. It allows sharing text/code snippets across devices instantly with a simple 6-character alphanumeric code, using both a clean web interface and CLI tools like `curl`.

## 🚀 Features

-   **Browser & CLI Dynamic Routing**: Retrieve raw text via terminal tools (`curl`, `wget`) and an interactive collaborative editor via web browsers on the same URL!
-   **Real-time Collaboration**: WebSocket-based instant updates across all open browser tabs for any specific clipboard.
-   **Case-Insensitive Access**: `ABCDEF` and `abcdef` access the exact same bin.
-   **Lightweight Persistence**: Built on standard Node.js Express and SQLite.
-   **Premium Dark UI**: Glassmorphic dark styling, responsive text area, status sync badges, and interactive copy utilities.

---

## 💻 CLI Integration (How to Use)

Since EasyBin handles terminal User-Agents dynamically, you can use it directly with `curl`:

### 1. Create a new Bin
Send a POST request with the content you want to upload:
```bash
curl -d "Hello from my terminal!" http://localhost:3000/
```
*Output:*
```text
http://localhost:3000/3x9f2a
```

### 2. Retrieve a Bin
Perform a GET request to the bin URL:
```bash
curl http://localhost:3000/3x9f2a
```
*Output:*
```text
Hello from my terminal!
```

### 3. Update an existing Bin
Send a POST or PUT request to the specific bin URL with the updated content:
```bash
curl -X POST -d "Updated terminal message" http://localhost:3000/3x9f2a
```
*Output:*
```text
Bin 3x9f2a updated
```

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation
1. Clone the repository or navigate to the directory.
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Server
Start the production server:
```bash
npm start
```
Or start in development mode with auto-reload:
```bash
npm run dev
```

The server will be running at [http://localhost:3000](http://localhost:3000). Open this address in your browser to start pasting and sharing text!
