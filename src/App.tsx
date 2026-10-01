/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, AkunPintar } from './types';
import { api } from './services/api';
import { Header } from './components/Header';
import { LoginPage } from './components/LoginPage';
import { UserDashboard } from './components/UserDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => api.getCachedUser());
  const [currentAkunPintar, setCurrentAkunPintar] = useState<AkunPintar | null>(() => api.getCachedAkunPintar());
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(() => !api.getCachedUser() && Boolean(api.getToken()));
  const [isSyncing, setIsSyncing] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Theme Mode State: 'dark' | 'light' | 'system' (Persisted in localStorage)
  const [themeMode, setThemeMode] = useState<'dark' | 'light' | 'system'>(() => {
    try {
      const saved = localStorage.getItem('tc_theme_mode');
      return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'dark';
    } catch {
      return 'dark';
    }
  });

  // Effective computed theme ('dark' or 'light')
  const [effectiveTheme, setEffectiveTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    try {
      localStorage.setItem('tc_theme_mode', themeMode);
    } catch {}

    const updateEffectiveTheme = () => {
      let resolved: 'dark' | 'light' = 'dark';
      if (themeMode === 'system') {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        resolved = themeMode;
      }
      setEffectiveTheme(resolved);

      if (resolved === 'light') {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
      }
    };

    updateEffectiveTheme();

    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => updateEffectiveTheme();
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode(prev => {
      if (prev === 'dark') return 'light';
      if (prev === 'light') return 'system';
      return 'dark';
    });
  };

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Check existing session & live polling every 10 seconds
  useEffect(() => {
    const onSessionExpired = () => {
      setCurrentUser(null);
      setCurrentAkunPintar(null);
      setIsLoadingAuth(false);
    };

    window.addEventListener('tc_auth_logout', onSessionExpired);

    const token = api.getToken();
    if (!token) {
      setIsLoadingAuth(false);
      return () => window.removeEventListener('tc_auth_logout', onSessionExpired);
    }

    const fetchMe = () => {
      api.getMe()
        .then(res => {
          setCurrentUser(prev => {
            if (!prev && !res.user) return null;
            if (prev && res.user && prev.nik === res.user.nik && prev.role === res.user.role && prev.nama === res.user.nama) return prev;
            return res.user;
          });
          setCurrentAkunPintar(prev => {
            if (!prev && !res.akunPintar) return null;
            if (prev && res.akunPintar && prev.email_pintar === res.akunPintar.email_pintar && prev.password_pintar === res.akunPintar.password_pintar && prev.wa === res.akunPintar.wa) return prev;
            return res.akunPintar;
          });
          setLastSyncedAt(prev => {
            if (prev === res.lastSyncedAt) return prev;
            return res.lastSyncedAt;
          });
        })
        .catch((err) => {
          // Do NOT clear token on network drops or temporary hiccups!
          // Real 401s are handled by api.ts emitting 'tc_auth_logout'.
          console.warn('Background session refresh notice (session maintained):', err);
        })
        .finally(() => {
          setIsLoadingAuth(false);
        });
    };

    fetchMe();

    // Background silent refresh every 30 seconds
    const interval = setInterval(fetchMe, 30000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('tc_auth_logout', onSessionExpired);
    };
  }, []);

  const handleLoginSuccess = (user: User, akunPintar: AkunPintar | null) => {
    setCurrentUser(user);
    setCurrentAkunPintar(akunPintar);
    setIsLoadingAuth(false);
    showNotification(`Selamat datang, ${user.nama}!`, 'success');
  };

  const handleLogout = () => {
    api.clearToken();
    setCurrentUser(null);
    setCurrentAkunPintar(null);
    showNotification('Anda telah berhasil keluar.', 'success');
  };

  const handleForceSync = async () => {
    try {
      setIsSyncing(true);
      const res = await api.triggerSync();
      setLastSyncedAt(res.lastSyncedAt);
      if (res.success) {
        showNotification(`Sinkronisasi Google Sheet berhasil (${res.userCount} data diperbarui)`, 'success');
      } else {
        showNotification(`Gagal sinkron: ${res.error}`, 'error');
      }
    } catch (err: any) {
      showNotification(`Gagal sinkron: ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateAkunPintar = (updated: AkunPintar) => {
    setCurrentAkunPintar(updated);
    showNotification('Data Akun Pintar berhasil diperbarui & disinkronkan!', 'success');
  };

  if (isLoadingAuth) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${effectiveTheme === 'light' ? 'bg-slate-100 text-slate-800' : 'bg-slate-950 text-slate-300'}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono">Memuat Portal TC Surabaya...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${effectiveTheme === 'light' ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'}`}>
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 border ${
              notification.type === 'success'
                ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
                : 'bg-rose-900 text-rose-100 border-rose-700'
            }`}
          >
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <Header
        user={currentUser}
        onLogout={handleLogout}
        lastSyncedAt={lastSyncedAt}
        onSyncClick={currentUser?.role === 'admin' ? handleForceSync : undefined}
        isSyncing={isSyncing}
        themeMode={effectiveTheme}
        rawThemeMode={themeMode}
        onToggleTheme={toggleTheme}
      />

      {/* Main Views */}
      <main className="flex-1">
        <ErrorBoundary fallbackMessage="Terjadi kendala pada tampilan dashboard">
          {!currentUser ? (
            <LoginPage onLoginSuccess={handleLoginSuccess} themeMode={effectiveTheme} />
          ) : currentUser.role === 'user' ? (
            <UserDashboard
              user={currentUser}
              initialAkunPintar={currentAkunPintar}
              onUpdateAkunPintar={handleUpdateAkunPintar}
              themeMode={effectiveTheme}
            />
          ) : (
            <AdminDashboard
              onForceSync={handleForceSync}
              isSyncing={isSyncing}
              themeMode={effectiveTheme}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <footer className={`border-t py-6 text-center text-xs transition-colors ${
        themeMode === 'light'
          ? 'border-slate-300 bg-white/80 text-slate-600'
          : 'border-slate-800/80 bg-slate-950/80 text-slate-400'
      }`}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Portal TC Surabaya &copy; {new Date().getFullYear()} - Sistem Pendataan & Sinkronisasi Akun Pintar Karyawan.
          </div>
          <div className="font-mono text-[11px] font-semibold opacity-80">
            Terhubung ke Google Spreadsheet ID: 1VyP2x_0zRX...
          </div>
        </div>
      </footer>
    </div>
  );
}
