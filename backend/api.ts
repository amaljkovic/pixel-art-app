import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

const PORT = 3000;
const JWT_SECRET = 'pixeldraw-secret-key';


interface User {
  user_id: string;
  username: string;
  password_hash: string;
  created_at: string;
}

interface Picture {
  picture_id: string;
  name: string;
  picture_data: string[][];
  author_id: string;
  created_at: string;
  updated_at: string;
}

interface DB {
  users: User[];
  pictures: Picture[];
}


const DB_PATH = path.join(__dirname, 'db.json');
let db: DB = { users: [], pictures: [] };

const loadDb = () => {
  try {
    if (fs.existsSync(DB_PATH)) {
      db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    }
  } catch {
    db = { users: [], pictures: [] };
  }
};

const saveDb = () => {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
};

loadDb();


type ErrorCode =
  | 'DUPLICATE_USERNAME'
  | 'BAD_PICTURE_DATA'
  | 'LOGGED_IN'
  | 'INCORRECT_CREDENTIALS'
  | 'INVALID_DATA'
  | 'NO_SUCH_ENTITY'
  | 'NOT_YOURS'
  | 'NOT_AUTHENTICATED'
  | 'INTERNAL_ERROR';

const apiError = (res: express.Response, status: number, code: ErrorCode, extra?: unknown) => {
  res.status(status).json({ failed: true, code, ...(extra !== undefined ? { extra } : {}) });
};


type AuthRequest = express.Request & { user?: { user_id: string; username: string } };

const authenticate = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    apiError(res, 401, 'NOT_AUTHENTICATED');
    return;
  }
  try {
    const payload = jwt.verify(authHeader.slice(7), JWT_SECRET) as { user_id: string; username: string };
    req.user = payload;
    next();
  } catch {
    apiError(res, 401, 'NOT_AUTHENTICATED');
  }
};

const rejectAuthenticated = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      jwt.verify(authHeader.slice(7), JWT_SECRET);
      apiError(res, 400, 'LOGGED_IN');
      return;
    } catch {
    }
  }
  next();
};


const COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const validatePictureData = (data: string[][]): boolean => {
  const size = data.length;
  if (size < 1 || size > 24) return false;
  for (const col of data) {
    if (!Array.isArray(col) || col.length !== size) return false;
    for (const cell of col) {
      if (typeof cell !== 'string' || !COLOR_RE.test(cell)) return false;
    }
  }
  return true;
};


const formatPicture = (pic: Picture, username: string) => ({
  picture_id: pic.picture_id,
  name: pic.name,
  picture_data: pic.picture_data,
  author: { user_id: pic.author_id, username },
  created_at: pic.created_at,
  updated_at: pic.updated_at,
});


const loginSchema = z.object({
  username: z.string().min(2).max(32),
  password: z.string().min(8).max(128),
});

const registerSchema = z.object({
  username: z.string().min(2).max(32),
  password: z.string().min(8).max(128),
});

const createPictureSchema = z.object({
  name: z.string().min(1).max(40),
  picture_data: z.array(z.array(z.string())),
});

const updatePictureSchema = z.object({
  name: z.string().min(1).max(40).optional(),
  picture_data: z.array(z.array(z.string())).optional(),
});


app.post('/api/auth/register', rejectAuthenticated, (req, res) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    apiError(res, 400, 'INVALID_DATA', result.error.issues);
    return;
  }

  const { username, password } = result.data;
  if (db.users.some(u => u.username === username)) {
    apiError(res, 409, 'DUPLICATE_USERNAME');
    return;
  }

  const user: User = {
    user_id: randomUUID(),
    username,
    password_hash: bcrypt.hashSync(password, 10),
    created_at: new Date().toISOString(),
  };

  db.users.push(user);
  saveDb();

  res.status(201).json({ failed: false, user_id: user.user_id });
});

