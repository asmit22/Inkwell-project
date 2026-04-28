// public/js/auth-state.js
// ─────────────────────────────────────────────────────────
//  Runs on every page. Updates nav based on auth state.
//  Also injects an "Admin" link if the user is an admin.
// ─────────────────────────────────────────────────────────

(async () => {
  const sb = window.supabase.createClient(
    window.__ENV.SUPABASE_URL,
    window.__ENV.SUPABASE_ANON_KEY
  );

  const { data: { session } } = await sb.auth.getSession();

  const authLinks  = document.getElementById('nav-auth-links');
  const userMenu   = document.getElementById('nav-user-menu');
  const usernameEl = document.getElementById('nav-username');
  const logoutBtn  = document.getElementById('nav-logout');
  const logoutLi   = document.getElementById('nav-logout-li');

  if (session) {
    // Show user nav, hide login/signup
    if (authLinks) authLinks.style.display = 'none';
    if (userMenu)  userMenu.style.display  = 'flex';
    if (logoutLi)  logoutLi.style.display  = 'flex';
    if (usernameEl) usernameEl.textContent = session.user.email.split('@')[0];

    // Check if admin — if so, inject Admin link into nav
    try {
      const { data: profile } = await sb
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profile?.role === 'admin' && userMenu) {
        // Only add the link if it isn't already there
        if (!document.getElementById('nav-admin-link')) {
          const adminLink = document.createElement('a');
          adminLink.href = '/admin/dashboard';
          adminLink.id   = 'nav-admin-link';
          adminLink.textContent = 'Admin Review';
          adminLink.style.cssText = `
            font-size: 0.78rem;
            font-weight: 600;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: #c8832a;
            text-decoration: none;
            border: 1.5px solid #c8832a;
            padding: 6px 14px;
          `;
          // Insert before the Publish CTA
          const publishCta = userMenu.querySelector('.nav-cta');
          userMenu.insertBefore(adminLink, publishCta);
        }
      }
    } catch (e) {
      // Not an admin or profile fetch failed — no problem
    }

  } else {
    if (authLinks) authLinks.style.display = 'flex';
    if (userMenu)  userMenu.style.display  = 'none';
    if (logoutLi)  logoutLi.style.display  = 'none';
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await sb.auth.signOut();
      window.location.href = '/';
    });
  }
})();
