// public/js/dashboard.js
// ─────────────────────────────────────────────────────────
//  Writer dashboard: submission tracking + profile management
// ─────────────────────────────────────────────────────────

(async () => {
  const sb = window.supabase.createClient(
    window.__ENV.SUPABASE_URL,
    window.__ENV.SUPABASE_ANON_KEY
  );

  const { data: { session } } = await sb.auth.getSession();

  const authGate      = document.getElementById('auth-gate');
  const dashboardWrap = document.getElementById('dashboard-wrap');

  if (!session) {
    authGate.style.display      = 'flex';
    dashboardWrap.style.display = 'none';
    return;
  }

  authGate.style.display      = 'none';
  dashboardWrap.style.display = 'block';

  let allStories = [];
  let currentFilter = 'all';

  // ── Load stories ──
  async function loadStories() {
    const res = await fetch('/api/stories/mine', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    allStories = await res.ok ? await res.json() : [];
    updateStats();
    renderStories();
  }

  function updateStats() {
    const total    = allStories.length;
    const approved = allStories.filter(s => s.status === 'approved').length;
    const pending  = allStories.filter(s => s.status === 'pending_review').length;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-approved').textContent = approved;
    document.getElementById('stat-pending').textContent = pending;
  }

  function renderStories() {
    const tbody = document.getElementById('stories-tbody');
    const filtered = currentFilter === 'all'
      ? allStories
      : allStories.filter(s => s.status === currentFilter);

    if (!filtered.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center;padding:40px;color:var(--muted);font-style:italic;">
            ${currentFilter === 'all' ? 'No submissions yet.' : 'None in this category.'}
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(s => {
      const date = new Date(s.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      const statusClass = `status-${s.status}`;
      const statusText = s.status.replace('_', ' ');

      let actionBtn = '';
      if (s.status === 'rejected') {
        actionBtn = `<button class="table-action-btn btn-secondary" onclick="resubmit('${s.id}')">Resubmit</button>`;
      } else if (s.status === 'approved') {
        actionBtn = `<button class="table-action-btn btn-secondary" onclick="viewStory('${s.id}')">View</button>`;
      }

      return `
        <tr>
          <td><strong>${escHtml(s.title)}</strong></td>
          <td>${escHtml(s.genre || '—')}</td>
          <td><span class="status-badge ${statusClass}">${statusText}</span></td>
          <td>${date}</td>
          <td>
            ${actionBtn}
            ${s.review_note ? `<span title="${escHtml(s.review_note)}" style="cursor:help;color:var(--danger)">📝</span>` : ''}
          </td>
        </tr>
      `;
    }).join('');
  }

  // Tabs
  document.querySelectorAll('.dashboard-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dashboard-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderStories();
    });
  });

  // ── Load & edit profile ──
  async function loadProfile() {
    const res = await fetch('/api/profile', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const profile = await res.json();

    document.getElementById('profile-name').textContent = profile.display_name || '—';
    document.getElementById('profile-email').textContent = profile.email || '—';
    document.getElementById('profile-bio').textContent = profile.bio || 'No bio yet.';

    document.getElementById('edit-name').value = profile.display_name || '';
    document.getElementById('edit-bio').value = profile.bio || '';
  }

  const editProfileBtn = document.getElementById('edit-profile-btn');
  const cancelProfileBtn = document.getElementById('cancel-profile-btn');
  const profileView = document.getElementById('profile-view');
  const profileEdit = document.getElementById('profile-edit');
  const profileForm = document.getElementById('profile-form');

  editProfileBtn.addEventListener('click', () => {
    profileView.style.display = 'none';
    profileEdit.style.display = 'block';
  });

  cancelProfileBtn.addEventListener('click', () => {
    profileEdit.style.display = 'none';
    profileView.style.display = 'block';
  });

  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('profile-error');
    errorEl.style.display = 'none';

    const displayName = document.getElementById('edit-name').value.trim();
    const bio = document.getElementById('edit-bio').value.trim();

    const res = await fetch(`/api/profile/update`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ display_name: displayName, bio }),
    });

    if (res.ok) {
      await loadProfile();
      profileEdit.style.display = 'none';
      profileView.style.display = 'block';
    } else {
      const data = await res.json();
      errorEl.textContent = data.error || 'Failed to update profile';
      errorEl.style.display = 'block';
    }
  });

  // Global functions
  window.resubmit = (id) => {
    window.location.href = '/publish';
  };

  window.viewStory = (id) => {
    // TODO: Implement story reader
    alert('Story reader coming soon');
  };

  function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Initial load
  loadStories();
  loadProfile();
})();
