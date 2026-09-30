import React, { useState } from 'react';
import { api } from '../services/api';
import { User, AkunPintar } from '../types';
import {
  KeyRound,
  Shield,
  ArrowRight,
  UserCheck,
  AlertCircle,
  Database,
  Lock,
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User, akunPintar: AkunPintar | null) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'user' | 'admin'>('user');

  // User Login State
  const [nik, setNik] = useState('');
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [userError, setUserError] = useState('');

  // Admin Login State
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(false);
  const [adminError, setAdminError] = useState('');

  const handleUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');

    const cleanNik = nik.trim();
    if (!cleanNik) {
      setUserError('Silakan masukkan NIK Anda.');
      return;
    }

    try {
      setIsLoadingUser(true);
      const res = await api.loginNik(cleanNik);
      onLoginSuccess(res.user, res.akunPintar);
    } catch (err: any) {
      setUserError(err.message || 'NIK tidak terdaftar dalam sheet Users.');
    } finally {
      setIsLoadingUser(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');

    if (!adminUsername || !adminPassword) {
      setAdminError('Username dan Password wajib diisi.');
      return;
    }

    try {
      setIsLoadingAdmin(true);
      const res = await api.loginAdmin(adminUsername.trim(), adminPassword.trim());
      onLoginSuccess(res.user, null);
    } catch (err: any) {
      setAdminError(err.message || 'Kredensial Administrator tidak valid.');
    } finally {
      setIsLoadingAdmin(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Briefing */}
        <div className="lg:col-span-6 space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-950/60 border border-blue-800/40 text-blue-300 text-xs font-mono">
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>Portal Training Center Surabaya</span>
          </div>

          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Portal TC Surabaya
            </h1>
            <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed">
              Sistem resmi Training Center Surabaya untuk pendataan dan verifikasi akun aplikasi Pintar karyawan.
            </p>
          </div>
        </div>

        {/* Right Column: Authentication Card */}
        <div className="lg:col-span-6">
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-sm">
            {/* Tab Selector */}
            <div className="flex p-1 bg-slate-900/80 rounded-lg border border-slate-700/60 mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('user');
                  setUserError('');
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'user'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Masuk Karyawan</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('admin');
                  setAdminError('');
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Masuk Admin</span>
              </button>
            </div>

            {/* TAB 1: User Login by NIK */}
            {activeTab === 'user' && (
              <form onSubmit={handleUserLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Nomor Induk Karyawan (NIK)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={nik}
                      onChange={e => setNik(e.target.value)}
                      placeholder="Masukkan NIK Anda"
                      className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      autoFocus
                    />
                    <KeyRound className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
                  </div>
                </div>

                {userError && (
                  <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    <span>{userError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoadingUser}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingUser ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Memverifikasi NIK...
                    </span>
                  ) : (
                    <>
                      <span>Masuk ke Dashboard Pribadi</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* TAB 2: Admin Login */}
            {activeTab === 'admin' && (
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Username Administrator
                  </label>
                  <input
                    type="text"
                    value={adminUsername}
                    onChange={e => setAdminUsername(e.target.value)}
                    placeholder="Masukkan username admin"
                    className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Kata Sandi (Password)
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                      placeholder="Masukkan password admin"
                      className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                    <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
                  </div>
                </div>

                {adminError && (
                  <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    <span>{adminError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoadingAdmin}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  {isLoadingAdmin ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Memverifikasi Admin...
                    </span>
                  ) : (
                    <>
                      <span>Masuk Konsol Admin</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
