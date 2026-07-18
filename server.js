const express = require('express');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');

const app = express();
const server = http.createServer(app);



const PORT = process.env.PORT || 3000;

// Determine if request comes from curl/CLI tools or explicitly requests text
function isCliRequest(req) {
  const userAgent = req.headers['user-agent'] || '';
  const accept = req.headers['accept'] || '';
  return (
    userAgent.includes('curl') ||
    userAgent.includes('Wget') ||
    userAgent.includes('HTTPie') ||
    userAgent.includes('easybin') ||
    accept.includes('text/plain')
  );
}

// Middleware to parse body based on client type
app.use((req, res, next) => {
  if (isCliRequest(req)) {
    // For CLI, parse the entire body as raw text
    express.text({ type: '*/*', limit: '10mb' })(req, res, next);
  } else {
    // For browser/API, handle JSON and text
    express.json({ limit: '10mb' })(req, res, (err) => {
      if (err) return res.status(400).send('Invalid JSON\n');
      express.text({ type: 'text/*', limit: '10mb' })(req, res, next);
    });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Generate a unique 6-character alphanumeric code (lowercase)
function generateCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(crypto.randomInt(chars.length));
  }
  return code;
}

// --- CLI & API HTTP Endpoints ---

// Health check endpoint (used by UptimeRobot / cron services to keep free instance awake)
app.get('/health', (req, res) => {
  res.status(200).send('OK\n');
});


// Create a new bin (POST /)
app.post('/', async (req, res) => {
  try {
    let content = '';
    if (typeof req.body === 'string') {
      content = req.body;
    } else if (req.body && typeof req.body === 'object' && req.body.content !== undefined) {
      content = String(req.body.content);
    }

    let code;
    let exists = true;
    while (exists) {
      code = generateCode();
      const existing = await db.getBin(code);
      if (!existing) exists = false;
    }

    await db.createBin(code, content);

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers.host;
    const url = `${protocol}://${host}/${code}`;

    if (isCliRequest(req)) {
      return res.status(201).send(`${url}\n`);
    } else {
      return res.status(201).json({ code, url });
    }
  } catch (error) {
    console.error('Error creating bin:', error);
    res.status(500).send('Server Error\n');
  }
});

// Access/Update paste by 6-character code
app.route('/:code')
  .get(async (req, res, next) => {
    const { code } = req.params;
    if (code.length !== 6 || !/^[a-zA-Z0-9]+$/.test(code)) {
      return next(); // Pass to static files / 404
    }

    try {
      const bin = await db.getBin(code);
      if (!bin) {
        if (isCliRequest(req)) {
          return res.status(404).send('Bin not found\n');
        }
        // Let frontend handle rendering/creation interface for empty bins
        return res.sendFile(path.join(__dirname, 'public', 'index.html'));
      }

      if (isCliRequest(req)) {
        res.setHeader('Content-Type', 'text/plain');
        return res.send(bin.content);
      }

      // Browser gets the Single Page App
      return res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } catch (error) {
      console.error('Error fetching bin:', error);
      res.status(500).send('Server Error\n');
    }
  })
  .post(async (req, res) => {
    await handleUpdate(req, res);
  })
  .put(async (req, res) => {
    await handleUpdate(req, res);
  });

async function handleUpdate(req, res) {
  const { code } = req.params;
  if (code.length !== 6 || !/^[a-zA-Z0-9]+$/.test(code)) {
    return res.status(400).send('Invalid code format. Must be 6 alphanumeric characters.\n');
  }

  let content = '';
  if (typeof req.body === 'string') {
    content = req.body;
  } else if (req.body && typeof req.body === 'object' && req.body.content !== undefined) {
    content = String(req.body.content);
  }

  try {
    const bin = await db.getBin(code);
    if (!bin) {
      await db.createBin(code, content);
      return res.status(201).send(`Bin ${code.toLowerCase()} created\n`);
    }

    await db.updateBin(code, content);
    return res.status(200).send(`Bin ${code.toLowerCase()} updated\n`);
  } catch (error) {
    console.error('Error updating bin:', error);
    res.status(500).send('Server Error\n');
  }
}

// --- API Endpoint to Fetch Bin Content (JSON) ---
app.get('/api/bin/:code', async (req, res) => {
  const { code } = req.params;
  if (code.length !== 6 || !/^[a-zA-Z0-9]+$/.test(code)) {
    return res.status(400).json({ error: 'Invalid code format' });
  }

  try {
    const bin = await db.getBin(code);
    return res.json({
      code: code.toLowerCase(),
      content: bin ? bin.content : ''
    });
  } catch (error) {
    console.error('Error fetching bin via API:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});



// Fallback SPA route for browser requests
app.get('*', (req, res) => {
  if (isCliRequest(req)) {
    return res.status(404).send('Not Found\n');
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`EasyBin server running on 0.0.0.0:${PORT}`);
});


