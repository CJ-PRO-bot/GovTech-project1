async function postJSON(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

function setMsg(el, text, isError) {
  el.textContent = text || '';
  el.className = 'msg' + (isError ? ' error' : ' success');
}

const signupForm = document.getElementById('signup-form');
const signupMsg = document.getElementById('signup-msg');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(signupForm);
    const email = (form.get('email') || '').toString().trim();
    const password = (form.get('password') || '').toString();

    const data = await postJSON('/signup', { email, password });
    if (data.ok) {
      setMsg(signupMsg, 'Account created. Redirecting...', false);
      setTimeout(() => (window.location.href = '/dashboard'), 600);
    } else {
      setMsg(signupMsg, data.error || 'Signup failed', true);
    }
  });
}

const loginForm = document.getElementById('login-form');
const loginMsg = document.getElementById('login-msg');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(loginForm);
    const email = (form.get('email') || '').toString().trim();
    const password = (form.get('password') || '').toString();

    const data = await postJSON('/login', { email, password });
    if (data.ok) {
      setMsg(loginMsg, 'Logged in. Redirecting...', false);
      setTimeout(() => (window.location.href = '/dashboard'), 600);
    } else {
      setMsg(loginMsg, data.error || 'Login failed', true);
    }
  });
}
