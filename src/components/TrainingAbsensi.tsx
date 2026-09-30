import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { User, TrainingDateOption, CheckParticipantResponse, AbsensiRecord } from '../types';
import { api } from '../services/api';
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Lock,
  UserCheck,
  Building2,
  Clock,
  GraduationCap,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Info,
  CalendarCheck2,
  Search,
} from 'lucide-react';

interface TrainingAbsensiProps {
  user: User;
}

export const TrainingAbsensi: React.FC<TrainingAbsensiProps> = ({ user }) => {
  const [schedules, setSchedules] = useState<TrainingDateOption[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedJenis, setSelectedJenis] = useState<string>('');
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);

  // My Personal Schedules
  const [mySchedules, setMySchedules] = useState<any[]>([]);
  const [isLoadingMySchedules, setIsLoadingMySchedules] = useState(true);

  // Check Participant Verification State
  const [checkResult, setCheckResult] = useState<CheckParticipantResponse | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Attendance Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [submitError, setSubmitError] = useState('');

  const loadSchedules = async () => {
    try {
      setIsLoadingSchedule(true);
      const res = await api.getTrainingSchedule();
      setSchedules(res.scheduleOptions);

      // Auto-select date
      if (res.scheduleOptions.length > 0 && !selectedDate) {
        // Find if today's date exists or default to first available
        const todayStr = '29 September 2026'; // current simulation date
        const matchToday = res.scheduleOptions.find(
          s => s.tanggal.toLowerCase() === todayStr.toLowerCase()
        );
        if (matchToday) {
          setSelectedDate(matchToday.tanggal);
        } else {
          setSelectedDate(res.scheduleOptions[0].tanggal);
        }
      }
    } catch (err) {
      console.error('Failed to load training schedules:', err);
    } finally {
      setIsLoadingSchedule(false);
    }
  };

  const loadMySchedules = async () => {
    try {
      setIsLoadingMySchedules(true);
      const res = await api.getMyTrainingSchedules();
      setMySchedules(res.mySchedules);
    } catch (err) {
      console.error('Failed to load my schedules:', err);
    } finally {
      setIsLoadingMySchedules(false);
    }
  };

  useEffect(() => {
    loadSchedules();
    loadMySchedules();
  }, []);

  // When date or jenis changes, check participant
  const handleSelectTraining = async (tanggal: string, jenis: string) => {
    setSelectedDate(tanggal);
    setSelectedJenis(jenis);
    setSubmitError('');
    setSubmitSuccess('');

    try {
      setIsChecking(true);
      const result = await api.checkTrainingParticipant(tanggal, jenis);
      setCheckResult(result);
    } catch (err: any) {
      setSubmitError(err.message || 'Gagal memeriksa kepesertaan training.');
      setCheckResult(null);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubmitAttendance = async () => {
    if (!selectedDate || !selectedJenis) return;

    try {
      setIsSubmitting(true);
      setSubmitError('');
      setSubmitSuccess('');

      const res = await api.submitTrainingAttendance(selectedDate, selectedJenis);
      setSubmitSuccess(res.message || 'Absensi kehadiran berhasil dicatat!');

      // Update check result state to attended
      setCheckResult(prev =>
        prev
          ? {
              ...prev,
              already_attended: true,
              absensi: res.record,
            }
          : null
      );

      // Refresh my schedule
      await loadMySchedules();
      await loadSchedules();

      // Confetti celebration
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch {}
    } catch (err: any) {
      setSubmitError(err.message || 'Gagal mencatat absensi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get training types for the currently selected date
  const currentSelectedDateData = schedules.find(s => s.tanggal === selectedDate);
  const availableJenisList = currentSelectedDateData?.jenis_list || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-900/60 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
              <CalendarCheck2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Absensi Kehadiran Training TC Surabaya
                </h2>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-mono bg-blue-900/60 text-blue-300 border border-blue-700/50">
                  Sheet: Trainings
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Pilih tanggal dan jenis training yang Anda ikuti. Seluruh data identitas Anda akan terkunci otomatis dan langsung tersinkron ke spreadsheet.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              loadSchedules();
              loadMySchedules();
              if (selectedDate && selectedJenis) {
                handleSelectTraining(selectedDate, selectedJenis);
              }
            }}
            disabled={isLoadingSchedule}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer self-start md:self-auto"
            title="Muat ulang jadwal training"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSchedule ? 'animate-spin' : ''}`} />
            <span>Perbarui Jadwal</span>
          </button>
        </div>
      </div>

      {/* User's Registered Schedules Quick Card */}
      {mySchedules.length > 0 && (
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Jadwal Training Terdaftar Anda ({mySchedules.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">Klik untuk langsung absensi</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {mySchedules.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectTraining(item.tanggal, item.jenis_training)}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 ${
                  selectedDate === item.tanggal && selectedJenis === item.jenis_training
                    ? 'bg-blue-950/80 border-blue-500 shadow-md shadow-blue-500/10'
                    : 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-700/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white">{item.jenis_training}</span>
                    {item.already_attended ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Hadir
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-950/60 border border-amber-800/50 px-2 py-0.5 rounded">
                        <Clock className="w-2.5 h-2.5" /> Belum Absen
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1 font-mono">
                    <Calendar className="w-3 h-3 text-blue-400" />
                    <span>{item.tanggal}</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  <span>{item.kode_toko} / {item.nama_toko}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Absensi Workflow */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Step 1 & 2: Pilih Tanggal & Jenis Training */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>1. Pilih Tanggal Training Berjalan</span>
              </label>
              <select
                value={selectedDate}
                onChange={e => {
                  setSelectedDate(e.target.value);
                  setSelectedJenis('');
                  setCheckResult(null);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {schedules.map(s => (
                  <option key={s.tanggal} value={s.tanggal}>
                    {s.tanggal} ({s.total_peserta} Peserta Terjadwal)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
                  <span>2. Pilih Jenis Training ({availableJenisList.length})</span>
                </label>
                <span className="text-[10px] text-slate-400">Klik jenis training</span>
              </div>

              {availableJenisList.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/40 text-center text-xs text-slate-400">
                  Tidak ada jenis training yang terdaftar pada tanggal ini.
                </div>
              ) : (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {availableJenisList.map(item => (
                    <button
                      key={item.jenis_training}
                      type="button"
                      onClick={() => handleSelectTraining(selectedDate, item.jenis_training)}
                      className={`w-full p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                        selectedJenis === item.jenis_training
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                          : 'bg-slate-900/80 hover:bg-slate-700/50 text-slate-200 border-slate-700/50'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs">{item.jenis_training}</div>
                        <div
                          className={`text-[10px] font-mono mt-0.5 ${
                            selectedJenis === item.jenis_training ? 'text-blue-100' : 'text-slate-400'
                          }`}
                        >
                          {item.total_peserta} Peserta Terdaftar
                        </div>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 ${
                          selectedJenis === item.jenis_training ? 'text-white' : 'text-slate-500'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Step 3: Verifikasi Kepesertaan & Formulir Hadir Absensi */}
        <div className="lg:col-span-7">
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span>Status Kepesertaan & Form Hadir Absensi</span>
              </h3>
              {selectedDate && (
                <span className="text-[11px] font-mono text-slate-400">
                  {selectedDate}
                </span>
              )}
            </div>

            {!selectedJenis ? (
              <div className="py-12 px-4 text-center text-slate-400 space-y-2">
                <GraduationCap className="w-10 h-10 mx-auto text-slate-600 animate-pulse" />
                <div className="text-sm font-semibold text-slate-300">
                  Silakan Pilih Jenis Training di Panel Kiri
                </div>
                <p className="text-xs max-w-sm mx-auto text-slate-400">
                  Sistem akan secara otomatis memverifikasi apakah Anda terdaftar sebagai peserta training pada tanggal dan jenis training tersebut.
                </p>
              </div>
            ) : isChecking ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block"></span>
                <div className="text-xs font-mono">Memverifikasi kepesertaan NIK: {user.nik}...</div>
              </div>
            ) : checkResult && checkResult.is_registered && checkResult.training ? (
              /* KASUS 1: USER ADALAH PESERTA TERDAFTAR (Seluruh Data Terkunci & Tombol Hadir Absensi) */
              <div className="space-y-4 animate-fade-in">
                {/* Status Badge */}
                {checkResult.already_attended ? (
                  <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-800/70 text-emerald-300 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-bold">✓ Absensi Kehadiran Terverifikasi</div>
                        <div className="text-[11px] text-emerald-300/80">
                          {checkResult.absensi?.waktu_formatted || 'Tersinkron di Spreadsheet'}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-700/50">
                      STATUS: HADIR
                    </span>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-blue-950/60 border border-blue-800/60 text-blue-200 text-xs flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-blue-400 shrink-0" />
                    <div>
                      <div className="font-bold">Peserta Terdaftar Terverifikasi</div>
                      <div className="text-[11px] text-blue-300/80">
                        Rincian data Anda telah terkunci otomatis. Klik tombol Hadir Absensi di bawah untuk mencatat kehadiran.
                      </div>
                    </div>
                  </div>
                )}

                {/* FORMULIR RINCIAN DATA PESERTA (SEMUANYA TERKUNCI / READ-ONLY) */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/60 space-y-3 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 border-b border-slate-800 pb-2">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>RINCIAN DATA PESERTA (TERKUNCI OTOMATIS)</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Terkunci</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* 1. NIK */}
                    <div>
                      <label className="block text-[11px] text-slate-400 font-medium mb-1">
                        Nomor Induk Karyawan (NIK)
                      </label>
                      <div className="px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg font-mono font-bold text-white flex items-center justify-between">
                        <span>{checkResult.training.nik}</span>
                        <Lock className="w-3 h-3 text-slate-400" />
                      </div>
                    </div>

                    {/* 2. Nama */}
                    <div>
                      <label className="block text-[11px] text-slate-400 font-medium mb-1">
                        Nama Peserta
                      </label>
                      <div className="px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg font-semibold text-slate-200 truncate flex items-center justify-between">
                        <span className="truncate">{checkResult.training.nama}</span>
                        <Lock className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
                      </div>
                    </div>

                    {/* 3. Kode Toko */}
                    <div>
                      <label className="block text-[11px] text-slate-400 font-medium mb-1">
                        Kode Toko
                      </label>
                      <div className="px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg font-mono font-bold text-blue-400 flex items-center justify-between">
                        <span>{checkResult.training.kode_toko}</span>
                        <Lock className="w-3 h-3 text-slate-400" />
                      </div>
                    </div>

                    {/* 4. Nama Toko */}
                    <div>
                      <label className="block text-[11px] text-slate-400 font-medium mb-1">
                        Nama Toko / Unit
                      </label>
                      <div className="px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg font-medium text-slate-200 truncate flex items-center justify-between">
                        <span className="truncate">{checkResult.training.nama_toko}</span>
                        <Lock className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
                      </div>
                    </div>

                    {/* 5. Tanggal Training */}
                    <div>
                      <label className="block text-[11px] text-slate-400 font-medium mb-1">
                        Tanggal Training
                      </label>
                      <div className="px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg font-medium text-slate-200 flex items-center justify-between">
                        <span>{checkResult.training.tanggal}</span>
                        <Lock className="w-3 h-3 text-slate-400" />
                      </div>
                    </div>

                    {/* 6. Jenis Training */}
                    <div>
                      <label className="block text-[11px] text-slate-400 font-medium mb-1">
                        Jenis Training
                      </label>
                      <div className="px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg font-bold text-white truncate flex items-center justify-between">
                        <span className="truncate">{checkResult.training.jenis_training}</span>
                        <Lock className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feedback Alerts */}
                {submitError && (
                  <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{submitError}</span>
                  </div>
                )}

                {submitSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{submitSuccess}</span>
                  </div>
                )}

                {/* TOMBOL AKSI: HADIR ABSENSI (HANYA INI YANG BISA DIKLIK PESERTA) */}
                {!checkResult.already_attended ? (
                  <button
                    type="button"
                    onClick={handleSubmitAttendance}
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Mencatat & Menyinkronkan Kehadiran...
                      </span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Hadir Absensi Sekarang</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-700/60 text-center text-xs text-slate-300 space-y-1">
                    <div className="font-semibold text-emerald-400">
                      ✓ Anda telah berhasil melakukan absensi untuk sesi training ini.
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Data kehadiran telah dicatat dan terkirim ke spreadsheet Training Center Surabaya.
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* KASUS 2: USER BUKAN PESERTA TERDAFTAR */
              <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs space-y-3 animate-fade-in">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-white">
                      Bukan Peserta Terdaftar pada Jadwal Ini
                    </h4>
                    <p className="mt-1 text-amber-200/90 leading-relaxed">
                      {checkResult?.message ||
                        `NIK ${user.nik} (${user.nama}) tidak terdaftar sebagai peserta training "${selectedJenis}" pada tanggal "${selectedDate}".`}
                    </p>
                  </div>
                </div>

                {checkResult?.user_other_schedules && checkResult.user_other_schedules.length > 0 ? (
                  <div className="pt-3 border-t border-amber-800/40 space-y-2">
                    <div className="font-semibold text-white flex items-center gap-1.5 text-[11px]">
                      <Info className="w-3.5 h-3.5 text-amber-400" />
                      <span>Jadwal Training Anda Terdaftar Pada:</span>
                    </div>
                    <div className="space-y-1.5">
                      {checkResult.user_other_schedules.map((sc, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectTraining(sc.tanggal, sc.jenis_training)}
                          className="w-full text-left p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-[11px] text-slate-200 border border-slate-700/60 flex items-center justify-between transition cursor-pointer"
                        >
                          <div>
                            <span className="font-bold text-white">{sc.jenis_training}</span>
                            <span className="text-slate-400 ml-2 font-mono">({sc.tanggal})</span>
                          </div>
                          <span className="text-blue-400 font-semibold text-[10px]">Pilih Jadwal Ini →</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 text-[11px] text-slate-400">
                    Jika Anda ditugaskan mengikuti training ini, silakan hubungi tim Administrator atau PIC Training Center Surabaya.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
