import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react';
import { isOffline, syncPendingQueue } from '../services/api';
import { getPendingQueue } from '../services/db';

interface OfflineSyncBannerProps {
  onSyncComplete?: () => void;
}

export const OfflineSyncBanner: React.FC<OfflineSyncBannerProps> = ({ onSyncComplete }) => {
  const [offline, setOffline] = useState(isOffline());
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncSuccess, setLastSyncSuccess] = useState<number | null>(null);

  const refreshState = async () => {
    setOffline(isOffline());
    const queue = await getPendingQueue();
    setPendingItems(queue);
  };

  useEffect(() => {
    refreshState();

    const handleUpdate = () => refreshState();
    window.addEventListener('online', handleUpdate);
    window.addEventListener('offline', handleUpdate);
    window.addEventListener('continuity:network-changed', handleUpdate);
    window.addEventListener('continuity:queue-updated', handleUpdate);

    return () => {
      window.removeEventListener('online', handleUpdate);
      window.removeEventListener('offline', handleUpdate);
      window.removeEventListener('continuity:network-changed', handleUpdate);
      window.removeEventListener('continuity:queue-updated', handleUpdate);
    };
  }, []);

  const handleSync = async () => {
    if (offline) return;
    setSyncing(true);
    try {
      const res = await syncPendingQueue();
      if (res.success) {
        setLastSyncSuccess(res.syncedCount);
        setTimeout(() => setLastSyncSuccess(null), 4000);
        await refreshState();
        onSyncComplete?.();
      }
    } finally {
      setSyncing(false);
    }
  };

  if (!offline && pendingItems.length === 0 && lastSyncSuccess === null) {
    return null;
  }

  return (
    <div id="offline-sync-banner" className="bg-[#EAE7DC] border-b border-[#D8D5C3] px-4 py-2.5 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2">
          {offline ? (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-[#8C7851] animate-ping" />
              <span className="font-bold text-[#8C7851] flex items-center gap-1.5 uppercase tracking-wide">
                <WifiOff className="w-3.5 h-3.5" />
                Offline Mode (PWA Edge Architecture)
              </span>
              <span className="text-[#2C332B]/80 hidden sm:inline">
                All patient registrations, vitals & referrals are securely saved in local IndexedDB.
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 text-[#4A5D4E]" />
              <span className="font-bold text-[#4A5D4E] uppercase tracking-wide">
                Network Connected
              </span>
              {pendingItems.length > 0 && (
                <span className="text-[#2C332B]/90 font-medium">
                  — {pendingItems.length} changes waiting for background sync.
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {lastSyncSuccess !== null && (
            <span className="text-[#4A5D4E] font-bold flex items-center gap-1 animate-fadeIn bg-white px-2.5 py-0.5 rounded-full border border-[#D8D5C3]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Synced {lastSyncSuccess} records to cloud
            </span>
          )}

          {pendingItems.length > 0 && (
            <button
              id="banner-sync-btn"
              onClick={handleSync}
              disabled={offline || syncing}
              className={`px-3 py-1 rounded-xl font-bold flex items-center space-x-1.5 transition-all text-xs ${
                offline
                  ? 'bg-[#D8D5C3] text-[#8C7851] cursor-not-allowed opacity-75'
                  : 'bg-[#4A5D4E] text-white hover:bg-[#3C4C3F] shadow-xs'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing...' : `Sync ${pendingItems.length} Records`}</span>
              {!offline && <ArrowRight className="w-3 h-3 ml-0.5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
