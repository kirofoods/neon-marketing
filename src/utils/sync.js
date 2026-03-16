// PROTOCOL Cloud Sync — Firebase Realtime Database
// Syncs localStorage data across devices for the same user PIN

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, off } from 'firebase/database';

let app = null;
let db = null;
let syncListener = null;
let syncEnabled = false;

// Keys to sync across devices
const SYNC_KEYS = [
  'protocol_leads',
  'protocol_lead_folders',
  'kj_claude_key',
  'kj_openai_key',
  'kj_gemini_key',
  'kj_apify_token',
  'kj_google_api_key',
  'kj_google_cx',
  'kj_shopify_store',
  'kj_shopify_token',
  'kj_ai_provider',
  'kj_brand_voice',
];

export function initSync(firebaseConfig) {
  try {
    if (!firebaseConfig || !firebaseConfig.apiKey) return false;
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    syncEnabled = true;
    console.log('[PROTOCOL Sync] Firebase initialized');
    return true;
  } catch (e) {
    console.error('[PROTOCOL Sync] Init failed:', e.message);
    return false;
  }
}

export function isSyncEnabled() {
  return syncEnabled && db !== null;
}

function getUserPath(userPin) {
  // Hash the PIN for privacy (simple hash, not cryptographic)
  const hash = btoa(userPin).replace(/[^a-zA-Z0-9]/g, '');
  return `users/${hash}`;
}

// Push all local data to cloud
export async function pushToCloud(userPin) {
  if (!isSyncEnabled() || !userPin) return { success: false, error: 'Sync not enabled' };

  try {
    const path = getUserPath(userPin);
    const data = {};

    // Collect all syncable data
    for (const key of SYNC_KEYS) {
      const val = localStorage.getItem(key);
      if (val !== null) data[key] = val;
    }

    // Also sync user-scoped keys
    const userPrefix = `kj_${userPin}_`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(userPrefix)) {
        data[key] = localStorage.getItem(key);
      }
    }

    data._lastSync = Date.now();
    data._device = navigator.userAgent.substring(0, 50);

    await set(ref(db, path), data);
    console.log(`[PROTOCOL Sync] Pushed ${Object.keys(data).length} keys to cloud`);
    return { success: true, keys: Object.keys(data).length };
  } catch (e) {
    console.error('[PROTOCOL Sync] Push failed:', e);
    return { success: false, error: e.message };
  }
}

// Pull cloud data to local
export async function pullFromCloud(userPin) {
  if (!isSyncEnabled() || !userPin) return { success: false, error: 'Sync not enabled' };

  try {
    const path = getUserPath(userPin);
    const snapshot = await get(ref(db, path));

    if (!snapshot.exists()) {
      return { success: true, keys: 0, message: 'No cloud data found' };
    }

    const data = snapshot.val();
    let count = 0;

    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('_')) continue; // Skip metadata
      localStorage.setItem(key, value);
      count++;
    }

    console.log(`[PROTOCOL Sync] Pulled ${count} keys from cloud`);
    return { success: true, keys: count, lastSync: data._lastSync, device: data._device };
  } catch (e) {
    console.error('[PROTOCOL Sync] Pull failed:', e);
    return { success: false, error: e.message };
  }
}

// Start real-time sync listener
export function startRealtimeSync(userPin, onUpdate) {
  if (!isSyncEnabled() || !userPin) return;

  stopRealtimeSync(); // Clean up any existing listener

  const path = getUserPath(userPin);
  syncListener = onValue(ref(db, path), (snapshot) => {
    if (!snapshot.exists()) return;
    const data = snapshot.val();

    // Only apply if the data is from a different device
    const lastSync = parseInt(localStorage.getItem('_protocol_last_local_sync') || '0');
    if (data._lastSync && data._lastSync > lastSync) {
      let count = 0;
      for (const [key, value] of Object.entries(data)) {
        if (key.startsWith('_')) continue;
        const current = localStorage.getItem(key);
        if (current !== value) {
          localStorage.setItem(key, value);
          count++;
        }
      }
      if (count > 0 && onUpdate) {
        onUpdate({ keys: count, from: data._device, at: data._lastSync });
      }
    }
  });
}

export function stopRealtimeSync() {
  if (syncListener) {
    // Firebase listener cleanup happens when ref is detached
    syncListener = null;
  }
}

// Get sync status
export async function getSyncStatus(userPin) {
  if (!isSyncEnabled() || !userPin) return null;

  try {
    const path = getUserPath(userPin);
    const snapshot = await get(ref(db, path));
    if (!snapshot.exists()) return { hasCloudData: false };

    const data = snapshot.val();
    return {
      hasCloudData: true,
      lastSync: data._lastSync,
      device: data._device,
      keyCount: Object.keys(data).filter(k => !k.startsWith('_')).length,
    };
  } catch (e) {
    return { hasCloudData: false, error: e.message };
  }
}

// Parse Firebase config from JSON string
export function parseFirebaseConfig(configStr) {
  try {
    const config = JSON.parse(configStr);
    if (config.apiKey && config.projectId && config.databaseURL) {
      return config;
    }
    // Try to extract from a broader object
    if (config.firebaseConfig) return parseFirebaseConfig(JSON.stringify(config.firebaseConfig));
    return null;
  } catch {
    return null;
  }
}
