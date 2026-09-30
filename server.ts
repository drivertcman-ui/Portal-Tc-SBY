import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const SPREADSHEET_ID = '1VyP2x_0zRX8iqa8XadKyURKH5Yz55WFJVECaeQUpP0g';
const PERMANENT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzTYfIFIPwO4iSFE_-TYOcE4jqx7XA_M-WBh59qy8MOsLqNLKFPIf-N10ijaErDYGqE4A/exec';

app.use(express.json());

// Type Definitions
export interface UserRecord {
  nik: string;
  nama: string;
  jabatan: string;
  kode_toko: string;
  nama_toko: string;
  wa: string;
  role: string;
}

export interface StoreRecord {
  kode_toko: string;
  nama_toko: string;
  wilayah: string;
}

export interface TrainingRecord {
  tanggal_awal: string;
  nik: string;
  nama: string;
  kode_toko: string;
  nama_toko: string;
  jenis_training: string;
}

export interface AkunPintarRecord {
  nik: string;
  nama: string;
  jabatan: string;
  wa: string;
  email_pintar: string;
  password_pintar: string;
  updated_at?: string;
  synced_to_sheet?: boolean;
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

interface DatabaseState {
  users: Record<string, UserRecord>;
  stores: Record<string, StoreRecord>;
  trainings: TrainingRecord[];
  akunPintar: Record<string, AkunPintarRecord>;
  absensi: Record<string, AbsensiRecord>;
  sessions: Record<string, { nik: string; role: string; expires: number }>;
  lastSyncedAt: string;
  webhookUrl: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.resolve(DATA_DIR, 'tc_database.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-Memory Database with persistent storage
const db: DatabaseState = {
  users: {},
  stores: {},
  trainings: [],
  akunPintar: {},
  absensi: {},
  sessions: {},
  lastSyncedAt: '',
  webhookUrl: PERMANENT_APPS_SCRIPT_URL,
};

// Load saved local data if available
if (fs.existsSync(DATA_FILE)) {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.users) db.users = parsed.users;
    if (parsed.stores) db.stores = parsed.stores;
    if (parsed.trainings) db.trainings = parsed.trainings;
    if (parsed.akunPintar) db.akunPintar = parsed.akunPintar;
    if (parsed.absensi) db.absensi = parsed.absensi;
    if (parsed.sessions) db.sessions = parsed.sessions;
    if (parsed.lastSyncedAt) db.lastSyncedAt = parsed.lastSyncedAt;
    db.webhookUrl = parsed.webhookUrl || PERMANENT_APPS_SCRIPT_URL;
  } catch (err) {
    console.error('Error reading local db file:', err);
  }
} else {
  db.webhookUrl = PERMANENT_APPS_SCRIPT_URL;
}

function persistDb() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist db:', err);
  }
}

// Robust CSV parser
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(current.trim());
      current = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(current.trim());
      if (row.some(cell => cell.length > 0)) {
        lines.push(row);
      }
      row = [];
      current = '';
    } else {
      current += char;
    }
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current.trim());
    if (row.some(cell => cell.length > 0)) {
      lines.push(row);
    }
  }

  return lines;
}

