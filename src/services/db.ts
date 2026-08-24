import { OfflineSyncQueueItem, Patient, ReferralThread, HighRiskFlag, Encounter, FacilityTier } from '../types';

const DB_NAME = 'ContinuityEngine_DB';
const DB_VERSION = 1;
const STORE_QUEUE = 'sync_queue';
const STORE_LOCAL_CACHE = 'local_cache';

// Initialize IndexedDB with fallbacks
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_LOCAL_CACHE)) {
        db.createObjectStore(STORE_LOCAL_CACHE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Queue an action for background sync when offline
export async function enqueueOfflineAction(action: Omit<OfflineSyncQueueItem, 'id' | 'timestamp' | 'synced'>): Promise<OfflineSyncQueueItem> {
  const item: OfflineSyncQueueItem = {
    id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    ...action,
    timestamp: new Date().toISOString(),
    synced: false
  };

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_QUEUE, 'readwrite');
    tx.objectStore(STORE_QUEUE).add(item);
    await new Promise((res) => { tx.oncomplete = res; });
  } catch (e) {
    // Fallback to localStorage
    const current = getFallbackQueue();
    current.push(item);
    localStorage.setItem(STORE_QUEUE, JSON.stringify(current));
  }

  window.dispatchEvent(new CustomEvent('continuity:queue-updated'));
  return item;
}

// Retrieve pending offline sync queue items
export async function getPendingQueue(): Promise<OfflineSyncQueueItem[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_QUEUE, 'readonly');
    const store = tx.objectStore(STORE_QUEUE);
    const request = store.getAll();
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve(getFallbackQueue());
    });
  } catch (e) {
    return getFallbackQueue();
  }
}

// Remove synced items from queue
export async function removeQueueItems(ids: string[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_QUEUE, 'readwrite');
    const store = tx.objectStore(STORE_QUEUE);
    ids.forEach(id => store.delete(id));
    await new Promise((res) => { tx.oncomplete = res; });
  } catch (e) {
    const current = getFallbackQueue().filter(item => !ids.includes(item.id));
    localStorage.setItem(STORE_QUEUE, JSON.stringify(current));
  }
  window.dispatchEvent(new CustomEvent('continuity:queue-updated'));
}

// Cache data locally for offline reads
export async function setLocalCache(key: string, data: any): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_LOCAL_CACHE, 'readwrite');
    tx.objectStore(STORE_LOCAL_CACHE).put({ key, data, updatedAt: Date.now() });
  } catch (e) {
    localStorage.setItem(`cache_${key}`, JSON.stringify(data));
  }
}

export async function getLocalCache<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_LOCAL_CACHE, 'readonly');
    const store = tx.objectStore(STORE_LOCAL_CACHE);
    const request = store.get(key);
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result?.data || null);
      request.onerror = () => {
        const item = localStorage.getItem(`cache_${key}`);
        resolve(item ? JSON.parse(item) : null);
      };
    });
  } catch (e) {
    const item = localStorage.getItem(`cache_${key}`);
    return item ? JSON.parse(item) : null;
  }
}

function getFallbackQueue(): OfflineSyncQueueItem[] {
  try {
    const raw = localStorage.getItem(STORE_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
