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
  synced_to_sheet?: boolean;
}

export interface TrainingRecord {
  tanggal_awal: string;
  nik: string;
  nama: string;
  kode_toko: string;
  nama_toko: string;
  jenis_training: string;
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
  synced_to_sheet?: boolean;
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
  already_attended: boolean;
  training?: {
    tanggal: string;
    nik: string;
    nama: string;
    kode_toko: string;
    nama_toko: string;
    jenis_training: string;
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
  lastSyncedAt: string;
  spreadsheetId: string;
  webhookUrl?: string;
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