app.post('/api/auth/login', rejectAuthenticated, (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    apiError(res, 400, 'INVALID_DATA', result.error.issues);
    return;
  }

  const { username, password } = result.data;
  const user = db.users.find(u => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    apiError(res, 401, 'INCORRECT_CREDENTIALS');
    return;
  }

  const token = jwt.sign(
    { user_id: user.user_id, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ failed: false, token, user_id: user.user_id, username: user.username });
});


app.get('/api/pictures/', (req, res) => {
  const limit = Math.min(25, Math.max(1, parseInt(req.query.limit as string) || 10));
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const olderFirst = req.query.older_first === 'true';
  const authorFilter = req.query.author as string | undefined;

  let pics = [...db.pictures];

  if (authorFilter) {
    pics = pics.filter(p => p.author_id === authorFilter);
  }

  pics.sort((a, b) => {
    const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return olderFirst ? diff : -diff;
  });

  const total = pics.length;
  const start = (page - 1) * limit;
  const paginated = pics.slice(start, start + limit);

  const pictures = paginated.map(pic => {
    const author = db.users.find(u => u.user_id === pic.author_id);
    return formatPicture(pic, author?.username ?? 'Unknown');
  });

  res.json({ pictures, total });
});

app.get('/api/pictures/:id', (req, res) => {
  const pic = db.pictures.find(p => p.picture_id === req.params.id);
  if (!pic) {
    apiError(res, 404, 'NO_SUCH_ENTITY');
    return;
  }

  const author = db.users.find(u => u.user_id === pic.author_id);
  res.json({ failed: false, picture: formatPicture(pic, author?.username ?? 'Unknown') });
});

app.post('/api/pictures/', authenticate, (req: AuthRequest, res) => {
  const result = createPictureSchema.safeParse(req.body);
  if (!result.success) {
    apiError(res, 400, 'INVALID_DATA', result.error.issues);
    return;
  }

  const { name, picture_data } = result.data;

  if (!validatePictureData(picture_data)) {
    apiError(res, 400, 'BAD_PICTURE_DATA');
    return;
  }

  const now = new Date().toISOString();
  const pic: Picture = {
    picture_id: randomUUID(),
    name,
    picture_data,
    author_id: req.user!.user_id,
    created_at: now,
    updated_at: now,
  };

  db.pictures.push(pic);
  saveDb();

  res.status(201).json({ failed: false, picture_id: pic.picture_id });
});

app.patch('/api/pictures/:id', authenticate, (req: AuthRequest, res) => {
  const idx = db.pictures.findIndex(p => p.picture_id === req.params.id);
  if (idx === -1) {
    apiError(res, 404, 'NO_SUCH_ENTITY');
    return;
  }

  const pic = db.pictures[idx];
  if (pic.author_id !== req.user!.user_id) {
    apiError(res, 403, 'NOT_YOURS');
    return;
  }

  const result = updatePictureSchema.safeParse(req.body);
  if (!result.success) {
    apiError(res, 400, 'INVALID_DATA', result.error.issues);
    return;
  }

  if (result.data.picture_data !== undefined && !validatePictureData(result.data.picture_data)) {
    apiError(res, 400, 'BAD_PICTURE_DATA');
    return;
  }

  if (result.data.name !== undefined) pic.name = result.data.name;
  if (result.data.picture_data !== undefined) pic.picture_data = result.data.picture_data;
  pic.updated_at = new Date().toISOString();

  saveDb();

  res.json({ failed: false });
});

app.delete('/api/pictures/:id', authenticate, (req: AuthRequest, res) => {
  const idx = db.pictures.findIndex(p => p.picture_id === req.params.id);
  if (idx === -1) {
    apiError(res, 404, 'NO_SUCH_ENTITY');
    return;
  }

  const pic = db.pictures[idx];
  if (pic.author_id !== req.user!.user_id) {
    apiError(res, 403, 'NOT_YOURS');
    return;
  }

  db.pictures.splice(idx, 1);
  saveDb();

  res.json({ failed: false });
});

app.listen(PORT, () => {
  console.log(`API server listening on port ${PORT}`);
});