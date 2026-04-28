// backend/server.js
// ─────────────────────────────────────────────────────────
//  Inkwell — Express backend
//  • Serves HTML pages with __ENV injected (no keys in frontend source)
//  • /api/stories  — submit story for review  (writer only, JWT-verified)
//  • /api/admin/*  — approve / reject stories  (admin role only)
//  • /api/profile  — fetch writer profile
// ─────────────────────────────────────────────────────────

require('dotenv').config();
const express      = require('express');
const path         = require('path');
const multer       = require('multer');
const { createClient } = require('@supabase/supabase-js');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Supabase admin client (service-role key — server only) ──
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── Multer — in-memory storage, then forwarded to Supabase Storage ──
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only .pdf, .docx, .txt allowed'));
  },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Inject safe public env vars into every HTML page ──
const publicEnv = JSON.stringify({
  SUPABASE_URL:      process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
});

function injectEnv(filePath, res) {
  const fs = require('fs');
  let html = fs.readFileSync(filePath, 'utf8');
  html = html.replace('</head>', `<script>window.__ENV = ${publicEnv};</script>\n</head>`);
  res.send(html);
}

// ── Serve static assets ──
app.use('/css',    express.static(path.join(__dirname, '../public/css')));
app.use('/js',     express.static(path.join(__dirname, '../public/js')));
app.use('/auth/css', express.static(path.join(__dirname, '../auth/css')));
app.use('/auth/js',  express.static(path.join(__dirname, '../auth/js')));
app.use('/admin/css', express.static(path.join(__dirname, '../admin/css')));
app.use('/admin/js',  express.static(path.join(__dirname, '../admin/js')));

// ── Pages ──
app.get('/',          (req, res) => injectEnv(path.join(__dirname, '../public/index.html'), res));
app.get('/publish',   (req, res) => injectEnv(path.join(__dirname, '../public/pages/publish.html'), res));
app.get('/stories',   (req, res) => injectEnv(path.join(__dirname, '../public/pages/stories.html'), res));
app.get('/dashboard', (req, res) => injectEnv(path.join(__dirname, '../public/pages/dashboard.html'), res));
app.get('/read',      (req, res) => injectEnv(path.join(__dirname, '../public/pages/reader.html'), res));
app.get('/auth/login',    (req, res) => injectEnv(path.join(__dirname, '../auth/login.html'), res));
app.get('/auth/signup',   (req, res) => injectEnv(path.join(__dirname, '../auth/signup.html'), res));
app.get('/admin/dashboard', (req, res) => injectEnv(path.join(__dirname, '../admin/dashboard.html'), res));

// ── Debug endpoint (remove in production) ──
app.get('/api/debug/me', requireAuth, async (req, res) => {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();
  const { data: stories } = await supabaseAdmin
    .from('stories')
    .select('id, title, status')
    .order('submitted_at', { ascending: false });
  res.json({ user: req.user, profile, allStories: stories });
});

// ─────────────────────────────────────────────────────────
//  MIDDLEWARE — verify Supabase JWT from Authorization header
// ─────────────────────────────────────────────────────────
async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = header.split(' ')[1];
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' });
  req.user = user;
  next();
}

async function requireAdmin(req, res, next) {
  // Step 1: verify JWT
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }
  const token = header.split(' ')[1];
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  req.user = user;

  // Step 2: check admin role using service-role key (bypasses RLS)
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    return res.status(500).json({ error: 'Could not fetch profile: ' + profileError.message });
  }
  if (!profile || profile.role !== 'admin') {
    return res.status(403).json({ error: `Admin access only. Your role is: ${profile?.role || 'unknown'}` });
  }

  next();
}

// ─────────────────────────────────────────────────────────
//  API — Writers
// ─────────────────────────────────────────────────────────

/**
 * POST /api/stories
 * Writers submit a story for review.
 * Body (multipart/form-data): title, synopsis, genre, manuscript (file)
 * Status set to 'pending_review' — not visible to public until approved.
 */
