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
  Star,
} from 'lucide-react';

interface TrainingAbsensiProps {
  user: User;
  themeMode?: 'dark' | 'light';
}

const MONTH_NAMES_MAP: Record<string, number> = {
  januari: 1, jan: 1, januarii: 1,
  februari: 2, feb: 2,
  maret: 3, mar: 3,
  april: 4, apr: 4,
  mei: 5, may: 5,
  juni: 6, jun: 6,
  juli: 7, jul: 7,
  agustus: 8, agu: 8, ags: 8,
  september: 9, sep: 9,
  oktober: 10, okt: 10,
  november: 11, nov: 11,
  desember: 12, des: 12,
};

function normalizeDateStr(str: string): string {
  if (!str) return '';
  const s = str.replace(/^["']|["']$/g, '').trim().toLowerCase();
  return s.replace(/^0(\d)\s+/, '$1 ').replace(/\s+/g, ' ');
}

function normalizeJenisStr(str: string): string {
  if (!str) return '';
  return str.replace(/^["']|["']$/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseDateDays(str: string): string[] {
  if (!str) return [];
  const s = String(str).toLowerCase().trim();
  const dates: string[] = [];

  // Match DD-MM-YYYY patterns like "01-10-2026, 02-10-2026"
  const dmyMatches = [...s.matchAll(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/g)];
  if (dmyMatches.length > 0) {
    for (const m of dmyMatches) {
      dates.push(`${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`);
    }
  }

  // Match YYYY-MM-DD patterns like "2026-01-01"
  const ymdMatches = [...s.matchAll(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/g)];
  if (ymdMatches.length > 0) {
    for (const m of ymdMatches) {
      dates.push(`${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`);
    }
  }

  // Match Excel serial number e.g. 46302
  const excelMatch = s.match(/\b(4\d{4})\b/);
  if (excelMatch) {
    const serial = parseInt(excelMatch[1], 10);
    const d = new Date((serial - 25569) * 86400 * 1000);
    const day = String(d.getUTCDate()).padStart(2, '0');
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const y = d.getUTCFullYear();
    dates.push(`${y}-${m}-${day}`);
  }

  // Match Indonesian month names like "01 - 02 OKTOBER 2026" or "12 OKTOBER 2026"
  let foundMonth = 0;
  for (const [mName, mNum] of Object.entries(MONTH_NAMES_MAP)) {
    if (s.includes(mName)) {
      foundMonth = mNum;
      break;
    }
  }

  const yearMatch = s.match(/\b(20\d\d)\b/);
  const year = yearMatch ? yearMatch[1] : '2026';

  if (foundMonth > 0) {
    const dayMatches = [...s.matchAll(/\b(\d{1,2})\b/g)]
      .map(m => parseInt(m[1], 10))
      .filter(d => d >= 1 && d <= 31 && d !== 20 && d !== 26);
    for (const d of dayMatches) {
      dates.push(`${year}-${String(foundMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
  }

  return [...new Set(dates)];
}

function areDatesEquivalent(dateA: string, dateB: string): boolean {
  if (!dateA || !dateB) return false;
  if (dateA.trim().toLowerCase() === dateB.trim().toLowerCase()) return true;

  const parsedA = parseDateDays(dateA);
  const parsedB = parseDateDays(dateB);

  if (parsedA.length > 0 && parsedB.length > 0) {
    return parsedA.some(dA => parsedB.includes(dA));
  }
  return false;
}

// Automatically calculate current running date in Indonesian (WIB / UTC+7)
function getTanggalBerjalanIndo(): { padded: string; unpadded: string; dateYMD: string } {
  const now = new Date();
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  // Calculate based on Indonesian timezone UTC+7 (Asia/Jakarta)
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const indoTime = new Date(utc + 7 * 3600000);

  const day = indoTime.getDate();
  const monthIdx = indoTime.getMonth();
  const month = months[monthIdx];
  const year = indoTime.getFullYear();

  const paddedDay = String(day).padStart(2, '0');
  const paddedMonth = String(monthIdx + 1).padStart(2, '0');
  return {
    padded: `${paddedDay} ${month} ${year}`,
    unpadded: `${day} ${month} ${year}`,
    dateYMD: `${year}-${paddedMonth}-${paddedDay}`,
  };
}

export const TrainingAbsensi: React.FC<TrainingAbsensiProps> = ({ user, themeMode = 'dark' }) => {
  const isLight = themeMode === 'light';
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

  const todayInfo = getTanggalBerjalanIndo();

  const loadData = async (forceDateSelect = true) => {
    setIsLoadingSchedule(true);
    setIsLoadingMySchedules(true);

    let scheduleOptions: TrainingDateOption[] = [];
    let userSchedules: any[] = [];

    // Safe individual fetch for schedules
    try {
      const scheduleRes = await api.getTrainingSchedule();
      scheduleOptions = scheduleRes.scheduleOptions || [];
      setSchedules(scheduleOptions);
    } catch (err) {
      console.error('Failed to load training schedules:', err);
    } finally {
      setIsLoadingSchedule(false);
    }

    // Safe individual fetch for user's own schedules
    try {
      const myRes = await api.getMyTrainingSchedules();
      userSchedules = myRes.mySchedules || [];
      setMySchedules(userSchedules);
    } catch (err) {
      console.error('Failed to load user schedules:', err);
    } finally {
      setIsLoadingMySchedules(false);
    }

    // Auto-select date & jenis training intelligently
    if (scheduleOptions.length > 0 && forceDateSelect) {
      let targetDate = '';
      let targetJenis = '';

      // Priority 1: User's own registered schedule
      if (userSchedules.length > 0) {
        // Look for schedule matching today first
        const todayMatch = userSchedules.find(m =>
          areDatesEquivalent(m.tanggal, todayInfo.padded) ||
          areDatesEquivalent(m.tanggal, todayInfo.dateYMD)
        );
        const chosenUserSchedule = todayMatch || userSchedules[0];

        // Match with a date entry in scheduleOptions
        const matchedInOptions = scheduleOptions.find(s =>
          s.tanggal === chosenUserSchedule.tanggal ||
          areDatesEquivalent(s.tanggal, chosenUserSchedule.tanggal)
        );

        targetDate = matchedInOptions ? matchedInOptions.tanggal : chosenUserSchedule.tanggal;
        targetJenis = chosenUserSchedule.jenis_training;
      } else {
        // Priority 2: Schedule matching today's date
        const matchToday = scheduleOptions.find(s =>
          areDatesEquivalent(s.tanggal, todayInfo.padded) ||
          areDatesEquivalent(s.tanggal, todayInfo.dateYMD)
        );

        if (matchToday) {
          targetDate = matchToday.tanggal;
          targetJenis = matchToday.jenis_list[0]?.jenis_training || '';
        } else {
          // Priority 3: First available schedule date
          targetDate = scheduleOptions[0].tanggal;
          targetJenis = scheduleOptions[0].jenis_list[0]?.jenis_training || '';
        }
      }

      if (targetDate) {
        setSelectedDate(targetDate);
        if (targetJenis) {
          setSelectedJenis(targetJenis);
          handleSelectTraining(targetDate, targetJenis);
        }
      }
    }
  };

  useEffect(() => {
    loadData(true);
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

      // Refresh schedule data without resetting date
      await loadData(false);

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

  // Check if a specific training type on selectedDate is user's registered training
  const isUserRegisteredFor = (jenis: string) => {
    return mySchedules.some(
      m =>
        (m.tanggal === selectedDate || areDatesEquivalent(m.tanggal, selectedDate)) &&
        normalizeJenisStr(m.jenis_training) === normalizeJenisStr(jenis)
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className={`border rounded-2xl p-6 shadow-xl relative overflow-hidden transition-colors ${
        isLight
          ? 'bg-gradient-to-r from-blue-50 via-slate-50 to-indigo-50 border-blue-200 text-slate-900'
          : 'bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border-blue-900/60 text-white'
      }`}>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${
              isLight ? 'bg-blue-100 border-blue-300 text-[#0054A6]' : 'bg-blue-600/30 border-blue-500/40 text-blue-400'
            }`}>
              <CalendarCheck2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className={`text-xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Absensi Kehadiran Training TC Surabaya
                </h2>
                <span className={`px-2.5 py-0.5 rounded text-[11px] font-mono border ${
                  isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-950/60 border-emerald-700/50 text-emerald-300'
                }`}>
                  Database: Trainings
                </span>
                <span className={`px-2.5 py-0.5 rounded text-[11px] font-mono border flex items-center gap-1 ${
                  isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-950/80 border-emerald-800/60 text-emerald-300'
                }`}>
                  <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Tanggal Berjalan: {todayInfo.padded}</span>
                </span>
              </div>
              <p className={`text-xs mt-1 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                Pilih jenis training sesuai jadwal Anda. Seluruh rincian data Anda telah terkunci otomatis dari database <code>Trainings</code>.
              </p>
            </div>
          </div>

          <button
            onClick={() => loadData(true)}
            disabled={isLoadingSchedule}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer self-start md:self-auto ${
              isLight ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="Muat ulang jadwal training"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSchedule ? 'animate-spin' : ''}`} />
            <span>Perbarui Jadwal</span>
          </button>
        </div>
      </div>

      {/* User's Registered Schedules Quick Card */}
      {mySchedules.length > 0 && (
        <div className={`border rounded-2xl p-5 shadow-xl space-y-3 transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-800/90 border-slate-700/80 text-white'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-emerald-500" />
              <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Jadwal Training Terdaftar Anda ({mySchedules.length})
              </h3>
            </div>
            <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Klik kartu untuk langsung absensi</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {mySchedules.map((item, idx) => {
              const isCardSelected =
                (item.tanggal === selectedDate || areDatesEquivalent(item.tanggal, selectedDate)) &&
                normalizeJenisStr(selectedJenis) === normalizeJenisStr(item.jenis_training);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectTraining(item.tanggal, item.jenis_training)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 ${
                    isCardSelected
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md ring-2 ring-blue-400'
                      : isLight
                      ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900'
                      : 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-700/60 text-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span>{item.jenis_training}</span>
                      </span>
                      {item.already_attended ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800/50 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Hadir
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800/50 px-2 py-0.5 rounded">
                          <Clock className="w-2.5 h-2.5" /> Belum Absen
                        </span>
                      )}
                    </div>
                    <div className={`text-[11px] flex items-center gap-1 mt-1 font-mono ${
                      isCardSelected
                        ? 'text-blue-100'
                        : isLight ? 'text-slate-600' : 'text-slate-300'
                    }`}>
                      <Calendar className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                      <span className="font-semibold">{item.tanggal}</span>
                    </div>
                  </div>

                  <div className={`text-[10px] flex items-center gap-1 ${
                    isCardSelected
                      ? 'text-blue-100'
                      : isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    <Building2 className="w-3 h-3" />
                    <span>{item.kode_toko} / {item.nama_toko}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Absensi Workflow */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Step 1 & 2: Pilih Tanggal & Jenis Training */}
        <div className="lg:col-span-5 space-y-4">
          <div className={`border rounded-2xl p-5 shadow-xl space-y-4 transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-800/90 border-slate-700/80 text-white'
          }`}>
            {/* Step 1: Otomatis membaca tanggal berjalan */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`text-xs font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  <span>1. Tanggal Training Berjalan</span>
                </label>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50'
                }`}>
                  Otomatis: {todayInfo.padded}
                </span>
              </div>
              <select
                value={selectedDate}
                disabled={isLoadingSchedule || schedules.length === 0}
                onChange={e => {
                  const newDate = e.target.value;
                  setSelectedDate(newDate);
                  const dateObj = schedules.find(s => s.tanggal === newDate || areDatesEquivalent(s.tanggal, newDate));
                  if (dateObj && dateObj.jenis_list.length > 0) {
                    // Check if user has a registered training on this newDate
                    const userMatch = mySchedules.find(
                      m => m.tanggal === newDate || areDatesEquivalent(m.tanggal, newDate)
                    );
                    const defaultJenis = userMatch ? userMatch.jenis_training : dateObj.jenis_list[0].jenis_training;
                    setSelectedJenis(defaultJenis);
                    handleSelectTraining(newDate, defaultJenis);
                  } else {
                    setSelectedJenis('');
                    setCheckResult(null);
                  }
                }}
                className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0054A6] cursor-pointer transition ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
                }`}
              >
                {isLoadingSchedule && (
                  <option value="">Memuat data tanggal training...</option>
                )}
                {!isLoadingSchedule && schedules.length === 0 && (
                  <option value="">Tidak ada tanggal training tersedia</option>
                )}
                {schedules.map(s => {
                  const isToday =
                    areDatesEquivalent(s.tanggal, todayInfo.padded) ||
                    areDatesEquivalent(s.tanggal, todayInfo.dateYMD);
                  const isUserDate = mySchedules.some(
                    m => m.tanggal === s.tanggal || areDatesEquivalent(m.tanggal, s.tanggal)
                  );
                  return (
                    <option key={s.tanggal} value={s.tanggal}>
                      {s.tanggal} {isUserDate ? '★ (Jadwal Training Anda)' : isToday ? '★ (Hari Ini)' : ''} ({s.total_peserta} Peserta Terjadwal)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Step 2: Pilih Jenis Training */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={`text-xs font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                  <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
                  <span>2. Pilih Jenis Training ({availableJenisList.length})</span>
                </label>
                <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Klik untuk absensi</span>
              </div>

              {availableJenisList.length === 0 ? (
                <div className={`p-4 rounded-xl border text-center text-xs ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-slate-900/60 border-slate-700/40 text-slate-400'
                }`}>
                  Tidak ada jenis training yang terdaftar pada tanggal ini.
                </div>
              ) : (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {availableJenisList.map(item => {
                    const isSelected = selectedJenis.toLowerCase() === item.jenis_training.toLowerCase();
                    const isUserRegistered = isUserRegisteredFor(item.jenis_training);

                    return (
                      <button
                        key={item.jenis_training}
                        type="button"
                        onClick={() => handleSelectTraining(selectedDate, item.jenis_training)}
                        className={`w-full p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-500 shadow-md ring-2 ring-blue-400'
                            : isUserRegistered
                            ? isLight ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-900' : 'bg-emerald-950/40 hover:bg-emerald-900/40 border-emerald-700/60 text-emerald-200'
                            : isLight ? 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200' : 'bg-slate-900/80 hover:bg-slate-700/50 text-slate-200 border-slate-700/50'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-xs flex items-center gap-1.5">
                            {isUserRegistered && (
                              <Star className={`w-3 h-3 ${isSelected ? 'text-amber-300 fill-amber-300' : 'text-amber-500 fill-amber-500'}`} />
                            )}
                            <span>{item.jenis_training}</span>
                          </div>
                          <div
                            className={`text-[10px] font-mono mt-0.5 flex items-center gap-2 ${
                              isSelected ? 'text-blue-100' : isLight ? 'text-slate-600' : 'text-slate-400'
                            }`}
                          >
                            <span>{item.total_peserta} Peserta Terdaftar</span>
                            {isUserRegistered && (
                              <span className={`font-semibold ${isSelected ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                • Anda Terdaftar
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight
                          className={`w-4 h-4 ${
                            isSelected ? 'text-white' : isLight ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Step 3: Verifikasi Kepesertaan & Formulir Hadir Absensi */}
        <div className="lg:col-span-7">
          <div className={`border rounded-2xl p-6 shadow-xl space-y-5 transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-800/90 border-slate-700/80 text-white'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-slate-200' : 'border-slate-700/60'}`}>
              <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span>Status Kepesertaan & Form Hadir Absensi</span>
              </h3>
              {selectedDate && (
                <span className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border ${
                  isLight ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-300'
                }`}>
                  {selectedDate}
                </span>
              )}
            </div>

            {!selectedJenis ? (
              <div className={`py-12 px-4 text-center space-y-2 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                <GraduationCap className="w-10 h-10 mx-auto text-slate-400 animate-pulse" />
                <div className={`text-sm font-semibold ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                  Silakan Pilih Jenis Training di Panel Kiri
                </div>
                <p className={`text-xs max-w-sm mx-auto ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Sistem akan secara otomatis memverifikasi apakah Anda terdaftar sebagai peserta training pada tanggal dan jenis training tersebut.
                </p>
              </div>
            ) : isChecking ? (
              <div className={`py-12 text-center space-y-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block"></span>
                <div className="text-xs font-mono">Memverifikasi kepesertaan NIK: {user.nik}...</div>
              </div>
            ) : checkResult && checkResult.is_registered && checkResult.training ? (
              /* KASUS 1: USER ADALAH PESERTA TERDAFTAR (Seluruh Data Terkunci & Tombol Hadir Absensi) */
              <div className="space-y-4 animate-fade-in">
                {/* Status Badge */}
                {checkResult.already_attended ? (
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800/70 text-emerald-900 dark:text-emerald-300 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-bold">✓ Absensi Kehadiran Terverifikasi</div>
                        <div className="text-[11px] opacity-90">
                          {checkResult.absensi?.waktu_formatted || 'Tersinkron di Database Supabase'}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-700/50 font-bold">
                      STATUS: HADIR
                    </span>
                  </div>
                ) : checkResult.is_today_eligible === false ? (
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>
                        {checkResult.date_status === 'EXPIRED'
                          ? '⚠️ Jadwal Training Telah Berakhir (Lewat Tanggal Pelaksanaan)'
                          : checkResult.date_status === 'UPCOMING'
                          ? '🕒 Jadwal Training Belum Dimulai'
                          : '⚠️ Tanggal Hari Ini Tidak Sesuai Jadwal Training'}
                      </span>
                    </div>
                    <p className="text-[11.5px] leading-relaxed opacity-95">
                      Anda terdaftar pada pelatihan ini untuk tanggal <strong>{checkResult.training.tanggal}</strong>, namun tanggal sistem saat ini adalah <strong>{todayInfo.padded}</strong>.
                    </p>
                    <div className="p-2 rounded-lg bg-amber-100/70 dark:bg-amber-900/40 text-[11px] text-amber-900 dark:text-amber-300 font-medium">
                      {checkResult.date_message || 'Peserta tidak dapat melakukan absensi karena tanggal hari ini tidak sesuai dengan jadwal training yang ditentukan.'}
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-200 text-xs flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-[#0054A6] dark:text-blue-400 shrink-0" />
                    <div>
                      <div className="font-bold">Peserta Terdaftar & Jadwal Berlangsung Hari Ini ({todayInfo.padded})</div>
                      <div className="text-[11px] opacity-90">
                        Rincian data Anda telah terkunci otomatis. Klik tombol Hadir Absensi di bawah untuk mencatat kehadiran.
                      </div>
                    </div>
                  </div>
                )}

                {/* FORMULIR RINCIAN DATA PESERTA (SEMUANYA TERKUNCI / READ-ONLY) */}
                <div className={`p-4 rounded-xl border space-y-3 text-xs ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/80 border-slate-700/60'
                }`}>
                  <div className={`flex items-center justify-between text-[11px] font-semibold border-b pb-2 ${
                    isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800 text-slate-400'
                  }`}>
                    <span className="flex items-center gap-1.5 font-bold">
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                      <span>RINCIAN DATA PESERTA (TERKUNCI OTOMATIS)</span>
                    </span>
                    <span className="text-[10px] font-mono">Terkunci</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* 1. NIK */}
                    <div>
                      <label className={`block text-[11px] font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        Nomor Induk Karyawan (NIK)
                      </label>
                      <div className={`px-3 py-2 border rounded-lg font-mono font-bold flex items-center justify-between ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-800/80 border-slate-700 text-white'
                      }`}>
                        <span>{checkResult.training.nik}</span>
                        <Lock className="w-3 h-3 text-slate-400" />
                      </div>
                    </div>

                    {/* 2. Nama */}
                    <div>
                      <label className={`block text-[11px] font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        Nama Peserta
                      </label>
                      <div className={`px-3 py-2 border rounded-lg font-semibold truncate flex items-center justify-between ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-800/80 border-slate-700 text-slate-200'
                      }`}>
                        <span className="truncate">{checkResult.training.nama}</span>
                        <Lock className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
                      </div>
                    </div>

                    {/* 3. Kode Toko */}
                    <div>
                      <label className={`block text-[11px] font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        Kode Toko
                      </label>
                      <div className={`px-3 py-2 border rounded-lg font-mono font-bold flex items-center justify-between ${
                        isLight ? 'bg-white border-slate-300 text-[#0054A6]' : 'bg-slate-800/80 border-slate-700 text-blue-400'
                      }`}>
                        <span>{checkResult.training.kode_toko}</span>
                        <Lock className="w-3 h-3 text-slate-400" />
                      </div>
                    </div>

                    {/* 4. Nama Toko */}
                    <div>
                      <label className={`block text-[11px] font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        Nama Toko / Unit
                      </label>
                      <div className={`px-3 py-2 border rounded-lg font-medium truncate flex items-center justify-between ${
                        isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-800/80 border-slate-700 text-slate-200'
                      }`}>
                        <span className="truncate">{checkResult.training.nama_toko}</span>
                        <Lock className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
                      </div>
                    </div>

                    {/* 5. Tanggal Training */}
                    <div>
                      <label className={`block text-[11px] font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        Tanggal Training
                      </label>
                      <div className={`px-3 py-2 border rounded-lg font-medium flex items-center justify-between ${
                        isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-800/80 border-slate-700 text-slate-200'
                      }`}>
                        <span className="font-semibold">{checkResult.training.tanggal}</span>
                        <Lock className="w-3 h-3 text-slate-400" />
                      </div>
                    </div>

                    {/* 6. Jenis Training */}
                    <div>
                      <label className={`block text-[11px] font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        Jenis Training
                      </label>
                      <div className={`px-3 py-2 border rounded-lg font-bold truncate flex items-center justify-between ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-800/80 border-slate-700 text-white'
                      }`}>
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

                {/* TOMBOL AKSI: HADIR ABSENSI / TERKUNCI KARENA TANGGAL */}
                {checkResult.already_attended ? (
                  <div className={`p-3.5 rounded-xl border text-center text-xs space-y-1 ${
                    isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-900 border-slate-700/60 text-slate-300'
                  }`}>
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                      ✓ Anda telah berhasil melakukan absensi untuk sesi training ini.
                    </div>
                    <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      Data kehadiran telah dicatat dan terkirim ke database Supabase Training Center Surabaya.
                    </div>
                  </div>
                ) : checkResult.is_today_eligible === false ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      disabled={true}
                      className={`w-full py-3.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border cursor-not-allowed transition ${
                        isLight
                          ? 'bg-slate-200 border-slate-300 text-slate-500'
                          : 'bg-slate-800/90 border-slate-700 text-slate-400'
                      }`}
                    >
                      <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Absensi Dikunci — Tanggal Training Tidak Sesuai ({checkResult.training.tanggal})</span>
                    </button>
                    <p className={`text-[11px] text-center leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      Absensi kehadiran hanya dapat dilakukan pada tanggal pelaksanaan training yang telah dijadwalkan. Tanggal berjalan saat ini (<strong>{todayInfo.padded}</strong>) di luar rentang tanggal pelaksanaan training Anda.
                    </p>
                  </div>
                ) : (
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
                )}
              </div>
            ) : (
              /* KASUS 2: USER BUKAN PESERTA TERDAFTAR */
              <div className={`p-5 rounded-2xl border text-xs space-y-3 animate-fade-in ${
                isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
              }`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      Bukan Peserta Terdaftar pada Jadwal Ini
                    </h4>
                    <p className="mt-1 leading-relaxed opacity-90">
                      {checkResult?.message ||
                        `NIK ${user.nik} (${user.nama}) tidak terdaftar sebagai peserta training "${selectedJenis}" pada tanggal "${selectedDate}".`}
                    </p>
                  </div>
                </div>

                {checkResult?.user_other_schedules && checkResult.user_other_schedules.length > 0 ? (
                  <div className="pt-3 border-t border-amber-200 dark:border-amber-800/40 space-y-2">
                    <div className={`font-semibold flex items-center gap-1.5 text-[11px] ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      <Info className="w-3.5 h-3.5 text-amber-500" />
                      <span>Jadwal Training Anda Terdaftar Pada:</span>
                    </div>
                    <div className="space-y-1.5">
                      {checkResult.user_other_schedules.map((sc, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectTraining(sc.tanggal, sc.jenis_training)}
                          className={`w-full text-left p-2.5 rounded-lg text-[11px] border flex items-center justify-between transition cursor-pointer ${
                            isLight
                              ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200'
                              : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border-slate-700/60'
                          }`}
                        >
                          <div>
                            <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{sc.jenis_training}</span>
                            <span className="text-slate-500 ml-2 font-mono">({sc.tanggal})</span>
                          </div>
                          <span className="text-[#0054A6] dark:text-blue-400 font-semibold text-[10px]">Pilih Jadwal Ini →</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={`pt-2 text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
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
