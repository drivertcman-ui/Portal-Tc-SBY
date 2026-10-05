import React, { useState, useEffect } from 'react';
import {
  Database,
  Key,
  Link,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Save,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  Code2,
  Layers,
  ShieldCheck,
  Trash2,
  X,
  FileCode,
  Table
} from 'lucide-react';
import { SupabaseConfigState, SupabaseSyncResult, SupabaseSourceConfig } from '../types';
import { api } from '../services/api';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncSuccess?: (result: SupabaseSyncResult) => void;
  showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const DEFAULT_CONFIG: SupabaseConfigState = {
  masterUrl: '',
  masterAnonKey: '',
  sources: {
    users: {
      name: '1. Data Karyawan (Users)',
      url: '',
      anonKey: '',
      tableName: 'users',
      status: 'idle',
    },
    stores: {
      name: '2. Data Toko (Stores)',
      url: '',
      anonKey: '',
      tableName: 'stores',
      status: 'idle',
    },
    trainings: {
      name: '3. Data Jadwal Training (Trainings / Schedules)',
      url: '',
      anonKey: '',
      tableName: 'training_schedules',
      status: 'idle',
    },
    akunPintar: {
      name: '4. Data Akun Pintar (data_pintar)',
      url: '',
      anonKey: '',
      tableName: 'data_pintar',
      status: 'idle',
    },
    undangan: {
      name: '5. Data Agenda Undangan Training (Undangans)',
      url: '',
      anonKey: '',
      tableName: 'undangans',
      status: 'idle',
    },
    absensi: {
      name: '6. Data Absensi Kehadiran Training (data_absensi)',
      url: '',
      anonKey: '',
      tableName: 'data_absensi',
      status: 'idle',
    },
  },
};

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onSyncSuccess,
  showNotification,
}) => {
  const [activeTab, setActiveTab] = useState<'sources' | 'sql'>('sources');
  const [config, setConfig] = useState<SupabaseConfigState>(DEFAULT_CONFIG);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [syncingSource, setSyncingSource] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [copiedType, setCopiedType] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      const data = await api.getSupabaseConfig();
      if (data && data.supabaseConfig) {
        setConfig({
          masterUrl: data.supabaseConfig.masterUrl || '',
          masterAnonKey: data.supabaseConfig.masterAnonKey || '',
          sources: {
            users: { ...DEFAULT_CONFIG.sources.users, ...(data.supabaseConfig.sources?.users || {}) } as SupabaseSourceConfig,
            stores: { ...DEFAULT_CONFIG.sources.stores, ...(data.supabaseConfig.sources?.stores || {}) } as SupabaseSourceConfig,
            trainings: { ...DEFAULT_CONFIG.sources.trainings, ...(data.supabaseConfig.sources?.trainings || {}) } as SupabaseSourceConfig,
            akunPintar: {
              ...DEFAULT_CONFIG.sources.akunPintar,
              tableName: data.supabaseConfig.sources?.akunPintar?.tableName || 'data_pintar',
              ...(data.supabaseConfig.sources?.akunPintar || {}),
            } as SupabaseSourceConfig,
            undangan: { ...DEFAULT_CONFIG.sources.undangan, ...(data.supabaseConfig.sources?.undangan || {}) } as SupabaseSourceConfig,
            absensi: {
              ...DEFAULT_CONFIG.sources.absensi,
              tableName: data.supabaseConfig.sources?.absensi?.tableName || 'data_absensi',
              ...(data.supabaseConfig.sources?.absensi || {}),
            } as SupabaseSourceConfig,
          },
        });
      }
      if (data && data.counts) {
        setCounts(data.counts);
      }
    } catch (err: any) {
      console.warn('Gagal memuat konfigurasi Supabase:', err);
    }
  };

  if (!isOpen) return null;

  const toggleShowKey = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleApplyMasterToAll = () => {
    if (!config.masterUrl.trim()) {
      showNotification?.('Masukkan Link URL Supabase Master terlebih dahulu.', 'error');
      return;
    }

    const updatedSources = { ...config.sources };
    (Object.keys(updatedSources) as (keyof typeof updatedSources)[]).forEach(k => {
      const existing = updatedSources[k];
      if (existing) {
        updatedSources[k] = {
          ...existing,
          url: config.masterUrl.trim(),
          anonKey: config.masterAnonKey.trim(),
        } as SupabaseSourceConfig;
      }
    });

    setConfig(prev => ({ ...prev, sources: updatedSources }));
    showNotification?.('Link URL dan Anon Key master berhasil diterapkan ke seluruh sumber data Supabase!', 'success');
  };

  const handleSourceChange = (
    sourceKey: keyof SupabaseConfigState['sources'],
    field: 'url' | 'anonKey' | 'tableName',
    value: string
  ) => {
    setConfig(prev => ({
      ...prev,
      sources: {
        ...prev.sources,
        [sourceKey]: {
          ...prev.sources[sourceKey],
          [field]: value,
        },
      },
    }));
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const res = await api.saveSupabaseConfig(config);
      if (res.success) {
        showNotification?.('Konfigurasi Supabase berhasil disimpan!', 'success');
      }
    } catch (err: any) {
      showNotification?.(err.message || 'Gagal menyimpan konfigurasi Supabase', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportSingle = async (sourceKey: string) => {
    setSyncingSource(sourceKey);
    try {
      await api.saveSupabaseConfig(config);

      const res = await api.importSupabaseSource(sourceKey);
      if (res.success && res.count && res.count > 0) {
        showNotification?.(
          `Impor data ${config.sources[sourceKey as keyof typeof config.sources]?.name || sourceKey} berhasil! (${res.count} data dimuat)`,
          'success'
        );
        await loadConfig();
        onSyncSuccess?.(res);
      } else {
        showNotification?.(
          res.error || `Tabel ${sourceKey} terhubung namun 0 data berhasil diimpor. Periksa Row Level Security (RLS) di Supabase atau gunakan Service Role Key.`,
          'error'
        );
        await loadConfig();
      }
    } catch (err: any) {
      showNotification?.(err.message || `Gagal mengimpor data ${sourceKey}`, 'error');
    } finally {
      setSyncingSource(null);
    }
  };

  const handleImportAll = async () => {
    setIsSyncingAll(true);
    try {
      await api.saveSupabaseConfig(config);
      const res = await api.syncAllSupabase();
      const totalCount = (res.userCount || 0) + (res.storeCount || 0) + (res.trainingCount || 0) + (res.undanganCount || 0);

      if (res.success && totalCount > 0) {
        showNotification?.(
          `Impor seluruh data dari Supabase berhasil! (Total: ${res.userCount || 0} Karyawan, ${res.storeCount || 0} Toko, ${res.trainingCount || 0} Jadwal, ${res.undanganCount || 0} Undangan)`,
          'success'
        );
        await loadConfig();
        onSyncSuccess?.(res);
      } else {
        const errorList = Object.entries(res.details || {})
          .filter(([_, v]) => v.error)
          .map(([k, v]) => `${k}: ${v.error}`);

        const mainError = errorList.length > 0
          ? errorList[0]
          : 'Terhubung ke Supabase, namun 0 data berhasil diimpor. Kemungkinan besar diblokir oleh Row Level Security (RLS) untuk role anon. Gunakan Service Role Key atau jalankan policy RLS di Supabase.';

        showNotification?.(mainError, 'error');
        await loadConfig();
      }
    } catch (err: any) {
      showNotification?.(err.message || 'Gagal sinkronisasi data Supabase', 'error');
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleClearSourceData = async () => {
    setIsClearingData(true);
    try {
      const res = await api.clearSourceData('all');
      showNotification?.(res.message || 'Semua data sumber spreadsheet berhasil dihapus!', 'success');
      setShowClearConfirm(false);
      await loadConfig();
      onSyncSuccess?.({
        success: true,
        lastSyncedAt: '',
        userCount: 0,
        trainingCount: 0,
        undanganCount: 0,
        storeCount: 0,
        absensiCount: 0,
        pintarCount: 0,
      });
    } catch (err: any) {
      showNotification?.(err.message || 'Gagal menghapus data sumber', 'error');
    } finally {
      setIsClearingData(false);
    }
  };

  const sqlDataPintar = `-- ==========================================================
-- TABEL PENYIMPANAN DATA AKUN PINTAR (data_pintar)
-- Simpan data WhatsApp, Email Pintar, dan Password Pintar User
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.data_pintar (
  nik VARCHAR(50) PRIMARY KEY,
  nama VARCHAR(255),
  jabatan VARCHAR(100),
  wa VARCHAR(50),
  email_pintar VARCHAR(255),
  password_pintar TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Buka izin Row Level Security (RLS) untuk Web App / Anon Key
ALTER TABLE public.data_pintar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all data_pintar" ON public.data_pintar;
CREATE POLICY "Allow public all data_pintar" ON public.data_pintar 
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- (Opsional) Alias jika sebelumnya pernah menggunakan nama tabel akun_pintar:
CREATE TABLE IF NOT EXISTS public.akun_pintar (
  nik VARCHAR(50) PRIMARY KEY,
  nama VARCHAR(255),
  jabatan VARCHAR(100),
  wa VARCHAR(50),
  email_pintar VARCHAR(255),
  password_pintar TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.akun_pintar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all akun_pintar" ON public.akun_pintar;
CREATE POLICY "Allow public all akun_pintar" ON public.akun_pintar 
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`;

  const sqlDataAbsensi = `-- ==========================================================
-- TABEL LOG DATA ABSENSI KEHADIRAN TRAINING (data_absensi)
-- Simpan data kehadiran training peserta secara otomatis
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.data_absensi (
  id VARCHAR(255) PRIMARY KEY,
  tanggal VARCHAR(100) NOT NULL,
  nik VARCHAR(50) NOT NULL,
  nama VARCHAR(255),
  kode_toko VARCHAR(50),
  nama_toko VARCHAR(255),
  jenis_training VARCHAR(255) NOT NULL,
  cabang VARCHAR(100) DEFAULT 'SBY',
  status VARCHAR(50) DEFAULT 'HADIR',
  waktu_absen VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_absensi_nik ON public.data_absensi(nik);
CREATE INDEX IF NOT EXISTS idx_data_absensi_tanggal ON public.data_absensi(tanggal);

-- Buka izin Row Level Security (RLS) untuk Web App / Anon Key
ALTER TABLE public.data_absensi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all data_absensi" ON public.data_absensi;
CREATE POLICY "Allow public all data_absensi" ON public.data_absensi 
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- (Opsional) Alias jika sebelumnya pernah menggunakan nama tabel absensi:
CREATE TABLE IF NOT EXISTS public.absensi (
  id VARCHAR(255) PRIMARY KEY,
  tanggal VARCHAR(100) NOT NULL,
  nik VARCHAR(50) NOT NULL,
  nama VARCHAR(255),
  kode_toko VARCHAR(50),
  nama_toko VARCHAR(255),
  jenis_training VARCHAR(255) NOT NULL,
  cabang VARCHAR(100) DEFAULT 'SBY',
  status VARCHAR(50) DEFAULT 'HADIR',
  waktu_absen VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.absensi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all absensi" ON public.absensi;
CREATE POLICY "Allow public all absensi" ON public.absensi 
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`;

  const sqlFullScript = `-- ==========================================================
-- SKEMA LENGKAP SUPABASE SQL EDITOR - PORTAL TC SURABAYA
-- Dibuat untuk: data_pintar, data_absensi, users, stores, trainings, undangans
-- ==========================================================

-- 1. TABEL DATA AKUN PINTAR (data_pintar)
CREATE TABLE IF NOT EXISTS public.data_pintar (
  nik VARCHAR(50) PRIMARY KEY,
  nama VARCHAR(255),
  jabatan VARCHAR(100),
  wa VARCHAR(50),
  email_pintar VARCHAR(255),
  password_pintar TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.data_pintar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all data_pintar" ON public.data_pintar;
CREATE POLICY "Allow public all data_pintar" ON public.data_pintar FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 2. TABEL LOG DATA ABSENSI TRAINING (data_absensi)
CREATE TABLE IF NOT EXISTS public.data_absensi (
  id VARCHAR(255) PRIMARY KEY,
  tanggal VARCHAR(100) NOT NULL,
  nik VARCHAR(50) NOT NULL,
  nama VARCHAR(255),
  kode_toko VARCHAR(50),
  nama_toko VARCHAR(255),
  jenis_training VARCHAR(255) NOT NULL,
  cabang VARCHAR(100) DEFAULT 'SBY',
  status VARCHAR(50) DEFAULT 'HADIR',
  waktu_absen VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_data_absensi_nik ON public.data_absensi(nik);
CREATE INDEX IF NOT EXISTS idx_data_absensi_tanggal ON public.data_absensi(tanggal);
ALTER TABLE public.data_absensi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all data_absensi" ON public.data_absensi;
CREATE POLICY "Allow public all data_absensi" ON public.data_absensi FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 3. TABEL DATA KARYAWAN (users)
CREATE TABLE IF NOT EXISTS public.users (
  nik TEXT PRIMARY KEY,
  nama TEXT,
  jabatan TEXT,
  kode_toko TEXT,
  nama_toko TEXT,
  wa TEXT,
  role TEXT DEFAULT 'user',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read users" ON public.users;
CREATE POLICY "Allow public read users" ON public.users FOR SELECT TO anon, authenticated USING (true);

-- 4. TABEL DATA TOKO (stores)
CREATE TABLE IF NOT EXISTS public.stores (
  kode_toko TEXT PRIMARY KEY,
  nama_toko TEXT,
  nama_as TEXT,
  nama_am TEXT,
  wilayah TEXT DEFAULT 'SBY',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read stores" ON public.stores;
CREATE POLICY "Allow public read stores" ON public.stores FOR SELECT TO anon, authenticated USING (true);

-- 5. TABEL JADWAL PELATIHAN (trainings / training_schedules)
CREATE TABLE IF NOT EXISTS public.trainings (
  id BIGSERIAL PRIMARY KEY,
  tanggal_awal VARCHAR(100) NOT NULL,
  nik VARCHAR(50) NOT NULL,
  nama VARCHAR(255),
  kode_toko VARCHAR(50),
  nama_toko VARCHAR(255),
  jenis_training VARCHAR(255) NOT NULL,
  cabang VARCHAR(100) DEFAULT 'SBY',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trainings_nik ON public.trainings(nik);
CREATE INDEX IF NOT EXISTS idx_trainings_tanggal ON public.trainings(tanggal_awal);
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read trainings" ON public.trainings;
CREATE POLICY "Allow public read trainings" ON public.trainings FOR SELECT TO anon, authenticated USING (true);

-- 6. TABEL AGENDA UNDANGAN TRAINING (undangans / undangan)
CREATE TABLE IF NOT EXISTS public.undangans (
  id BIGSERIAL PRIMARY KEY,
  nik VARCHAR(50) NOT NULL,
  nama VARCHAR(255),
  jabatan VARCHAR(100),
  kode_toko VARCHAR(50),
  nama_toko VARCHAR(255),
  "as" VARCHAR(100),
  am VARCHAR(100),
  tanggal VARCHAR(100),
  jenis_training VARCHAR(255),
  sistem_training VARCHAR(50) DEFAULT 'OFFLINE',
  batch VARCHAR(50),
  status VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_undangans_nik ON public.undangans(nik);
ALTER TABLE public.undangans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read undangans" ON public.undangans;
CREATE POLICY "Allow public read undangans" ON public.undangans FOR SELECT TO anon, authenticated USING (true);
`;

  const copyCode = (text: string, type: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
    showNotification?.(`Kode SQL ${label} berhasil disalin ke clipboard!`, 'success');
  };

  const sourceKeys: (keyof SupabaseConfigState['sources'])[] = [
    'users',
    'stores',
    'trainings',
    'akunPintar',
    'undangan',
    'absensi',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  Integrasi & Sinkronisasi Database Supabase
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  data_pintar & data_absensi
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Kelola input link URL Supabase, Anon Key, nama tabel, dan salin kode SQL Editor untuk membuat tabel penyimpanan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-800 bg-slate-900/50 flex gap-2">
          <button
            onClick={() => setActiveTab('sources')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'sources'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Kolom Integrasi URL & Key Supabase</span>
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'sql'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Kode SQL Editor (data_pintar & data_absensi)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'sources' ? (
            <>
              {/* Quick Master Project Configuration */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-emerald-500/30 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-extrabold text-white">
                        Kolom Master Integrasi Supabase
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 max-w-xl">
                      Masukkan URL Project dan Anon Key Supabase di bawah ini, lalu klik <strong>Terapkan ke Semua</strong> untuk menghubungkan seluruh penyimpanan data secara instan.
                    </p>
                  </div>

                  <button
                    onClick={handleApplyMasterToAll}
                    type="button"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 shadow-lg shadow-emerald-600/30 transition cursor-pointer shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Terapkan ke Seluruh Sumber Data</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Link URL Supabase (Project URL)
                    </label>
                    <div className="relative">
                      <Link className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="https://your-project-id.supabase.co"
                        value={config.masterUrl}
                        onChange={e => setConfig(prev => ({ ...prev, masterUrl: e.target.value }))}
                        className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs font-mono text-white placeholder-slate-600 outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Code Anon Key / Service Role Key
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                      <input
                        type={showKeys['master'] ? 'text' : 'password'}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (anon public / service_role)"
                        value={config.masterAnonKey}
                        onChange={e => setConfig(prev => ({ ...prev, masterAnonKey: e.target.value }))}
                        className="w-full pl-9 pr-10 py-2 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs font-mono text-white placeholder-slate-600 outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={() => toggleShowKey('master')}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition cursor-pointer"
                      >
                        {showKeys['master'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* RLS Security Notice Box */}
              <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 shadow-md">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1.5 leading-relaxed w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <strong className="text-amber-300 font-bold text-sm">
                        Petunjuk Penyimpanan Data User ke Supabase
                      </strong>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 w-fit">
                        Tabel data_pintar & data_absensi
                      </span>
                    </div>
                    <p className="text-slate-300">
                      Pastikan Anda telah membuat tabel <code>data_pintar</code> dan <code>data_absensi</code> di <strong>SQL Editor Supabase</strong> menggunakan skema di tab sebelah agar data yang diinput user (Akun Pintar & Log Absensi) tersimpan secara permanen ke Supabase.
                    </p>
                  </div>
                </div>
              </div>

              {/* Individual Data Sources Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                    Daftar Kolom Integrasi Sumber Data Supabase
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Mendukung custom URL, Key, dan Nama Tabel per sumber
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {sourceKeys.map((srcKey, idx) => {
                    const src: SupabaseSourceConfig = (config.sources[srcKey] || DEFAULT_CONFIG.sources[srcKey]) as SupabaseSourceConfig;
                    const currentCount = counts[srcKey] || src.count || 0;
                    const isConfigured = Boolean(src.url && src.anonKey);
                    const isSyncingThis = syncingSource === srcKey;

                    return (
                      <div
                        key={srcKey}
                        className={`p-5 rounded-2xl border transition-all ${
                          src.status === 'error'
                            ? 'bg-rose-950/20 border-rose-800/60'
                            : isConfigured
                            ? 'bg-slate-950/70 border-slate-700 hover:border-slate-600'
                            : 'bg-slate-950/40 border-slate-800'
                        }`}
                      >
                        {/* Card Top: Title, Status Badge & Single Import Button */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono font-bold text-emerald-400">
                              {idx + 1}
                            </span>
                            <div>
                              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                {src.name}
                              </h4>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                <span>Nama Tabel: <code className="text-emerald-400 font-mono font-bold">{src.tableName}</code></span>
                                <span>•</span>
                                <span>Tersimpan di App: <strong className="text-white font-mono">{currentCount.toLocaleString('id-ID')} data</strong></span>
                                {src.lastSyncedAt && (
                                  <>
                                    <span>•</span>
                                    <span>Sinkron: {new Date(src.lastSyncedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {srcKey === 'akunPintar' && (
                              <button
                                type="button"
                                onClick={() => copyCode(sqlDataPintar, 'dp', 'data_pintar')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-700 hover:bg-emerald-900/80 transition cursor-pointer"
                              >
                                <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>{copiedType === 'dp' ? 'Tersalin!' : 'Salin SQL Tabel Ini'}</span>
                              </button>
                            )}

                            {srcKey === 'absensi' && (
                              <button
                                type="button"
                                onClick={() => copyCode(sqlDataAbsensi, 'da', 'data_absensi')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-700 hover:bg-emerald-900/80 transition cursor-pointer"
                              >
                                <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>{copiedType === 'da' ? 'Tersalin!' : 'Salin SQL Tabel Ini'}</span>
                              </button>
                            )}

                            {src.status === 'success' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Terhubung
                              </span>
                            )}
                            {src.status === 'error' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20" title={src.error}>
                                <AlertCircle className="w-3.5 h-3.5" /> Gagal
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleImportSingle(srcKey)}
                              disabled={isSyncingThis || isSyncingAll}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-emerald-600 border border-slate-700 hover:border-emerald-500 transition cursor-pointer shadow disabled:opacity-50"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncingThis ? 'animate-spin' : ''}`} />
                              <span>{isSyncingThis ? 'Mengimpor...' : 'Impor Data Ini'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Card Inputs: URL, Anon Key, Table Name */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-3">
                          <div className="md:col-span-5">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Link URL Supabase / Endpoint
                            </label>
                            <div className="relative">
                              <Link className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                              <input
                                type="text"
                                placeholder={config.masterUrl || 'https://abcdef.supabase.co'}
                                value={src.url}
                                onChange={e => handleSourceChange(srcKey, 'url', e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs font-mono text-white placeholder-slate-600 outline-none transition"
                              />
                            </div>
                          </div>

                          <div className="md:col-span-5">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Anon Key / Service Role Key
                            </label>
                            <div className="relative">
                              <Key className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                              <input
                                type={showKeys[srcKey] ? 'text' : 'password'}
                                placeholder={config.masterAnonKey ? 'Menggunakan Key Master' : 'eyJhbGci... (service_role / anon)'}
                                value={src.anonKey}
                                onChange={e => handleSourceChange(srcKey, 'anonKey', e.target.value)}
                                className="w-full pl-8 pr-9 py-1.5 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs font-mono text-white placeholder-slate-600 outline-none transition"
                              />
                              <button
                                type="button"
                                onClick={() => toggleShowKey(srcKey)}
                                className="absolute right-2.5 top-2 text-slate-400 hover:text-white transition cursor-pointer"
                              >
                                {showKeys[srcKey] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Nama Tabel
                            </label>
                            <input
                              type="text"
                              value={src.tableName}
                              onChange={e => handleSourceChange(srcKey, 'tableName', e.target.value)}
                              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs font-mono text-white placeholder-slate-600 outline-none transition"
                            />
                          </div>
                        </div>

                        {src.error && (
                          <div className="mt-2 text-xs text-rose-400 font-mono bg-rose-950/40 p-2 rounded-lg border border-rose-800/40 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Error: {src.error}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Tab 2: SQL Script Guide */
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                <div className="text-xs text-slate-300 space-y-1">
                  <strong className="text-white block text-sm">Panduan Menjalankan SQL Editor di Supabase</strong>
                  <p>
                    1. Buka dashboard Supabase Anda di <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-mono">supabase.com/dashboard</a>.
                  </p>
                  <p>
                    2. Masuk ke menu <strong>SQL Editor</strong> pada sidebar kiri.
                  </p>
                  <p>
                    3. Salin kode SQL untuk tabel <code>data_pintar</code> dan <code>data_absensi</code> di bawah ini, paste ke SQL Editor Supabase, lalu klik <strong>Run</strong>.
                  </p>
                  <p>
                    4. Data yang diinputkan user di web akan otomatis langsung masuk dan tersimpan ke Supabase!
                  </p>
                </div>
              </div>

              {/* Box 1: Table data_pintar */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-bold text-white">1. Kode SQL Tabel <code>data_pintar</code> (Data Akun Pintar)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyCode(sqlDataPintar, 'pintar', 'data_pintar')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer shadow"
                  >
                    {copiedType === 'pintar' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin SQL data_pintar</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 font-mono text-xs text-emerald-300 bg-slate-950 overflow-x-auto max-h-56">
                  {sqlDataPintar}
                </pre>
              </div>

              {/* Box 2: Table data_absensi */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4 text-teal-400" />
                    <span className="text-sm font-bold text-white">2. Kode SQL Tabel <code>data_absensi</code> (Log Absensi User)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyCode(sqlDataAbsensi, 'absensi', 'data_absensi')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition cursor-pointer shadow"
                  >
                    {copiedType === 'absensi' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin SQL data_absensi</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 font-mono text-xs text-teal-300 bg-slate-950 overflow-x-auto max-h-56">
                  {sqlDataAbsensi}
                </pre>
              </div>

              {/* Box 3: Full Schema */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-bold text-white">3. Skema Lengkap Supabase (Semua 6 Tabel)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyCode(sqlFullScript, 'full', 'Skema Lengkap')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition cursor-pointer"
                  >
                    {copiedType === 'full' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Semua Skema SQL</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 font-mono text-xs text-slate-300 bg-slate-950 overflow-x-auto max-h-64">
                  {sqlFullScript}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Total Karyawan di App: <strong className="text-white font-mono">{(counts.users || 0).toLocaleString('id-ID')}</strong></span>
            </div>

            {showClearConfirm ? (
              <div className="flex items-center gap-1.5 p-1 px-2.5 rounded-xl bg-rose-950/80 border border-rose-800 shadow-sm animate-fadeIn">
                <span className="text-[11px] text-rose-300 font-sans font-bold">Hapus semua data sumber?</span>
                <button
                  type="button"
                  onClick={handleClearSourceData}
                  disabled={isClearingData}
                  className="px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold transition cursor-pointer shadow disabled:opacity-50"
                >
                  {isClearingData ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition cursor-pointer"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-400 hover:text-white bg-rose-950/30 hover:bg-rose-900/60 border border-rose-900/50 transition cursor-pointer"
                title="Hapus data sumber yang tersimpan di memori/database lokal"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Data Sumber Lama</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition cursor-pointer shadow disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-slate-300" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Konfigurasi'}</span>
            </button>

            <button
              type="button"
              onClick={handleImportAll}
              disabled={isSyncingAll}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:brightness-110 shadow-lg shadow-emerald-600/30 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingAll ? 'animate-spin' : ''}`} />
              <span>{isSyncingAll ? 'Mengimpor Semua Data...' : '🚀 Impor Semua Data dari Supabase'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
