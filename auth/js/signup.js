// auth/js/signup.js
(async () => {
  const sb = window.supabase.createClient(
    window.__ENV.SUPABASE_URL,
    window.__ENV.SUPABASE_ANON_KEY
  );

  const { data: { session } } = await sb.auth.getSession();
  if (session) { window.location.href = '/publish'; return; }

  const form      = document.getElementById('signup-form');
  const errorEl   = document.getElementById('auth-error');
  const successEl = document.getElementById('auth-success');
  const signupBtn = document.getElementById('signup-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display   = 'none';
    successEl.style.display = 'none';

    const displayName = document.getElementById('display_name').value.trim();
    const email       = document.getElementById('email').value.trim();
    const password    = document.getElementById('password').value;
    const confirm     = document.getElementById('confirm').value;

    if (password !== confirm) {
      errorEl.textContent = 'Passwords do not match.';
      errorEl.style.display = 'block';
      return;
    }
    if (password.length < 8) {
      errorEl.textContent = 'Password must be at least 8 characters.';
      errorEl.style.display = 'block';
      return;
    }

    signupBtn.disabled = true;
    signupBtn.textContent = 'Creating account…';

    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });

    if (error) {
      errorEl.textContent = error.message;
      errorEl.style.display = 'block';
      signupBtn.disabled = false;
      signupBtn.textContent = 'Create Account';
      return;
    }

    // Update display_name in profiles table
    if (data.user) {
      await sb.from('profiles').update({ display_name: displayName }).eq('id', data.user.id);
    }

    successEl.textContent = '✓ Account created! Please check your email to confirm, then log in.';
    successEl.style.display = 'block';
    form.reset();
    signupBtn.disabled = false;
    signupBtn.textContent = 'Create Account';
  });
})();
