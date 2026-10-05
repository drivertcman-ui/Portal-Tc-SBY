import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { User, AkunPintar } from '../types';
import { api } from '../services/api';
import { TrainingAbsensi } from './TrainingAbsensi';
import { AgendaUndangan } from './AgendaUndangan';
import {
  Lock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Send,
  Building2,
  ShieldCheck,
  User as UserIcon,
  Phone,
  Mail,
  Key,
  HelpCircle,
  Sparkles,
  Smartphone,
  CalendarCheck2,
  UserCheck,
  Calendar,
  Edit3,
} from 'lucide-react';

interface UserDashboardProps {
  user: User;
  initialAkunPintar: AkunPintar | null;
  onUpdateAkunPintar: (updated: AkunPintar) => void;
  themeMode?: 'dark' | 'light';
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  user,
  initialAkunPintar,
  onUpdateAkunPintar,
  themeMode = 'dark',
}) => {
  // Navigation tab for Employee: 'akun-pintar' | 'absensi-training' | 'agenda-undangan'
  const [activeTab, setActiveTab] = useState<'akun-pintar' | 'absensi-training' | 'agenda-undangan'>('akun-pintar');

  const [wa, setWa] = useState(initialAkunPintar?.wa || user.wa || '');
  const [emailPintar, setEmailPintar] = useState(initialAkunPintar?.email_pintar || '');
  const [passwordPintar, setPasswordPintar] = useState(initialAkunPintar?.password_pintar || '');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  // Synchronize state when initialAkunPintar changes or loads asynchronously
  useEffect(() => {
    if (initialAkunPintar) {
      if (initialAkunPintar.wa) setWa(initialAkunPintar.wa);
      if (initialAkunPintar.email_pintar) setEmailPintar(initialAkunPintar.email_pintar);
      if (initialAkunPintar.password_pintar) setPasswordPintar(initialAkunPintar.password_pintar);
    }
  }, [initialAkunPintar]);

  const isLight = themeMode === 'light';

  // Is already filled
  const isRegistered = Boolean(initialAkunPintar?.email_pintar && initialAkunPintar.email_pintar.trim().length > 0);

  // Real-time validations
  const isWaValid = wa.trim().replace(/[^0-9]/g, '').length >= 8 && wa.trim().replace(/[^0-9]/g, '').length <= 16;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailPintar.trim());
  const isPasswordValid = passwordPintar.trim().length >= 4;
  const isFormValid = isWaValid && isEmailValid && isPasswordValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');

    if (!isFormValid) {
      setSubmitError('Pastikan seluruh kolom isian nomor WA, email, dan password telah valid.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.submitAkunPintar({
        wa: wa.trim(),
        email_pintar: emailPintar.trim().toLowerCase(),
        password_pintar: passwordPintar.trim(),
      });

      setSubmitSuccess(res.message || 'Data Akun Pintar berhasil disimpan dan disinkronkan!');
      onUpdateAkunPintar(res.record);

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}
    } catch (err: any) {
      setSubmitError(err.message || 'Gagal menyimpan data Akun Pintar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6 transition-all ${
      activeTab === 'agenda-undangan' ? 'max-w-[96rem] w-full' : 'max-w-6xl'
    }`}>
      {/* Privacy Notice Banner */}
      <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-700 shadow-sm' : 'bg-slate-800/80 border-slate-700/80 text-slate-300'
      }`}>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            <strong>Mode Akses Pribadi Aktif:</strong> Anda hanya dapat melihat dan mengelola data profil Anda sendiri.
          </span>
        </div>
        <div className={`hidden sm:inline-flex font-mono text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
          NIK: {user.nik}
        </div>
      </div>

      {/* User Welcome & Profile Header Card with Indomaret Tricolor Accent */}
      <div className="p-[2px] rounded-2xl bg-gradient-to-r from-[#E31E25] via-[#0054A6] to-[#FFD100] shadow-xl">
        <div className={`border rounded-[14px] p-6 relative overflow-hidden transition-colors ${
          isLight ? 'bg-white/95 border-slate-100 text-slate-900 shadow-sm' : 'bg-slate-900/95 border-slate-800 text-white'
        }`}>
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E31E25]/30 to-[#0054A6]/40 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#FFD100] font-bold text-xl shrink-0 shadow-lg">
                <UserIcon className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className={`text-xl sm:text-2xl font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {user.nama}
                  </h1>
                  {isRegistered ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-full shadow-sm">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Akun Pintar Terdaftar
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-[#FFD100] bg-amber-50 dark:bg-slate-950/80 border border-amber-300 dark:border-[#FFD100]/50 px-2.5 py-0.5 rounded-full animate-pulse shadow-sm">
                      <AlertTriangle className="w-3 h-3 text-[#E31E25]" /> Belum Terdaftar di AkunPintar
                    </span>
                  )}
                </div>

                <div className={`mt-2 flex flex-wrap items-center gap-y-1 gap-x-4 text-xs ${isLight ? 'text-slate-700 font-medium' : 'text-slate-300'}`}>
                  <div className="flex items-center gap-1">
                    <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>NIK:</span>
                    <span className={`font-mono font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{user.nik}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Jabatan:</span>
                    <span className="font-semibold text-[#0054A6] dark:text-blue-300">{user.jabatan}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-[#0054A6] dark:text-[#FFD100]" />
                    <span className={`font-medium ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{user.nama_toko}</span>
                    <span className={`font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>({user.kode_toko})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Menu Tabs for Employee */}
      <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-300' : 'border-slate-800'}`}>
        <div className={`flex items-center gap-2 p-1 rounded-2xl border shadow-inner ${
          isLight ? 'bg-slate-200/80 border-slate-300' : 'bg-slate-950/90 border-slate-800'
        }`}>
          <button
            type="button"
            onClick={() => setActiveTab('akun-pintar')}
            className={`px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'akun-pintar'
                ? 'bg-gradient-to-r from-[#E31E25] via-[#0054A6] to-[#003875] text-white shadow-lg shadow-[#0054A6]/30'
                : isLight ? 'text-slate-700 hover:text-slate-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4 text-[#FFD100]" />
            <span>Profil & Input Akun Pintar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('absensi-training')}
            className={`px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'absensi-training'
                ? 'bg-gradient-to-r from-[#E31E25] via-[#0054A6] to-[#003875] text-white shadow-lg shadow-[#0054A6]/30'
                : isLight ? 'text-slate-700 hover:text-slate-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarCheck2 className="w-4 h-4 text-[#FFD100]" />
            <span>Absensi Kehadiran Training</span>
            <span className="w-2 h-2 rounded-full bg-[#FFD100] animate-pulse"></span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('agenda-undangan')}
            className={`px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'agenda-undangan'
                ? 'bg-gradient-to-r from-[#E31E25] via-[#0054A6] to-[#003875] text-white shadow-lg shadow-[#0054A6]/30'
                : isLight ? 'text-slate-700 hover:text-slate-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4 text-[#FFD100]" />
            <span>Agenda Jadwal Training (Undangan)</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: Input Data Akun Pintar */}
      {activeTab === 'akun-pintar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Form Input Data Akun Pintar */}
          <div className="lg:col-span-7 space-y-6">
            <div className={`border rounded-2xl p-6 shadow-xl transition-colors ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-800/90 border-slate-700/80 text-white'
            }`}>
              <div className={`flex items-center justify-between pb-4 border-b ${isLight ? 'border-slate-200' : 'border-slate-700/60'}`}>
                <div>
                  <h2 className={`text-lg font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    <span>Input Data Akun Pintar</span>
                  </h2>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Lengkapi akun untuk sinkronisasi ke lembar data database <code>AkunPintar</code>
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-[11px] font-mono block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Database</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">Supabase</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                {/* STATUS KETERANGAN EDIT DATA */}
                {isRegistered ? (
                  <div className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
                    isLight
                      ? 'bg-blue-50 border-blue-200 text-blue-900'
                      : 'bg-blue-950/50 border-blue-800/70 text-blue-200'
                  }`}>
                    <Edit3 className="w-4 h-4 text-[#0054A6] dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-bold flex items-center gap-2 flex-wrap">
                        <span>Mode Edit Data: Data Akun Pintar Tersimpan</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800/60">
                          ✓ Tersimpan di Supabase
                        </span>
                      </div>
                      <p className="leading-relaxed opacity-90 text-[11.5px]">
                        Data Akun Pintar Anda telah terisi sebelumnya. Anda dapat memperbarui nomor WhatsApp, email pintar, atau kata sandi kapan saja di bawah ini, lalu klik tombol <strong>"Perbarui Data Akun Pintar"</strong>.
                      </p>
                      {initialAkunPintar?.updated_at && (
                        <div className="text-[10.5px] font-mono opacity-80 pt-0.5 text-slate-600 dark:text-slate-400">
                          🕒 Terakhir diperbarui: {new Date(initialAkunPintar.updated_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })} WIB
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    isLight
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                  }`}>
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Silakan lengkapi data nomor WhatsApp, email aplikasi Pintar, dan kata sandi Anda di bawah ini.</span>
                  </div>
                )}

                {/* LOCKED FIELDS (NIK, Nama, Jabatan terkunci) */}
                <div className={`space-y-3 p-3.5 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-700/50'
                }`}>
                  <div className={`flex items-center justify-between text-[11px] font-semibold mb-1 ${
                    isLight ? 'text-slate-600' : 'text-slate-400'
                  }`}>
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400" /> DATA TERKUNCI (OTOMATIS DARI SISTEM)
                    </span>
                    <span className="text-[10px]">Tidak dapat diubah manual</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className={`block text-[11px] font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>NIK</label>
                      <div className={`px-3 py-2 border rounded-lg text-xs font-mono font-bold ${
                        isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-800/80 border-slate-700 text-slate-300'
                      }`}>
                        {user.nik}
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className={`block text-[11px] font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Nama Lengkap</label>
                      <div className={`px-3 py-2 border rounded-lg text-xs font-semibold truncate ${
                        isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-800/80 border-slate-700 text-slate-300'
                      }`}>
                        {user.nama}
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <label className={`block text-[11px] font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Jabatan</label>
                      <div className={`px-3 py-2 border rounded-lg text-xs font-semibold ${
                        isLight ? 'bg-white border-slate-300 text-[#0054A6]' : 'bg-slate-800/80 border-slate-700 text-blue-300'
                      }`}>
                        {user.jabatan}
                      </div>
                    </div>
                  </div>
                </div>

                {/* USER INPUT FIELDS: Nomor WA, Email, Password */}
                <div className="space-y-4 pt-2">
                  {/* 1. Nomor WhatsApp */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`text-xs font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                        <Phone className="w-3.5 h-3.5 text-[#0054A6] dark:text-blue-400" />
                        <span>Nomor WhatsApp Aktif</span>
                      </label>
                      <span className={`text-[10px] font-mono ${isWaValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                        {isWaValid ? '✓ Format Sesuai' : 'Min. 8-15 digit'}
                      </span>
                    </div>
                    <input
                      type="tel"
                      value={wa}
                      onChange={e => setWa(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className={`w-full px-4 py-2.5 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0054A6] transition ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-slate-900/90 border-slate-700 text-white placeholder-slate-500'
                      }`}
                    />
                    <p className={`mt-1 text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Nomor WhatsApp aktif untuk koordinasi training dan verifikasi.
                    </p>
                  </div>

                  {/* 2. Email Aplikasi Pintar */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`text-xs font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                        <Mail className="w-3.5 h-3.5 text-[#0054A6] dark:text-blue-400" />
                        <span>Email Terdaftar di Aplikasi Pintar</span>
                      </label>
                      <span className={`text-[10px] font-mono ${isEmailValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                        {isEmailValid ? '✓ Email Valid' : 'Format: user@email.com'}
                      </span>
                    </div>
                    <input
                      type="email"
                      value={emailPintar}
                      onChange={e => setEmailPintar(e.target.value)}
                      placeholder="nama.karyawan@gmail.com"
                      className={`w-full px-4 py-2.5 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0054A6] transition ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-slate-900/90 border-slate-700 text-white placeholder-slate-500'
                      }`}
                    />
                    <p className={`mt-1 text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Gunakan email yang sama dengan yang Anda gunakan saat login di aplikasi Pintar.
                    </p>
                  </div>

                  {/* 3. Password Aplikasi Pintar */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`text-xs font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                        <Key className="w-3.5 h-3.5 text-[#0054A6] dark:text-blue-400" />
                        <span>Password Aplikasi Pintar</span>
                      </label>
                      <span className={`text-[10px] font-mono ${isPasswordValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                        {isPasswordValid ? '✓ Siap Sinkron' : 'Min. 4 karakter'}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordPintar}
                        onChange={e => setPasswordPintar(e.target.value)}
                        placeholder="Masukkan password akun Pintar"
                        className={`w-full px-4 py-2.5 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0054A6] transition pr-10 ${
                          isLight ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-slate-900/90 border-slate-700 text-white placeholder-slate-500'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute right-3 top-2.5 transition ${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className={`mt-1 text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Kata sandi untuk akses akun Pintar guna sinkronisasi data training.
                    </p>
                  </div>
                </div>

                {/* Real-time Checklist */}
                <div className={`p-3 rounded-lg border space-y-1 text-xs ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-900/80 border-slate-700/60 text-slate-300'
                }`}>
                  <div className={`text-[11px] font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Status Validasi Real-time:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${isWaValid ? 'text-emerald-500' : 'text-slate-400'}`} />
                      <span className={isWaValid ? (isLight ? 'text-slate-900 font-medium' : 'text-slate-200') : 'text-slate-400'}>Nomor WA Valid</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${isEmailValid ? 'text-emerald-500' : 'text-slate-400'}`} />
                      <span className={isEmailValid ? (isLight ? 'text-slate-900 font-medium' : 'text-slate-200') : 'text-slate-400'}>Email Format Valid</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${isPasswordValid ? 'text-emerald-500' : 'text-slate-400'}`} />
                      <span className={isPasswordValid ? (isLight ? 'text-slate-900 font-medium' : 'text-slate-200') : 'text-slate-400'}>Password Terisi</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className={isLight ? 'text-slate-900 font-medium' : 'text-slate-200'}>Kunci NIK & Jabatan Aktif</span>
                    </div>
                  </div>
                </div>

                {/* Feedback Alerts */}
                {submitError && (
                  <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/70 text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{submitError}</span>
                  </div>
                )}

                {submitSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/70 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{submitSuccess}</span>
                  </div>
                )}

                {/* Action Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !isFormValid}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-[#E31E25] via-[#0054A6] to-[#004080] hover:brightness-110 text-white rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-[#0054A6]/30 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Menyimpan & Menyinkronkan...
                    </span>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-[#FFD100]" />
                      <span>{isRegistered ? 'Perbarui Data Akun Pintar' : 'Simpan & Sinkronkan Data Akun Pintar'}</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Guidelines Panel */}
          <div className="lg:col-span-5 space-y-6">
            <div className={`border rounded-2xl p-6 shadow-xl space-y-4 transition-colors ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-800/90 border-slate-700/80 text-slate-300'
            }`}>
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#0054A6] dark:text-blue-400" />
                <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Panduan Pengisian Akun Pintar</h3>
              </div>

              <ol className={`space-y-3 text-xs list-decimal list-inside leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                <li className="pl-1">
                  <strong className={isLight ? 'text-slate-900' : 'text-white'}>Pastikan NIK & Profil Benar:</strong> Periksa nama dan jabatan Anda di atas sebelum melengkapi data.
                </li>
                <li className="pl-1">
                  <strong className={isLight ? 'text-slate-900' : 'text-white'}>Input Email & Sandi:</strong> Masukkan email dan kata sandi yang Anda daftarkan di aplikasi Pintar.
                </li>
                <li className="pl-1">
                  <strong className={isLight ? 'text-slate-900' : 'text-white'}>Klik Simpan:</strong> Sistem akan memvalidasi secara real-time dan menyimpan data ke database Supabase <code>akun_pintar</code>.
                </li>
                <li className="pl-1">
                  <strong className={isLight ? 'text-slate-900' : 'text-white'}>Selesaikan Pelatihan:</strong> Buka aplikasi Pintar di smartphone Anda dan selesaikan modul pelatihan yang ditugaskan oleh TC Surabaya.
                </li>
              </ol>

              <div className={`pt-2 border-t text-[11px] flex items-center gap-1.5 ${
                isLight ? 'border-slate-200 text-slate-600' : 'border-slate-700/60 text-slate-400'
              }`}>
                <HelpCircle className="w-3.5 h-3.5 text-[#0054A6] dark:text-blue-400 shrink-0" />
                <span>Butuh bantuan teknis? Hubungi tim Administrator TC Surabaya.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Menu Absensi Kehadiran Training */}
      {activeTab === 'absensi-training' && (
        <TrainingAbsensi user={user} themeMode={themeMode} />
      )}

      {/* VIEW 3: Agenda Jadwal Training (Data Agenda Undangan) */}
      {activeTab === 'agenda-undangan' && (
        <AgendaUndangan user={user} themeMode={themeMode} />
      )}
    </div>
  );
};
