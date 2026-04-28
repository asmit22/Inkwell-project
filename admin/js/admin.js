// admin/js/admin.js
// ─────────────────────────────────────────────────────────
//  Admin review dashboard.
//  • Verifies user is admin (via backend + Supabase role)
//  • Lists stories by status
//  • Approve / Reject actions
// ─────────────────────────────────────────────────────────

(async () => {
  const sb = window.supabase.createClient(
    window.__ENV.SUPABASE_URL,
    window.__ENV.SUPABASE_ANON_KEY
  );

  const { data: { session } } = await sb.auth.getSession();

  const accessDenied = document.getElementById('access-denied');
  const adminWrap    = document.getElementById('admin-wrap');
  const logoutBtn    = document.getElementById('nav-logout');

  // Sign out
  logoutBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    await sb.auth.signOut();
    window.location.href = '/';
  });

  // Must be logged in
  if (!session) { showDenied(); return; }

  // Check admin role via backend
  const profileRes = await fetch('/api/profile', {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const profile = await profileRes.json();
  if (profile.role !== 'admin') { showDenied(); return; }

  // Show admin UI
  accessDenied.style.display = 'none';
  adminWrap.style.display    = 'block';

  let currentStatus = 'pending_review';

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentStatus = btn.dataset.status;
      loadQueue();
    });
  });

  // Reject modal state
  let pendingRejectId = null;
  const modal       = document.getElementById('reject-modal');
  const rejectNote  = document.getElementById('reject-note');
  const modalCancel = document.getElementById('modal-cancel');
  const modalConfirm= document.getElementById('modal-confirm');

  modalCancel.addEventListener('click', () => { modal.style.display = 'none'; pendingRejectId = null; });
  modalConfirm.addEventListener('click', () => doReject(pendingRejectId));

  // Load queue
  async function loadQueue() {
    const list = document.getElementById('review-list');
    list.innerHTML = '<p class="loading-text">Loading…</p>';

    let stories;
    try {
      const res = await fetch(`/api/admin/stories?status=${currentStatus}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();

      // If the API returned an error object, show it
      if (!res.ok || data.error) {
        list.innerHTML = `<p style="color:red;padding:24px">API Error: ${data.error || res.statusText}</p>`;
        console.error('Admin API error:', data);
        return;
      }

      // If not an array something went wrong
      if (!Array.isArray(data)) {
        list.innerHTML = `<p style="color:red;padding:24px">Unexpected response: ${JSON.stringify(data)}</p>`;
        console.error('Unexpected response:', data);
        return;
      }

      stories = data;
    } catch (err) {
      list.innerHTML = `<p style="color:red;padding:24px">Network error: ${err.message}</p>`;
      console.error('Fetch error:', err);
      return;
    }

    if (!stories.length) {
      list.innerHTML = '<p class="loading-text">Queue is empty.</p>';
      return;
    }

    list.innerHTML = stories.map(s => {
      const author = s.author?.display_name || s.author?.email || 'Unknown';
      const date   = new Date(s.submitted_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
      const isFile = s.file_url
        ? `<button class="btn-secondary table-action-btn" onclick="viewManuscript('${s.id}', this)">📄 View Manuscript</button>`
        : '<span style="color:var(--muted);font-size:0.8rem">No file attached</span>';

      const actions = currentStatus === 'pending_review' ? `
        <button class="btn-primary"  onclick="approveStory('${s.id}')">✓ Approve</button>
        <button class="btn-danger"   onclick="openReject('${s.id}')">✗ Reject</button>
        ${isFile}
      ` : `
        <span class="status-badge status-${currentStatus.replace('_review','')}">${currentStatus.replace('_',' ')}</span>
        ${isFile}
        ${s.review_note ? `<p class="review-note">Note: ${s.review_note}</p>` : ''}
      `;

      return `
        <div class="review-card" id="card-${s.id}">
          <div class="review-card-header">
            <div>
              <div class="review-card-title">${escHtml(s.title)}</div>
              <div class="review-card-meta">
                by <strong>${escHtml(author)}</strong>
                · ${escHtml(s.genre || 'Unspecified')}
                · Submitted ${date}
              </div>
            </div>
          </div>
          <div class="review-card-synopsis">${escHtml(s.synopsis || 'No synopsis provided.')}</div>
          ${s.body ? `
          <details class="story-body-preview">
            <summary>📖 Read full story text</summary>
            <div class="story-body-text">${escHtml(s.body).replace(/\n\n+/g,'</p><p>').replace(/\n/g,'<br>')}</div>
          </details>` : ''}
          <div class="review-actions">${actions}</div>
        </div>
      `;
    }).join('');
  }

  // View manuscript via signed URL (admin only)
  window.viewManuscript = async (storyId, btn) => {
    const original = btn.textContent;
    btn.textContent = 'Loading…';
    btn.disabled = true;

    const res = await fetch(`/api/admin/manuscript/${storyId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();

    btn.textContent = original;
    btn.disabled = false;

    if (!res.ok) {
      alert('Could not load manuscript: ' + data.error);
      return;
    }
    // Open the signed URL in a new tab (valid for 1 hour)
    window.open(data.url, '_blank');
  };

  // Approve
  window.approveStory = async (id) => {
    const res = await fetch(`/api/admin/stories/${id}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      document.getElementById(`card-${id}`)?.remove();
      if (!document.querySelector('.review-card')) {
        document.getElementById('review-list').innerHTML = '<p class="loading-text">Queue is empty.</p>';
      }
    }
  };

  // Open reject modal
  window.openReject = (id) => {
    pendingRejectId = id;
    rejectNote.value = '';
    modal.style.display = 'flex';
  };

  async function doReject(id) {
    const note = rejectNote.value.trim();
    const res  = await fetch(`/api/admin/stories/${id}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ review_note: note }),
    });
    modal.style.display = 'none';
    pendingRejectId = null;
    if (res.ok) {
      document.getElementById(`card-${id}`)?.remove();
      if (!document.querySelector('.review-card')) {
        document.getElementById('review-list').innerHTML = '<p class="loading-text">Queue is empty.</p>';
      }
    }
  }

  function showDenied() {
    document.getElementById('access-denied').style.display = 'flex';
    adminWrap.style.display = 'none';
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  loadQueue();
})();
