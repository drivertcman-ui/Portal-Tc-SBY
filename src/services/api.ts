import {
  DashboardStats,
  EmployeeListItem,
  User,
  AkunPintar,
  TrainingDateOption,
  CheckParticipantResponse,
  AbsensiRecord,
  UndanganResponse,
  SupabaseConfigState,
  SupabaseSyncResult,
} from '../types';

const TOKEN_KEY = 'portal_tc_token';
const USER_KEY = 'portal_tc_user';
const AKUN_PINTAR_KEY = 'portal_tc_akun_pintar';

function handleSessionExpired() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(AKUN_PINTAR_KEY);
  window.dispatchEvent(new CustomEvent('tc_auth_logout'));
}

async function parseJsonResponse<T = any>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('Endpoint API tidak ditemukan (404). Pastikan server backend terkonfigurasi dengan benar.');
      }
      throw new Error(`Server error (${res.status}): Terjadi kendala respon dari server.`);
    }
    throw new Error('Format respon server tidak valid.');
  }
}

export const api = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  getCachedUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  },

  getCachedAkunPintar(): AkunPintar | null {
    try {
      const raw = localStorage.getItem(AKUN_PINTAR_KEY);
      return raw ? (JSON.parse(raw) as AkunPintar) : null;
    } catch {
      return null;
    }
  },

  setCachedUser(user: User | null, akunPintar: AkunPintar | null) {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
    if (akunPintar) {
      localStorage.setItem(AKUN_PINTAR_KEY, JSON.stringify(akunPintar));
    } else {
      localStorage.removeItem(AKUN_PINTAR_KEY);
    }
  },

  clearToken() {
    const token = this.getToken();
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(AKUN_PINTAR_KEY);
    window.dispatchEvent(new CustomEvent('tc_auth_logout'));
  },

  async loginNik(nik: string): Promise<{ token: string; user: User; akunPintar: AkunPintar }> {
    const res = await fetch('/api/auth/login-nik', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nik }),
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) {
      throw new Error(data.error || 'Gagal login dengan NIK');
    }
    this.setToken(data.token);
    this.setCachedUser(data.user, data.akunPintar);
    return data;
  },

  async loginAdmin(username: string, password: string): Promise<{ token: string; user: User }> {
    const res = await fetch('/api/auth/login-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) {
      throw new Error(data.error || 'Gagal login Administrator');
    }
    this.setToken(data.token);
    this.setCachedUser(data.user, null);
    return data;
  },

  async getMe(): Promise<{ user: User; akunPintar: AkunPintar | null; lastSyncedAt: string }> {
    const token = this.getToken();
    if (!token) throw new Error('Token tidak ditemukan');

    const res = await fetch('/api/user/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) {
      if (res.status === 401) {
        handleSessionExpired();
      }
      throw new Error(data.error || 'Sesi tidak valid');
    }
    this.setCachedUser(data.user, data.akunPintar);
    return data;
  },

  async submitAkunPintar(payload: { wa: string; email_pintar: string; password_pintar: string }): Promise<{
    success: boolean;
    message: string;
    record: AkunPintar;
  }> {
    const token = this.getToken();
    if (!token) throw new Error('Token tidak ditemukan');

    const res = await fetch('/api/user/akun-pintar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) {
      if (res.status === 401) {
        handleSessionExpired();
      }
      throw new Error(data.error || 'Gagal menyimpan data Akun Pintar');
    }
    return data;
  },

  // ===================================
  // TRAINING & ABSENSI API METHODS
  // ===================================

  async getTrainingSchedule(): Promise<{
    scheduleOptions: TrainingDateOption[];
    branchOptions: string[];
    totalTrainings: number;
    totalAbsensi: number;
  }> {
    const res = await fetch('/api/trainings/schedule');
    if (!res.ok) throw new Error('Gagal memuat jadwal training');
    return parseJsonResponse(res);
  },

  async getMyTrainingSchedules(): Promise<{
    mySchedules: {
      tanggal: string;
      jenis_training: string;
      kode_toko: string;
      nama_toko: string;
      already_attended: boolean;
    }[];
  }> {
    const token = this.getToken();
    if (!token) throw new Error('Token tidak ditemukan');

    const res = await fetch('/api/trainings/my-schedules', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) {
      if (res.status === 401) {
        handleSessionExpired();
      }
      throw new Error(data.error || 'Gagal memuat jadwal saya');
    }
    return data;
  },

  async checkTrainingParticipant(tanggal: string, jenis_training: string): Promise<CheckParticipantResponse> {
    const token = this.getToken();
    if (!token) throw new Error('Token tidak ditemukan');

    const res = await fetch('/api/trainings/check-participant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tanggal, jenis_training }),
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) {
      if (res.status === 401) {
        handleSessionExpired();
      }
      throw new Error(data.error || 'Gagal memeriksa kepesertaan training');
    }
    return data;
  },

  async submitTrainingAttendance(tanggal: string, jenis_training: string): Promise<{
    success: boolean;
    already_attended?: boolean;
    message: string;
    record: AbsensiRecord;
  }> {
    const token = this.getToken();
    if (!token) throw new Error('Token tidak ditemukan');

    const res = await fetch('/api/trainings/absensi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tanggal, jenis_training }),
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) {
      if (res.status === 401) {
        handleSessionExpired();
      }
      throw new Error(data.error || 'Gagal melakukan absensi kehadiran');
    }
    return data;
  },

  async getAdminAbsensiList(params: {
    search?: string;
    tanggal?: string;
    jenis_training?: string;
    status?: string;
    cabang?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: AbsensiRecord[];
    summary: {
      total: number;
      totalHadir: number;
      totalBelum: number;
      totalPesertaTraining: number;
      percentage: number;
      persentaseHadir: number;
    };
    filterOptions: {
      dates: string[];
      trainingTypes: string[];
      cabangList: string[];
    };
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const token = this.getToken();
    if (!token) throw new Error('Token tidak ditemukan');

    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.tanggal) query.set('tanggal', params.tanggal);
    if (params.jenis_training) query.set('jenis_training', params.jenis_training);
    if (params.status) query.set('status', params.status);
    if (params.cabang) query.set('cabang', params.cabang);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    const res = await fetch(`/api/admin/absensi?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) {
      if (res.status === 401) {
        handleSessionExpired();
      }
      throw new Error(data.error || 'Gagal memuat log absensi');
    }
    return data;
  },

  async getBelumAbsenList(params: {
    tanggal?: string;
    jenis_training?: string;
    cabang?: string;
    search?: string;
  }): Promise<{
    data: {
      nik: string;
      nama: string;
      kode_toko: string;
      nama_toko: string;
      jabatan: string;
      wa: string;
      jenis_training: string;
      tanggal: string;
      cabang: string;
    }[];
    count: number;
  }> {
    const token = this.getToken();
    if (!token) throw new Error('Token tidak ditemukan');

    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.tanggal) query.set('tanggal', params.tanggal);
    if (params.jenis_training) query.set('jenis_training', params.jenis_training);
    if (params.cabang) query.set('cabang', params.cabang);

    const res = await fetch(`/api/admin/absensi/belum?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) {
      if (res.status === 401) {
        handleSessionExpired();
      }
      throw new Error(data.error || 'Gagal memuat daftar belum absen');
    }
    return data;
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch('/api/rekap/stats');
    if (!res.ok) throw new Error('Gagal memuat rekap statistik');
    return parseJsonResponse(res);
  },

  async getAdminEmployees(params: {
    search?: string;
    status?: string;
    jabatan?: string;
    toko?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: EmployeeListItem[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const token = this.getToken();
    if (!token) throw new Error('Token tidak ditemukan');

    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.jabatan) query.set('jabatan', params.jabatan);
    if (params.toko) query.set('toko', params.toko);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    const res = await fetch(`/api/admin/employees?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) {
      if (res.status === 401) {
        handleSessionExpired();
      }
      throw new Error(data.error || 'Gagal memuat data karyawan');
    }
    return data;
  },

  async updateEmployeeAkunPintar(
    nik: string,
    payload: { wa: string; email_pintar: string; password_pintar: string }
  ): Promise<{ success: boolean; message: string; record: AkunPintar }> {
    const token = this.getToken();
    if (!token) throw new Error('Token tidak ditemukan');

    const res = await fetch(`/api/admin/employees/${encodeURIComponent(nik)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) {
      if (res.status === 401) {
        handleSessionExpired();
      }
      throw new Error(data.error || 'Gagal memperbarui data karyawan');
    }
    return data;
  },

  async deleteEmployeeAkunPintar(nik: string): Promise<{ success: boolean; message: string }> {
    const token = this.getToken();
    if (!token) throw new Error('Token tidak ditemukan');

    const res = await fetch(`/api/admin/employees/${encodeURIComponent(nik)}/akun-pintar`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) {
      if (res.status === 401) {
        handleSessionExpired();
      }
      throw new Error(data.error || 'Gagal menghapus data akun pintar');
    }
    return data;
  },

  // ===================================
  // SUPABASE CONFIG & SYNC API METHODS
  // ===================================

  async getSupabaseConfig(): Promise<{
    supabaseConfig: SupabaseConfigState;
    lastSyncedAt: string;
    counts: Record<string, number>;
  }> {
    const token = this.getToken();
    if (!token) throw new Error('Token tidak ditemukan');

    const res = await fetch('/api/admin/supabase-config', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return parseJsonResponse(res);
  },

  async saveSupabaseConfig(config: SupabaseConfigState): Promise<{
    success: boolean;
    message: string;
    supabaseConfig: SupabaseConfigState;
  }> {
    const token = this.getToken();
    if (!token) throw new Error('Token tidak ditemukan');

    const res = await fetch('/api/admin/supabase-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(config),
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) {
      if (res.status === 401) {
        handleSessionExpired();
      }
      throw new Error(data.error || 'Gagal menyimpan konfigurasi Supabase');
    }
    return data;
  },

  async importSupabaseSource(sourceKey: string): Promise<SupabaseSyncResult> {
    const token = this.getToken();
    if (!token) throw new Error('Token tidak ditemukan');

    const res = await fetch(`/api/admin/supabase-sync/${encodeURIComponent(sourceKey)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) {
      if (res.status === 401) {
        handleSessionExpired();
      }
      throw new Error(data.error || `Gagal mengimpor data ${sourceKey} dari Supabase`);
    }
    return data;
  },

  async syncAllSupabase(): Promise<SupabaseSyncResult> {
    const token = this.getToken();
    if (!token) throw new Error('Token tidak ditemukan');

    const res = await fetch('/api/admin/sync', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) {
      if (res.status === 401) {
        handleSessionExpired();
      }
      throw new Error(data.error || 'Gagal sinkronisasi data Supabase');
    }
    return data;
  },

  async triggerSync(): Promise<SupabaseSyncResult> {
    return this.syncAllSupabase();
  },

  async resetAbsensi(): Promise<{ success: boolean; message: string; totalAbsensi: number }> {
    const token = this.getToken();
    if (!token) throw new Error('Token tidak ditemukan');

    const res = await fetch('/api/admin/reset-absensi', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) {
      if (res.status === 401) {
        handleSessionExpired();
      }
      throw new Error(data.error || 'Gagal mereset data absensi');
    }
    return data;
  },

  async deleteAdminAbsensiRecord(id: string): Promise<{ success: boolean; message: string; deleted: any }> {
    const token = this.getToken();
    if (!token) throw new Error('Token tidak ditemukan');

    const res = await fetch(`/api/admin/absensi/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) {
      if (res.status === 401) {
        handleSessionExpired();
      }
      throw new Error(data.error || 'Gagal menghapus data absensi');
    }
    return data;
  },

  async clearAllAbsensiRecords(): Promise<{ success: boolean; message: string; deletedCount: number }> {
    const token = this.getToken();
    if (!token) throw new Error('Token tidak ditemukan');

    const res = await fetch('/api/admin/absensi', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) {
      if (res.status === 401) {
        handleSessionExpired();
      }
      throw new Error(data.error || 'Gagal menghapus seluruh data absensi');
    }
    return data;
  },

  async getUndangan(params: {
    search?: string;
    nik?: string;
    nama?: string;
    kode_toko?: string;
    nama_toko?: string;
    as?: string;
    am?: string;
    cabang?: string;
    jenis_training?: string;
    sistem_training?: string;
    tanggal?: string;
    myOnly?: boolean;
    page?: number;
    limit?: number;
  }): Promise<UndanganResponse> {
    const token = this.getToken();
    if (!token) throw new Error('Token tidak ditemukan');

    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.nik) query.append('nik', params.nik);
    if (params.nama) query.append('nama', params.nama);
    if (params.kode_toko) query.append('kode_toko', params.kode_toko);
    if (params.nama_toko) query.append('nama_toko', params.nama_toko);
    if (params.as && params.as !== 'all') query.append('as', params.as);
    if (params.am && params.am !== 'all') query.append('am', params.am);
    if (params.cabang && params.cabang !== 'all') query.append('cabang', params.cabang);
    if (params.jenis_training && params.jenis_training !== 'all') query.append('jenis_training', params.jenis_training);
    if (params.sistem_training && params.sistem_training !== 'all') query.append('sistem_training', params.sistem_training);
    if (params.tanggal && params.tanggal !== 'all') query.append('tanggal', params.tanggal);
    if (params.myOnly) query.append('myOnly', 'true');
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));

    const res = await fetch(`/api/undangan?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) {
      if (res.status === 401) {
        handleSessionExpired();
      }
      throw new Error(data.error || 'Gagal memuat data agenda training Undangan');
    }
    return data;
  },

  async changeAdminPassword(payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{ success: boolean; message: string }> {
    const token = this.getToken();
    if (!token) throw new Error('Token otentikasi tidak ditemukan. Silakan login kembali.');

    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await parseJsonResponse(res);
    if (!res.ok) {
      if (res.status === 401) {
        handleSessionExpired();
      }
      throw new Error(data.error || 'Gagal mengubah kata sandi Administrator');
    }
    return data;
  },

  async clearSourceData(target: 'all' | 'users' | 'stores' | 'trainings' | 'undangan' | 'akunPintar' | 'absensi' = 'all'): Promise<{
    success: boolean;
    message: string;
    counts: Record<string, number>;
  }> {
    const token = this.getToken();
    if (!token) throw new Error('Token otentikasi tidak ditemukan');

    const res = await fetch('/api/admin/clear-source-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ target }),
    });

    const data = await parseJsonResponse(res);
    if (!res.ok) {
      if (res.status === 401) {
        handleSessionExpired();
      }
      throw new Error(data.error || 'Gagal menghapus data sumber');
    }
    return data;
  },

  async downloadCsv(endpoint: string, defaultFilename: string): Promise<boolean> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const sep = endpoint.includes('?') ? '&' : '?';
    const url = token ? `${endpoint}${sep}token=${encodeURIComponent(token)}` : endpoint;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      if (res.status === 401) {
        handleSessionExpired();
      }
      const errText = await res.text().catch(() => '');
      throw new Error(`Gagal mengunduh CSV (${res.status}): ${errText || 'Terjadi kesalahan pada server'}`);
    }

    const text = await res.text();
    const content = text.startsWith('\uFEFF') ? text : '\uFEFF' + text;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', defaultFilename);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    }, 150);
    return true;
  },

  downloadArrayAsCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
    const headerLine = headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',');
    const rowLines = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const csvContent = '\uFEFF' + headerLine + '\n' + rowLines;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    }, 150);
  },
};