function clean(str: string | undefined): string {
  if (!str) return '';
  return str.replace(/^["']|["']$/g, '').trim();
}

function getIndonesianCurrentTime(): { iso: string; formatted: string } {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };
  const formatted = new Intl.DateTimeFormat('id-ID', options).format(now) + ' WIB';
  return { iso: now.toISOString(), formatted };
}

// Fetch and sync data directly from Google Sheets
async function syncFromGoogleSheets(): Promise<{
  success: boolean;
  userCount: number;
  pintarCount: number;
  trainingCount: number;
  error?: string;
}> {
  try {
    // 1. Fetch Users Sheet
    const usersUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=Users`;
    const usersRes = await fetch(usersUrl);
    const newUsers: Record<string, UserRecord> = {};

    if (usersRes.ok) {
      const usersCsv = await usersRes.text();
      const userRows = parseCSV(usersCsv);

      if (userRows.length > 1) {
        const headers = userRows[0].map(h => clean(h).toLowerCase());
        const nikIdx = headers.findIndex(h => h.includes('nik'));
        const namaIdx = headers.findIndex(h => h.includes('nama') && !h.includes('toko'));
        const jabIdx = headers.findIndex(h => h.includes('jabatan'));
        const kodeTokoIdx = headers.findIndex(h => h.includes('kode_toko') || h.includes('kode toko'));
        const namaTokoIdx = headers.findIndex(h => h.includes('nama toko') || h.includes('nama_toko'));
        const waIdx = headers.findIndex(h => h.includes('wa') || h.includes('no_wa'));
        const roleIdx = headers.findIndex(h => h.includes('role'));

        for (let i = 1; i < userRows.length; i++) {
          const row = userRows[i];
          const nik = clean(row[nikIdx >= 0 ? nikIdx : 0]);
          if (!nik) continue;

          const nama = clean(row[namaIdx >= 0 ? namaIdx : 1]);
          const jabatan = clean(row[jabIdx >= 0 ? jabIdx : 2]);
          const kode_toko = clean(row[kodeTokoIdx >= 0 ? kodeTokoIdx : 3]);
          const nama_toko = clean(row[namaTokoIdx >= 0 ? namaTokoIdx : 4]);
          const wa = clean(row[waIdx >= 0 ? waIdx : 5]);
          const role = clean(row[roleIdx >= 0 ? roleIdx : 6]) || 'Users';

          newUsers[nik] = {
            nik,
            nama: nama || '',
            jabatan: jabatan || '',
            kode_toko: kode_toko || '',
            nama_toko: nama_toko || '',
            wa: wa || '',
            role: role || 'Users',
          };
        }
      }
    }
    db.users = newUsers;

    // 2. Fetch Stores Sheet
    try {
      const storesUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=Stores`;
      const storesRes = await fetch(storesUrl);
      if (storesRes.ok) {
        const storesCsv = await storesRes.text();
        const storeRows = parseCSV(storesCsv);
        const newStores: Record<string, StoreRecord> = {};
        for (let i = 1; i < storeRows.length; i++) {
          const row = storeRows[i];
          const kode = clean(row[0]);
          if (kode) {
            newStores[kode] = {
              kode_toko: kode,
              nama_toko: clean(row[1]) || kode,
              wilayah: clean(row[2]) || '',
            };
          }
        }
        db.stores = newStores;
      }
    } catch (e) {
      console.warn('Stores sync notice:', e);
    }

    // 3. Fetch Trainings Sheet (Menu Absensi Kehadiran Training)
    try {
      const trainingsUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=Trainings`;
      const trainingsRes = await fetch(trainingsUrl);
      if (trainingsRes.ok) {
        const trainingsCsv = await trainingsRes.text();
        const trainingRows = parseCSV(trainingsCsv);
        const newTrainings: TrainingRecord[] = [];

        if (trainingRows.length > 1) {
          const tHeaders = trainingRows[0].map(h => clean(h).toLowerCase());
          const tTglIdx = tHeaders.findIndex(h => h.includes('tanggal'));
          const tNikIdx = tHeaders.findIndex(h => h.includes('nik'));
          const tNamaIdx = tHeaders.findIndex(h => h.includes('nama'));
          const tKodeTokoIdx = tHeaders.findIndex(h => h.includes('toko'));
          const tJenisIdx = tHeaders.findIndex(h => h.includes('training') || h.includes('jenis'));

          for (let i = 1; i < trainingRows.length; i++) {
            const row = trainingRows[i];
            const nik = clean(row[tNikIdx >= 0 ? tNikIdx : 1]);
            const jenis_training = clean(row[tJenisIdx >= 0 ? tJenisIdx : 4]);
            if (!nik || !jenis_training) continue;

            const tanggal_awal = clean(row[tTglIdx >= 0 ? tTglIdx : 0]);
            const nama = clean(row[tNamaIdx >= 0 ? tNamaIdx : 2]) || db.users[nik]?.nama || '';
            const kode_toko = clean(row[tKodeTokoIdx >= 0 ? tKodeTokoIdx : 3]) || db.users[nik]?.kode_toko || '';
            const nama_toko =
              db.stores[kode_toko]?.nama_toko ||
              db.users[nik]?.nama_toko ||
              kode_toko;

            newTrainings.push({
              tanggal_awal,
              nik,
              nama,
              kode_toko,
              nama_toko,
              jenis_training,
            });
          }
        }
        db.trainings = newTrainings;
      }
    } catch (e) {
      console.warn('Trainings sync notice:', e);
    }

    // 4. Fetch AkunPintar Sheet
    const pintarUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=AkunPintar`;
    const pintarRes = await fetch(pintarUrl);
    const newAkunPintar: Record<string, AkunPintarRecord> = {};

    if (pintarRes.ok) {
      const pintarCsv = await pintarRes.text();
      const pintarRows = parseCSV(pintarCsv);

      if (pintarRows.length > 1) {
        const pHeaders = pintarRows[0].map(h => clean(h).toLowerCase());
        const pNikIdx = pHeaders.findIndex(h => h.includes('nik'));
        const pNamaIdx = pHeaders.findIndex(h => h.includes('nama'));
        const pJabIdx = pHeaders.findIndex(h => h.includes('jabatan'));
        const pWaIdx = pHeaders.findIndex(h => h.includes('wa'));
        const pEmailIdx = pHeaders.findIndex(h => h.includes('email'));
        const pPassIdx = pHeaders.findIndex(h => h.includes('password'));

        for (let i = 1; i < pintarRows.length; i++) {
          const row = pintarRows[i];
          const nik = clean(row[pNikIdx >= 0 ? pNikIdx : 0]);
          if (!nik) continue;

          const nama = clean(row[pNamaIdx >= 0 ? pNamaIdx : 1]);
          const jabatan = clean(row[pJabIdx >= 0 ? pJabIdx : 2]);
          const wa = clean(row[pWaIdx >= 0 ? pWaIdx : 3]);
          const email = clean(row[pEmailIdx >= 0 ? pEmailIdx : 4]);
          const password = clean(row[pPassIdx >= 0 ? pPassIdx : 5]);

          if (email || password || wa) {
            newAkunPintar[nik] = {
              nik,
              nama: nama || db.users[nik]?.nama || '',
              jabatan: jabatan || db.users[nik]?.jabatan || '',
              wa,
              email_pintar: email,
              password_pintar: password,
              updated_at: new Date().toISOString(),
              synced_to_sheet: true,
            };
          }
        }
      }
    }

    db.akunPintar = newAkunPintar;
    db.lastSyncedAt = new Date().toISOString();
    persistDb();

    const userCount = Object.keys(db.users).length;
    const filledCount = Object.values(db.akunPintar).filter(a => a.email_pintar && a.email_pintar.trim().length > 0).length;
    const trainingCount = db.trainings.length;

    return { success: true, userCount, pintarCount: filledCount, trainingCount };
  } catch (error: any) {
    console.error('❌ Error syncing with Google Sheets:', error);
    return { success: false, userCount: Object.keys(db.users).length, pintarCount: 0, trainingCount: 0, error: error.message };
  }
}

// Initial Sync
syncFromGoogleSheets();

// 10-Second Auto Sync
setInterval(() => {
  syncFromGoogleSheets().catch(e => console.error('Live sync failed:', e));
}, 10000);

function createSession(nik: string, role: string) {
  const token = 'tc_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  db.sessions[token] = {
    nik,
    role,
    expires: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  };
  persistDb();
  return token;
}

