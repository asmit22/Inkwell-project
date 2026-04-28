// auth/js/login.js
(async () => {
  const sb = window.supabase.createClient(
    window.__ENV.SUPABASE_URL,
    window.__ENV.SUPABASE_ANON_KEY
  );

  // Redirect if already logged in
  const { data: { session } } = await sb.auth.getSession();
  if (session) { window.location.href = '/publish'; return; }

  const form     = document.getElementById('login-form');
  const errorEl  = document.getElementById('auth-error');
  const loginBtn = document.getElementById('login-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in…';

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    const { error } = await sb.auth.signInWithPassword({ email, password });

    if (error) {
      errorEl.textContent = error.message;
      errorEl.style.display = 'block';
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign In';
    } else {
      window.location.href = '/publish';
    }
  });
})();
