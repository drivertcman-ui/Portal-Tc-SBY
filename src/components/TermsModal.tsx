import React from 'react';
import { ShieldCheck, X, FileText, CheckCircle2, Lock, Scale, Building2 } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeMode?: 'dark' | 'light';
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose, themeMode = 'dark' }) => {
  if (!isOpen) return null;
  const isLight = themeMode === 'light';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className={`border rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
      }`}>
        {/* Modal Header */}
        <div className={`p-5 border-b flex items-start justify-between gap-4 ${
          isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950/80'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0054A6] to-[#003875] text-[#FFD100] flex items-center justify-center shrink-0 shadow">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-base font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Syarat & Ketentuan Penggunaan
              </h3>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Hak Cipta & Ketentuan Layanan Portal Training Center Surabaya
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              isLight ? 'border-slate-300 hover:bg-slate-200 text-slate-700' : 'border-slate-700 hover:bg-slate-800 text-slate-300'
            }`}
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs leading-relaxed">
          {/* Hak Cipta & Kepemilikan Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-blue-950/40 border border-blue-700/50 text-blue-200 space-y-1.5 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-sm text-[#FFD100]">
              <ShieldCheck className="w-4 h-4" />
              <span>Hak Cipta & Kepemilikan Resmi</span>
            </div>
            <p className="text-slate-200 text-xs">
              Hak cipta dan seluruh kepemilikan intelektual atas sistem dan aplikasi web ini dilindungi oleh undang-undang atas nama <strong>Bang Ajiib</strong>.
            </p>
            <div className="font-mono text-[11px] text-blue-300 font-semibold pt-1">
              &copy; {new Date().getFullYear()} Bang Ajiib. All Rights Reserved.
            </div>
          </div>

          {/* Section 1: Penggunaan Layanan */}
          <div className="space-y-2">
            <h4 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <FileText className="w-4 h-4 text-[#0054A6] dark:text-blue-400" />
              <span>1. Ketentuan Umum & Penggunaan Portal</span>
            </h4>
            <ul className={`list-disc list-inside space-y-1.5 pl-1 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              <li>Portal ini diperuntukkan secara khusus bagi karyawan terdaftar di lingkungan Training Center (TC) Surabaya untuk keperluan verifikasi data Akun Pintar, pengecekan jadwal undangan training, dan pencatatan absensi pelatihan.</li>
              <li>Setiap pengguna wajib memberikan data yang sah, akurat, dan sesuai dengan identitas karyawan resmi (NIK, nama, kode toko, dan nomor WhatsApp aktif).</li>
              <li>Dilarang menyalahgunakan sistem untuk manipulasi kehadiran, akses tanpa hak, atau tindakan peretasan dalam bentuk apapun.</li>
            </ul>
          </div>

          {/* Section 2: Keamanan Akun & Sandi */}
          <div className="space-y-2">
            <h4 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <Lock className="w-4 h-4 text-amber-500" />
              <span>2. Keamanan Akun, Kata Sandi, & Privasi</span>
            </h4>
            <ul className={`list-disc list-inside space-y-1.5 pl-1 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              <li>Pengguna bertanggung jawab penuh untuk menjaga kerahasiaan kata sandi (password) Akun Pintar masing-masing.</li>
              <li>Perubahan kata sandi yang dilakukan melalui portal ini akan disinkronkan secara permanen ke database Supabase dan berlaku di semua perangkat / komputer.</li>
              <li>Administrator berhak membatasi atau menonaktifkan akses akun yang terindikasi melanggar keamanan atau kebijakan operasional.</li>
            </ul>
          </div>

          {/* Section 3: Absensi & Verifikasi Kehadiran */}
          <div className="space-y-2">
            <h4 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>3. Kebijakan Absensi Kehadiran Training</span>
            </h4>
            <ul className={`list-disc list-inside space-y-1.5 pl-1 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              <li>Absensi kehadiran hanya dapat dilakukan pada tanggal pelaksanaan training yang telah dijadwalkan secara resmi di sistem.</li>
              <li>Sistem secara otomatis mengunci formulir absensi jika tanggal berjalan di luar rentang tanggal pelaksanaan training peserta.</li>
              <li>Setiap catatan kehadiran yang terkirim bersifat final dan tersimpan permanen di database absensi TC Surabaya.</li>
            </ul>
          </div>

          {/* Section 4: Hak Kekayaan Intelektual */}
          <div className="space-y-2">
            <h4 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <Building2 className="w-4 h-4 text-purple-500" />
              <span>4. Hak Cipta & Lisensi</span>
            </h4>
            <p className={isLight ? 'text-slate-600' : 'text-slate-300'}>
              Seluruh rancangan antarmuka, arsitektur data, kode pemrograman, dan fitur sistem portal ini merupakan hak cipta eksklusif atas nama <strong>Bang Ajiib</strong>. Dilarang menggandakan, mendistribusikan ulang, atau memodifikasi sistem tanpa izin tertulis dari pemegang hak cipta.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`p-4 border-t flex items-center justify-between gap-3 ${
          isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950'
        }`}>
          <div className="text-[11px] font-mono text-slate-500">
            &copy; {new Date().getFullYear()} Bang Ajiib
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-[#0054A6] to-[#003875] hover:opacity-95 shadow transition cursor-pointer"
          >
            Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  );
};
