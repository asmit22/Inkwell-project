// public/js/reader.js
// ─────────────────────────────────────────────────────────
//  Loads a single approved story from the API by ID
//  and renders it as a readable page.
// ─────────────────────────────────────────────────────────

(async () => {
  // Get story ID from URL: /read?id=uuid
  const params  = new URLSearchParams(window.location.search);
  const storyId = params.get('id');

  const loadingEl = document.getElementById('reader-loading');
  const errorEl   = document.getElementById('reader-error');
  const articleEl = document.getElementById('reader-article');

  function showError() {
    loadingEl.style.display = 'none';
    errorEl.style.display   = 'flex';
  }

  if (!storyId) { showError(); return; }

  // ── Fetch story ──
  let story;
  try {
    const res = await fetch(`/api/stories/${storyId}`);
    const data = await res.json();
    if (!res.ok || data.error) { showError(); return; }
    story = data;
  } catch (e) { showError(); return; }

  // ── Populate page ──
  document.title = `${story.title} — Inkwell`;

  document.getElementById('reader-genre').textContent  = story.genre || 'Story';
  document.getElementById('reader-title').textContent  = story.title;
  document.getElementById('reader-author').textContent = story.author?.display_name || 'Anonymous';
  document.getElementById('reader-synopsis').textContent = story.synopsis || '';

  const date = new Date(story.approved_at || story.submitted_at)
    .toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('reader-date').textContent = date;

  // ── Render story body ──
  const bodyEl = document.getElementById('reader-body');

  if (story.body && story.body.trim()) {
    // Split on double newlines for paragraphs, single newlines become <br>
    const paragraphs = story.body
      .trim()
      .split(/\n\n+/)
      .filter(p => p.trim())
      .map(p => `<p>${escHtml(p.trim()).replace(/\n/g, '<br>')}</p>`)
      .join('');

    bodyEl.innerHTML = paragraphs;

    // Estimate reading time
    const wordCount = story.body.trim().split(/\s+/).length;
    const minutes   = Math.max(1, Math.round(wordCount / 200));
    document.getElementById('reader-time').textContent = `${minutes} min read · ${wordCount.toLocaleString()} words`;

  } else if (story.file_url) {
    // No body text — show manuscript button only
    bodyEl.innerHTML = `
      <p style="color:var(--muted-text,var(--muted));font-style:italic;text-align:center;padding:40px 0">
        This story is available as a manuscript file.
      </p>`;
    document.getElementById('reader-pdf-wrap').style.display = 'block';
    document.getElementById('reader-time').textContent = 'Manuscript';

    document.getElementById('open-pdf-btn').addEventListener('click', () => {
      window.open(story.file_url, '_blank');
    });
  } else {
    bodyEl.innerHTML = `
      <p style="color:var(--muted-text,var(--muted));font-style:italic;text-align:center;padding:40px 0">
        No content available for this story yet.
      </p>`;
    document.getElementById('reader-time').textContent = '';
  }

  // ── Show article ──
  loadingEl.style.display  = 'none';
  articleEl.style.display  = 'block';

  // ── Set hero background colour by genre ──
  const GENRE_COLORS = {
    'Fantasy':           '#2c4a6e',
    'Science Fiction':   '#2a4a3a',
    'Mystery & Thriller':'#3a2e5a',
    'Romance':           '#4a2a3a',
    'Horror':            '#2a1a1a',
    'Literary Fiction':  '#3a2a1a',
    'Historical Fiction':'#2a3a2a',
    'Short Story':       '#1a3a4a',
    'Poetry':            '#3a1a3a',
    'Non-Fiction':       '#2a2a3a',
  };
  const heroEl = document.getElementById('reader-hero');
  const color  = GENRE_COLORS[story.genre] || '#1a1209';
  heroEl.style.background = `linear-gradient(135deg, ${color}, ${color}cc)`;

  // ── Font size controls ──
  let fontSize = parseFloat(
    getComputedStyle(document.documentElement)
      .getPropertyValue('--reader-font-size') || '1.15'
  ) || 1.15;

  document.getElementById('font-increase').addEventListener('click', () => {
    fontSize = Math.min(1.6, fontSize + 0.1);
    bodyEl.style.fontSize = fontSize + 'rem';
  });
  document.getElementById('font-decrease').addEventListener('click', () => {
    fontSize = Math.max(0.9, fontSize - 0.1);
    bodyEl.style.fontSize = fontSize + 'rem';
  });

  // ── Theme controls ──
  function setTheme(theme) {
    document.body.classList.remove('theme-light', 'theme-sepia', 'theme-dark');
    document.body.classList.add('theme-' + theme);
    localStorage.setItem('inkwell-theme', theme);
  }
  // Restore saved theme
  const savedTheme = localStorage.getItem('inkwell-theme') || 'light';
  setTheme(savedTheme);

  document.getElementById('theme-light').addEventListener('click', () => setTheme('light'));
  document.getElementById('theme-sepia').addEventListener('click', () => setTheme('sepia'));
  document.getElementById('theme-dark').addEventListener('click',  () => setTheme('dark'));

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
})();