function authMiddleware(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Akses ditolak. Token otentikasi tidak ditemukan.', code: 'UNAUTHORIZED' });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const session = db.sessions[token];

  if (!session || session.expires < Date.now()) {
    if (session && db.sessions[token]) {
      delete db.sessions[token];
      persistDb();
    }
    return res.status(401).json({ error: 'Sesi telah kedaluwarsa. Silakan login kembali.', code: 'SESSION_EXPIRED' });
  }

  // Extend session expiry for active usage
  session.expires = Date.now() + 30 * 24 * 60 * 60 * 1000;

  (req as any).userSession = session;
  next();
}

async function pushToGoogleSheetsWebhook(payload: any) {
  const targetWebhook = db.webhookUrl || PERMANENT_APPS_SCRIPT_URL;
  if (!targetWebhook) return;

  try {
    const res = await fetch(targetWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    console.log('📡 Apps Script Webhook Response:', text);
  } catch (err) {
    console.error('Apps Script Webhook Error:', err);
  }
}

// --- API ROUTES ---

// 1. User Login by NIK
app.post('/api/auth/login-nik', (req: Request, res: Response) => {
  const { nik } = req.body;
  if (!nik || typeof nik !== 'string') {
    return res.status(400).json({ error: 'NIK wajib diisi.' });
  }

  const cleanNik = clean(nik);
  const user = db.users[cleanNik];

  if (!user) {
    return res.status(404).json({
      error: `NIK "${cleanNik}" tidak ditemukan dalam database sheet Users. Pastikan NIK sudah sesuai.`,
    });
  }

  const token = createSession(user.nik, 'user');
  const akunPintar = db.akunPintar[user.nik] || {
    nik: user.nik,
    nama: user.nama,
    jabatan: user.jabatan,
    wa: user.wa || '',
    email_pintar: '',
    password_pintar: '',
  };

  return res.json({
    token,
    user: {
      nik: user.nik,
      nama: user.nama,
      jabatan: user.jabatan,
      kode_toko: user.kode_toko,
      nama_toko: user.nama_toko,
      wa: user.wa,
      role: 'user',
    },
    akunPintar: {
      nik: akunPintar.nik,
      nama: akunPintar.nama,
      jabatan: akunPintar.jabatan,
      wa: akunPintar.wa,
      email_pintar: akunPintar.email_pintar,
      has_password: Boolean(akunPintar.password_pintar),
      updated_at: akunPintar.updated_at,
      synced_to_sheet: akunPintar.synced_to_sheet,
    },
  });
});

// 2. Admin Login
app.post('/api/auth/login-admin', (req: Request, res: Response) => {
  const { username, password } = req.body;

  const isValidAdmin =
    (username === 'admin' && password === 'admin123') ||
    (username === 'admin_tc' && password === 'tc_surabaya_2026') ||
    (username === 'superadmin' && password === 'surabaya2026');

  if (!isValidAdmin) {
    return res.status(401).json({ error: 'Username atau kata sandi Administrator salah.' });
  }

  const token = createSession('ADMIN_TC', 'admin');
  return res.json({
    token,
    user: {
      nik: 'ADMIN_TC',
      nama: 'Administrator TC Surabaya',
      jabatan: 'Koordinator TC Surabaya',
      kode_toko: 'HQ',
      nama_toko: 'Kantor TC Surabaya',
      role: 'admin',
    },
  });
});

// 3. Get Current User Profile & Synced Akun Pintar
app.get('/api/user/me', authMiddleware, (req: Request, res: Response) => {
  const session = (req as any).userSession;

  if (session.role === 'admin') {
    return res.json({
      user: {
        nik: 'ADMIN_TC',
        nama: 'Administrator TC Surabaya',
        jabatan: 'Koordinator TC Surabaya',
        kode_toko: 'HQ',
        nama_toko: 'Kantor TC Surabaya',
        role: 'admin',
      },
      akunPintar: null,
      lastSyncedAt: db.lastSyncedAt,
    });
  }

  const user = db.users[session.nik];
  if (!user) {
    return res.status(404).json({ error: 'Data karyawan tidak ditemukan.' });
  }

  const akunPintar = db.akunPintar[session.nik] || {
    nik: user.nik,
    nama: user.nama,
    jabatan: user.jabatan,
    wa: user.wa || '',
    email_pintar: '',
    password_pintar: '',
  };

  return res.json({
    user: {
      nik: user.nik,
      nama: user.nama,
      jabatan: user.jabatan,
      kode_toko: user.kode_toko,
      nama_toko: user.nama_toko,
      wa: user.wa,
      role: 'user',
    },
    akunPintar: {
      nik: akunPintar.nik,
      nama: akunPintar.nama,
      jabatan: akunPintar.jabatan,
      wa: akunPintar.wa,
      email_pintar: akunPintar.email_pintar,
      password_pintar: akunPintar.password_pintar,
      has_password: Boolean(akunPintar.password_pintar),
      updated_at: akunPintar.updated_at,
      synced_to_sheet: akunPintar.synced_to_sheet,
    },
    lastSyncedAt: db.lastSyncedAt,
  });
});

// 4. Input / Update Akun Pintar by Employee
app.post('/api/user/akun-pintar', authMiddleware, async (req: Request, res: Response) => {
  const session = (req as any).userSession;
  const user = db.users[session.nik];

  if (!user) {
    return res.status(404).json({ error: 'Data user tidak valid atau tidak terdaftar.' });
  }

  const { wa, email_pintar, password_pintar } = req.body;

  if (!wa || typeof wa !== 'string' || wa.trim().length < 8) {
    return res.status(400).json({ error: 'Nomor WhatsApp tidak valid. Masukkan minimal 8-15 digit angka.' });
  }

  const cleanWa = wa.trim().replace(/[^0-9+]/g, '');

  if (!email_pintar || typeof email_pintar !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email_pintar.trim())) {
    return res.status(400).json({ error: 'Format Email Pintar tidak valid. Contoh: nama@gmail.com' });
  }

  if (!password_pintar || typeof password_pintar !== 'string' || password_pintar.trim().length < 4) {
    return res.status(400).json({ error: 'Password aplikasi Pintar minimal 4 karakter.' });
  }

  const updatedRecord: AkunPintarRecord = {
    nik: user.nik,
    nama: user.nama,
    jabatan: user.jabatan,
    wa: cleanWa,
    email_pintar: email_pintar.trim().toLowerCase(),
    password_pintar: password_pintar.trim(),
    updated_at: new Date().toISOString(),
    synced_to_sheet: true,
  };

  db.akunPintar[user.nik] = updatedRecord;

  if (db.users[user.nik]) {
    db.users[user.nik].wa = cleanWa;
  }

  persistDb();

  await pushToGoogleSheetsWebhook({
    action: 'update_akun_pintar',
    nik: updatedRecord.nik,
    nama: updatedRecord.nama,
    jabatan: updatedRecord.jabatan,
    wa: updatedRecord.wa,
    email_pintar: updatedRecord.email_pintar,
    password_pintar: updatedRecord.password_pintar,
    data: updatedRecord,
  });

  return res.json({
    success: true,
    message: 'Data Akun Pintar berhasil disimpan dan disinkronkan ke database sheet AkunPintar!',
    record: updatedRecord,
  });
});

