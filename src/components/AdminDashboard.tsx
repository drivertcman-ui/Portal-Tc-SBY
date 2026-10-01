import React, { useState, useEffect, useRef } from 'react';
import { DashboardStats, EmployeeListItem } from '../types';
import { api } from '../services/api';
import { GoogleAppsScriptModal } from './GoogleAppsScriptModal';
import { AgendaUndangan } from './AgendaUndangan';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  Building,
  RefreshCw,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Code2,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Save,
  Lock,
  Phone,
  Mail,
  CalendarCheck2,
  Calendar,
  GraduationCap,
  Clock,
  Filter,
} from 'lucide-react';

interface AdminDashboardProps {
  onForceSync: () => Promise<void>;
  isSyncing: boolean;
  themeMode?: 'dark' | 'light';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onForceSync,
  isSyncing,
  themeMode = 'dark',
}) => {
  const isLight = themeMode === 'light';
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Active View Tab: 'employees' | 'absensi' | 'undangan' | 'rekap'
  const [activeTab, setActiveTab] = useState<'employees' | 'rekap' | 'absensi' | 'undangan'>('employees');

  // Table 1 State: Karyawan & Akun Pintar
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jabatanFilter, setJabatanFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingTable, setIsLoadingTable] = useState(false);

  // Table 2 State: Rekap Absensi Training
  const [absensiList, setAbsensiList] = useState<any[]>([]);
  const [absensiSearch, setAbsensiSearch] = useState('');
  const [absensiTanggalFilter, setAbsensiTanggalFilter] = useState('all');
  const [absensiJenisFilter, setAbsensiJenisFilter] = useState('all');
  const [absensiCabangFilter, setAbsensiCabangFilter] = useState('all');
  const [absensiStatusFilter, setAbsensiStatusFilter] = useState('all');
  const [absensiPage, setAbsensiPage] = useState(1);
  const [absensiTotalPages, setAbsensiTotalPages] = useState(1);
  const [absensiTotalCount, setAbsensiTotalCount] = useState(0);
  const [absensiSummary, setAbsensiSummary] = useState({ total: 0, totalHadir: 0, totalBelum: 0, percentage: 0 });
  const [isLoadingAbsensi, setIsLoadingAbsensi] = useState(false);

  // Delete Absensi State
  const [deletingAbsensiRecord, setDeletingAbsensiRecord] = useState<any | null>(null);
  const [isDeletingSingleAbsensi, setIsDeletingSingleAbsensi] = useState(false);
  const [isConfirmingClearAllAbsensi, setIsConfirmingClearAllAbsensi] = useState(false);
  const [isClearingAllAbsensi, setIsClearingAllAbsensi] = useState(false);
  const [deleteAbsensiError, setDeleteAbsensiError] = useState('');

  // Schedules metadata for filter dropdowns
  const [trainingDates, setTrainingDates] = useState<string[]>([]);
  const [trainingTypes, setTrainingTypes] = useState<string[]>([]);
  const [trainingBranches, setTrainingBranches] = useState<string[]>([]);

  // Persistent filter refs
  const filtersRef = useRef({
    search,
    statusFilter,
    jabatanFilter,
    page,
    absensiSearch,
    absensiTanggalFilter,
    absensiJenisFilter,
    absensiCabangFilter,
    absensiStatusFilter,
    absensiPage,
  });

  useEffect(() => {
    filtersRef.current = {
      search,
      statusFilter,
      jabatanFilter,
      page,
      absensiSearch,
      absensiTanggalFilter,
      absensiJenisFilter,
      absensiCabangFilter,
      absensiStatusFilter,
      absensiPage,
    };
  });

  // Password visibility map for table rows
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Edit Modal State
  const [editingEmployee, setEditingEmployee] = useState<EmployeeListItem | null>(null);
  const [editWa, setEditWa] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(true);

  // Delete Modal State
  const [deletingEmployee, setDeletingEmployee] = useState<EmployeeListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Webhook Modal State
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');

  const loadStats = async () => {
    try {
      setIsLoadingStats(true);
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const loadEmployees = async (overrideFilters?: {
    search?: string;
    status?: string;
    jabatan?: string;
    page?: number;
  }) => {
    try {
      setIsLoadingTable(true);
      const current = filtersRef.current;
      const res = await api.getAdminEmployees({
        search: overrideFilters?.search ?? current.search,
        status: overrideFilters?.status ?? current.statusFilter,
        jabatan: overrideFilters?.jabatan ?? current.jabatanFilter,
        page: overrideFilters?.page ?? current.page,
        limit: 25,
      });
      setEmployees(res.data);
      setTotalPages(res.pagination.totalPages);
      setTotalCount(res.pagination.total);
    } catch (err: any) {
      if (!err?.message?.includes('Sesi telah kedaluwarsa') && !err?.message?.includes('Akses ditolak')) {
        console.error('Failed to load employees:', err);
      }
    } finally {
      setIsLoadingTable(false);
    }
  };

  const loadAbsensiList = async (overrideFilters?: {
    search?: string;
    tanggal?: string;
    jenis_training?: string;
    status?: string;
    cabang?: string;
    page?: number;
  }) => {
    try {
      setIsLoadingAbsensi(true);
      const current = filtersRef.current;
      const res = await api.getAdminAbsensiList({
        search: overrideFilters?.search ?? current.absensiSearch,
        tanggal: overrideFilters?.tanggal ?? current.absensiTanggalFilter,
        jenis_training: overrideFilters?.jenis_training ?? current.absensiJenisFilter,
        status: overrideFilters?.status ?? current.absensiStatusFilter,
        cabang: overrideFilters?.cabang ?? current.absensiCabangFilter,
        page: overrideFilters?.page ?? current.absensiPage,
        limit: 25,
      });
      setAbsensiList(res.data);
      setAbsensiSummary(res.summary);
      setAbsensiTotalPages(res.pagination.totalPages);
      setAbsensiTotalCount(res.pagination.total);
    } catch (err: any) {
      if (!err?.message?.includes('Sesi telah kedaluwarsa') && !err?.message?.includes('Akses ditolak')) {
        console.error('Failed to load absensi list:', err);
      }
    } finally {
      setIsLoadingAbsensi(false);
    }
  };

  const loadTrainingMetadata = async () => {
    try {
      const res = await api.getTrainingSchedule();
      const dates = res.scheduleOptions.map(s => s.tanggal);
      const types = new Set<string>();
      res.scheduleOptions.forEach(s => {
        s.jenis_list.forEach(j => types.add(j.jenis_training));
      });
      setTrainingDates(dates);
      setTrainingTypes(Array.from(types));
      if (res.branchOptions && res.branchOptions.length > 0) {
        setTrainingBranches(res.branchOptions);
      }
    } catch (e) {
      console.error('Failed to load training metadata:', e);
    }
  };

  useEffect(() => {
    loadStats();
    loadTrainingMetadata();
    api.getWebhookConfig().then(res => setWebhookUrl(res.webhookUrl)).catch(() => {});

    // Live Auto-Sync Every 10 Seconds
    const interval = setInterval(() => {
      loadStats();
      loadEmployees();
      loadAbsensiList();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadEmployees({ search, status: statusFilter, jabatan: jabatanFilter, page });
  }, [search, statusFilter, jabatanFilter, page]);

  useEffect(() => {
    loadAbsensiList({
      search: absensiSearch,
      tanggal: absensiTanggalFilter,
      jenis_training: absensiJenisFilter,
      status: absensiStatusFilter,
      cabang: absensiCabangFilter,
      page: absensiPage,
    });
  }, [absensiSearch, absensiTanggalFilter, absensiJenisFilter, absensiStatusFilter, absensiCabangFilter, absensiPage]);

  const handleSync = async () => {
    await onForceSync();
    await loadStats();
    await loadEmployees();
    await loadAbsensiList();
    await loadTrainingMetadata();
  };

  const handleSaveWebhook = async (url: string) => {
    await api.saveWebhookConfig(url);
    setWebhookUrl(url);
  };

  const handleExportCSV = () => {
    const token = api.getToken();
    window.location.href = `/api/admin/export-csv?token=${token}`;
  };

  const handleExportAbsensiCSV = () => {
    const token = api.getToken();
    window.location.href = `/api/admin/export-absensi-csv?token=${token}`;
  };

  const handleSingleDeleteAbsensi = async () => {
    if (!deletingAbsensiRecord) return;
    try {
      setIsDeletingSingleAbsensi(true);
      setDeleteAbsensiError('');
      const recId = deletingAbsensiRecord.id || `${deletingAbsensiRecord.nik}_${deletingAbsensiRecord.tanggal}_${deletingAbsensiRecord.jenis_training}`;
      await api.deleteAdminAbsensiRecord(recId);
      setDeletingAbsensiRecord(null);
      await handleSync();
    } catch (err: any) {
      setDeleteAbsensiError(err.message || 'Gagal menghapus data absensi');
    } finally {
      setIsDeletingSingleAbsensi(false);
    }
  };

  const handleClearAllAbsensi = async () => {
    try {
      setIsClearingAllAbsensi(true);
      setDeleteAbsensiError('');
      await api.clearAllAbsensiRecords();
      setIsConfirmingClearAllAbsensi(false);
      await handleSync();
    } catch (err: any) {
      setDeleteAbsensiError(err.message || 'Gagal menghapus seluruh data absensi');
    } finally {
      setIsClearingAllAbsensi(false);
    }
  };

  const togglePasswordVisibility = (nik: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [nik]: !prev[nik],
    }));
  };

  // Open Edit Modal
  const handleOpenEdit = (emp: EmployeeListItem) => {
    setEditingEmployee(emp);
    setEditWa(emp.wa || '');
    setEditEmail(emp.email_pintar || '');
    setEditPassword(emp.password_pintar || '');
    setEditError('');
    setShowEditPassword(true);
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    try {
      setIsSavingEdit(true);
      setEditError('');
      await api.updateEmployeeAkunPintar(editingEmployee.nik, {
        wa: editWa,
        email_pintar: editEmail,
        password_pintar: editPassword,
      });

      setEditingEmployee(null);
      await loadEmployees();
      await loadStats();
    } catch (err: any) {
      setEditError(err.message || 'Gagal memperbarui data.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Open Delete Modal
  const handleOpenDelete = (emp: EmployeeListItem) => {
    setDeletingEmployee(emp);
    setDeleteError('');
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingEmployee) return;

    try {
      setIsDeleting(true);
      setDeleteError('');
      await api.deleteEmployeeAkunPintar(deletingEmployee.nik);
      setDeletingEmployee(null);
      await loadEmployees();
      await loadStats();
    } catch (err: any) {
      setDeleteError(err.message || 'Gagal menghapus data akun pintar.');
    } finally {
      setIsDeleting(false);
    }
  };

  const distinctJabatans = stats?.jabatanStats.map(j => j.jabatan) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Actions & Title */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border rounded-2xl p-6 shadow-xl transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900/95 border-slate-800 text-white'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E31E25]/20 border border-[#E31E25]/50 text-[#E31E25]">
              Admin Console
            </span>
            <span className={`text-xs font-mono ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Spreadsheet: 1VyP2x_0zRX...
            </span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-extrabold mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Konsol Administrasi TC Surabaya
          </h1>
          <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            Monitoring rekapitulasi data, sinkronisasi Akun Pintar, dan Absensi Kehadiran Training real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsScriptModalOpen(true)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer shadow-md ${
              isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="Pengaturan Otomasi Webhook Google Apps Script"
          >
            <Code2 className="w-3.5 h-3.5 text-[#0054A6]" />
            <span>Setup Apps Script</span>
          </button>

          <button
            onClick={activeTab === 'absensi' ? handleExportAbsensiCSV : handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold border border-emerald-600 transition cursor-pointer shadow-md"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{activeTab === 'absensi' ? 'Ekspor Absensi CSV' : 'Ekspor AkunPintar CSV'}</span>
          </button>

          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#E31E25] via-[#0054A6] to-[#004080] hover:brightness-110 text-white text-xs font-extrabold shadow-lg shadow-[#0054A6]/30 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#FFD100] ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sheet'}</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Karyawan */}
        <div className={`border rounded-2xl p-5 shadow-lg relative overflow-hidden transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900/90 border-slate-800 text-white'
        }`}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#E31E25] to-[#0054A6]"></div>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>Total Karyawan</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className={`mt-2 text-2xl sm:text-3xl font-bold font-mono tabular-nums ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {stats?.totalKaryawan.toLocaleString('id-ID') || 0}
          </div>
          <div className={`mt-1 text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Terdaftar di sheet <code>Users</code>
          </div>
        </div>

        {/* Metric 2: Akun Pintar Terisi */}
        <div className={`border rounded-2xl p-5 shadow-lg relative overflow-hidden transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900/90 border-slate-800 text-white'
        }`}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0054A6] to-emerald-500"></div>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>Akun Pintar Terisi</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
            {stats?.totalTerisi.toLocaleString('id-ID') || 0}
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
            {stats?.completionPercentage || 0}% Target Tercapai
          </div>
        </div>

        {/* Metric 3: Total Jadwal Training */}
        <div className={`border rounded-2xl p-5 shadow-lg relative overflow-hidden transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900/90 border-slate-800 text-white'
        }`}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-[#FFD100]"></div>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>Peserta Training</span>
            <GraduationCap className="w-4 h-4 text-purple-600" />
          </div>
          <div className={`mt-2 text-2xl sm:text-3xl font-bold font-mono tabular-nums ${isLight ? 'text-purple-700' : 'text-purple-300'}`}>
            {stats?.totalTrainings?.toLocaleString('id-ID') || 0}
          </div>
          <div className={`mt-1 text-[11px] ${isLight ? 'text-purple-700' : 'text-purple-300'}`}>
            Terdaftar di sheet <code>Trainings</code>
          </div>
        </div>

        {/* Metric 4: Kehadiran Absensi */}
        <div className={`border rounded-2xl p-5 shadow-lg relative overflow-hidden transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900/90 border-slate-800 text-white'
        }`}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FFD100] to-[#E31E25]"></div>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>Kehadiran Absensi</span>
            <CalendarCheck2 className="w-4 h-4 text-[#E31E25]" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-[#0054A6] dark:text-[#FFD100] tabular-nums">
            {stats?.totalAbsensi?.toLocaleString('id-ID') || 0}
          </div>
          <div className="mt-1 text-[11px] text-[#0054A6] dark:text-[#FFD100] font-semibold">
            Peserta telah hadir training
          </div>
        </div>
      </div>

      {/* Navigation View Switcher (3 Tabs with Indomaret Tricolor Theme) */}
      <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-300' : 'border-slate-800'}`}>
        <div className={`flex flex-wrap items-center gap-2 p-1 rounded-2xl border shadow-inner ${
          isLight ? 'bg-slate-200/80 border-slate-300' : 'bg-slate-950/90 border-slate-800'
        }`}>
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-4 py-2.5 text-xs font-extrabold rounded-xl transition cursor-pointer ${
              activeTab === 'employees'
                ? 'bg-gradient-to-r from-[#E31E25] via-[#0054A6] to-[#003875] text-white shadow-lg shadow-[#0054A6]/30'
                : isLight ? 'text-slate-700 hover:text-slate-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            Daftar Karyawan & Akun Pintar
          </button>
          <button
            onClick={() => setActiveTab('absensi')}
            className={`px-4 py-2.5 text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'absensi'
                ? 'bg-gradient-to-r from-[#E31E25] via-[#0054A6] to-[#003875] text-white shadow-lg shadow-[#0054A6]/30'
                : isLight ? 'text-slate-700 hover:text-slate-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarCheck2 className="w-4 h-4 text-[#FFD100]" />
            <span>Rekap Absensi Kehadiran Training</span>
          </button>
          <button
            onClick={() => setActiveTab('undangan')}
            className={`px-4 py-2.5 text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'undangan'
                ? 'bg-gradient-to-r from-[#E31E25] via-[#0054A6] to-[#003875] text-white shadow-lg shadow-[#0054A6]/30'
                : isLight ? 'text-slate-700 hover:text-slate-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4 text-[#FFD100]" />
            <span>Agenda Jadwal Training (Undangan)</span>
          </button>
          <button
            onClick={() => setActiveTab('rekap')}
            className={`px-4 py-2.5 text-xs font-extrabold rounded-xl transition cursor-pointer ${
              activeTab === 'rekap'
                ? 'bg-gradient-to-r from-[#E31E25] via-[#0054A6] to-[#003875] text-white shadow-lg shadow-[#0054A6]/30'
                : isLight ? 'text-slate-700 hover:text-slate-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            Rekap Data & Progres Jabatan
          </button>
        </div>
      </div>

      {/* TAB 1: DETAILED EMPLOYEE & AKUN PINTAR TABLE WITH EDIT & DELETE ACTIONS */}
      {activeTab === 'employees' && (
        <div className={`border rounded-2xl p-6 shadow-xl space-y-4 transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900/90 border-slate-800 text-white'
        }`}>
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2 relative">
              <input
                type="text"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari NIK, Nama, Toko, No WA, Email..."
                className={`w-full pl-9 pr-4 py-2 border rounded-lg text-xs font-mono transition focus:outline-none focus:ring-1 focus:ring-[#0054A6] ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-slate-900/90 border-slate-700 text-white placeholder-slate-500'
                }`}
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={e => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className={`w-full px-3 py-2 border rounded-lg text-xs transition cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#0054A6] ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900/90 border-slate-700 text-slate-200'
                }`}
              >
                <option value="all">Semua Status Akun</option>
                <option value="filled">✓ Sudah Input Akun Pintar</option>
                <option value="empty">⚠ Belum Input Akun Pintar</option>
              </select>
            </div>

            <div>
              <select
                value={jabatanFilter}
                onChange={e => {
                  setJabatanFilter(e.target.value);
                  setPage(1);
                }}
                className={`w-full px-3 py-2 border rounded-lg text-xs transition cursor-pointer truncate focus:outline-none focus:ring-1 focus:ring-[#0054A6] ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900/90 border-slate-700 text-slate-200'
                }`}
              >
                <option value="all">Semua Jabatan ({distinctJabatans.length})</option>
                {distinctJabatans.map(j => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className={`overflow-x-auto border rounded-xl ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <table className="w-full text-left text-xs border-collapse">
              <thead className={`font-semibold border-b ${
                isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-900/90 text-slate-400 border-slate-800'
              }`}>
                <tr>
                  <th className="py-3 px-3.5">NIK</th>
                  <th className="py-3 px-3.5">Nama</th>
                  <th className="py-3 px-3.5">Jabatan</th>
                  <th className="py-3 px-3.5">Kode Toko / Nama Toko</th>
                  <th className="py-3 px-3.5">Nomor WA</th>
                  <th className="py-3 px-3.5">Email Pintar</th>
                  <th className="py-3 px-3.5">Password Pintar</th>
                  <th className="py-3 px-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                {isLoadingTable ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                        <span>Memuat data karyawan...</span>
                      </div>
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Tidak ada data karyawan yang cocok dengan kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  employees.map(emp => (
                    <tr key={emp.nik} className={`transition ${isLight ? 'hover:bg-slate-100' : 'hover:bg-slate-800/40'}`}>
                      <td className={`py-2.5 px-3.5 font-mono font-extrabold whitespace-nowrap ${
                        isLight ? 'text-slate-900' : 'text-slate-200'
                      }`}>
                        {emp.nik}
                      </td>
                      <td className={`py-2.5 px-3.5 font-bold truncate max-w-[170px] ${
                        isLight ? 'text-slate-900' : 'text-white'
                      }`}>
                        {emp.nama}
                      </td>
                      <td className={`py-2.5 px-3.5 font-semibold truncate max-w-[140px] ${
                        isLight ? 'text-slate-700' : 'text-slate-300'
                      }`}>
                        {emp.jabatan}
                      </td>
                      <td className="py-2.5 px-3.5 truncate max-w-[180px]">
                        <span className={`font-mono font-bold mr-1 ${isLight ? 'text-[#0054A6]' : 'text-blue-400'}`}>{emp.kode_toko}</span>
                        <span className={isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}>/ {emp.nama_toko}</span>
                      </td>
                      <td className={`py-2.5 px-3.5 font-mono font-semibold whitespace-nowrap ${
                        isLight ? 'text-slate-800' : 'text-slate-300'
                      }`}>
                        {emp.wa || <span className={isLight ? 'text-slate-400 italic' : 'text-slate-500 italic'}>-</span>}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono truncate max-w-[170px]">
                        {emp.email_pintar ? (
                          <span className={isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400 font-semibold'}>{emp.email_pintar}</span>
                        ) : (
                          <span className={isLight ? 'text-slate-400 italic' : 'text-slate-500 italic'}>Belum diisi</span>
                        )}
                      </td>
                      <td className={`py-2.5 px-3.5 font-mono font-semibold whitespace-nowrap ${
                        isLight ? 'text-slate-800' : 'text-slate-300'
                      }`}>
                        {emp.password_pintar ? (
                          <div className="flex items-center gap-1.5">
                            <span>
                              {visiblePasswords[emp.nik]
                                ? emp.password_pintar
                                : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(emp.nik)}
                              className={`p-0.5 transition cursor-pointer ${isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200'}`}
                              title="Tampilkan / Sembunyikan Password"
                            >
                              {visiblePasswords[emp.nik] ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className={isLight ? 'text-slate-400 italic' : 'text-slate-500 italic'}>-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(emp)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-extrabold transition cursor-pointer ${
                              isLight
                                ? 'bg-blue-50 hover:bg-blue-100 text-[#0054A6] border border-blue-300'
                                : 'bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40'
                            }`}
                            title="Edit Data Akun Pintar"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenDelete(emp)}
                            disabled={!emp.is_filled}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-extrabold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                              isLight
                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300'
                                : 'bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/40'
                            }`}
                            title={emp.is_filled ? 'Hapus Data Akun Pintar' : 'Data belum diisi'}
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className={`flex items-center justify-between text-xs pt-2 ${
            isLight ? 'text-slate-700 font-medium' : 'text-slate-400'
          }`}>
            <div>
              Menampilkan <span className={`font-mono font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>{employees.length}</span> dari{' '}
              <span className={`font-mono font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>{totalCount}</span> karyawan
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className={`p-1.5 rounded border transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  isLight ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100' : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className={`font-mono font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                Halaman {page} dari {totalPages || 1}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className={`p-1.5 rounded border transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  isLight ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100' : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REKAP ABSENSI KEHADIRAN TRAINING */}
      {activeTab === 'absensi' && (
        <div className={`border rounded-2xl p-6 shadow-xl space-y-4 transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-800/90 border-slate-700/80 text-white'
        }`}>
          {/* Summary KPI Bar for Training Attendance */}
          <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl border transition-colors ${
            isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-900/80 border-slate-700/60 text-white'
          }`}>
            <div>
              <div className={`text-[11px] font-semibold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Total Peserta Terjadwal</div>
              <div className={`text-xl font-bold font-mono tabular-nums ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {absensiSummary.total.toLocaleString('id-ID')}
              </div>
            </div>
            <div>
              <div className={`text-[11px] font-semibold ${isLight ? 'text-emerald-700' : 'text-slate-400'}`}>Sudah Hadir Absen</div>
              <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                {absensiSummary.totalHadir.toLocaleString('id-ID')}
              </div>
            </div>
            <div>
              <div className={`text-[11px] font-semibold ${isLight ? 'text-amber-700' : 'text-slate-400'}`}>Belum Hadir</div>
              <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 tabular-nums">
                {absensiSummary.totalBelum.toLocaleString('id-ID')}
              </div>
            </div>
            <div>
              <div className={`text-[11px] font-semibold ${isLight ? 'text-blue-700' : 'text-slate-400'}`}>Tingkat Kehadiran</div>
              <div className="text-xl font-bold font-mono text-[#0054A6] dark:text-blue-400 tabular-nums">
                {absensiSummary.percentage}%
              </div>
            </div>
          </div>

          {/* Filters Bar for Absensi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={absensiSearch}
                onChange={e => {
                  setAbsensiSearch(e.target.value);
                  setAbsensiPage(1);
                }}
                placeholder="Cari NIK, Nama, Toko..."
                className={`w-full pl-9 pr-4 py-2 border rounded-lg text-xs font-mono transition focus:outline-none focus:ring-1 focus:ring-[#0054A6] ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-slate-900/90 border-slate-700 text-white placeholder-slate-500'
                }`}
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            {/* Filter Cabang */}
            <div>
              <select
                value={absensiCabangFilter}
                onChange={e => {
                  setAbsensiCabangFilter(e.target.value);
                  setAbsensiPage(1);
                }}
                className={`w-full px-3 py-2 border rounded-lg text-xs font-semibold transition cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#0054A6] ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900/90 border-slate-700 text-slate-200'
                }`}
              >
                <option value="all">Semua Cabang ({trainingBranches.length || 1})</option>
                {trainingBranches.map(c => (
                  <option key={c} value={c}>Cabang {c}</option>
                ))}
              </select>
            </div>

            {/* Filter Tanggal */}
            <div>
              <select
                value={absensiTanggalFilter}
                onChange={e => {
                  setAbsensiTanggalFilter(e.target.value);
                  setAbsensiPage(1);
                }}
                className={`w-full px-3 py-2 border rounded-lg text-xs transition cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#0054A6] ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900/90 border-slate-700 text-slate-200'
                }`}
              >
                <option value="all">Semua Tanggal Training ({trainingDates.length})</option>
                {trainingDates.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Filter Jenis Training */}
            <div>
              <select
                value={absensiJenisFilter}
                onChange={e => {
                  setAbsensiJenisFilter(e.target.value);
                  setAbsensiPage(1);
                }}
                className={`w-full px-3 py-2 border rounded-lg text-xs transition cursor-pointer truncate focus:outline-none focus:ring-1 focus:ring-[#0054A6] ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900/90 border-slate-700 text-slate-200'
                }`}
              >
                <option value="all">Semua Jenis Training ({trainingTypes.length})</option>
                {trainingTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Filter Status Hadir */}
            <div>
              <select
                value={absensiStatusFilter}
                onChange={e => {
                  setAbsensiStatusFilter(e.target.value);
                  setAbsensiPage(1);
                }}
                className={`w-full px-3 py-2 border rounded-lg text-xs transition cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#0054A6] ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900/90 border-slate-700 text-slate-200'
                }`}
              >
                <option value="all">Semua Status Kehadiran</option>
                <option value="hadir">✓ Sudah Hadir Absen</option>
                <option value="belum">⚠ Belum Hadir</option>
              </select>
            </div>
          </div>

          {/* Action Toolbar for Absensi */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className={`text-xs ${isLight ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
              Total Peserta Hadir: <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{absensiSummary.totalHadir}</span> Orang
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportAbsensiCSV}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor Absensi CSV</span>
              </button>
              {absensiSummary.totalHadir > 0 && (
                <button
                  onClick={() => setIsConfirmingClearAllAbsensi(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow border ${
                    isLight
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-rose-950/90 hover:bg-rose-900 text-rose-200 border-rose-800/80'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Hapus Semua Absensi</span>
                </button>
              )}
            </div>
          </div>

          {/* Absensi Table */}
          <div className={`overflow-x-auto border rounded-xl ${isLight ? 'border-slate-200' : 'border-slate-700/60'}`}>
            <table className="w-full text-left text-xs border-collapse">
              <thead className={`font-semibold border-b ${
                isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-900/90 text-slate-400 border-slate-700/60'
              }`}>
                <tr>
                  <th className="py-3 px-3.5">Tanggal</th>
                  <th className="py-3 px-3.5">NIK</th>
                  <th className="py-3 px-3.5">Nama Peserta</th>
                  <th className="py-3 px-3.5">Cabang</th>
                  <th className="py-3 px-3.5">Kode / Nama Toko</th>
                  <th className="py-3 px-3.5">Jenis Training</th>
                  <th className="py-3 px-3.5">Status Kehadiran</th>
                  <th className="py-3 px-3.5">Waktu Absen</th>
                  <th className="py-3 px-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                {isLoadingAbsensi ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <div className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                        <span>Memuat data absensi training...</span>
                      </div>
                    </td>
                  </tr>
                ) : absensiList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className={`py-12 text-center ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Tidak ada data absensi training yang cocok dengan kriteria filter.
                    </td>
                  </tr>
                ) : (
                  absensiList.map((row, idx) => (
                    <tr key={idx} className={`transition ${isLight ? 'hover:bg-slate-100' : 'hover:bg-slate-800/40'}`}>
                      <td className={`py-2.5 px-3.5 font-mono whitespace-nowrap ${isLight ? 'text-slate-800 font-medium' : 'text-slate-300'}`}>
                        {row.tanggal}
                      </td>
                      <td className={`py-2.5 px-3.5 font-mono font-extrabold whitespace-nowrap ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {row.nik}
                      </td>
                      <td className={`py-2.5 px-3.5 font-bold truncate max-w-[170px] ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                        {row.nama}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span className={`inline-block px-2 py-0.5 rounded font-mono text-[11px] font-bold uppercase border ${
                          isLight ? 'bg-purple-100 border-purple-300 text-purple-800' : 'bg-purple-950/60 border-purple-800/60 text-purple-300'
                        }`}>
                          {row.cabang || 'SBY'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 truncate max-w-[180px]">
                        <span className={`font-mono font-bold mr-1 ${isLight ? 'text-[#0054A6]' : 'text-blue-400'}`}>{row.kode_toko}</span>
                        <span className={isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}>/ {row.nama_toko}</span>
                      </td>
                      <td className={`py-2.5 px-3.5 font-bold truncate max-w-[180px] ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {row.jenis_training}
                      </td>
                      <td className="py-2.5 px-3.5">
                        {row.is_hadir ? (
                          <span className={`inline-flex items-center gap-1 text-[11px] border px-2 py-0.5 rounded font-semibold ${
                            isLight
                              ? 'text-emerald-800 bg-emerald-50 border-emerald-300'
                              : 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40'
                          }`}>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Hadir
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 text-[11px] border px-2 py-0.5 rounded font-medium ${
                            isLight
                              ? 'text-amber-800 bg-amber-50 border-amber-300'
                              : 'text-amber-400 bg-amber-950/40 border-amber-800/40'
                          }`}>
                            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Belum Hadir
                          </span>
                        )}
                      </td>
                      <td className={`py-2.5 px-3.5 font-mono text-[11px] whitespace-nowrap ${isLight ? 'text-slate-700 font-medium' : 'text-slate-300'}`}>
                        {row.waktu_absen}
                      </td>
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                        {row.is_hadir ? (
                          <button
                            onClick={() => setDeletingAbsensiRecord(row)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer shadow-sm border ${
                              isLight
                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300'
                                : 'bg-rose-950/80 hover:bg-rose-900 border-rose-800/80 text-rose-300 hover:text-white'
                            }`}
                            title="Hapus data absensi peserta ini dari database & spreadsheet"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        ) : (
                          <span className={isLight ? 'text-slate-400 text-[11px]' : 'text-slate-600 text-[11px]'}>-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className={`flex items-center justify-between text-xs pt-2 ${
            isLight ? 'text-slate-700 font-medium' : 'text-slate-400'
          }`}>
            <div>
              Menampilkan <span className={`font-mono font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>{absensiList.length}</span> dari{' '}
              <span className={`font-mono font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>{absensiTotalCount}</span> peserta
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAbsensiPage(p => Math.max(1, p - 1))}
                disabled={absensiPage <= 1}
                className={`p-1.5 rounded border transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  isLight ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100' : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className={`font-mono font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                Halaman {absensiPage} dari {absensiTotalPages || 1}
              </span>
              <button
                onClick={() => setAbsensiPage(p => Math.min(absensiTotalPages, p + 1))}
                disabled={absensiPage >= absensiTotalPages}
                className={`p-1.5 rounded border transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  isLight ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100' : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REKAPITULASI JABATAN & TOKO */}
      {activeTab === 'rekap' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className={`lg:col-span-7 border rounded-2xl p-6 shadow-xl space-y-4 transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-800/90 border-slate-700/80 text-white'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-slate-200' : 'border-slate-700/60'}`}>
              <h2 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <BarChart3 className="w-4 h-4 text-blue-500" />
                <span>Rekapitulasi Progres per Jabatan</span>
              </h2>
              <span className={`text-[11px] font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {stats?.jabatanStats.length || 0} Kategori
              </span>
            </div>

            <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
              {stats?.jabatanStats.map(item => (
                <div key={item.jabatan} className={`p-3 rounded-xl border space-y-2 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-700/50'
                }`}>
                  <div className="flex justify-between items-center text-xs">
                    <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{item.jabatan}</span>
                    <span className={`font-mono text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      <strong className="text-emerald-600 dark:text-emerald-400">{item.terisi}</strong> / {item.total} ({item.percentage}%)
                    </span>
                  </div>
                  <div className={`w-full h-2 rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`lg:col-span-5 border rounded-2xl p-6 shadow-xl space-y-4 transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-800/90 border-slate-700/80 text-white'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-slate-200' : 'border-slate-700/60'}`}>
              <h2 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Building className="w-4 h-4 text-purple-500" />
                <span>Leaderboard Unit Toko</span>
              </h2>
              <span className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Peringkat Teratas</span>
            </div>

            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {stats?.topToko.map((toko, idx) => (
                <div
                  key={toko.kode_toko}
                  className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-700/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold ${
                      isLight ? 'bg-slate-200 text-slate-800' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <div className={`font-semibold truncate max-w-[170px] ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                        {toko.nama_toko}
                      </div>
                      <div className={`text-[10px] font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        Kode: {toko.kode_toko}
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-emerald-600 dark:text-emerald-400 font-bold">{toko.percentage}%</div>
                    <div className={`text-[10px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      {toko.terisi}/{toko.total} akun
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AGENDA JADWAL TRAINING (DATA SHEET UNDANGAN) */}
      {activeTab === 'undangan' && (
        <AgendaUndangan
          user={{
            nik: 'ADMIN_TC',
            nama: 'Administrator TC Surabaya',
            jabatan: 'Koordinator TC Surabaya',
            kode_toko: 'HQ',
            nama_toko: 'Kantor TC Surabaya',
            role: 'admin',
          }}
          themeMode={themeMode}
          isAdmin={true}
        />
      )}

      {/* EDIT MODAL */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className={`border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-[#0054A6] dark:text-blue-400 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Edit Data Akun Pintar Karyawan
                  </h3>
                  <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Perubahan akan langsung disinkronkan ke sheet <code>AkunPintar</code>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingEmployee(null)}
                className={`p-1 rounded-lg ${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}
              >
                ✕
              </button>
            </div>

            <div className={`p-3 rounded-xl border space-y-1.5 text-xs ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950/80 border-slate-800 text-slate-300'
            }`}>
              <div className="flex justify-between">
                <span className={isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}>NIK:</span>
                <span className={`font-mono font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{editingEmployee.nik}</span>
              </div>
              <div className="flex justify-between">
                <span className={isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}>Nama Lengkap:</span>
                <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{editingEmployee.nama}</span>
              </div>
              <div className="flex justify-between">
                <span className={isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}>Jabatan:</span>
                <span className="text-[#0054A6] dark:text-blue-300 font-bold">{editingEmployee.jabatan}</span>
              </div>
              <div className="flex justify-between">
                <span className={isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}>Toko / Cabang:</span>
                <span className={isLight ? 'text-slate-800' : 'text-slate-300'}>{editingEmployee.kode_toko} / {editingEmployee.nama_toko}</span>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                  Nomor WhatsApp Aktif
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={editWa}
                    onChange={e => setEditWa(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className={`w-full px-3.5 py-2 border rounded-lg text-xs font-mono transition focus:outline-none focus:ring-1 focus:ring-[#0054A6] ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-slate-950 border-slate-700 text-white placeholder-slate-500'
                    }`}
                  />
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                  Email Aplikasi Pintar
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className={`w-full px-3.5 py-2 border rounded-lg text-xs font-mono transition focus:outline-none focus:ring-1 focus:ring-[#0054A6] ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-slate-950 border-slate-700 text-white placeholder-slate-500'
                    }`}
                  />
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                  Password Aplikasi Pintar
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editPassword}
                    onChange={e => setEditPassword(e.target.value)}
                    placeholder="Password aplikasi Pintar"
                    className={`w-full px-3.5 py-2 border rounded-lg text-xs font-mono transition focus:outline-none focus:ring-1 focus:ring-[#0054A6] pr-9 ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-slate-950 border-slate-700 text-white placeholder-slate-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className={`absolute right-3 top-2.5 ${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}
                  >
                    {showEditPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {editError && (
                <div className="p-2.5 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{editError}</span>
                </div>
              )}

              <div className={`flex justify-end gap-2 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-medium cursor-pointer ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className={`border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
          }`}>
            <div className={`flex items-center gap-3 pb-3 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="w-10 h-10 rounded-full bg-rose-600/20 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Konfirmasi Hapus Data Akun Pintar
                </h3>
                <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Tindakan ini akan mengosongkan data pada database & sheet AkunPintar.
                </p>
              </div>
            </div>

            <div className={`p-3 rounded-xl border text-xs space-y-1 ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}>
              <div><strong className={isLight ? 'text-slate-900' : 'text-white'}>NIK:</strong> <span className="font-mono">{deletingEmployee.nik}</span></div>
              <div><strong className={isLight ? 'text-slate-900' : 'text-white'}>Nama:</strong> <span>{deletingEmployee.nama}</span></div>
              <div><strong className={isLight ? 'text-slate-900' : 'text-white'}>Email Pintar:</strong> <span className="font-mono text-rose-600 dark:text-rose-300">{deletingEmployee.email_pintar}</span></div>
            </div>

            {deleteError && (
              <div className="p-2.5 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                {deleteError}
              </div>
            )}

            <div className={`flex justify-end gap-2 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <button
                type="button"
                onClick={() => setDeletingEmployee(null)}
                className={`px-4 py-2 rounded-lg text-xs font-medium cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus Data'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE SINGLE ABSENSI MODAL */}
      {deletingAbsensiRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className={`border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
          }`}>
            <div className={`flex items-center gap-3 pb-3 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="w-10 h-10 rounded-full bg-rose-600/20 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Konfirmasi Hapus Data Absensi</h3>
                <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Data akan dihapus dari database web dan dikirim sinyal untuk dihapus dari Google Spreadsheet.
                </p>
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}>
              <div className="flex justify-between"><span className={isLight ? 'text-slate-600' : 'text-slate-400'}>NIK:</span> <strong className="font-mono">{deletingAbsensiRecord.nik}</strong></div>
              <div className="flex justify-between"><span className={isLight ? 'text-slate-600' : 'text-slate-400'}>Nama:</span> <span className="font-semibold">{deletingAbsensiRecord.nama}</span></div>
              <div className="flex justify-between"><span className={isLight ? 'text-slate-600' : 'text-slate-400'}>Tanggal:</span> <span className="text-[#0054A6] dark:text-blue-400 font-mono font-bold">{deletingAbsensiRecord.tanggal}</span></div>
              <div className="flex justify-between"><span className={isLight ? 'text-slate-600' : 'text-slate-400'}>Jenis Training:</span> <span className="text-amber-700 dark:text-amber-400 font-semibold">{deletingAbsensiRecord.jenis_training}</span></div>
            </div>

            {deleteAbsensiError && (
              <div className="p-2.5 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{deleteAbsensiError}</span>
              </div>
            )}

            <div className={`flex justify-end gap-2 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <button
                type="button"
                onClick={() => { setDeletingAbsensiRecord(null); setDeleteAbsensiError(''); }}
                className={`px-4 py-2 rounded-lg text-xs font-medium cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSingleDeleteAbsensi}
                disabled={isDeletingSingleAbsensi}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingSingleAbsensi ? 'Menghapus...' : 'Ya, Hapus Absensi'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK CLEAR ALL ABSENSI MODAL */}
      {isConfirmingClearAllAbsensi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className={`border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
          }`}>
            <div className={`flex items-center gap-3 pb-3 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="w-10 h-10 rounded-full bg-rose-600/20 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Hapus Seluruh Data Absensi</h3>
                <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Tindakan ini akan mengosongkan seluruh data absensi ({absensiSummary.totalHadir} kehadiran) di database dan Google Spreadsheet.
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs text-rose-800 dark:text-rose-200">
              ⚠️ Perhatian: Seluruh catatan kehadiran peserta training akan dikosongkan dan dikembalikan ke status belum absen.
            </div>

            {deleteAbsensiError && (
              <div className="p-2.5 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{deleteAbsensiError}</span>
              </div>
            )}

            <div className={`flex justify-end gap-2 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <button
                type="button"
                onClick={() => { setIsConfirmingClearAllAbsensi(false); setDeleteAbsensiError(''); }}
                className={`px-4 py-2 rounded-lg text-xs font-medium cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleClearAllAbsensi}
                disabled={isClearingAllAbsensi}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isClearingAllAbsensi ? 'Menghapus...' : 'Ya, Hapus Semua Absensi'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Apps Script Modal */}
      <GoogleAppsScriptModal
        isOpen={isScriptModalOpen}
        onClose={() => setIsScriptModalOpen(false)}
        currentWebhookUrl={webhookUrl}
        onSaveWebhook={handleSaveWebhook}
      />
    </div>
  );
};
