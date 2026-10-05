export interface User {
  nik: string;
  nama: string;
  jabatan: string;
  kode_toko: string;
  nama_toko: string;
  wa?: string;
  role: 'user' | 'admin';
}

export interface AkunPintar {
  nik: string;
  nama: string;
  jabatan: string;
  wa: string;
  email_pintar: string;
  password_pintar?: string;
  has_password?: boolean;
  updated_at?: string;
  synced_to_supabase?: boolean;
}

export interface TrainingRecord {
  tanggal_awal: string;
  nik: string;
  nama: string;
  kode_toko: string;
  nama_toko: string;
  jenis_training: string;
  cabang?: string;
  as?: string;
  am?: string;
  batch?: string;
  status?: string;
}

export interface AbsensiRecord {
  id: string;
  tanggal: string;
  nik: string;
  nama: string;
  kode_toko: string;
  nama_toko: string;
  jenis_training: string;
  waktu_absen: string;
  waktu_formatted: string;
  status: 'HADIR';
  synced_to_supabase?: boolean;
}

export interface TrainingDateOption {
  tanggal: string;
  total_peserta: number;
  jenis_list: {
    jenis_training: string;
    total_peserta: number;
    total_hadir: number;
  }[];
}

export interface CheckParticipantResponse {
  is_registered: boolean;
  is_today_eligible?: boolean;
  date_status?: 'ACTIVE_TODAY' | 'EXPIRED' | 'UPCOMING' | 'UNKNOWN';
  date_message?: string;
  already_attended: boolean;
  training?: {
    tanggal: string;
    nik: string;
    nama: string;
    kode_toko: string;
    nama_toko: string;
    jenis_training: string;
    cabang?: string;
    as?: string;
    am?: string;
  };
  absensi?: AbsensiRecord;
  user_other_schedules?: {
    tanggal: string;
    jenis_training: string;
    kode_toko: string;
    nama_toko: string;
    already_attended: boolean;
  }[];
  message?: string;
}

export interface JabatanStat {
  jabatan: string;
  total: number;
  terisi: number;
  belum: number;
  percentage: number;
}

export interface TokoStat {
  kode_toko: string;
  nama_toko: string;
  total: number;
  terisi: number;
  percentage: number;
}

export interface DashboardStats {
  totalKaryawan: number;
  totalTerisi: number;
  totalBelum: number;
  totalToko: number;
  completionPercentage: number;
  totalTrainings?: number;
  totalAbsensi?: number;
  totalUndangan?: number;
  lastSyncedAt: string;
  supabaseConnected?: boolean;
  supabaseConfig?: SupabaseConfigState;
  jabatanStats: JabatanStat[];
  topToko: TokoStat[];
}

export interface EmployeeListItem {
  nik: string;
  nama: string;
  jabatan: string;
  kode_toko: string;
  nama_toko: string;
  wa: string;
  email_pintar: string;
  password_pintar?: string;
  is_filled: boolean;
  updated_at?: string;
}

export interface UndanganRecord {
  nik: string;
  nama: string;
  jabatan: string;
  kode_toko: string;
  nama_toko: string;
  as: string;
  am: string;
  cabang?: string;
  tanggal: string;
  jenis_training: string;
  sistem_training: string;
  batch?: string;
  status?: string;
}

export interface UndanganResponse {
  data: UndanganRecord[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  filterOptions: {
    asOptions: string[];
    amOptions: string[];
    cabangOptions?: string[];
    jenisOptions: string[];
    sistemOptions: string[];
    tanggalOptions: string[];
  };
  summary: {
    totalPeserta: number;
    totalToko: number;
    totalAS: number;
    totalAM: number;
    totalCabang?: number;
    myTotal?: number;
  };
}

export interface SupabaseSourceConfig {
  name: string;
  url: string;
  anonKey: string;
  tableName: string;
  lastSyncedAt?: string;
  count?: number;
  status?: 'idle' | 'success' | 'error';
  error?: string;
}

export interface SupabaseConfigState {
  masterUrl: string;
  masterAnonKey: string;
  sources: {
    users: SupabaseSourceConfig;
    stores: SupabaseSourceConfig;
    trainings: SupabaseSourceConfig;
    akunPintar: SupabaseSourceConfig;
    undangan: SupabaseSourceConfig;
    absensi?: SupabaseSourceConfig;
  };
}

export interface SupabaseSyncResult {
  success: boolean;
  source?: string;
  count?: number;
  userCount?: number;
  pintarCount?: number;
  trainingCount?: number;
  undanganCount?: number;
  storeCount?: number;
  absensiCount?: number;
  lastSyncedAt: string;
  message?: string;
  error?: string;
  details?: Record<string, { success: boolean; count: number; error?: string }>;
}
