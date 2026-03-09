import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 3000;
const PUBLIC_DIR = join(__dirname, 'public');
const DATA_DIR = join(__dirname, 'characters');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

async function serveStatic(res, filepath) {
  try {
    const ext = extname(filepath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const data = await readFile(filepath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not Found');
  }
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString());
}

async function handleAPI(req, res, url) {
  res.setHeader('Content-Type', 'application/json');

  // GET /api/characters - list all characters
  if (url.pathname === '/api/characters' && req.method === 'GET') {
    await ensureDataDir();
    const files = await readdir(DATA_DIR);
    const characters = [];
    for (const file of files.filter(f => f.endsWith('.json'))) {
      const data = await readFile(join(DATA_DIR, file), 'utf-8');
      characters.push(JSON.parse(data));
    }
    res.writeHead(200);
    res.end(JSON.stringify(characters));
    return;
  }

  // POST /api/characters - create/update character
  if (url.pathname === '/api/characters' && req.method === 'POST') {
    await ensureDataDir();
    const character = await readBody(req);
    character.id = character.id || crypto.randomUUID();
    const filename = `${character.id}.json`;
    await writeFile(join(DATA_DIR, filename), JSON.stringify(character, null, 2));
    res.writeHead(200);
    res.end(JSON.stringify(character));
    return;
  }

  // DELETE /api/characters/:id
  if (url.pathname.startsWith('/api/characters/') && req.method === 'DELETE') {
    const id = url.pathname.split('/').pop();
    const filepath = join(DATA_DIR, `${id}.json`);
    try {
      const { unlink } = await import('node:fs/promises');
      await unlink(filepath);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true }));
    } catch {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    }
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // API routes
  if (url.pathname.startsWith('/api/')) {
    return handleAPI(req, res, url);
  }

  // Static files
  let filepath = join(PUBLIC_DIR, url.pathname);
  if (url.pathname === '/') {
    filepath = join(PUBLIC_DIR, 'index.html');
  }

  await serveStatic(res, filepath);
});

server.listen(PORT, () => {
  console.log(`🎲 D&D Character Sheet running at http://localhost:${PORT}`);
});
