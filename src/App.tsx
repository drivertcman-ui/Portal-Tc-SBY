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

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentAkunPintar, setCurrentAkunPintar] = useState<AkunPintar | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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
          setCurrentUser(res.user);
          setCurrentAkunPintar(res.akunPintar);
          setLastSyncedAt(res.lastSyncedAt);
        })
        .catch(() => {
          api.clearToken();
        })
        .finally(() => {
          setIsLoadingAuth(false);
        });
    };

    fetchMe();

    // Auto-refresh every 10 seconds for live synchronization
    const interval = setInterval(fetchMe, 10000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('tc_auth_logout', onSessionExpired);
    };
  }, []);

  const handleLoginSuccess = (user: User, akunPintar: AkunPintar | null) => {
    setCurrentUser(user);
    setCurrentAkunPintar(akunPintar);
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono">Memuat Portal TC Surabaya...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 border ${
              notification.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800'
                : 'bg-rose-950/90 text-rose-300 border-rose-800'
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
      />

      {/* Main Views */}
      <main className="flex-1">
        {!currentUser ? (
          <LoginPage onLoginSuccess={handleLoginSuccess} />
        ) : currentUser.role === 'user' ? (
          <UserDashboard
            user={currentUser}
            initialAkunPintar={currentAkunPintar}
            onUpdateAkunPintar={handleUpdateAkunPintar}
          />
        ) : (
          <AdminDashboard
            onForceSync={handleForceSync}
            isSyncing={isSyncing}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/60 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Portal TC Surabaya &copy; {new Date().getFullYear()} - Sistem Pendataan & Sinkronisasi Akun Pintar Karyawan.
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Terhubung ke Google Spreadsheet ID: 1VyP2x_0zRX...
          </div>
        </div>
      </footer>
    </div>
  );
}
