import { initDB, getAll } from './db.js';

const SESSION_KEY = 'pos_session';
const LAST_ACTIVITY_KEY = 'pos_last_activity';
const TIMEOUT_MS = 15 * 60 * 1000;

export const getCurrentSession = () => {
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const requireAuth = () => {
  const session = getCurrentSession();
  if (!session) window.location.href = 'login.html';
  const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || Date.now());
  if (Date.now() - lastActivity > TIMEOUT_MS) logout();
  ['click', 'keydown', 'touchstart'].forEach((evt) => window.addEventListener(evt, () => {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  }, { passive: true }));
  return session;
};

export const hasRole = (role) => getCurrentSession()?.role === role;

export const logout = () => {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);
  window.location.href = 'login.html';
};

const doLogin = async (username, password) => {
  await initDB();
  const users = await getAll('users');
  const found = users.find((u) => u.username === username && u.passwordHash === btoa(password));
  if (!found) return null;
  const session = { id: found.id, role: found.role, name: found.name, username: found.username };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  return session;
};

if (document.getElementById('loginForm')) {
  initDB();
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const user = await doLogin(formData.get('username'), formData.get('password'));
    const msg = document.getElementById('loginMessage');
    if (!user) {
      msg.textContent = 'Invalid credentials. Please try again.';
      msg.style.color = '#c62828';
      return;
    }
    msg.textContent = 'Login successful. Redirecting...';
    msg.style.color = '#2e7d32';
    setTimeout(() => (window.location.href = 'dashboard.html'), 250);
  });
}