// ==========================================
// MENU ABSENSI KEHADIRAN TRAINING (NEW FEATURE)
// ==========================================

// 5. Get Available Training Dates & Training Types
app.get('/api/trainings/schedule', (req: Request, res: Response) => {
  const dateMap: Record<
    string,
    Record<string, { total_peserta: number; total_hadir: number }>
  > = {};

  for (const t of db.trainings) {
    const tgl = t.tanggal_awal || 'Tanpa Tanggal';
    const jenis = t.jenis_training || 'Umum';

    if (!dateMap[tgl]) {
      dateMap[tgl] = {};
    }
    if (!dateMap[tgl][jenis]) {
      dateMap[tgl][jenis] = { total_peserta: 0, total_hadir: 0 };
    }
    dateMap[tgl][jenis].total_peserta++;

    // Check attendance in db.absensi
    const absKey = `${t.nik}_${tgl}_${jenis}`;
    if (db.absensi[absKey]) {
      dateMap[tgl][jenis].total_hadir++;
    }
  }

  const scheduleOptions = Object.entries(dateMap).map(([tanggal, jenisObj]) => {
    let total_peserta = 0;
    const jenis_list = Object.entries(jenisObj).map(([jenis_training, stat]) => {
      total_peserta += stat.total_peserta;
      return {
        jenis_training,
        total_peserta: stat.total_peserta,
        total_hadir: stat.total_hadir,
      };
    });

    return {
      tanggal,
      total_peserta,
      jenis_list,
    };
  });

  return res.json({
    scheduleOptions,
    totalTrainings: db.trainings.length,
    totalAbsensi: Object.keys(db.absensi).length,
  });
});

