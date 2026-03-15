// NEON Multi-User Storage System
// All data keys are prefixed with the current user's username
// Admin can access any user's data

const USER_KEY = 'kj_current_user';
const USERS_KEY = 'kj_users';
const ADMIN_PIN = '1793';

// ---- Current user management ----
export function getCurrentUser() {
  return sessionStorage.getItem(USER_KEY) || 'admin';
}

export function setCurrentUser(username) {
  sessionStorage.setItem(USER_KEY, username);
}

export function clearCurrentUser() {
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem('kj_auth');
}

export function isCurrentUserAdmin() {
  const cur = getCurrentUser();
  if (cur === 'admin') return true;
  const users = getUsers();
  const u = users.find(u => u.username === cur);
  return u?.role === 'Admin';
}

// ---- User CRUD ----
export function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch { return []; }
}

export function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// ---- PIN authentication ----
// Returns { success, username, role } or { success: false, error }
export function authenticatePin(pin) {
  // Check admin pin first
  if (pin === ADMIN_PIN) {
    return { success: true, username: 'admin', role: 'Admin' };
  }

  // Check sub-user pins
  const users = getUsers();
  const user = users.find(u => u.pin === pin);
  if (user) {
    return { success: true, username: user.username, role: user.role };
  }

  return { success: false, error: 'Incorrect PIN' };
}

// ---- User-scoped localStorage ----
// Prefix keys with user to isolate data
function userKey(key, username) {
  const user = username || getCurrentUser();
  return `kj_${user}_${key}`;
}

export function getUserData(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(userKey(key));
    if (raw === null) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

export function setUserData(key, value) {
  localStorage.setItem(userKey(key), JSON.stringify(value));
}

export function removeUserData(key) {
  localStorage.removeItem(userKey(key));
}

// ---- Admin: access any user's data ----
export function getUserDataAs(username, key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(userKey(key, username));
    if (raw === null) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

// ---- Admin: get all users who have data ----
export function getAllUsernames() {
  const users = getUsers().map(u => u.username);
  // Always include admin
  if (!users.includes('admin')) users.unshift('admin');
  return users;
}

// ---- Admin: aggregate data across all users ----
export function getAggregatedData(key, defaultValue = []) {
  const usernames = getAllUsernames();
  const result = {};
  for (const username of usernames) {
    const data = getUserDataAs(username, key, defaultValue);
    if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
      result[username] = data;
    }
  }
  return result;
}

// ---- Migration: move old non-prefixed data to admin ----
export function migrateOldData() {
  const migrated = localStorage.getItem('kj_data_migrated');
  if (migrated) return;

  const oldKeys = {
    'kj_leads': 'leads',
    'kj_search_history': 'search_history',
    'kj_rank_history': 'rank_history',
    'kj_domain_history': 'domain_history',
  };

  for (const [oldKey, newSuffix] of Object.entries(oldKeys)) {
    const oldData = localStorage.getItem(oldKey);
    if (oldData) {
      const adminKey = `kj_admin_${newSuffix}`;
      // Only migrate if admin doesn't already have this data
      if (!localStorage.getItem(adminKey)) {
        localStorage.setItem(adminKey, oldData);
      }
    }
  }

  localStorage.setItem('kj_data_migrated', 'true');
}
