import {
  DashboardStats,
  EmployeeListItem,
  User,
  AkunPintar,
  TrainingDateOption,
  CheckParticipantResponse,
  AbsensiRecord,
} from '../types';

const TOKEN_KEY = 'portal_tc_token';

function handleSessionExpired() {
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new CustomEvent('tc_auth_logout'));
}

export const api = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new CustomEvent('tc_auth_logout'));
  },

  async loginNik(nik: string): Promise<{ token: string; user: User; akunPintar: AkunPintar }> {
    const res = await fetch('/api/auth/login-nik', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nik }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal login dengan NIK');
    }
    this.setToken(data.token);
    return data;
  },

  async loginAdmin(username: string, password: string): Promise<{ token: string; user: User }> {
    const res = await fetch('/api/auth/login-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal login Administrator');
    }
    this.setToken(data.token);
    return data;
  },

  async getMe(): Promise<{ user: User; akunPintar: AkunPintar | null; lastSyncedAt: string }> {
    const token = this.getToken();
    if (!token) throw new Error('Token tidak ditemukan');

    const res = await fetch('/api/user/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        handleSessionExpired();
      }
      throw new Error(data.error || 'Sesi tidak valid');
    }
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
    const data = await res.json();
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
    totalTrainings: number;
    totalAbsensi: number;
  }> {
    const res = await fetch('/api/trainings/schedule');
    if (!res.ok) throw new Error('Gagal memuat jadwal training');
    return res.json();
  },

  async getMyTrainingSchedules(): Promise<{
    mySchedules: {
      tanggal: string;
      nik: string;
      nama: string;
      kode_toko: string;
      nama_toko: string;
      jenis_training: string;
      already_attended: boolean;
      absensi: AbsensiRecord | null;
    }[];
  }> {
    const token = this.getToken();
    if (!token) throw new Error('Token tidak ditemukan');

    const res = await fetch('/api/trainings/my-schedule', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        handleSessionExpired();
      }
      throw new Error(data.error || 'Gagal memuat jadwal training Anda');
    }
    return data;
  },

  async checkTrainingParticipant(tanggal: string, jenis_training: string): Promise<CheckParticipantResponse> {
    const token = this.getToken();
    if (!token) throw new Error('Token tidak ditemukan');

    const query = new URLSearchParams({
      tanggal,
      jenis_training,
    });
    const res = await fetch(`/api/trainings/check-participant?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
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
    const data = await res.json();
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
    page?: number;
    limit?: number;
  }): Promise<{
    data: {
      tanggal: string;
      nik: string;
      nama: string;
      kode_toko: string;
      nama_toko: string;
      jenis_training: string;
      is_hadir: boolean;
      waktu_absen: string;
    }[];
    summary: {
      total: number;
      totalHadir: number;
      totalBelum: number;
      percentage: number;
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
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    const res = await fetch(`/api/admin/absensi?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        handleSessionExpired();
      }
      throw new Error(data.error || 'Gagal memuat log absensi');
    }
    return data;
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch('/api/rekap/stats');
    if (!res.ok) throw new Error('Gagal memuat rekap statistik');
    return res.json();
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
    const data = await res.json();
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
    const data = await res.json();
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
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        handleSessionExpired();
      }
      throw new Error(data.error || 'Gagal menghapus data akun pintar');
    }
    return data;
  },

  async triggerSync(): Promise<{ success: boolean; userCount: number; pintarCount: number; lastSyncedAt: string; error?: string }> {
    const token = this.getToken();
    if (!token) throw new Error('Token tidak ditemukan');

    const res = await fetch('/api/admin/sync', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        handleSessionExpired();
      }
      throw new Error(data.error || 'Gagal sinkronisasi Google Sheet');
    }
    return data;
  },

  async getWebhookConfig(): Promise<{ webhookUrl: string }> {
    const token = this.getToken();
    if (!token) throw new Error('Token tidak ditemukan');

    const res = await fetch('/api/admin/config-webhook', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  async saveWebhookConfig(webhookUrl: string): Promise<{ success: boolean; webhookUrl: string }> {
    const token = this.getToken();
    if (!token) throw new Error('Token tidak ditemukan');

    const res = await fetch('/api/admin/config-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ webhookUrl }),
    });
    return res.json();
  },
};
