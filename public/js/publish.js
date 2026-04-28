// public/js/publish.js
// ─────────────────────────────────────────────────────────
//  Handles:
//  • Auth gate (redirect if not logged in)
//  • Drag-and-drop file upload
//  • Story submission via backend API (with JWT)
//  • My Submissions sidebar
// ─────────────────────────────────────────────────────────

(async () => {
  const sb = window.supabase.createClient(
    window.__ENV.SUPABASE_URL,
    window.__ENV.SUPABASE_ANON_KEY
  );

  const { data: { session } } = await sb.auth.getSession();

  const authGate   = document.getElementById('auth-gate');
  const publishWrap= document.getElementById('publish-wrap');

  if (!session) {
    // Show auth gate, hide form
    authGate.style.display    = 'flex';
    publishWrap.style.display = 'none';
    return;
  }

  // User is logged in
  authGate.style.display    = 'none';
  publishWrap.style.display = 'block';

  // ── Live word count ──
  const bodyTextarea = document.getElementById('body');
  const wordCountEl  = document.getElementById('word-count');
  const readTimeEl   = document.getElementById('read-time');

  function updateWordCount() {
    const text  = bodyTextarea.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const mins  = Math.max(1, Math.round(words / 200));
    if (wordCountEl) wordCountEl.textContent = words.toLocaleString();
    if (readTimeEl)  readTimeEl.textContent  = words > 0 ? `${mins} min read` : '0 min read';
  }
  bodyTextarea?.addEventListener('input', updateWordCount);

  // ── Drop zone ──
  const dropZone   = document.getElementById('dropZone');
  const fileInput  = document.getElementById('fileInput');
  const fileChosen = document.getElementById('fileChosen');

  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => showFile(fileInput.files[0]));

  ['dragover','dragenter'].forEach(e =>
    dropZone.addEventListener(e, ev => { ev.preventDefault(); dropZone.classList.add('drag-over'); })
  );
  ['dragleave','drop'].forEach(e =>
    dropZone.addEventListener(e, ev => {
      ev.preventDefault(); dropZone.classList.remove('drag-over');
      if (e === 'drop' && ev.dataTransfer.files[0]) showFile(ev.dataTransfer.files[0]);
    })
  );

  function showFile(file) {
    if (!file) return;
    fileInput._file = file; // store for FormData
    fileChosen.textContent = '✓ ' + file.name;
    dropZone.querySelector('.drop-label').textContent = 'File selected';
  }

  // ── Form submit ──
  const form      = document.getElementById('publish-form');
  const errorEl   = document.getElementById('form-error');
  const successEl = document.getElementById('form-success');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display   = 'none';
    successEl.style.display = 'none';

    const title    = document.getElementById('title').value.trim();
    const genre    = document.getElementById('genre').value;
    const synopsis = document.getElementById('synopsis').value.trim();
    const body     = document.getElementById('body').value.trim();

    if (!title || !genre || !synopsis || !body) {
      errorEl.textContent = 'Please fill in all required fields including the full story text.';
      errorEl.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    try {
      const fd = new FormData();
      fd.append('title',    title);
      fd.append('genre',    genre);
      fd.append('synopsis', synopsis);
      fd.append('body',     body);

      // File is optional — only attach if one was selected
      const file = fileInput.files[0] || fileInput._file;
      if (file) fd.append('manuscript', file);

      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: fd,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Submission failed');

      successEl.textContent = '🎉 Story submitted! It will be reviewed within 24 hours.';
      successEl.style.display = 'block';
      form.reset();
      fileChosen.textContent = '';
      dropZone.querySelector('.drop-label').textContent = 'Drop a file here or click to attach';
      if (wordCountEl) wordCountEl.textContent = '0';
      if (readTimeEl)  readTimeEl.textContent  = '0 min read';
      loadMyStories();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '✦ Submit for Review';
    }
  });

  // ── My Submissions sidebar ──
  async function loadMyStories() {
    const list = document.getElementById('my-stories-list');
    list.innerHTML = '<p class="loading-text">Loading…</p>';

    const res  = await fetch('/api/stories/mine', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const stories = await res.json();

    if (!stories.length) { list.innerHTML = '<p class="loading-text">No submissions yet.</p>'; return; }

    list.innerHTML = stories.map(s => `
      <div class="story-row">
        <div class="story-row-title">
          ${s.title}
          <span class="status-badge status-${s.status.replace('_review','')}">${s.status.replace('_',' ')}</span>
        </div>
        <div class="story-row-meta">
          ${s.genre} · ${new Date(s.submitted_at).toLocaleDateString()}
          ${s.review_note ? `<br><em style="color:#c0392b">Note: ${s.review_note}</em>` : ''}
        </div>
      </div>
    `).join('');
  }

  loadMyStories();
})();