// 6. Get My Registered Training Schedules (User)
app.get('/api/trainings/my-schedule', authMiddleware, (req: Request, res: Response) => {
  const session = (req as any).userSession;
  const myTrainings = db.trainings
    .filter(t => t.nik === session.nik)
    .map(t => {
      const absKey = `${t.nik}_${t.tanggal_awal}_${t.jenis_training}`;
      const abs = db.absensi[absKey];
      return {
        tanggal: t.tanggal_awal,
        nik: t.nik,
        nama: t.nama,
        kode_toko: t.kode_toko,
        nama_toko: t.nama_toko,
        jenis_training: t.jenis_training,
        already_attended: Boolean(abs),
        absensi: abs || null,
      };
    });

  return res.json({ mySchedules: myTrainings });
});

// 7. Check if user is a participant for a specific date and training type
app.get('/api/trainings/check-participant', authMiddleware, (req: Request, res: Response) => {
  const session = (req as any).userSession;
  const { tanggal = '', jenis_training = '' } = req.query;

  const targetDate = String(tanggal).trim();
  const targetJenis = String(jenis_training).trim();

  const user = db.users[session.nik];
  if (!user) {
    return res.status(404).json({ is_registered: false, message: 'Data karyawan tidak ditemukan.' });
  }

  // Look for match in db.trainings
  const match = db.trainings.find(
    t =>
      t.nik === session.nik &&
      t.tanggal_awal.toLowerCase() === targetDate.toLowerCase() &&
      t.jenis_training.toLowerCase() === targetJenis.toLowerCase()
  );

  const userOtherSchedules = db.trainings
    .filter(t => t.nik === session.nik)
    .map(t => {
      const key = `${t.nik}_${t.tanggal_awal}_${t.jenis_training}`;
      return {
        tanggal: t.tanggal_awal,
        jenis_training: t.jenis_training,
        kode_toko: t.kode_toko,
        nama_toko: t.nama_toko,
        already_attended: Boolean(db.absensi[key]),
      };
    });

  if (!match) {
    return res.json({
      is_registered: false,
      already_attended: false,
      message: `Anda tidak terdaftar sebagai peserta training "${targetJenis}" pada tanggal "${targetDate}".`,
      user_other_schedules: userOtherSchedules,
    });
  }

  const absKey = `${session.nik}_${match.tanggal_awal}_${match.jenis_training}`;
  const existingAbs = db.absensi[absKey];

  return res.json({
    is_registered: true,
    already_attended: Boolean(existingAbs),
    training: {
      tanggal: match.tanggal_awal,
      nik: match.nik,
      nama: match.nama || user.nama,
      kode_toko: match.kode_toko || user.kode_toko,
      nama_toko: match.nama_toko || user.nama_toko || match.kode_toko,
      jenis_training: match.jenis_training,
    },
    absensi: existingAbs || null,
    user_other_schedules: userOtherSchedules,
  });
});

// 8. Submit Attendance (Absensi Kehadiran) - Locked fields from system & Trainings sheet
app.post('/api/trainings/absensi', authMiddleware, async (req: Request, res: Response) => {
  const session = (req as any).userSession;
  const { tanggal, jenis_training } = req.body;

  if (!tanggal || !jenis_training) {
    return res.status(400).json({ error: 'Tanggal dan Jenis Training wajib disertakan.' });
  }

  const targetDate = String(tanggal).trim();
  const targetJenis = String(jenis_training).trim();

  // Validate that user is a genuine registered participant in Trainings sheet
  const match = db.trainings.find(
    t =>
      t.nik === session.nik &&
      t.tanggal_awal.toLowerCase() === targetDate.toLowerCase() &&
      t.jenis_training.toLowerCase() === targetJenis.toLowerCase()
  );

  if (!match) {
    return res.status(403).json({
      error: `Akses Absensi Ditolak: Anda tidak terdaftar sebagai peserta training "${targetJenis}" pada tanggal "${targetDate}".`,
    });
  }

  const user = db.users[session.nik];
  const absKey = `${session.nik}_${match.tanggal_awal}_${match.jenis_training}`;

  // Check if already submitted
  if (db.absensi[absKey]) {
    return res.json({
      success: true,
      already_attended: true,
      message: 'Anda telah berhasil melakukan absensi kehadiran sebelumnya.',
      record: db.absensi[absKey],
    });
  }

  const timeInfo = getIndonesianCurrentTime();
  const absensiRecord: AbsensiRecord = {
    id: absKey,
    tanggal: match.tanggal_awal,
    nik: match.nik,
    nama: match.nama || user?.nama || '',
    kode_toko: match.kode_toko || user?.kode_toko || '',
    nama_toko: match.nama_toko || user?.nama_toko || match.kode_toko,
    jenis_training: match.jenis_training,
    waktu_absen: timeInfo.iso,
    waktu_formatted: timeInfo.formatted,
    status: 'HADIR',
    synced_to_sheet: true,
  };

  db.absensi[absKey] = absensiRecord;
  persistDb();

  // Dispatch attendance record to Google Apps Script Webhook
  await pushToGoogleSheetsWebhook({
    action: 'submit_absensi',
    tanggal: absensiRecord.tanggal,
    nik: absensiRecord.nik,
    nama: absensiRecord.nama,
    kode_toko: absensiRecord.kode_toko,
    nama_toko: absensiRecord.nama_toko,
    jenis_training: absensiRecord.jenis_training,
    waktu_absen: absensiRecord.waktu_formatted,
    status: 'HADIR',
    data: absensiRecord,
  });

  return res.json({
    success: true,
    message: 'Absensi kehadiran training berhasil dicatat dan disinkronkan ke spreadsheet!',
    record: absensiRecord,
  });
});