app.post('/api/stories', requireAuth, upload.single('manuscript'), async (req, res) => {
  try {
    const { title, synopsis, genre, body } = req.body;
    if (!title || !synopsis || !genre || !body) {
      return res.status(400).json({ error: 'title, synopsis, genre and body text are required' });
    }

    let fileUrl = null;
    if (req.file) {
      const ext      = req.file.originalname.split('.').pop();
      const fileName = `${req.user.id}/${Date.now()}.${ext}`;
      const { error: storageErr } = await supabaseAdmin
        .storage
        .from(process.env.SUPABASE_STORAGE_BUCKET)
        .upload(fileName, req.file.buffer, { contentType: req.file.mimetype });

      if (storageErr) throw storageErr;

      const { data: { publicUrl } } = supabaseAdmin
        .storage
        .from(process.env.SUPABASE_STORAGE_BUCKET)
        .getPublicUrl(fileName);
      fileUrl = publicUrl;
    }

    const { data: story, error: dbErr } = await supabaseAdmin
      .from('stories')
      .insert({
        author_id:    req.user.id,
        title,
        synopsis,
        genre,
        body,
        file_url:     fileUrl,
        status:       'pending_review',
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbErr) throw dbErr;

    res.status(201).json({
      message: 'Story submitted for review. You will be notified once it is approved.',
      story,
    });
  } catch (err) {
    console.error('[POST /api/stories]', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

/**
 * GET /api/stories/mine
 * Writers fetch their own stories (all statuses).
 */
app.get('/api/stories/mine', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('stories')
    .select('id, title, genre, status, submitted_at, review_note')
    .eq('author_id', req.user.id)
    .order('submitted_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/**
 * GET /api/stories
 * Public listing — only approved stories.
 */
app.get('/api/stories', async (req, res) => {
  const { genre, search } = req.query;
  let query = supabaseAdmin
    .from('stories')
    .select('id, title, synopsis, genre, submitted_at, approved_at, author:profiles!stories_author_id_fkey(display_name)')
    .eq('status', 'approved')
    .order('approved_at', { ascending: false });

  if (genre && genre !== 'all') query = query.eq('genre', genre);
  if (search) query = query.ilike('title', `%${search}%`);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/**
 * GET /api/stories/:id
 * Fetch a single approved story by ID for the reader page.
 */
app.get('/api/stories/:id', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('stories')
    .select('*, author:profiles!stories_author_id_fkey(display_name)')
    .eq('id', req.params.id)
    .eq('status', 'approved')
    .single();

  if (error || !data) return res.status(404).json({ error: 'Story not found or not yet approved' });
  res.json(data);
});

// ─────────────────────────────────────────────────────────
//  API — Admin review
// ─────────────────────────────────────────────────────────

/**
 * GET /api/admin/stories
 * List all stories pending review.
 */
app.get('/api/admin/stories', requireAdmin, async (req, res) => {
  const { status = 'pending_review' } = req.query;
  const { data, error } = await supabaseAdmin
    .from('stories')
    .select('*, author:profiles!stories_author_id_fkey(display_name, email)')
    .eq('status', status)
    .order('submitted_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/**
 * PATCH /api/admin/stories/:id/approve
 * Approve a story — makes it publicly visible.
 */
app.patch('/api/admin/stories/:id/approve', requireAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('stories')
    .update({ status: 'approved', approved_at: new Date().toISOString(), reviewed_by: req.user.id })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Story approved and published.', story: data });
});

/**
 * PATCH /api/admin/stories/:id/reject
 * Reject a story with an optional note to the author.
 */
app.patch('/api/admin/stories/:id/reject', requireAdmin, async (req, res) => {
  const { review_note } = req.body;
  const { data, error } = await supabaseAdmin
    .from('stories')
    .update({ status: 'rejected', review_note, reviewed_by: req.user.id })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Story rejected.', story: data });
});

/**
 * GET /api/admin/manuscript/:storyId
 * Generates a signed URL (1 hour) for admins to view a manuscript.
 * The storage bucket stays private — only admins can get this link.
 */
app.get('/api/admin/manuscript/:storyId', requireAdmin, async (req, res) => {
  // Fetch the story to get its file_url
  const { data: story, error: storyErr } = await supabaseAdmin
    .from('stories')
    .select('file_url, title')
    .eq('id', req.params.storyId)
    .single();

  if (storyErr || !story) return res.status(404).json({ error: 'Story not found' });
  if (!story.file_url) return res.status(404).json({ error: 'No manuscript uploaded for this story' });

  // Extract just the storage path from the full URL
  // file_url looks like: https://xxx.supabase.co/storage/v1/object/public/story-uploads/userId/file.pdf
  // We need just: userId/file.pdf
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  const marker = `/object/public/${bucket}/`;
  const markerPrivate = `/object/sign/${bucket}/`;
  let filePath = '';

  if (story.file_url.includes(marker)) {
    filePath = story.file_url.split(marker)[1];
  } else if (story.file_url.includes(markerPrivate)) {
    filePath = story.file_url.split(markerPrivate)[1].split('?')[0];
  } else if (story.file_url.includes(`/${bucket}/`)) {
    filePath = story.file_url.split(`/${bucket}/`)[1].split('?')[0];
  } else {
    return res.status(400).json({ error: 'Cannot parse file path from URL: ' + story.file_url });
  }

  // Generate a signed URL valid for 1 hour
  const { data, error } = await supabaseAdmin
    .storage
    .from(bucket)
    .createSignedUrl(filePath, 60 * 60);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ url: data.signedUrl, title: story.title });
});

/**
 * GET /api/profile
 * Return logged-in user's profile.
 */
app.get('/api/profile', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/**
 * PATCH /api/profile/update
 * Update user's profile (display name, bio)
 */
app.patch('/api/profile/update', requireAuth, async (req, res) => {
  const { display_name, bio } = req.body;

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({
      display_name: display_name || undefined,
      bio: bio || undefined,
    })
    .eq('id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Profile updated', profile: data });
});

// ── Global error handler ──
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => console.log(`✦ Inkwell server running on http://localhost:${PORT}`));
