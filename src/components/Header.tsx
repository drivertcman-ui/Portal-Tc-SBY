import React from 'react';
import { User } from '../types';
import { ShieldCheck, UserCheck, LogOut, RefreshCw, Database, Radio } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  lastSyncedAt?: string;
  onSyncClick?: () => void;
  isSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  lastSyncedAt,
  onSyncClick,
  isSyncing = false,
}) => {
  const formattedSync = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Zone 1: Single Wordmark / Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
            <span className="font-mono text-sm tracking-wider">TC</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold tracking-tight text-white">
                Portal TC Surabaya
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                <Radio className="w-2.5 h-2.5 animate-pulse" /> Live 10s
              </span>
            </div>
          </div>
        </div>

        {/* Zone 2: Sync Status / Information */}
        <div className="hidden md:flex items-center gap-4 text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>Sheet ID: 1VyP2x...</span>
          </div>
          {formattedSync && (
            <div className="flex items-center gap-1.5 text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Sinkron: {formattedSync} WIB</span>
            </div>
          )}
          {onSyncClick && (
            <button
              onClick={onSyncClick}
              disabled={isSyncing}
              className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-pointer disabled:opacity-50"
              title="Sinkronkan dengan Google Sheets Sekarang"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan'}</span>
            </button>
          )}
        </div>

        {/* Zone 3: User Action & Profile */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-slate-200 truncate max-w-[160px]">
                  {user.nama}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-end gap-1 font-mono">
                  {user.role === 'admin' ? (
                    <span className="text-amber-400 flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3" /> Admin
                    </span>
                  ) : (
                    <span className="text-slate-400 flex items-center gap-0.5">
                      <UserCheck className="w-3 h-3 text-blue-400" /> NIK: {user.nik}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                title="Keluar dari Portal"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-400 font-mono">
              Silakan Masuk
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
