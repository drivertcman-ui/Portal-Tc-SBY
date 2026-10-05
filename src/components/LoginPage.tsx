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
  themeMode?: 'dark' | 'light';
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, themeMode = 'dark' }) => {
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

  const isLight = themeMode === 'light';

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
      setUserError(err.message || 'NIK tidak terdaftar dalam database karyawan.');
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
    <div className={`min-h-[calc(100vh-4rem)] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-200 ${
      isLight ? 'bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100' : 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950'
    }`}>
      {/* Background Decorative Gradient Blobs */}
      <div className="absolute top-1/4 left-10 w-72 h-72 bg-[#E31E25]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-[#0054A6]/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-[#FFD100]/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-4xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        {/* Left Column: Briefing & Indomaret Branding */}
        <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
          <div className="inline-block p-4 rounded-2xl bg-white shadow-2xl shadow-[#0054A6]/30 border border-slate-200 transform hover:scale-105 transition-transform">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/4/44/Indomaret.svg"
              alt="Indomaret Logo"
              className="h-12 sm:h-14 w-auto object-contain mx-auto lg:mx-0"
            />
          </div>

          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold shadow-sm ${
            isLight ? 'bg-white border border-blue-200 text-[#0054A6]' : 'bg-slate-900/90 border border-[#FFD100]/40 text-[#FFD100]'
          }`}>
            <Database className="w-3.5 h-3.5 text-[#E31E25]" />
            <span>Portal Training Center Surabaya</span>
          </div>

          <div>
            <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Sistem Pendataan & Absensi <br />
              <span className="bg-gradient-to-r from-[#E31E25] via-blue-600 to-[#0054A6] bg-clip-text text-transparent">
                TC Surabaya
              </span>
            </h1>
            <p className={`mt-3 text-sm sm:text-base leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Portal resmi Training Center Surabaya untuk verifikasi Akun Pintar, pencatatan absensi pelatihan, dan sinkronisasi real-time database Supabase.
            </p>
          </div>

          {/* Indomaret Tricolor Accent Bar */}
          <div className="h-1.5 w-36 rounded-full bg-gradient-to-r from-[#E31E25] via-[#0054A6] to-[#FFD100] mx-auto lg:mx-0"></div>
        </div>

        {/* Right Column: Authentication Card with Tricolor Gradient Border */}
        <div className="lg:col-span-6">
          <div className="p-[2.5px] rounded-3xl bg-gradient-to-r from-[#E31E25] via-[#0054A6] to-[#FFD100] shadow-2xl shadow-[#0054A6]/25">
            <div className={`rounded-[22px] p-6 sm:p-8 backdrop-blur-md transition-colors ${
              isLight ? 'bg-white/95 border border-slate-100 text-slate-900 shadow-xl' : 'bg-slate-900/95 border border-slate-800 text-white'
            }`}>
              {/* Tab Selector */}
              <div className={`flex p-1 rounded-xl border mb-6 ${
                isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950/80 border-slate-800'
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('user');
                    setUserError('');
                  }}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'user'
                      ? 'bg-gradient-to-r from-[#E31E25] via-[#0054A6] to-[#003875] text-white shadow-lg shadow-[#0054A6]/30'
                      : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserCheck className="w-4 h-4 text-[#FFD100]" />
                  <span>Masuk Karyawan</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin');
                    setAdminError('');
                  }}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'admin'
                      ? 'bg-gradient-to-r from-[#E31E25] via-[#0054A6] to-[#003875] text-white shadow-lg shadow-[#0054A6]/30'
                      : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Shield className="w-4 h-4 text-[#FFD100]" />
                  <span>Masuk Admin</span>
                </button>
              </div>

              {/* TAB 1: User Login by NIK */}
              {activeTab === 'user' && (
                <form onSubmit={handleUserLogin} className="space-y-4">
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                      Nomor Induk Karyawan (NIK)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={nik}
                        onChange={e => setNik(e.target.value)}
                        placeholder="Masukkan NIK Anda"
                        className={`w-full px-4 py-3 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0054A6] focus:border-transparent transition ${
                          isLight
                            ? 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 shadow-sm'
                            : 'bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 shadow-inner'
                        }`}
                        autoFocus
                      />
                      <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                    </div>
                  </div>

                  {userError && (
                    <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2 shadow">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                      <span>{userError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoadingUser}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-[#E31E25] via-[#0054A6] to-[#004080] hover:brightness-110 text-white rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-[#0054A6]/30 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoadingUser ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Memverifikasi NIK...
                      </span>
                    ) : (
                      <>
                        <span>Masuk Dashboard Pribadi</span>
                        <ArrowRight className="w-4 h-4 text-[#FFD100]" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* TAB 2: Admin Login */}
              {activeTab === 'admin' && (
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                      Username Administrator
                    </label>
                    <input
                      type="text"
                      value={adminUsername}
                      onChange={e => setAdminUsername(e.target.value)}
                      placeholder="Masukkan username admin"
                      className={`w-full px-4 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0054A6] focus:border-transparent transition ${
                        isLight
                          ? 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 shadow-sm'
                          : 'bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 shadow-inner'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                      Kata Sandi (Password)
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        value={adminPassword}
                        onChange={e => setAdminPassword(e.target.value)}
                        placeholder="Masukkan password admin"
                        className={`w-full px-4 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0054A6] focus:border-transparent transition ${
                          isLight
                            ? 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 shadow-sm'
                            : 'bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 shadow-inner'
                        }`}
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                    </div>
                  </div>

                  {adminError && (
                    <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2 shadow">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                      <span>{adminError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoadingAdmin}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-[#E31E25] via-[#0054A6] to-[#004080] hover:brightness-110 text-white rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-[#0054A6]/30 transition cursor-pointer disabled:opacity-50"
                  >
                    {isLoadingAdmin ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Memverifikasi Admin...
                      </span>
                    ) : (
                      <>
                        <span>Masuk Konsol Admin</span>
                        <ArrowRight className="w-4 h-4 text-[#FFD100]" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