// 9. Admin: Get All Attendance Log & Statistics
app.get('/api/admin/absensi', authMiddleware, (req: Request, res: Response) => {
  const session = (req as any).userSession;
  if (session.role !== 'admin') {
    return res.status(403).json({ error: 'Akses khusus administrator TC Surabaya.' });
  }

  const { search = '', tanggal = 'all', jenis_training = 'all', status = 'all', page = '1', limit = '50' } = req.query;

  const searchQuery = String(search).toLowerCase().trim();
  const tanggalFilter = String(tanggal);
  const jenisFilter = String(jenis_training);
  const statusFilter = String(status);
  const pageNum = Math.max(1, parseInt(String(page)) || 1);
  const pageLimit = Math.min(200, Math.max(10, parseInt(String(limit)) || 50));

  // Build combined list of all scheduled training participants with their attendance status
  let list = db.trainings.map(t => {
    const absKey = `${t.nik}_${t.tanggal_awal}_${t.jenis_training}`;
    const abs = db.absensi[absKey];
    return {
      tanggal: t.tanggal_awal,
      nik: t.nik,
      nama: t.nama,
      kode_toko: t.kode_toko,
      nama_toko: t.nama_toko,
      jenis_training: t.jenis_training,
      is_hadir: Boolean(abs),
      waktu_absen: abs?.waktu_formatted || '-',
    };
  });

  // Filters
  if (tanggalFilter !== 'all') {
    list = list.filter(item => item.tanggal === tanggalFilter);
  }

  if (jenisFilter !== 'all') {
    list = list.filter(item => item.jenis_training === jenisFilter);
  }

  if (statusFilter === 'hadir') {
    list = list.filter(item => item.is_hadir);
  } else if (statusFilter === 'belum') {
    list = list.filter(item => !item.is_hadir);
  }

  if (searchQuery) {
    list = list.filter(
      item =>
        item.nik.toLowerCase().includes(searchQuery) ||
        item.nama.toLowerCase().includes(searchQuery) ||
        item.nama_toko.toLowerCase().includes(searchQuery) ||
        item.kode_toko.toLowerCase().includes(searchQuery) ||
        item.jenis_training.toLowerCase().includes(searchQuery)
    );
  }

  const total = list.length;
  const totalHadir = list.filter(item => item.is_hadir).length;
  const totalBelum = total - totalHadir;
  const totalPages = Math.ceil(total / pageLimit);
  const offset = (pageNum - 1) * pageLimit;
  const paginated = list.slice(offset, offset + pageLimit);

  return res.json({
    data: paginated,
    summary: {
      total,
      totalHadir,
      totalBelum,
      percentage: total > 0 ? Number(((totalHadir / total) * 100).toFixed(1)) : 0,
    },
    pagination: {
      total,
      page: pageNum,
      limit: pageLimit,
      totalPages,
    },
  });
});

