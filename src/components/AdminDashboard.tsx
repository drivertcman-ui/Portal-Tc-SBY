import React, { useState, useEffect, useRef } from 'react';
import { DashboardStats, EmployeeListItem } from '../types';
import { api } from '../services/api';
import { SupabaseConfigModal } from './SupabaseConfigModal';
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
  Database,
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
  KeyRound,
  ShieldCheck,
  UserX,
  Copy,
  Check,
  X,
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

  // Active View Tab: 'employees' | 'absensi' | 'undangan' | 'password'
  const [activeTab, setActiveTab] = useState<'employees' | 'absensi' | 'undangan' | 'password'>('employees');

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState('');
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('');

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

  // Belum Absen Modal State
  const [isBelumAbsenModalOpen, setIsBelumAbsenModalOpen] = useState(false);
  const [belumAbsenData, setBelumAbsenData] = useState<any[]>([]);
  const [isLoadingBelumAbsen, setIsLoadingBelumAbsen] = useState(false);
  const [belumAbsenModalSearch, setBelumAbsenModalSearch] = useState('');
  const [copiedType, setCopiedType] = useState<string | null>(null);

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

  const activeTabRef = useRef(activeTab);

  useEffect(() => {
    activeTabRef.current = activeTab;
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

  // Supabase Modal & Toast State
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToastNotification = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };
  const showNotification = showToastNotification;

  const loadStats = async (isSilent = false) => {
    try {
      if (!isSilent) setIsLoadingStats(true);
      const data = await api.getDashboardStats();
      setStats(prev => {
        if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
        return data;
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      if (!isSilent) setIsLoadingStats(false);
    }
  };

  const loadEmployees = async (overrideFilters?: {
    search?: string;
    status?: string;
    jabatan?: string;
    page?: number;
  }, isSilent = false) => {
    try {
      if (!isSilent) setIsLoadingTable(true);
      const current = filtersRef.current;
      const res = await api.getAdminEmployees({
        search: overrideFilters?.search ?? current.search,
        status: overrideFilters?.status ?? current.statusFilter,
        jabatan: overrideFilters?.jabatan ?? current.jabatanFilter,
        page: overrideFilters?.page ?? current.page,
        limit: 25,
      });
      setEmployees(prev => {
        if (JSON.stringify(prev) === JSON.stringify(res.data)) return prev;
        return res.data;
      });
      setTotalPages(prev => (prev === res.pagination.totalPages ? prev : res.pagination.totalPages));
      setTotalCount(prev => (prev === res.pagination.total ? prev : res.pagination.total));
    } catch (err: any) {
      if (!err?.message?.includes('Sesi telah kedaluwarsa') && !err?.message?.includes('Akses ditolak')) {
        console.error('Failed to load employees:', err);
      }
    } finally {
      if (!isSilent) setIsLoadingTable(false);
    }
  };

  const loadAbsensiList = async (overrideFilters?: {
    search?: string;
    tanggal?: string;
    jenis_training?: string;
    status?: string;
    cabang?: string;
    page?: number;
  }, isSilent = false) => {
    try {
      if (!isSilent) setIsLoadingAbsensi(true);
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
      setAbsensiList(prev => {
        if (JSON.stringify(prev) === JSON.stringify(res.data)) return prev;
        return res.data;
      });
      setAbsensiSummary(prev => {
        if (
          prev.total === res.summary.total &&
          prev.totalHadir === res.summary.totalHadir &&
          prev.totalBelum === res.summary.totalBelum &&
          prev.percentage === res.summary.percentage
        ) {
          return prev;
        }
        return res.summary;
      });
      setAbsensiTotalPages(prev => (prev === res.pagination.totalPages ? prev : res.pagination.totalPages));
      setAbsensiTotalCount(prev => (prev === res.pagination.total ? prev : res.pagination.total));
    } catch (err: any) {
      if (!err?.message?.includes('Sesi telah kedaluwarsa') && !err?.message?.includes('Akses ditolak')) {
        console.error('Failed to load absensi list:', err);
      }
    } finally {
      if (!isSilent) setIsLoadingAbsensi(false);
    }
  };

  const loadTrainingMetadata = async () => {
    try {
      const res = await api.getTrainingSchedule();
      const dates = res.scheduleOptions.map((s: any) => s.tanggal);
      const types = new Set<string>();
      res.scheduleOptions.forEach((s: any) => {
        s.jenis_list.forEach((j: any) => types.add(j.jenis_training));
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

    // Silent background auto-sync every 10 seconds (runs behind the scenes without screen flicker or table reloading)
    const interval = setInterval(async () => {
      try {
        await api.syncAllSupabase();
      } catch {
        // Silent catch for background polling
      }
      loadStats(true);
      if (activeTabRef.current === 'employees') {
        loadEmployees(undefined, true);
      } else if (activeTabRef.current === 'absensi') {
        loadAbsensiList(undefined, true);
      }
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

  const handleSupabaseSyncSuccess = async () => {
    await loadStats();
    await loadEmployees();
    await loadAbsensiList();
    await loadTrainingMetadata();
  };

  const handleExportCSV = async () => {
    try {
      showToastNotification('Memproses unduhan CSV Data Karyawan...', 'info');
      await api.downloadCsv('/api/admin/export-csv', `Data_Karyawan_TC_Surabaya_${Date.now()}.csv`);
      showToastNotification('Data Karyawan berhasil diunduh dalam format CSV!', 'success');
    } catch (err: any) {
      showToastNotification(err.message || 'Gagal mengunduh CSV data karyawan', 'error');
    }
  };

  const handleExportAbsensiCSV = async () => {
    try {
      showToastNotification('Memproses unduhan CSV Rekap Absensi...', 'info');
      const query = new URLSearchParams();
      if (absensiSearch) query.append('search', absensiSearch);
      if (absensiTanggalFilter && absensiTanggalFilter !== 'all') query.append('tanggal', absensiTanggalFilter);
      if (absensiJenisFilter && absensiJenisFilter !== 'all') query.append('jenis_training', absensiJenisFilter);
      if (absensiCabangFilter && absensiCabangFilter !== 'all') query.append('cabang', absensiCabangFilter);
      if (absensiStatusFilter && absensiStatusFilter !== 'all') query.append('status', absensiStatusFilter);

      await api.downloadCsv(`/api/admin/export-absensi-csv?${query.toString()}`, `Rekap_Absensi_TC_Surabaya_${Date.now()}.csv`);
      showToastNotification('Rekap Absensi berhasil diunduh dalam format CSV!', 'success');
    } catch (err: any) {
      showToastNotification(err.message || 'Gagal mengunduh CSV rekap absensi', 'error');
    }
  };

  const handleOpenBelumAbsenModal = async () => {
    setIsBelumAbsenModalOpen(true);
    setBelumAbsenModalSearch('');
    setCopiedType(null);
    try {
      setIsLoadingBelumAbsen(true);
      const res = await api.getBelumAbsenList({
        search: absensiSearch,
        tanggal: absensiTanggalFilter,
        jenis_training: absensiJenisFilter,
        cabang: absensiCabangFilter,
      });
      setBelumAbsenData(res.data || []);
    } catch (err: any) {
      console.error('Failed to load belum absen list:', err);
      showToastNotification(err.message || 'Gagal memuat data peserta belum absen', 'error');
    } finally {
      setIsLoadingBelumAbsen(false);
    }
  };

  const handleExportBelumAbsenCSV = () => {
    if (!belumAbsenData.length) {
      showToastNotification('Tidak ada data peserta belum absen pada filter ini.', 'error');
      return;
    }
    try {
      const headers = ['NIK', 'NAMA', 'JABATAN', 'KODE TOKO', 'NAMA TOKO', 'TANGGAL TRAINING', 'JENIS TRAINING', 'CABANG', 'STATUS'];
      const rows = belumAbsenData.map(item => [
        item.nik || '',
        item.nama || '',
        item.jabatan || '',
        item.kode_toko || '',
        item.nama_toko || '',
        item.tanggal || '',
        item.jenis_training || '',
        item.cabang || 'SBY',
        'BELUM ABSEN',
      ]);
      const filename = `Peserta_Belum_Absen_${absensiTanggalFilter !== 'all' ? absensiTanggalFilter.replace(/[^a-zA-Z0-9]/g, '_') : 'Semua'}_${Date.now()}.csv`;
      api.downloadArrayAsCsv(filename, headers, rows);
      showToastNotification(`Berhasil mengunduh ${belumAbsenData.length} data peserta belum absen!`, 'success');
    } catch (err: any) {
      showToastNotification(err.message || 'Gagal mengunduh file CSV', 'error');
    }
  };

  const handleCopyWhatsAppFormat = () => {
    if (!belumAbsenData.length) {
      showToastNotification('Tidak ada data peserta belum absen untuk disalin ke format WA.', 'error');
      return;
    }
    const tanggalStr = absensiTanggalFilter !== 'all' ? absensiTanggalFilter : 'Semua Tanggal';
    const jenisStr = absensiJenisFilter !== 'all' ? absensiJenisFilter : 'Semua Jenis Training';
    const cabangStr = absensiCabangFilter !== 'all' ? `Cabang ${absensiCabangFilter}` : 'Semua Cabang';

    let text = `*DAFTAR PESERTA BELUM MELAKUKAN ABSENSI TRAINING*\n`;
    text += `📅 Tanggal: ${tanggalStr}\n`;
    text += `📚 Pelatihan: ${jenisStr}\n`;
    text += `🏢 Cabang: ${cabangStr}\n`;
    text += `⚠️ Total Belum Absen: ${belumAbsenData.length} Orang\n\n`;

    belumAbsenData.forEach((item, idx) => {
      text += `${idx + 1}. *${item.nama}* (${item.nik})\n`;
      text += `   🏪 Toko: ${item.kode_toko} - ${item.nama_toko}\n`;
      text += `   📖 Training: ${item.jenis_training} (${item.tanggal})\n\n`;
    });

    text += `_Harap segera melakukan pengisian absensi kehadiran melalui Portal TC Surabaya._`;

    navigator.clipboard.writeText(text);
    setCopiedType('wa');
    showToastNotification(`Format WA untuk ${belumAbsenData.length} peserta belum absen berhasil disalin!`, 'success');
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleCopyNIKList = () => {
    if (!belumAbsenData.length) {
      showToastNotification('Tidak ada NIK peserta untuk disalin.', 'error');
      return;
    }
    const niks = belumAbsenData.map(item => item.nik).join('\n');
    navigator.clipboard.writeText(niks);
    setCopiedType('nik');
    showToastNotification(`Daftar ${belumAbsenData.length} NIK berhasil disalin ke clipboard!`, 'success');
    setTimeout(() => setCopiedType(null), 2500);
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

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccessMessage('');
    setPasswordErrorMessage('');

    if (!currentPassword) {
      setPasswordErrorMessage('Kata sandi saat ini wajib diisi.');
      return;
    }
    if (!newPassword) {
      setPasswordErrorMessage('Kata sandi baru wajib diisi.');
      return;
    }
    if (newPassword.trim().length < 6) {
      setPasswordErrorMessage('Kata sandi baru minimal harus 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErrorMessage('Konfirmasi kata sandi baru tidak sesuai.');
      return;
    }

    try {
      setIsChangingPassword(true);
      const res = await api.changeAdminPassword({
        currentPassword,
        newPassword: newPassword.trim(),
        confirmPassword: confirmPassword.trim(),
      });
      setPasswordSuccessMessage(res.message || 'Kata sandi Administrator berhasil diperbarui!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordErrorMessage(err.message || 'Gagal mengubah kata sandi Administrator.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const distinctJabatans = stats?.jabatanStats.map(j => j.jabatan) || [];

  const filteredBelumAbsen = belumAbsenData.filter(item => {
    if (!belumAbsenModalSearch.trim()) return true;
    const q = belumAbsenModalSearch.toLowerCase().trim();
    return (
      item.nik?.toLowerCase().includes(q) ||
      item.nama?.toLowerCase().includes(q) ||
      item.nama_toko?.toLowerCase().includes(q) ||
      item.kode_toko?.toLowerCase().includes(q) ||
      item.jabatan?.toLowerCase().includes(q) ||
      item.jenis_training?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 shadow-xl transition-all ${
          toastMessage.type === 'success'
            ? 'bg-emerald-950/90 border border-emerald-500 text-emerald-200'
            : toastMessage.type === 'error'
            ? 'bg-rose-950/90 border border-rose-500 text-rose-200'
            : 'bg-blue-950/90 border border-blue-500 text-blue-200'
        }`}>
          <div className="flex items-center gap-2 text-xs font-semibold">
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Actions & Title */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border rounded-2xl p-6 shadow-xl transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900/95 border-slate-800 text-white'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E31E25]/20 border border-[#E31E25]/50 text-[#E31E25]">
              Admin Console
            </span>
            <span className={`text-xs font-mono flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              <Database className="w-3.5 h-3.5 text-emerald-500" />
              <span>Database: Supabase</span>
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
            onClick={() => setIsSupabaseModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/30 transition cursor-pointer"
            title="Pengaturan 5 Sumber Link URL & Anon Key Supabase"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Kelola & Impor Supabase</span>
          </button>

          <button
            onClick={activeTab === 'absensi' ? handleExportAbsensiCSV : handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 transition cursor-pointer shadow-md"
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
            <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Supabase'}</span>
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
            Terdaftar di database <code>Users</code>
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
            Terdaftar di database <code>Trainings</code>
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
            onClick={() => setActiveTab('password')}
            className={`px-4 py-2.5 text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'password'
                ? 'bg-gradient-to-r from-[#E31E25] via-[#0054A6] to-[#003875] text-white shadow-lg shadow-[#0054A6]/30'
                : isLight ? 'text-slate-700 hover:text-slate-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-4 h-4 text-[#FFD100]" />
            <span>Ubah Password Admin</span>
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
            <div className={`text-xs flex items-center flex-wrap gap-2 ${isLight ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
              <span>Total Peserta Hadir: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{absensiSummary.totalHadir}</strong> Orang</span>
              {absensiSummary.totalBelum > 0 && (
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  • Belum Absen: <strong className="font-mono">{absensiSummary.totalBelum}</strong> Orang
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* TOMBOL AMBIL DATA BELUM ABSEN SESUAI FILTER */}
              <button
                type="button"
                onClick={handleOpenBelumAbsenModal}
                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md"
                title="Ambil dan unduh daftar peserta yang belum melakukan absensi sesuai data yang difilter"
              >
                <UserX className="w-3.5 h-3.5 text-[#FFD100]" />
                <span>Ambil Data Belum Absen</span>
                {absensiSummary.totalBelum > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black bg-amber-950 text-amber-200 border border-amber-500/50">
                    {absensiSummary.totalBelum}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={handleExportAbsensiCSV}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor Absensi CSV</span>
              </button>
              {absensiSummary.totalHadir > 0 && (
                <button
                  type="button"
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
                        {row.is_hadir || row.status === 'HADIR' ? (
                          <span className={`inline-flex items-center gap-1 text-[11px] border px-2 py-0.5 rounded font-bold ${
                            isLight
                              ? 'text-emerald-800 bg-emerald-50 border-emerald-300'
                              : 'text-emerald-400 bg-emerald-950/60 border-emerald-700/60'
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
                        {row.waktu_absen || '-'}
                      </td>
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                        {row.is_hadir || row.status === 'HADIR' ? (
                          <button
                            onClick={() => setDeletingAbsensiRecord(row)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer shadow-sm border ${
                              isLight
                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300'
                                : 'bg-rose-950/80 hover:bg-rose-900 border-rose-800/80 text-rose-300 hover:text-white'
                            }`}
                            title="Hapus data absensi peserta ini dari database"
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

      {/* TAB 3: UBAH KATA SANDI ADMINISTRATOR */}
      {activeTab === 'password' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className={`border rounded-2xl p-6 sm:p-8 shadow-xl transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
          }`}>
            {/* Header */}
            <div className="flex items-start gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0054A6] to-[#003875] border border-blue-400/30 flex items-center justify-center text-[#FFD100] shadow-md shrink-0">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  Ubah Kata Sandi Administrator
                </h2>
                <p className={`text-xs mt-1 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Perbarui kata sandi login untuk akun Administrator Portal TC Surabaya. Kata sandi baru akan berlaku saat Anda login kembali ke dashboard admin.
                </p>
              </div>
            </div>

            {/* Notification Messages */}
            {passwordSuccessMessage && (
              <div className="mt-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-sm">Berhasil Diperbarui!</div>
                  <div>{passwordSuccessMessage}</div>
                </div>
              </div>
            )}

            {passwordErrorMessage && (
              <div className="mt-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-sm">Gagal Mengubah Kata Sandi</div>
                  <div>{passwordErrorMessage}</div>
                </div>
              </div>
            )}

            {/* Password Form */}
            <form onSubmit={handleSavePassword} className="mt-6 space-y-5">
              {/* Current Password */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  Kata Sandi Saat Ini <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Masukkan kata sandi admin saat ini..."
                    className={`w-full px-4 py-3 rounded-xl border text-sm transition outline-none pr-11 focus:ring-2 focus:ring-[#0054A6] ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white placeholder-slate-400'
                        : 'bg-slate-950 border-slate-700 text-white focus:border-blue-500 placeholder-slate-500'
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title={showCurrentPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  Kata Sandi Baru <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter kombinasi..."
                    className={`w-full px-4 py-3 rounded-xl border text-sm transition outline-none pr-11 focus:ring-2 focus:ring-[#0054A6] ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white placeholder-slate-400'
                        : 'bg-slate-950 border-slate-700 text-white focus:border-blue-500 placeholder-slate-500'
                    }`}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title={showNewPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPassword && (
                  <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                    <span className={newPassword.length >= 6 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-amber-500'}>
                      {newPassword.length >= 6 ? '✓ Panjang memenuhi syarat (min. 6 karakter)' : '✗ Terlalu pendek (minimal 6 karakter)'}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  Konfirmasi Kata Sandi Baru <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru..."
                    className={`w-full px-4 py-3 rounded-xl border text-sm transition outline-none pr-11 focus:ring-2 focus:ring-[#0054A6] ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white placeholder-slate-400'
                        : 'bg-slate-950 border-slate-700 text-white focus:border-blue-500 placeholder-slate-500'
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title={showConfirmPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && (
                  <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                    <span className={newPassword === confirmPassword ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-500 font-semibold'}>
                      {newPassword === confirmPassword ? '✓ Konfirmasi cocok' : '✗ Kata sandi konfirmasi belum cocok'}
                    </span>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordErrorMessage('');
                    setPasswordSuccessMessage('');
                  }}
                  className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    isLight
                      ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                      : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Batal / Reset Form
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-[#0054A6] to-[#003875] hover:opacity-95 shadow-lg shadow-[#0054A6]/30 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  {isChangingPassword ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-[#FFD100]" />
                      <span>Simpan Kata Sandi Baru</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Security Notice Card */}
          <div className={`border rounded-2xl p-5 text-xs space-y-2 transition-colors ${
            isLight ? 'bg-amber-50/60 border-amber-200 text-amber-900' : 'bg-amber-950/30 border-amber-800/60 text-amber-200'
          }`}>
            <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
              <ShieldCheck className="w-4 h-4" />
              <span>Informasi Keamanan Administrator</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11.5px] leading-relaxed opacity-90 pl-1">
              <li>Perubahan kata sandi akan langsung tersimpan di database lokal sistem.</li>
              <li>Pastikan mencatat kata sandi baru Anda di tempat yang aman.</li>
              <li>Akun administrator memiliki akses penuh ke manajemen Akun Pintar, absensi, dan data training seluruh cabang.</li>
            </ul>
          </div>
        </div>
      )}

      {/* TAB 4: AGENDA JADWAL TRAINING (DATA SUPABASE UNDANGAN) */}
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
                    Perubahan akan langsung disinkronkan ke database Supabase
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
                  Tindakan ini akan mengosongkan data pada database.
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
                  Data kehadiran ini akan dihapus dari database absensi.
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
                  Tindakan ini akan mengosongkan seluruh data absensi ({absensiSummary.totalHadir} kehadiran) di database.
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

      {/* MODAL DATA PESERTA BELUM ABSEN SESUAI FILTER */}
      {isBelumAbsenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className={`border rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
          }`}>
            {/* Modal Header */}
            <div className={`p-5 border-b flex items-start justify-between gap-4 ${
              isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950/60'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <UserX className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`text-base font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      Daftar Peserta Belum Absen Training
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                      {belumAbsenData.length} Peserta
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Data peserta terjadwal yang belum melakukan absensi, otomatis disaring berdasarkan filter aktif di menu absensi.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBelumAbsenModalOpen(false)}
                className={`p-1.5 rounded-lg border transition cursor-pointer ${
                  isLight
                    ? 'border-slate-300 hover:bg-slate-200 text-slate-700'
                    : 'border-slate-700 hover:bg-slate-800 text-slate-300'
                }`}
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Active Filters Summary Bar */}
            <div className={`px-5 py-2.5 border-b flex flex-wrap items-center gap-2 text-xs ${
              isLight ? 'bg-amber-50/50 border-slate-200 text-slate-700' : 'bg-amber-950/20 border-slate-800 text-slate-300'
            }`}>
              <span className="font-bold text-[11px] uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Filter Aktif:
              </span>
              <span className={`px-2 py-0.5 rounded-md border text-[11px] font-medium ${isLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700'}`}>
                📅 {absensiTanggalFilter !== 'all' ? absensiTanggalFilter : 'Semua Tanggal'}
              </span>
              <span className={`px-2 py-0.5 rounded-md border text-[11px] font-medium ${isLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700'}`}>
                📚 {absensiJenisFilter !== 'all' ? absensiJenisFilter : 'Semua Jenis Training'}
              </span>
              <span className={`px-2 py-0.5 rounded-md border text-[11px] font-medium ${isLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700'}`}>
                🏢 {absensiCabangFilter !== 'all' ? `Cabang ${absensiCabangFilter}` : 'Semua Cabang'}
              </span>
              {absensiSearch && (
                <span className={`px-2 py-0.5 rounded-md border text-[11px] font-medium text-blue-600 dark:text-blue-400 ${isLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700'}`}>
                  🔍 "{absensiSearch}"
                </span>
              )}
            </div>

            {/* Action Tools & Search Bar */}
            <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900/90'
            }`}>
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={belumAbsenModalSearch}
                  onChange={e => setBelumAbsenModalSearch(e.target.value)}
                  placeholder="Cari nama, NIK, atau toko di daftar ini..."
                  className={`w-full pl-8 pr-3 py-1.5 border rounded-lg text-xs font-mono transition focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                      : 'bg-slate-950 border-slate-700 text-white placeholder-slate-500'
                  }`}
                />
                {belumAbsenModalSearch && (
                  <button
                    type="button"
                    onClick={() => setBelumAbsenModalSearch('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-rose-500 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportBelumAbsenCSV}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow hover:shadow-md"
                  title="Unduh file CSV berisi seluruh data peserta belum absen"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyWhatsAppFormat}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow border ${
                    copiedType === 'wa'
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : isLight
                      ? 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-300'
                      : 'bg-blue-950 hover:bg-blue-900 text-blue-200 border-blue-800'
                  }`}
                  title="Salin teks daftar nama berformat rapi untuk dibagikan ke WhatsApp"
                >
                  {copiedType === 'wa' ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'wa' ? 'Tersalin untuk WA!' : 'Salin Format WA'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyNIKList}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow border ${
                    copiedType === 'nik'
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                  title="Salin baris NIK saja"
                >
                  {copiedType === 'nik' ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'nik' ? 'NIK Tersalin!' : 'Salin NIK Saja'}</span>
                </button>
              </div>
            </div>

            {/* Modal Body / Table */}
            <div className="flex-1 overflow-y-auto max-h-[50vh] p-0">
              {isLoadingBelumAbsen ? (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs">Mengambil data peserta belum absen...</span>
                </div>
              ) : filteredBelumAbsen.length === 0 ? (
                <div className="py-16 text-center px-4">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className={`text-sm font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                    {belumAbsenData.length === 0
                      ? 'Seluruh Peserta Telah Melakukan Absensi!'
                      : 'Tidak Ada Peserta yang Cocok dengan Kata Kunci Pencarian'}
                  </h4>
                  <p className={`text-xs mt-1 max-w-md mx-auto ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {belumAbsenData.length === 0
                      ? 'Bagus sekali! Tidak ada peserta yang berstatus belum absen pada filter ini.'
                      : 'Coba ubah kata kunci pencarian Anda pada kotak input di atas.'}
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className={`font-semibold border-b sticky top-0 z-10 ${
                    isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-950 text-slate-300 border-slate-800'
                  }`}>
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">No</th>
                      <th className="py-2.5 px-3">Karyawan (NIK & Nama)</th>
                      <th className="py-2.5 px-3">Unit Toko</th>
                      <th className="py-2.5 px-3">Tanggal Training</th>
                      <th className="py-2.5 px-3">Jenis Training</th>
                      <th className="py-2.5 px-3 text-center">Cabang</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800'}`}>
                    {filteredBelumAbsen.map((item, idx) => (
                      <tr
                        key={`${item.nik}_${item.tanggal}_${idx}`}
                        className={`transition-colors ${
                          isLight ? 'hover:bg-amber-50/50' : 'hover:bg-slate-800/60'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center font-mono opacity-70">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            {item.nama}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-blue-600 dark:text-blue-400">
                            <span>{item.nik}</span>
                            {item.jabatan && (
                              <span className={`font-sans text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                • {item.jabatan}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className={`font-medium ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                            {item.nama_toko || item.kode_toko}
                          </div>
                          <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                            Kode: {item.kode_toko}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-medium whitespace-nowrap">
                          {item.tanggal}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-block px-2 py-0.5 rounded text-[10.5px] font-bold bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {item.jenis_training}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                            {item.cabang || 'SBY'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            BELUM ABSEN
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`p-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
              isLight ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-slate-800 bg-slate-950 text-slate-300'
            }`}>
              <div>
                Menampilkan <strong>{filteredBelumAbsen.length}</strong> dari total <strong>{belumAbsenData.length}</strong> peserta belum absen
              </div>
              <button
                type="button"
                onClick={() => setIsBelumAbsenModalOpen(false)}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  isLight
                    ? 'border-slate-300 hover:bg-slate-200 text-slate-800 bg-white'
                    : 'border-slate-700 hover:bg-slate-800 text-slate-200 bg-slate-900'
                }`}
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supabase Configuration & Import Modal */}
      <SupabaseConfigModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onSyncSuccess={handleSupabaseSyncSuccess}
        showNotification={showNotification}
      />
    </div>
  );
};
