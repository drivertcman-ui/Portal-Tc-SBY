import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { User, AkunPintar } from '../types';
import { api } from '../services/api';
import { TrainingAbsensi } from './TrainingAbsensi';
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
} from 'lucide-react';

interface UserDashboardProps {
  user: User;
  initialAkunPintar: AkunPintar | null;
  onUpdateAkunPintar: (updated: AkunPintar) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  user,
  initialAkunPintar,
  onUpdateAkunPintar,
}) => {
  // Navigation tab for Employee: 'akun-pintar' | 'absensi-training'
  const [activeTab, setActiveTab] = useState<'akun-pintar' | 'absensi-training'>('akun-pintar');

  const [wa, setWa] = useState(initialAkunPintar?.wa || user.wa || '');
  const [emailPintar, setEmailPintar] = useState(initialAkunPintar?.email_pintar || '');
  const [passwordPintar, setPasswordPintar] = useState(initialAkunPintar?.password_pintar || '');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Privacy Notice Banner */}
      <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Mode Akses Pribadi Aktif:</strong> Anda hanya dapat melihat dan mengelola data profil Anda sendiri.
          </span>
        </div>
        <div className="hidden sm:inline-flex font-mono text-[11px] text-slate-400">
          NIK: {user.nik}
        </div>
      </div>

      {/* User Welcome & Profile Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xl shrink-0">
              <UserIcon className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {user.nama}
                </h1>
                {isRegistered ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Akun Pintar Terdaftar
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-950/60 border border-amber-800/50 px-2.5 py-0.5 rounded-full animate-pulse">
                    <AlertTriangle className="w-3 h-3" /> Belum Terdaftar di AkunPintar
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-300">
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">NIK:</span>
                  <span className="font-mono font-semibold text-white">{user.nik}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">Jabatan:</span>
                  <span className="font-medium text-blue-300">{user.jabatan}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{user.nama_toko}</span>
                  <span className="font-mono text-slate-400">({user.kode_toko})</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Menu Tabs for Employee (Requirement: Penambahan Menu Absensi) */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 p-1 bg-slate-900/90 rounded-xl border border-slate-700/60">
          <button
            type="button"
            onClick={() => setActiveTab('akun-pintar')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'akun-pintar'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Profil & Input Akun Pintar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('absensi-training')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'absensi-training'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarCheck2 className="w-4 h-4" />
            <span>Absensi Kehadiran Training</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </button>
        </div>
      </div>

      {/* VIEW 1: Input Data Akun Pintar */}
      {activeTab === 'akun-pintar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Form Input Data Akun Pintar */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-700/60">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    <span>Input Data Akun Pintar</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Lengkapi akun untuk sinkronisasi ke lembar data database <code>AkunPintar</code>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-mono text-slate-400 block">Target Sheet</span>
                  <span className="text-xs font-semibold text-blue-400 font-mono">AkunPintar</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                {/* LOCKED FIELDS (NIK, Nama, Jabatan terkunci) */}
                <div className="space-y-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-700/50">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mb-1">
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400" /> DATA TERKUNCI (OTOMATIS DARI SISTEM)
                    </span>
                    <span className="text-[10px] text-slate-400">Tidak dapat diubah manual</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 font-medium mb-1">NIK</label>
                      <div className="px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-300">
                        {user.nik}
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-slate-400 font-medium mb-1">Nama Lengkap</label>
                      <div className="px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs font-semibold text-slate-300 truncate">
                        {user.nama}
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[11px] text-slate-400 font-medium mb-1">Jabatan</label>
                      <div className="px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs font-medium text-blue-300">
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
                      <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-blue-400" />
                        <span>Nomor WhatsApp Aktif</span>
                      </label>
                      <span className={`text-[10px] font-mono ${isWaValid ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {isWaValid ? '✓ Format Sesuai' : 'Min. 8-15 digit'}
                      </span>
                    </div>
                    <input
                      type="tel"
                      value={wa}
                      onChange={e => setWa(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className="w-full px-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      Nomor WhatsApp aktif untuk koordinasi training dan verifikasi.
                    </p>
                  </div>

                  {/* 2. Email Aplikasi Pintar */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-blue-400" />
                        <span>Email Terdaftar di Aplikasi Pintar</span>
                      </label>
                      <span className={`text-[10px] font-mono ${isEmailValid ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {isEmailValid ? '✓ Email Valid' : 'Format: user@email.com'}
                      </span>
                    </div>
                    <input
                      type="email"
                      value={emailPintar}
                      onChange={e => setEmailPintar(e.target.value)}
                      placeholder="nama.karyawan@gmail.com"
                      className="w-full px-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      Gunakan email yang sama dengan yang Anda gunakan saat login di aplikasi Pintar.
                    </p>
                  </div>

                  {/* 3. Password Aplikasi Pintar */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-blue-400" />
                        <span>Password Aplikasi Pintar</span>
                      </label>
                      <span className={`text-[10px] font-mono ${isPasswordValid ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {isPasswordValid ? '✓ Siap Sinkron' : 'Min. 4 karakter'}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordPintar}
                        onChange={e => setPasswordPintar(e.target.value)}
                        placeholder="Masukkan password akun Pintar"
                        className="w-full px-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Kata sandi untuk akses akun Pintar guna sinkronisasi data training.
                    </p>
                  </div>
                </div>

                {/* Real-time Checklist */}
                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-700/60 space-y-1 text-xs">
                  <div className="text-[11px] font-semibold text-slate-300 mb-1.5">
                    Status Validasi Real-time:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${isWaValid ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <span className={isWaValid ? 'text-slate-200' : 'text-slate-400'}>Nomor WA Valid</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${isEmailValid ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <span className={isEmailValid ? 'text-slate-200' : 'text-slate-400'}>Email Format Valid</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${isPasswordValid ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <span className={isPasswordValid ? 'text-slate-200' : 'text-slate-400'}>Password Terisi</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-slate-200">Kunci NIK & Jabatan Aktif</span>
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
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Menyimpan & Menyinkronkan...
                    </span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{isRegistered ? 'Perbarui Data Akun Pintar' : 'Simpan & Sinkronkan Data Akun Pintar'}</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Guidelines Panel */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Panduan Pengisian Akun Pintar</h3>
              </div>

              <ol className="space-y-3 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
                <li className="pl-1">
                  <strong className="text-white">Pastikan NIK & Profil Benar:</strong> Periksa nama dan jabatan Anda di atas sebelum melengkapi data.
                </li>
                <li className="pl-1">
                  <strong className="text-white">Input Email & Sandi:</strong> Masukkan email dan kata sandi yang Anda daftarkan di aplikasi Pintar.
                </li>
                <li className="pl-1">
                  <strong className="text-white">Klik Simpan:</strong> Sistem akan memvalidasi secara real-time dan menyimpan data ke sheet <code>AkunPintar</code>.
                </li>
                <li className="pl-1">
                  <strong className="text-white">Selesaikan Pelatihan:</strong> Buka aplikasi Pintar di smartphone Anda dan selesaikan modul pelatihan yang ditugaskan oleh TC Surabaya.
                </li>
              </ol>

              <div className="pt-2 border-t border-slate-700/60 text-[11px] text-slate-400 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Butuh bantuan teknis? Hubungi tim Administrator TC Surabaya.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Menu Absensi Kehadiran Training */}
      {activeTab === 'absensi-training' && (
        <TrainingAbsensi user={user} />
      )}
    </div>
  );
};
