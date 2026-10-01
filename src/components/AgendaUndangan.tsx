import React, { useState, useEffect, useMemo } from 'react';
import { User, UndanganRecord, UndanganResponse } from '../types';
import { api } from '../services/api';
import {
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Download,
  Building2,
  UserCheck,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Layers,
  MapPin,
  Clock,
  Briefcase,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';

interface AgendaUndanganProps {
  user: User;
  themeMode?: 'dark' | 'light';
  isAdmin?: boolean;
}

export const AgendaUndangan: React.FC<AgendaUndanganProps> = ({
  user,
  themeMode = 'dark',
  isAdmin = false,
}) => {
  const isLight = themeMode === 'light';

  // Filters state
  const [search, setSearch] = useState('');
  const [filterNik, setFilterNik] = useState('');
  const [filterNama, setFilterNama] = useState('');
  const [filterKodeToko, setFilterKodeToko] = useState('');
  const [filterNamaToko, setFilterNamaToko] = useState('');
  const [filterAs, setFilterAs] = useState('all');
  const [filterAm, setFilterAm] = useState('all');
  const [filterJenis, setFilterJenis] = useState('all');
  const [filterSistem, setFilterSistem] = useState('all');
  const [filterTanggal, setFilterTanggal] = useState('all');
  const [myOnly, setMyOnly] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Data state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [response, setResponse] = useState<UndanganResponse | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Load data from server
  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getUndangan({
        search,
        nik: filterNik,
        nama: filterNama,
        kode_toko: filterKodeToko,
        nama_toko: filterNamaToko,
        as: filterAs,
        am: filterAm,
        jenis_training: filterJenis,
        sistem_training: filterSistem,
        tanggal: filterTanggal,
        myOnly,
        page,
        limit,
      });
      setResponse(data);
    } catch (err: any) {
      console.error('Error loading agenda undangan:', err);
      setError(err.message || 'Gagal memuat data agenda jadwal training.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger load whenever filters or page changes
  useEffect(() => {
    loadData();
  }, [
    search,
    filterNik,
    filterNama,
    filterKodeToko,
    filterNamaToko,
    filterAs,
    filterAm,
    filterJenis,
    filterSistem,
    filterTanggal,
    myOnly,
    page,
    limit,
  ]);

  const handleResetFilters = () => {
    setSearch('');
    setFilterNik('');
    setFilterNama('');
    setFilterKodeToko('');
    setFilterNamaToko('');
    setFilterAs('all');
    setFilterAm('all');
    setFilterJenis('all');
    setFilterSistem('all');
    setFilterTanggal('all');
    setMyOnly(false);
    setPage(1);
  };

  const handleToggleMySchedule = () => {
    const nextVal = !myOnly;
    setMyOnly(nextVal);
    setPage(1);
    if (nextVal) {
      // Clear individual filters that might conflict
      setFilterNik('');
    }
  };

  const hasActiveFilters = Boolean(
    search ||
    filterNik ||
    filterNama ||
    filterKodeToko ||
    filterNamaToko ||
    filterAs !== 'all' ||
    filterAm !== 'all' ||
    filterJenis !== 'all' ||
    filterSistem !== 'all' ||
    filterTanggal !== 'all' ||
    myOnly
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search) count++;
    if (filterNik) count++;
    if (filterNama) count++;
    if (filterKodeToko) count++;
    if (filterNamaToko) count++;
    if (filterAs !== 'all') count++;
    if (filterAm !== 'all') count++;
    if (filterJenis !== 'all') count++;
    if (filterSistem !== 'all') count++;
    if (filterTanggal !== 'all') count++;
    if (myOnly) count++;
    return count;
  }, [search, filterNik, filterNama, filterKodeToko, filterNamaToko, filterAs, filterAm, filterJenis, filterSistem, filterTanggal, myOnly]);

  const exportCsv = () => {
    window.open('/api/undangan/export-csv', '_blank');
  };

  // Find user's personal schedules in the dataset if any
  const mySchedulesCount = response?.summary?.myTotal ?? 0;

  return (
    <div className="space-y-6">
      {/* Banner / Header Card */}
      <div className={`p-6 rounded-2xl border transition-colors shadow-xl ${
        isLight
          ? 'bg-gradient-to-r from-blue-50 via-indigo-50/50 to-white border-blue-200 text-slate-900'
          : 'bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border-slate-800 text-white'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#0054A6] to-[#003875] border border-blue-400/30 flex items-center justify-center text-[#FFD100] shadow-lg shrink-0">
              <Calendar className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  Agenda Jadwal Training
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Data Sheet Undangan
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Sync
                </span>
              </div>
              <p className={`mt-1 text-xs sm:text-sm max-w-2xl ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                Daftar agenda undangan pelatihan TC Surabaya lengkap dengan filter terperinci berdasarkan <strong>NIK</strong>, <strong>Nama Karyawan</strong>, <strong>Kode Toko</strong>, <strong>Nama Toko</strong>, serta <strong>Area Supervisor (AS)</strong> dan <strong>Area Manager (AM)</strong>.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Toggle My Schedule (for regular employees) */}
            {user.role !== 'admin' && (
              <button
                type="button"
                onClick={handleToggleMySchedule}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer shadow-sm ${
                  myOnly
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/30'
                    : isLight
                    ? 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                }`}
                title="Tampilkan jadwal saya saja"
              >
                <UserCheck className={`w-4 h-4 ${myOnly ? 'text-[#FFD100]' : 'text-emerald-500'}`} />
                <span>{myOnly ? 'Menampilkan Jadwal Saya' : 'Lihat Jadwal Saya'}</span>
                {mySchedulesCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-800 text-white font-extrabold">
                    {mySchedulesCount}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400'
                  : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
              }`}
              title="Perbarui Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-500' : ''}`} />
            </button>

            <button
              type="button"
              onClick={exportCsv}
              className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                  : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
              }`}
              title="Unduh format spreadsheet CSV"
            >
              <Download className="w-4 h-4 text-[#0054A6] dark:text-[#FFD100]" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* User Notification banner regarding their personal invitation status */}
        {user.role !== 'admin' && (
          <div className={`mt-4 p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            mySchedulesCount > 0
              ? isLight
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
              : isLight
              ? 'bg-slate-100 border-slate-200 text-slate-700'
              : 'bg-slate-800/80 border-slate-700 text-slate-300'
          }`}>
            <div className="flex items-center gap-2">
              {mySchedulesCount > 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <HelpCircle className="w-4 h-4 text-blue-500 shrink-0" />
              )}
              <span>
                {mySchedulesCount > 0 ? (
                  <>
                    <strong>Informasi:</strong> NIK Anda (<strong>{user.nik}</strong> - {user.nama}) memiliki <strong>{mySchedulesCount} agenda pelatihan</strong> di lembar Undangan. Klik tombol <em>"Lihat Jadwal Saya"</em> untuk menyorot jadwal Anda.
                  </>
                ) : (
                  <>
                    <strong>Informasi:</strong> Tidak ditemukan jadwal training atas NIK Anda (<strong>{user.nik}</strong>) pada data undangan saat ini. Anda tetap dapat menelusuri jadwal rekan atau toko menggunakan filter.
                  </>
                )}
              </span>
            </div>

            {mySchedulesCount > 0 && !myOnly && (
              <button
                type="button"
                onClick={() => {
                  setMyOnly(true);
                  setPage(1);
                }}
                className="shrink-0 text-xs font-bold underline text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 cursor-pointer"
              >
                Tampilkan Sekarang &rarr;
              </button>
            )}
          </div>
        )}
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className={`p-4 rounded-xl border transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-slate-900/90 border-slate-800 text-white'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <span>Total Undangan</span>
            <UsersIcon className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black">
            {response?.summary?.totalPeserta?.toLocaleString() ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Peserta terdaftar di sheet
          </div>
        </div>

        <div className={`p-4 rounded-xl border transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-slate-900/90 border-slate-800 text-white'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <span>Unit Toko</span>
            <Building2 className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black">
            {response?.summary?.totalToko?.toLocaleString() ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Toko cabang berpartisipasi
          </div>
        </div>

        <div className={`p-4 rounded-xl border transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-slate-900/90 border-slate-800 text-white'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <span>Area Supervisor (AS)</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black">
            {response?.summary?.totalAS ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Supervisor wilayah terdata
          </div>
        </div>

        <div className={`p-4 rounded-xl border transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-slate-900/90 border-slate-800 text-white'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <span>Area Manager (AM)</span>
            <Briefcase className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black">
            {response?.summary?.totalAM ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Manager wilayah terdata
          </div>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className={`p-5 rounded-2xl border transition-colors shadow-lg ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#0054A6] dark:text-[#FFD100]" />
            <h3 className="text-sm font-bold tracking-tight">
              Penyaringan Data Agenda Undangan
            </h3>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#0054A6] text-white">
                {activeFilterCount} filter aktif
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Semua Filter</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                showAdvancedFilters
                  ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                  : isLight
                  ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{showAdvancedFilters ? 'Tutup Filter Tambahan' : 'Filter Tambahan (Jenis / Tanggal / Sistem)'}</span>
            </button>
          </div>
        </div>

        {/* PRIMARY FILTERS: NIK, NAMA, KODE TOKO, NAMA TOKO, AS, AM (Requested by User) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 pt-4">
          {/* 1. Filter NIK */}
          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Filter by NIK
            </label>
            <div className="relative">
              <input
                type="text"
                value={filterNik}
                onChange={e => {
                  setFilterNik(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari NIK..."
                className={`w-full text-xs font-mono px-3 py-2 rounded-xl border transition-colors outline-none focus:ring-2 focus:ring-blue-500 ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white placeholder-slate-400'
                    : 'bg-slate-950 border-slate-700 text-white focus:border-blue-500 placeholder-slate-500'
                }`}
              />
              {filterNik && (
                <button
                  type="button"
                  onClick={() => setFilterNik('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-rose-500 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* 2. Filter Nama Karyawan */}
          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Filter by Nama
            </label>
            <div className="relative">
              <input
                type="text"
                value={filterNama}
                onChange={e => {
                  setFilterNama(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari nama karyawan..."
                className={`w-full text-xs px-3 py-2 rounded-xl border transition-colors outline-none focus:ring-2 focus:ring-blue-500 ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white placeholder-slate-400'
                    : 'bg-slate-950 border-slate-700 text-white focus:border-blue-500 placeholder-slate-500'
                }`}
              />
              {filterNama && (
                <button
                  type="button"
                  onClick={() => setFilterNama('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-rose-500 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* 3. Filter Kode Toko */}
          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Filter by Kode Toko
            </label>
            <div className="relative">
              <input
                type="text"
                value={filterKodeToko}
                onChange={e => {
                  setFilterKodeToko(e.target.value.toUpperCase());
                  setPage(1);
                }}
                placeholder="Contoh: T33F..."
                className={`w-full text-xs font-mono uppercase px-3 py-2 rounded-xl border transition-colors outline-none focus:ring-2 focus:ring-blue-500 ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white placeholder-slate-400'
                    : 'bg-slate-950 border-slate-700 text-white focus:border-blue-500 placeholder-slate-500'
                }`}
              />
              {filterKodeToko && (
                <button
                  type="button"
                  onClick={() => setFilterKodeToko('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-rose-500 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* 4. Filter Nama Toko */}
          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Filter by Nama Toko
            </label>
            <div className="relative">
              <input
                type="text"
                value={filterNamaToko}
                onChange={e => {
                  setFilterNamaToko(e.target.value);
                  setPage(1);
                }}
                placeholder="Contoh: FRESH..."
                className={`w-full text-xs px-3 py-2 rounded-xl border transition-colors outline-none focus:ring-2 focus:ring-blue-500 ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white placeholder-slate-400'
                    : 'bg-slate-950 border-slate-700 text-white focus:border-blue-500 placeholder-slate-500'
                }`}
              />
              {filterNamaToko && (
                <button
                  type="button"
                  onClick={() => setFilterNamaToko('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-rose-500 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* 5. Filter AS (Area Supervisor) */}
          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Filter by AS (Supervisor)
            </label>
            <select
              value={filterAs}
              onChange={e => {
                setFilterAs(e.target.value);
                setPage(1);
              }}
              className={`w-full text-xs px-3 py-2 rounded-xl border transition-colors outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                  : 'bg-slate-950 border-slate-700 text-white focus:border-blue-500'
              }`}
            >
              <option value="all">Semua AS ({response?.filterOptions?.asOptions?.length ?? 0})</option>
              {response?.filterOptions?.asOptions?.map((item, idx) => (
                <option key={idx} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {/* 6. Filter AM (Area Manager) */}
          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Filter by AM (Manager)
            </label>
            <select
              value={filterAm}
              onChange={e => {
                setFilterAm(e.target.value);
                setPage(1);
              }}
              className={`w-full text-xs px-3 py-2 rounded-xl border transition-colors outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                  : 'bg-slate-950 border-slate-700 text-white focus:border-blue-500'
              }`}
            >
              <option value="all">Semua AM ({response?.filterOptions?.amOptions?.length ?? 0})</option>
              {response?.filterOptions?.amOptions?.map((item, idx) => (
                <option key={idx} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ADVANCED / SECONDARY FILTERS: Global Search, Jenis Training, Tanggal, Sistem Training */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 mt-3 border-t border-dashed border-slate-200 dark:border-slate-800 animate-fade-in">
            {/* Quick General Search */}
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Cari Bebas (Semua Kolom)
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Ketik kata kunci..."
                  className={`w-full text-xs pl-8 pr-3 py-2 rounded-xl border transition-colors outline-none focus:ring-2 focus:ring-blue-500 ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white placeholder-slate-400'
                      : 'bg-slate-950 border-slate-700 text-white focus:border-blue-500 placeholder-slate-500'
                  }`}
                />
              </div>
            </div>

            {/* Filter Jenis Training */}
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Jenis Pelatihan
              </label>
              <select
                value={filterJenis}
                onChange={e => {
                  setFilterJenis(e.target.value);
                  setPage(1);
                }}
                className={`w-full text-xs px-3 py-2 rounded-xl border transition-colors outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    : 'bg-slate-950 border-slate-700 text-white focus:border-blue-500'
                }`}
              >
                <option value="all">Semua Jenis Training</option>
                {response?.filterOptions?.jenisOptions?.map((item, idx) => (
                  <option key={idx} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Tanggal */}
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Tanggal Pelaksanaan
              </label>
              <select
                value={filterTanggal}
                onChange={e => {
                  setFilterTanggal(e.target.value);
                  setPage(1);
                }}
                className={`w-full text-xs px-3 py-2 rounded-xl border transition-colors outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    : 'bg-slate-950 border-slate-700 text-white focus:border-blue-500'
                }`}
              >
                <option value="all">Semua Tanggal Jadwal</option>
                {response?.filterOptions?.tanggalOptions?.map((item, idx) => (
                  <option key={idx} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Sistem Training */}
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Sistem (Metode)
              </label>
              <select
                value={filterSistem}
                onChange={e => {
                  setFilterSistem(e.target.value);
                  setPage(1);
                }}
                className={`w-full text-xs px-3 py-2 rounded-xl border transition-colors outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    : 'bg-slate-950 border-slate-700 text-white focus:border-blue-500'
                }`}
              >
                <option value="all">Semua Sistem</option>
                {response?.filterOptions?.sistemOptions?.map((item, idx) => (
                  <option key={idx} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* DATA TABLE CONTAINER */}
      <div className={`border rounded-2xl overflow-hidden shadow-xl transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900/90 border-slate-800 text-white'
      }`}>
        {/* Table Header Bar */}
        <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isLight ? 'border-slate-200 bg-slate-50/70' : 'border-slate-800 bg-slate-950/60'
        }`}>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm tracking-tight">
              Daftar Peserta & Jadwal Training
            </span>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
              {response?.pagination?.total ?? 0} data ditemukan
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className={isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}>
              Tampilkan per halaman:
            </span>
            <select
              value={limit}
              onChange={e => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className={`text-xs px-2.5 py-1 rounded-lg border font-semibold outline-none cursor-pointer ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-800'
                  : 'bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border-b border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={loadData}
              className="font-bold underline cursor-pointer"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className={`text-xs font-mono font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Memuat data jadwal training dari sheet Undangan...
            </span>
          </div>
        ) : response?.data && response.data.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse table-fixed">
              <thead>
                <tr className={`border-b text-[10.5px] font-extrabold uppercase tracking-wider ${
                  isLight ? 'bg-slate-100/90 text-slate-700 border-slate-200' : 'bg-slate-950/80 text-slate-400 border-slate-800'
                }`}>
                  <th className="py-2.5 px-2 w-[3.5%] text-center">No</th>
                  <th className="py-2.5 px-2 w-[21.5%]">Karyawan (NIK & Nama)</th>
                  <th className="py-2.5 px-2 w-[11%]">Jabatan</th>
                  <th className="py-2.5 px-2 w-[18%]">Unit Toko</th>
                  <th className="py-2.5 px-2 w-[18%]">Jadwal Pelaksanaan</th>
                  <th className="py-2.5 px-2 w-[13%]">Jenis Training</th>
                  <th className="py-2.5 px-2 w-[15%] text-center">Sistem</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/80'}`}>
                {response.data.map((item, index) => {
                  const isCurrentUser = item.nik === user.nik;
                  const rowNumber = ((page - 1) * limit) + index + 1;
                  const rawSistem = (item.sistem_training || 'OFFLINE').trim();
                  const upperSistem = rawSistem.toUpperCase();
                  const hasOnline = upperSistem.includes('ONLINE');
                  const hasOffline = upperSistem.includes('OFFLINE');
                  const isHybrid = hasOnline && hasOffline;

                  return (
                    <tr
                      key={`${item.nik}_${item.tanggal}_${item.jenis_training}_${index}`}
                      className={`transition-colors ${
                        isCurrentUser
                          ? isLight
                            ? 'bg-emerald-50/80 hover:bg-emerald-100/80'
                            : 'bg-emerald-950/40 hover:bg-emerald-950/60'
                          : isLight
                          ? 'hover:bg-slate-50'
                          : 'hover:bg-slate-800/50'
                      }`}
                    >
                      {/* 1. No */}
                      <td className="py-2.5 px-2 text-center font-mono text-[10.5px] opacity-70">
                        {rowNumber}
                      </td>

                      {/* 2. Karyawan (NIK & Nama) */}
                      <td className="py-2.5 px-2 overflow-hidden">
                        <div className="min-w-0">
                          <div className={`font-bold text-xs truncate ${isLight ? 'text-slate-900' : 'text-white'}`} title={item.nama}>
                            {item.nama}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[10.5px] font-bold text-blue-600 dark:text-blue-400">
                              {item.nik}
                            </span>
                            {isCurrentUser && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-600 text-white shrink-0">
                                Anda
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. Jabatan */}
                      <td className="py-2.5 px-2 overflow-hidden">
                        <span className={`text-[11px] font-medium leading-snug line-clamp-2 ${isLight ? 'text-slate-700' : 'text-slate-300'}`} title={item.jabatan}>
                          {item.jabatan || '-'}
                        </span>
                      </td>

                      {/* 4. Unit Toko */}
                      <td className="py-2.5 px-2 overflow-hidden">
                        <div className="flex items-start gap-1.5 min-w-0">
                          <Building2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <div
                              className={`font-semibold text-[11px] leading-snug truncate ${isLight ? 'text-slate-800' : 'text-slate-200'}`}
                              title={`Toko: ${item.nama_toko || item.kode_toko}${item.as || item.am ? ` (AS: ${item.as || '-'} | AM: ${item.am || '-'})` : ''}`}
                            >
                              {item.nama_toko || item.kode_toko}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 truncate font-mono font-medium">
                              <span>Kode: {item.kode_toko}</span>
                              {(item.as || item.am) && (
                                <span className="opacity-75 font-sans truncate" title={`AS: ${item.as || '-'} | AM: ${item.am || '-'}`}>
                                  • {item.as ? `AS: ${item.as}` : ''} {item.am ? `AM: ${item.am}` : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 5. Jadwal Pelaksanaan */}
                      <td className="py-2.5 px-2 overflow-hidden">
                        <div className="flex items-start gap-1.5 min-w-0">
                          <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                          <span className={`font-semibold text-[11px] leading-snug break-words ${isLight ? 'text-slate-800' : 'text-slate-200'}`} title={item.tanggal}>
                            {item.tanggal || '-'}
                          </span>
                        </div>
                      </td>

                      {/* 6. Jenis Training */}
                      <td className="py-2.5 px-2 overflow-hidden">
                        <span className="inline-block max-w-full px-2 py-0.5 rounded text-[10.5px] font-bold bg-blue-50 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800 truncate" title={item.jenis_training}>
                          {item.jenis_training || '-'}
                        </span>
                      </td>

                      {/* 7. Sistem (Offline / Online / Hybrid) */}
                      <td className="py-2.5 px-2 text-center">
                        <span
                          className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full text-[9.5px] font-extrabold uppercase tracking-wide whitespace-nowrap shadow-xs ${
                            isHybrid
                              ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/80 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700'
                              : hasOnline
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                              : 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          }`}
                          title={rawSistem}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              isHybrid ? 'bg-indigo-600 dark:bg-indigo-400' : hasOnline ? 'bg-blue-500' : 'bg-amber-500'
                            }`}
                          ></span>
                          <span>{rawSistem}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center px-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <Calendar className="w-7 h-7" />
            </div>
            <h4 className={`text-base font-bold mb-1 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              Tidak Ada Data Agenda yang Sesuai
            </h4>
            <p className={`text-xs max-w-md mx-auto mb-4 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              {hasActiveFilters
                ? 'Tidak ditemukan agenda training dengan kriteria filter yang Anda pilih. Coba sesuaikan kata kunci atau bersihkan filter.'
                : 'Belum ada data agenda training yang tersedia pada sheet Undangan.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0054A6] text-white hover:bg-blue-700 shadow-md cursor-pointer transition-colors inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Semua Filter</span>
              </button>
            )}
          </div>
        )}

        {/* Pagination Bar */}
        {response?.pagination && response.pagination.totalPages > 1 && (
          <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
            isLight ? 'border-slate-200 bg-slate-50/70 text-slate-700' : 'border-slate-800 bg-slate-950/60 text-slate-300'
          }`}>
            <div>
              Menampilkan halaman <strong>{response.pagination.page}</strong> dari <strong>{response.pagination.totalPages}</strong> ({response.pagination.total} total data)
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={response.pagination.page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className={`p-2 rounded-lg border font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  response.pagination.page <= 1
                    ? 'opacity-40 cursor-not-allowed border-transparent'
                    : isLight
                    ? 'border-slate-300 bg-white hover:bg-slate-100 text-slate-800'
                    : 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-white'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Sebelumnya</span>
              </button>

              {/* Page Numbers */}
              <div className="hidden sm:flex items-center gap-1 px-1">
                {Array.from({ length: Math.min(5, response.pagination.totalPages) }).map((_, idx) => {
                  let pageNum: number;
                  const total = response.pagination.totalPages;
                  const current = response.pagination.page;

                  if (total <= 5) {
                    pageNum = idx + 1;
                  } else if (current <= 3) {
                    pageNum = idx + 1;
                  } else if (current >= total - 2) {
                    pageNum = total - 4 + idx;
                  } else {
                    pageNum = current - 2 + idx;
                  }

                  const isActive = pageNum === current;

                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#0054A6] text-white shadow-sm'
                          : isLight
                          ? 'text-slate-700 hover:bg-slate-200'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={response.pagination.page >= response.pagination.totalPages}
                onClick={() => setPage(p => Math.min(response.pagination.totalPages, p + 1))}
                className={`p-2 rounded-lg border font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  response.pagination.page >= response.pagination.totalPages
                    ? 'opacity-40 cursor-not-allowed border-transparent'
                    : isLight
                    ? 'border-slate-300 bg-white hover:bg-slate-100 text-slate-800'
                    : 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-white'
                }`}
              >
                <span>Berikutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper icon
function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
