import React from 'react';
import { User } from '../types';
import { ShieldCheck, UserCheck, LogOut, RefreshCw, Database, Radio, Sun, Moon, Monitor } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  lastSyncedAt?: string;
  onSyncClick?: () => void;
  isSyncing?: boolean;
  themeMode?: 'dark' | 'light';
  rawThemeMode?: 'dark' | 'light' | 'system';
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  lastSyncedAt,
  onSyncClick,
  isSyncing = false,
  themeMode = 'dark',
  rawThemeMode = 'dark',
  onToggleTheme,
}) => {
  const formattedSync = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  const isLight = themeMode === 'light';

  return (
    <header className={`border-b sticky top-0 z-40 shadow-xl transition-colors duration-200 ${
      isLight ? 'bg-white/95 border-slate-200 text-slate-900' : 'bg-slate-900/95 border-slate-800 text-white'
    }`}>
      {/* Indomaret Tricolor Top Gradient Line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#E31E25] via-[#0054A6] to-[#FFD100]"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Zone 1: Indomaret Logo + Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 px-2.5 py-1 rounded-xl bg-white flex items-center justify-center shadow-md shadow-[#0054A6]/20 border border-slate-200">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/4/44/Indomaret.svg"
              alt="Indomaret Logo"
              className="h-7 w-auto object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-base sm:text-lg font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Portal TC Surabaya
              </span>
              <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold shadow-sm ${
                isLight ? 'text-[#0054A6] bg-blue-50 border border-blue-200' : 'text-[#FFD100] bg-slate-950/80 border border-[#FFD100]/40'
              }`}>
                <Radio className="w-2.5 h-2.5 text-[#E31E25] animate-pulse" /> Live 10s
              </span>
            </div>
          </div>
        </div>

        {/* Zone 2: Sync Status / Information */}
        <div className="hidden md:flex items-center gap-4 text-xs font-mono">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border ${
            isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950/60 border-slate-800 text-slate-300'
          }`}>
            <Database className="w-3.5 h-3.5 text-emerald-500" />
            <span>Supabase DB</span>
          </div>
          {formattedSync && (
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border ${
              isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold' : 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
            }`}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Sinkron: {formattedSync} WIB</span>
            </div>
          )}
          {onSyncClick && (
            <button
              onClick={onSyncClick}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-[#0054A6] hover:brightness-110 transition-all cursor-pointer shadow-md disabled:opacity-50"
              title="Sinkronkan dengan Database Supabase Sekarang"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan'}</span>
            </button>
          )}
        </div>

        {/* Zone 3: User Action, Profile & Theme Toggle */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle Button (Terang / Gelap / Sistem) */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-sm border ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-[#FFD100] border-slate-700'
              }`}
              title={`Mode Tema Saat Ini: ${rawThemeMode === 'light' ? 'Terang' : rawThemeMode === 'dark' ? 'Gelap' : 'Otomatis Sistem'}. Klik untuk mengubah.`}
            >
              {rawThemeMode === 'light' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span className="hidden sm:inline">Terang</span>
                </>
              ) : rawThemeMode === 'dark' ? (
                <>
                  <Moon className="w-4 h-4 text-[#FFD100]" />
                  <span className="hidden sm:inline">Gelap</span>
                </>
              ) : (
                <>
                  <Monitor className="w-4 h-4 text-blue-400" />
                  <span className="hidden sm:inline">Sistem</span>
                </>
              )}
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className={`text-xs font-bold truncate max-w-[160px] ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {user.nama}
                </div>
                <div className="text-[11px] flex items-center justify-end gap-1 font-mono">
                  {user.role === 'admin' ? (
                    <span className="text-[#E31E25] flex items-center gap-0.5 font-bold">
                      <ShieldCheck className="w-3 h-3 text-[#E31E25]" /> Admin
                    </span>
                  ) : (
                    <span className={isLight ? 'text-slate-600' : 'text-slate-300'}>
                      NIK: {user.nik}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={onLogout}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all shadow ${
                  isLight
                    ? 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border-slate-300'
                    : 'bg-slate-800 hover:bg-rose-900/80 text-slate-200 hover:text-white border-slate-700 hover:border-rose-700'
                }`}
                title="Keluar dari Portal"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          ) : (
            <div className="text-xs font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FFD100] animate-ping"></span>
              <span className={isLight ? 'text-slate-600' : 'text-slate-300'}>Silakan Masuk</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