// 10. Admin: Export Attendance to CSV
app.get('/api/admin/export-absensi-csv', authMiddleware, (req: Request, res: Response) => {
  let csv = '"TANGGAL","NIK","NAMA","KODE TOKO","NAMA TOKO","JENIS TRAINING","STATUS","WAKTU ABSEN"\n';

  for (const t of db.trainings) {
    const absKey = `${t.nik}_${t.tanggal_awal}_${t.jenis_training}`;
    const abs = db.absensi[absKey];
    const status = abs ? 'HADIR' : 'BELUM HADIR';
    const waktu = abs?.waktu_formatted || '-';

    csv += `"${t.tanggal_awal}","${t.nik}","${t.nama.replace(/"/g, '""')}","${t.kode_toko}","${t.nama_toko.replace(/"/g, '""')}","${t.jenis_training.replace(/"/g, '""')}","${status}","${waktu}"\n`;
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="Rekap_Absensi_Training_${Date.now()}.csv"`);
  return res.send(csv);
});

// 11. Admin: Edit Employee Akun Pintar
app.put('/api/admin/employees/:nik', authMiddleware, async (req: Request, res: Response) => {
  const session = (req as any).userSession;
  if (session.role !== 'admin') {
    return res.status(403).json({ error: 'Akses khusus administrator TC Surabaya.' });
  }

  const { nik } = req.params;
  const user = db.users[nik];

  if (!user) {
    return res.status(404).json({ error: `Karyawan dengan NIK ${nik} tidak ditemukan.` });
  }

  const { wa = '', email_pintar = '', password_pintar = '' } = req.body;

  const cleanWa = String(wa).trim().replace(/[^0-9+]/g, '');
  const cleanEmail = String(email_pintar).trim().toLowerCase();
  const cleanPassword = String(password_pintar).trim();

  const updatedRecord: AkunPintarRecord = {
    nik: user.nik,
    nama: user.nama,
    jabatan: user.jabatan,
    wa: cleanWa,
    email_pintar: cleanEmail,
    password_pintar: cleanPassword,
    updated_at: new Date().toISOString(),
    synced_to_sheet: true,
  };

  db.akunPintar[user.nik] = updatedRecord;
  if (db.users[user.nik]) {
    db.users[user.nik].wa = cleanWa;
  }
  persistDb();

  await pushToGoogleSheetsWebhook({
    action: 'update_akun_pintar',
    nik: updatedRecord.nik,
    nama: updatedRecord.nama,
    jabatan: updatedRecord.jabatan,
    wa: updatedRecord.wa,
    email_pintar: updatedRecord.email_pintar,
    password_pintar: updatedRecord.password_pintar,
    data: updatedRecord,
  });

  return res.json({
    success: true,
    message: 'Data Akun Pintar berhasil diperbarui dan disinkronkan ke Google Spreadsheet!',
    record: updatedRecord,
  });
});

// 12. Admin: Delete Employee Akun Pintar
app.delete('/api/admin/employees/:nik/akun-pintar', authMiddleware, async (req: Request, res: Response) => {
  const session = (req as any).userSession;
  if (session.role !== 'admin') {
    return res.status(403).json({ error: 'Akses khusus administrator TC Surabaya.' });
  }

  const { nik } = req.params;
  const user = db.users[nik];

  if (!user) {
    return res.status(404).json({ error: `Karyawan dengan NIK ${nik} tidak ditemukan.` });
  }

  delete db.akunPintar[nik];
  if (db.users[nik]) {
    db.users[nik].wa = '';
  }
  persistDb();

  await pushToGoogleSheetsWebhook({
    action: 'update_akun_pintar',
    nik,
    nama: user.nama,
    jabatan: user.jabatan,
    wa: '',
    email_pintar: '',
    password_pintar: '',
    data: {
      nik,
      nama: user.nama,
      jabatan: user.jabatan,
      wa: '',
      email_pintar: '',
      password_pintar: '',
    },
  });

  return res.json({
    success: true,
    message: `Data Akun Pintar untuk NIK ${nik} (${user.nama}) berhasil dihapus dan dikosongkan pada Google Spreadsheet!`,
  });
});

// 13. Dashboard Recap Statistics
app.get('/api/rekap/stats', (req: Request, res: Response) => {
  const usersList = Object.values(db.users);
  const totalKaryawan = usersList.length;

  let totalTerisi = 0;
  let totalBelum = 0;

  const jabatanMap: Record<string, { total: number; terisi: number; belum: number }> = {};
  const tokoMap: Record<string, { kode_toko: string; nama_toko: string; total: number; terisi: number }> = {};

  for (const u of usersList) {
    const akun = db.akunPintar[u.nik];
    const isFilled = Boolean(akun && akun.email_pintar && akun.email_pintar.trim().length > 0);

    if (isFilled) {
      totalTerisi++;
    } else {
      totalBelum++;
    }

    const jab = u.jabatan || 'Lainnya';
    if (!jabatanMap[jab]) {
      jabatanMap[jab] = { total: 0, terisi: 0, belum: 0 };
    }
    jabatanMap[jab].total++;
    if (isFilled) {
      jabatanMap[jab].terisi++;
    } else {
      jabatanMap[jab].belum++;
    }

    const tokoKey = u.kode_toko || 'NO_TOKO';
    if (!tokoMap[tokoKey]) {
      tokoMap[tokoKey] = {
        kode_toko: u.kode_toko,
        nama_toko: u.nama_toko || u.kode_toko,
        total: 0,
        terisi: 0,
      };
    }
    tokoMap[tokoKey].total++;
    if (isFilled) {
      tokoMap[tokoKey].terisi++;
    }
  }

  const completionPercentage = totalKaryawan > 0 ? Number(((totalTerisi / totalKaryawan) * 100).toFixed(1)) : 0;

  const tokoRankings = Object.values(tokoMap)
    .map(t => ({
      ...t,
      percentage: t.total > 0 ? Number(((t.terisi / t.total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.percentage - a.percentage || b.total - a.total);

  const jabatanStats = Object.entries(jabatanMap)
    .map(([jabatan, stat]) => ({
      jabatan,
      total: stat.total,
      terisi: stat.terisi,
      belum: stat.belum,
      percentage: stat.total > 0 ? Number(((stat.terisi / stat.total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return res.json({
    totalKaryawan,
    totalTerisi,
    totalBelum,
    totalToko: Object.keys(tokoMap).length,
    completionPercentage,
    totalTrainings: db.trainings.length,
    totalAbsensi: Object.keys(db.absensi).length,
    lastSyncedAt: db.lastSyncedAt,
    spreadsheetId: SPREADSHEET_ID,
    webhookUrl: db.webhookUrl || PERMANENT_APPS_SCRIPT_URL,
    jabatanStats,
    topToko: tokoRankings.slice(0, 10),
  });
});

// 14. Admin Employees List
app.get('/api/admin/employees', authMiddleware, (req: Request, res: Response) => {
  const session = (req as any).userSession;
  if (session.role !== 'admin') {
    return res.status(403).json({ error: 'Akses khusus administrator TC Surabaya.' });
  }

  const { search = '', status = 'all', jabatan = 'all', toko = '', page = '1', limit = '50' } = req.query;

  const searchQuery = String(search).toLowerCase().trim();
  const statusFilter = String(status);
  const jabatanFilter = String(jabatan);
  const tokoFilter = String(toko).toLowerCase().trim();
  const pageNum = Math.max(1, parseInt(String(page)) || 1);
  const pageLimit = Math.min(200, Math.max(10, parseInt(String(limit)) || 50));

  let list = Object.values(db.users).map(u => {
    const akun = db.akunPintar[u.nik];
    const isFilled = Boolean(akun && akun.email_pintar && akun.email_pintar.trim().length > 0);
    return {
      nik: u.nik,
      nama: u.nama,
      jabatan: u.jabatan,
      kode_toko: u.kode_toko,
      nama_toko: u.nama_toko,
      wa: akun?.wa || u.wa || '',
      email_pintar: akun?.email_pintar || '',
      password_pintar: akun?.password_pintar || '',
      is_filled: isFilled,
      updated_at: akun?.updated_at || '',
    };
  });

  if (statusFilter === 'filled') {
    list = list.filter(item => item.is_filled);
  } else if (statusFilter === 'empty') {
    list = list.filter(item => !item.is_filled);
  }

  if (jabatanFilter !== 'all') {
    list = list.filter(item => item.jabatan === jabatanFilter);
  }

  if (tokoFilter) {
    list = list.filter(
      item => item.kode_toko.toLowerCase().includes(tokoFilter) || item.nama_toko.toLowerCase().includes(tokoFilter)
    );
  }

  if (searchQuery) {
    list = list.filter(
      item =>
        item.nik.toLowerCase().includes(searchQuery) ||
        item.nama.toLowerCase().includes(searchQuery) ||
        item.nama_toko.toLowerCase().includes(searchQuery) ||
        item.kode_toko.toLowerCase().includes(searchQuery) ||
        item.email_pintar.toLowerCase().includes(searchQuery) ||
        item.wa.toLowerCase().includes(searchQuery)
    );
  }

  const total = list.length;
  const totalPages = Math.ceil(total / pageLimit);
  const offset = (pageNum - 1) * pageLimit;
  const paginated = list.slice(offset, offset + pageLimit);

  return res.json({
    data: paginated,
    pagination: {
      total,
      page: pageNum,
      limit: pageLimit,
      totalPages,
    },
  });
});

// 15. Force Sync Trigger
app.post('/api/admin/sync', authMiddleware, async (req: Request, res: Response) => {
  const result = await syncFromGoogleSheets();
  return res.json({
    ...result,
    lastSyncedAt: db.lastSyncedAt,
  });
});

// 16. Webhook Config
app.post('/api/admin/config-webhook', authMiddleware, (req: Request, res: Response) => {
  const { webhookUrl } = req.body;
  db.webhookUrl = typeof webhookUrl === 'string' && webhookUrl.trim() ? webhookUrl.trim() : PERMANENT_APPS_SCRIPT_URL;
  persistDb();
  return res.json({ success: true, webhookUrl: db.webhookUrl });
});

app.get('/api/admin/config-webhook', authMiddleware, (req: Request, res: Response) => {
  return res.json({ webhookUrl: db.webhookUrl || PERMANENT_APPS_SCRIPT_URL });
});

// 17. Export CSV Akun Pintar
app.get('/api/admin/export-csv', authMiddleware, (req: Request, res: Response) => {
  const users = Object.values(db.users);
  let csv = '"nik","nama","Jabatan","wa","email_pintar","password_pintar"\n';

  for (const u of users) {
    const a = db.akunPintar[u.nik];
    const nik = u.nik.replace(/"/g, '""');
    const nama = (u.nama || '').replace(/"/g, '""');
    const jab = (u.jabatan || '').replace(/"/g, '""');
    const wa = (a?.wa || u.wa || '').replace(/"/g, '""');
    const email = (a?.email_pintar || '').replace(/"/g, '""');
    const pass = (a?.password_pintar || '').replace(/"/g, '""');
    csv += `"${nik}","${nama}","${jab}","${wa}","${email}","${pass}"\n`;
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="AkunPintar_TC_Surabaya_${Date.now()}.csv"`);
  return res.send(csv);
});

// Mount Vite in dev mode or serve static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Portal TC Surabaya Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
