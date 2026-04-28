// public/js/stories.js
// ─────────────────────────────────────────────────────────
//  Fetches only approved stories from the backend.
//  Supports genre filter + live search.
// ─────────────────────────────────────────────────────────

const THUMB_CLASSES = ['card-thumb-1','card-thumb-2','card-thumb-3','card-thumb-4','card-thumb-5','card-thumb-6'];

const GENRE_COLORS = {
  'Fantasy':           'card-thumb-1',
  'Science Fiction':   'card-thumb-3',
  'Mystery & Thriller':'card-thumb-4',
  'Romance':           'card-thumb-5',
  'Horror':            'card-thumb-2',
  'Literary Fiction':  'card-thumb-6',
  'Historical Fiction':'card-thumb-1',
  'Short Story':       'card-thumb-3',
  'Poetry':            'card-thumb-5',
  'Non-Fiction':       'card-thumb-6',
};

let currentGenre = 'all';
let searchTimeout;

async function fetchStories(genre, search) {
  const params = new URLSearchParams();
  if (genre && genre !== 'all') params.set('genre', genre);
  if (search) params.set('search', search);

  const grid = document.getElementById('stories-grid');
  grid.innerHTML = '<p class="loading-text">Loading stories…</p>';

  try {
    const res = await fetch(`/api/stories?${params}`);
    const data = await res.json();

    if (!res.ok || data.error) {
      grid.innerHTML = `<p class="no-stories" style="color:red">Error: ${data.error || 'Could not load stories'}</p>`;
      console.error('Stories API error:', data);
      return [];
    }
    return Array.isArray(data) ? data : [];
  } catch (err) {
    grid.innerHTML = `<p class="no-stories" style="color:red">Network error: ${err.message}</p>`;
    return [];
  }
}

function renderStories(stories) {
  const grid = document.getElementById('stories-grid');
  if (!stories.length) {
    grid.innerHTML = `
      <div class="no-stories">
        <div style="font-size:3rem;margin-bottom:16px">📭</div>
        <h3 style="font-family:'Playfair Display',serif;margin-bottom:8px">No stories yet</h3>
        <p>Be the first to <a href="/publish" style="color:var(--amber)">publish a story</a>.</p>
      </div>`;
    return;
  }

  grid.innerHTML = stories.map((s, i) => {
    const thumbClass = GENRE_COLORS[s.genre] || THUMB_CLASSES[i % THUMB_CLASSES.length];
    const author = s.author?.display_name || 'Anonymous';
    const date   = new Date(s.approved_at || s.submitted_at).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    const synopsis = s.synopsis
      ? s.synopsis.length > 120 ? s.synopsis.slice(0, 120) + '…' : s.synopsis
      : 'No synopsis provided.';

    return `
      <div class="story-card" onclick="window.location='/read?id=${s.id}'" style="cursor:pointer">
        <div class="card-thumb ${thumbClass}">
          <div class="thumb-title">${escHtml(s.title)}</div>
          <div class="genre-badge">${escHtml(s.genre || 'Story')}</div>
        </div>
        <div class="card-body">
          <div class="card-title">${escHtml(s.title)}</div>
          <div class="card-excerpt">${escHtml(synopsis)}</div>
          <div class="card-meta">
            <div class="card-author">by <strong>${escHtml(author)}</strong></div>
            <div class="card-stats"><span>📅 ${date}</span></div>
          </div>
        </div>
      </div>`;
  }).join('');
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

async function refresh() {
  const search = document.getElementById('search')?.value.trim();
  const stories = await fetchStories(currentGenre, search);
  renderStories(stories);

  // Update count label
  const countEl = document.getElementById('stories-count');
  if (countEl && stories.length > 0) {
    countEl.textContent = `${stories.length} ${stories.length === 1 ? 'story' : 'stories'} — all editorially reviewed.`;
  }
}

// Genre buttons
document.querySelectorAll('.genre-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentGenre = btn.dataset.genre;
    refresh();
  });
});

// Search
document.getElementById('search')?.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(refresh, 350);
});

// Initial load
refresh();
