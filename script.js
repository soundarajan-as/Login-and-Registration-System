// AuthSys front-end logic
// Talks to the Flask + MySQL backend via fetch() instead of localStorage.

function toast(msg, type = 'info') {
  const wrap = document.getElementById('toastWrap');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast-msg toast-${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 0.4s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 400);
  }, 3000);
}

function switchPage(from, to) {
  const f = document.getElementById(from), t = document.getElementById(to);
  f.style.animation = 'pageOut 0.38s cubic-bezier(0.16,1,0.3,1) forwards';
  setTimeout(() => { f.classList.remove('active'); f.style.animation = ''; t.classList.add('active'); }, 360);
}

function goTab(from, to) {
  if (from === to) return;
  switchPage(from, to);
}

document.querySelectorAll('.btn-primary-custom').forEach(btn => {
  btn.addEventListener('click', function (e) {
    const r = document.createElement('div'); r.className = 'ripple';
    const rect = this.getBoundingClientRect(), size = Math.max(rect.width, rect.height);
    r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px`;
    this.appendChild(r); setTimeout(() => r.remove(), 600);
  });
});

function loadDashboard(user) {
  document.getElementById('navAvatar1').textContent = user.name[0].toUpperCase();
  document.getElementById('navName1').textContent = user.name;
  document.getElementById('navAvatar2').textContent = user.name[0].toUpperCase();
  document.getElementById('navName2').textContent = user.name;
  document.getElementById('confirmName').textContent = user.name;
  document.getElementById('confirmEmail').textContent = user.email;
}

function shakeField(id) {
  const el = document.getElementById(id);
  el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 400);
}

async function handleLogin() {
  const id = document.getElementById('loginUser').value.trim();
  const pw = document.getElementById('loginPass').value;
  const btn = document.getElementById('loginBtn');

  if (!id || !pw) {
    toast('Please fill in all fields!', 'error');
    shakeField('loginUser');
    return;
  }

  btn.innerHTML = '<span class="spin"></span>Signing in...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: id, password: pw }),
    });
    const data = await res.json();

    if (data.ok) {
      toast(`${data.message} 🎉`, 'success');
      setTimeout(() => { switchPage('loginPage', 'dashboardPage'); loadDashboard(data.user); }, 600);
    } else {
      toast(data.message, 'error');
      shakeField('loginPass');
    }
  } catch (err) {
    toast('Could not reach the server. Try again.', 'error');
  } finally {
    btn.innerHTML = 'Sign In →';
    btn.disabled = false;
  }
}

async function handleRegister() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const user = document.getElementById('regUser').value.trim();
  const pass = document.getElementById('regPass').value;
  const btn = document.getElementById('regBtn');

  if (!name || !email || !user || !pass) { toast('Please fill in all fields!', 'error'); return; }
  if (pass.length < 6) { toast('Password must be at least 6 characters!', 'error'); return; }

  btn.innerHTML = '<span class="spin"></span>Creating account...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, username: user, password: pass }),
    });
    const data = await res.json();

    if (data.ok) {
      toast(`${data.message} 🎉`, 'success');
      setTimeout(() => { switchPage('registerPage', 'dashboardPage'); loadDashboard(data.user); }, 600);
    } else {
      toast(data.message, 'error');
    }
  } catch (err) {
    toast('Could not reach the server. Try again.', 'error');
  } finally {
    btn.innerHTML = 'Create Account →';
    btn.disabled = false;
  }
}

async function handleLogout() {
  await fetch('/api/logout', { method: 'POST' });
  toast('Logged out. See you soon!', 'info');
  setTimeout(() => switchPage(document.querySelector('.page.active').id, 'loginPage'), 400);
  ['loginUser', 'loginPass', 'regName', 'regEmail', 'regUser', 'regPass'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
}

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const active = document.querySelector('.page.active');
  if (active.id === 'loginPage') handleLogin();
  else if (active.id === 'registerPage') handleRegister();
});

window.onload = async () => {
  try {
    const res = await fetch('/api/session');
    const data = await res.json();
    if (data.ok) {
      document.getElementById('loginPage').classList.remove('active');
      document.getElementById('dashboardPage').classList.add('active');
      loadDashboard(data.user);
    }
  } catch (err) {
    // no active session / server not reachable yet — stay on login page
  }
};
