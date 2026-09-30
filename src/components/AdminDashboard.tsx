import React, { useState, useEffect, useRef } from 'react';
import { DashboardStats, EmployeeListItem } from '../types';
import { api } from '../services/api';
import { GoogleAppsScriptModal } from './GoogleAppsScriptModal';
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
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onForceSync,
  isSyncing,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Active View Tab: 'employees' | 'rekap' | 'absensi'
  const [activeTab, setActiveTab] = useState<'employees' | 'rekap' | 'absensi'>('employees');

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
  const [absensiStatusFilter, setAbsensiStatusFilter] = useState('all');
  const [absensiPage, setAbsensiPage] = useState(1);
  const [absensiTotalPages, setAbsensiTotalPages] = useState(1);
  const [absensiTotalCount, setAbsensiTotalCount] = useState(0);
  const [absensiSummary, setAbsensiSummary] = useState({ total: 0, totalHadir: 0, totalBelum: 0, percentage: 0 });
  const [isLoadingAbsensi, setIsLoadingAbsensi] = useState(false);

  // Schedules metadata for filter dropdowns
  const [trainingDates, setTrainingDates] = useState<string[]>([]);
  const [trainingTypes, setTrainingTypes] = useState<string[]>([]);

  // Persistent filter refs
  const filtersRef = useRef({
    search,
    statusFilter,
    jabatanFilter,
    page,
    absensiSearch,
    absensiTanggalFilter,
    absensiJenisFilter,
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
      page: absensiPage,
    });
  }, [absensiSearch, absensiTanggalFilter, absensiJenisFilter, absensiStatusFilter, absensiPage]);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-blue-950 border border-blue-800 text-blue-300">
              Admin Console
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Spreadsheet: 1VyP2x_0zRX...
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1">
            Konsol Administrasi TC Surabaya
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Monitoring rekapitulasi data, sinkronisasi Akun Pintar, dan Absensi Kehadiran Training real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsScriptModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-700/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-600 transition"
            title="Pengaturan Otomasi Webhook Google Apps Script"
          >
            <Code2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Setup Apps Script</span>
          </button>

          <button
            onClick={activeTab === 'absensi' ? handleExportAbsensiCSV : handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-semibold transition"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{activeTab === 'absensi' ? 'Ekspor Absensi CSV' : 'Ekspor AkunPintar CSV'}</span>
          </button>

          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sheet'}</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Karyawan */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Karyawan</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-white tabular-nums">
            {stats?.totalKaryawan.toLocaleString('id-ID') || 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Terdaftar di sheet <code>Users</code>
          </div>
        </div>

        {/* Metric 2: Akun Pintar Terisi */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Akun Pintar Terisi</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-emerald-400 tabular-nums">
            {stats?.totalTerisi.toLocaleString('id-ID') || 0}
          </div>
          <div className="mt-1 text-[11px] text-emerald-400/80">
            {stats?.completionPercentage || 0}% Target Tercapai
          </div>
        </div>

        {/* Metric 3: Total Jadwal Training */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Peserta Training</span>
            <GraduationCap className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-purple-300 tabular-nums">
            {stats?.totalTrainings?.toLocaleString('id-ID') || 0}
          </div>
          <div className="mt-1 text-[11px] text-purple-400/80">
            Terdaftar di sheet <code>Trainings</code>
          </div>
        </div>

        {/* Metric 4: Kehadiran Absensi */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Kehadiran Absensi</span>
            <CalendarCheck2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-amber-400 tabular-nums">
            {stats?.totalAbsensi?.toLocaleString('id-ID') || 0}
          </div>
          <div className="mt-1 text-[11px] text-amber-400/80">
            Peserta telah hadir training
          </div>
        </div>
      </div>

      {/* Navigation View Switcher (3 Tabs) */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-900/80 rounded-xl border border-slate-700/60">
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'employees'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Daftar Karyawan & Akun Pintar
          </button>
          <button
            onClick={() => setActiveTab('absensi')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'absensi'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarCheck2 className="w-3.5 h-3.5" />
            <span>Rekap Absensi Kehadiran Training</span>
          </button>
          <button
            onClick={() => setActiveTab('rekap')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'rekap'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Rekap Data & Progres Jabatan
          </button>
        </div>
      </div>

      {/* TAB 1: DETAILED EMPLOYEE & AKUN PINTAR TABLE WITH EDIT & DELETE ACTIONS */}
      {activeTab === 'employees' && (
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
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
                className="w-full pl-9 pr-4 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={e => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
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
                className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer truncate"
              >
                <option value="all">Semua Jabatan ({distinctJabatans.length})</option>
                {distinctJabatans.map(j => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-700/60 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-700/60">
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
              <tbody className="divide-y divide-slate-800/60">
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
                    <tr key={emp.nik} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3.5 font-mono text-slate-300 font-bold whitespace-nowrap">
                        {emp.nik}
                      </td>
                      <td className="py-2.5 px-3.5 font-medium text-white truncate max-w-[170px]">
                        {emp.nama}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-300 truncate max-w-[140px]">
                        {emp.jabatan}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-300 truncate max-w-[180px]">
                        <span className="font-mono text-blue-400 mr-1">{emp.kode_toko}</span>
                        <span className="text-slate-400">/ {emp.nama_toko}</span>
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-slate-300 whitespace-nowrap">
                        {emp.wa || <span className="text-slate-400 italic">-</span>}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-slate-300 truncate max-w-[170px]">
                        {emp.email_pintar ? (
                          <span className="text-emerald-400">{emp.email_pintar}</span>
                        ) : (
                          <span className="text-slate-400 italic">Belum diisi</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-slate-300 whitespace-nowrap">
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
                              className="text-slate-400 hover:text-slate-200 p-0.5"
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
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(emp)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 text-[11px] font-medium transition cursor-pointer"
                            title="Edit Data Akun Pintar"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenDelete(emp)}
                            disabled={!emp.is_filled}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/40 text-[11px] font-medium transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
            <div>
              Menampilkan <span className="font-mono text-white">{employees.length}</span> dari{' '}
              <span className="font-mono text-white">{totalCount}</span> karyawan
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded bg-slate-900 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-slate-200">
                Halaman {page} dari {totalPages || 1}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded bg-slate-900 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REKAP ABSENSI KEHADIRAN TRAINING (NEW FEATURE) */}
      {activeTab === 'absensi' && (
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
          {/* Summary KPI Bar for Training Attendance */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-700/60">
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Total Peserta Terjadwal</div>
              <div className="text-xl font-bold font-mono text-white tabular-nums">
                {absensiSummary.total.toLocaleString('id-ID')}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Sudah Hadir Absen</div>
              <div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
                {absensiSummary.totalHadir.toLocaleString('id-ID')}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Belum Hadir</div>
              <div className="text-xl font-bold font-mono text-amber-400 tabular-nums">
                {absensiSummary.totalBelum.toLocaleString('id-ID')}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Tingkat Kehadiran</div>
              <div className="text-xl font-bold font-mono text-blue-400 tabular-nums">
                {absensiSummary.percentage}%
              </div>
            </div>
          </div>

          {/* Filters Bar for Absensi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                className="w-full pl-9 pr-4 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            </div>

            {/* Filter Tanggal */}
            <div>
              <select
                value={absensiTanggalFilter}
                onChange={e => {
                  setAbsensiTanggalFilter(e.target.value);
                  setAbsensiPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
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
                className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer truncate"
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
                className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">Semua Status Kehadiran</option>
                <option value="hadir">✓ Sudah Hadir Absen</option>
                <option value="belum">⚠ Belum Hadir</option>
              </select>
            </div>
          </div>

          {/* Absensi Table */}
          <div className="overflow-x-auto border border-slate-700/60 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-700/60">
                <tr>
                  <th className="py-3 px-3.5">Tanggal</th>
                  <th className="py-3 px-3.5">NIK</th>
                  <th className="py-3 px-3.5">Nama Peserta</th>
                  <th className="py-3 px-3.5">Kode / Nama Toko</th>
                  <th className="py-3 px-3.5">Jenis Training</th>
                  <th className="py-3 px-3.5">Status Kehadiran</th>
                  <th className="py-3 px-3.5">Waktu Absen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoadingAbsensi ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                        <span>Memuat data absensi training...</span>
                      </div>
                    </td>
                  </tr>
                ) : absensiList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Tidak ada data absensi training yang cocok dengan kriteria filter.
                    </td>
                  </tr>
                ) : (
                  absensiList.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3.5 font-mono text-slate-300 whitespace-nowrap">
                        {row.tanggal}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono font-bold text-white whitespace-nowrap">
                        {row.nik}
                      </td>
                      <td className="py-2.5 px-3.5 font-medium text-slate-200 truncate max-w-[170px]">
                        {row.nama}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-300 truncate max-w-[180px]">
                        <span className="font-mono text-blue-400 mr-1">{row.kode_toko}</span>
                        <span className="text-slate-400">/ {row.nama_toko}</span>
                      </td>
                      <td className="py-2.5 px-3.5 font-semibold text-white truncate max-w-[180px]">
                        {row.jenis_training}
                      </td>
                      <td className="py-2.5 px-3.5">
                        {row.is_hadir ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> Hadir
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded font-medium">
                            <Clock className="w-3 h-3" /> Belum Hadir
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-slate-300 text-[11px] whitespace-nowrap">
                        {row.waktu_absen}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
            <div>
              Menampilkan <span className="font-mono text-white">{absensiList.length}</span> dari{' '}
              <span className="font-mono text-white">{absensiTotalCount}</span> peserta
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAbsensiPage(p => Math.max(1, p - 1))}
                disabled={absensiPage <= 1}
                className="p-1.5 rounded bg-slate-900 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-slate-200">
                Halaman {absensiPage} dari {absensiTotalPages || 1}
              </span>
              <button
                onClick={() => setAbsensiPage(p => Math.min(absensiTotalPages, p + 1))}
                disabled={absensiPage >= absensiTotalPages}
                className="p-1.5 rounded bg-slate-900 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
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
          <div className="lg:col-span-7 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                <span>Rekapitulasi Progres per Jabatan</span>
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">
                {stats?.jabatanStats.length || 0} Kategori
              </span>
            </div>

            <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
              {stats?.jabatanStats.map(item => (
                <div key={item.jabatan} className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/50 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-200">{item.jabatan}</span>
                    <span className="font-mono text-xs text-slate-300">
                      <strong className="text-emerald-400">{item.terisi}</strong> / {item.total} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-purple-400" />
                <span>Leaderboard Unit Toko</span>
              </h2>
              <span className="text-[11px] text-slate-400">Peringkat Teratas</span>
            </div>

            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {stats?.topToko.map((toko, idx) => (
                <div
                  key={toko.kode_toko}
                  className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-700/40 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center font-mono text-[10px] text-slate-300 font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-200 truncate max-w-[170px]">
                        {toko.nama_toko}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        Kode: {toko.kode_toko}
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-emerald-400 font-bold">{toko.percentage}%</div>
                    <div className="text-[10px] text-slate-400">
                      {toko.terisi}/{toko.total} akun
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Edit Data Akun Pintar Karyawan
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Perubahan akan langsung disinkronkan ke sheet <code>AkunPintar</code>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingEmployee(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">NIK:</span>
                <span className="font-mono font-bold text-white">{editingEmployee.nik}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nama Lengkap:</span>
                <span className="font-semibold text-slate-200">{editingEmployee.nama}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Jabatan:</span>
                <span className="text-blue-300">{editingEmployee.jabatan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Toko / Cabang:</span>
                <span className="text-slate-300">{editingEmployee.kode_toko} / {editingEmployee.nama_toko}</span>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nomor WhatsApp Aktif
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={editWa}
                    onChange={e => setEditWa(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <Phone className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email Aplikasi Pintar
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <Mail className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password Aplikasi Pintar
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editPassword}
                    onChange={e => setEditPassword(e.target.value)}
                    placeholder="Password aplikasi Pintar"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="text-slate-400 hover:text-white absolute right-3 top-2.5"
                  >
                    {showEditPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {editError && (
                <div className="p-2.5 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium cursor-pointer"
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
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-full bg-rose-600/20 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Konfirmasi Hapus Data Akun Pintar
                </h3>
                <p className="text-xs text-slate-400">
                  Tindakan ini akan mengosongkan data pada database & sheet AkunPintar.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
              <div><strong className="text-white">NIK:</strong> <span className="font-mono text-slate-300">{deletingEmployee.nik}</span></div>
              <div><strong className="text-white">Nama:</strong> <span className="text-slate-300">{deletingEmployee.nama}</span></div>
              <div><strong className="text-white">Email Pintar:</strong> <span className="font-mono text-rose-300">{deletingEmployee.email_pintar}</span></div>
            </div>

            {deleteError && (
              <div className="p-2.5 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingEmployee(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium cursor-pointer"
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
