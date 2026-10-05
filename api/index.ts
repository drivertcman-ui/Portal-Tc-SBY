import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const app = express();
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  'portal-tc-surabaya-hmac-jwt-secret-session-key-2026-production';
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Normalize request URL for serverless/Vercel environments
app.use((req: Request, _res: Response, next) => {
  if (
    !req.url.startsWith('/api') &&
    (req.url.startsWith('/auth') ||
      req.url.startsWith('/user') ||
      req.url.startsWith('/admin') ||
      req.url.startsWith('/trainings') ||
      req.url.startsWith('/undangan') ||
      req.url.startsWith('/sync') ||
      req.url.startsWith('/supabase') ||
      req.url.startsWith('/health'))
  ) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

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
  nama_as?: string;
  nama_am?: string;
  wilayah: string;
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

export interface AkunPintarRecord {
  nik: string;
  nama: string;
  jabatan: string;
  wa: string;
  email_pintar: string;
  password_pintar: string;
  updated_at?: string;
  synced_to_supabase?: boolean;
}

export interface AbsensiRecord {
  id: string;
  tanggal: string;
  nik: string;
  nama: string;
  kode_toko: string;
  nama_toko: string;
  jenis_training: string;
  cabang?: string;
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
    absensi: SupabaseSourceConfig;
  };
}

interface DatabaseState {
  users: Record<string, UserRecord>;
  stores: Record<string, StoreRecord>;
  trainings: TrainingRecord[];
  undangan: UndanganRecord[];
  akunPintar: Record<string, AkunPintarRecord>;
  absensi: Record<string, AbsensiRecord>;
  sessions: Record<string, { nik: string; role: string; expires: number }>;
  lastSyncedAt: string;
  adminPassword?: string;
  supabaseConfig: SupabaseConfigState;
}

const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel ? path.resolve('/tmp', 'data') : path.resolve(process.cwd(), 'data');
const DATA_FILE = path.resolve(DATA_DIR, 'tc_database.json');
const BUNDLED_DATA_FILE = path.resolve(process.cwd(), 'data', 'tc_database.json');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch {
  // Ignored on read-only serverless platforms
}

const DEFAULT_SUPABASE_CONFIG: SupabaseConfigState = {
  masterUrl: process.env.SUPABASE_URL || '',
  masterAnonKey: process.env.SUPABASE_ANON_KEY || '',
  sources: {
    users: {
      name: 'Data Karyawan (Users)',
      url: '',
      anonKey: '',
      tableName: 'users',
      status: 'idle',
    },
    stores: {
      name: 'Data Toko (Stores)',
      url: '',
      anonKey: '',
      tableName: 'stores',
      status: 'idle',
    },
    trainings: {
      name: 'Data Jadwal Pelatihan (Trainings / Schedules)',
      url: '',
      anonKey: '',
      tableName: 'training_schedules',
      status: 'idle',
    },
    akunPintar: {
      name: 'Data Akun Pintar (data_pintar)',
      url: process.env.SUPABASE_PINTAR_URL || 'https://ycpatnbsqlqtsegmmlxv.supabase.co',
      anonKey: process.env.SUPABASE_PINTAR_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljcGF0bmJzcWxxdHNlZ21tbHh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMTA4NDQsImV4cCI6MjEwNjY4Njg0NH0.YU9uf7bFlDOFGA32SSa6GIWurPKq4Ms2PPeDvNNMmU8',
      tableName: 'data_pintar',
      status: 'success',
    },
    undangan: {
      name: 'Data Agenda Undangan Training (Undangans)',
      url: '',
      anonKey: '',
      tableName: 'undangans',
      status: 'idle',
    },
    absensi: {
      name: 'Data Absensi Kehadiran Training (data_absensi)',
      url: process.env.SUPABASE_ABSENSI_URL || 'https://ycpatnbsqlqtsegmmlxv.supabase.co',
      anonKey: process.env.SUPABASE_ABSENSI_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljcGF0bmJzcWxxdHNlZ21tbHh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMTA4NDQsImV4cCI6MjEwNjY4Njg0NH0.YU9uf7bFlDOFGA32SSa6GIWurPKq4Ms2PPeDvNNMmU8',
      tableName: 'data_absensi',
      status: 'success',
    },
  },
};

// In-Memory Database with persistent storage
const db: DatabaseState = {
  users: {},
  stores: {},
  trainings: [],
  undangan: [],
  akunPintar: {},
  absensi: {},
  sessions: {},
  lastSyncedAt: '',
  adminPassword: '',
  supabaseConfig: DEFAULT_SUPABASE_CONFIG,
};

// Load saved local data if available (supports pre-bundled file or /tmp cache)
const fileToLoad = fs.existsSync(DATA_FILE)
  ? DATA_FILE
  : (fs.existsSync(BUNDLED_DATA_FILE) ? BUNDLED_DATA_FILE : null);

if (fileToLoad) {
  try {
    const raw = fs.readFileSync(fileToLoad, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.users) db.users = parsed.users;
    if (parsed.stores) db.stores = parsed.stores;
    if (parsed.trainings) db.trainings = parsed.trainings;
    if (parsed.undangan) db.undangan = parsed.undangan;
    if (parsed.akunPintar) db.akunPintar = parsed.akunPintar;
    if (parsed.absensi) db.absensi = parsed.absensi;
    if (parsed.sessions) db.sessions = parsed.sessions;
    if (parsed.lastSyncedAt) db.lastSyncedAt = parsed.lastSyncedAt;
    if (parsed.adminPassword) db.adminPassword = parsed.adminPassword;
    if (parsed.supabaseConfig) {
      db.supabaseConfig = {
        masterUrl: parsed.supabaseConfig.masterUrl || '',
        masterAnonKey: parsed.supabaseConfig.masterAnonKey || '',
        sources: {
          users: { ...DEFAULT_SUPABASE_CONFIG.sources.users, ...(parsed.supabaseConfig.sources?.users || {}) },
          stores: { ...DEFAULT_SUPABASE_CONFIG.sources.stores, ...(parsed.supabaseConfig.sources?.stores || {}) },
          trainings: { ...DEFAULT_SUPABASE_CONFIG.sources.trainings, ...(parsed.supabaseConfig.sources?.trainings || {}) },
          akunPintar: { ...DEFAULT_SUPABASE_CONFIG.sources.akunPintar, ...(parsed.supabaseConfig.sources?.akunPintar || {}) },
          undangan: { ...DEFAULT_SUPABASE_CONFIG.sources.undangan, ...(parsed.supabaseConfig.sources?.undangan || {}) },
          absensi: { ...DEFAULT_SUPABASE_CONFIG.sources.absensi, ...(parsed.supabaseConfig.sources?.absensi || {}) },
        },
      };
    }
  } catch (err) {
    console.error('Error reading local db file:', err);
  }
}

let lastPersistedHash = '';
function persistDb(force = false) {
  try {
    const currentHash = JSON.stringify({
      u: db.users,
      s: db.stores,
      t: db.trainings,
      un: db.undangan,
      ap: db.akunPintar,
      ab: db.absensi,
      pw: db.adminPassword,
      sc: db.supabaseConfig,
    });
    if (!force && currentHash === lastPersistedHash) {
      return;
    }
    lastPersistedHash = currentHash;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
    } catch {
      // On read-only serverless platforms
    }
  } catch (err) {
    console.error('Failed to persist db:', err);
  }
}

function clean(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str).replace(/^["']|["']$/g, '').trim();
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

// -------------------------------------------------------------
// DATE NORMALIZATION, PARSING & CLEANING UTILITIES
// -------------------------------------------------------------

const MONTH_NAMES_MAP: Record<string, number> = {
  januari: 1, jan: 1, januarii: 1,
  februari: 2, feb: 2,
  maret: 3, mar: 3,
  april: 4, apr: 4,
  mei: 5, may: 5,
  juni: 6, jun: 6,
  juli: 7, jul: 7,
  agustus: 8, agu: 8, ags: 8,
  september: 9, sep: 9,
  oktober: 10, okt: 10,
  november: 11, nov: 11,
  desember: 12, des: 12,
};

function normalizeDateStr(str: string): string {
  if (!str) return '';
  const s = str.replace(/^["']|["']$/g, '').trim().toLowerCase();
  return s.replace(/^0(\d)\s+/, '$1 ').replace(/\s+/g, ' ');
}

function normalizeJenisStr(str: string): string {
  if (!str) return '';
  return str.replace(/^["']|["']$/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseDateDays(str: string): string[] {
  if (!str) return [];
  const s = String(str).toLowerCase().trim();
  const dates: string[] = [];

  // Match DD-MM-YYYY patterns like "01-10-2026, 02-10-2026"
  const dmyMatches = [...s.matchAll(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/g)];
  if (dmyMatches.length > 0) {
    for (const m of dmyMatches) {
      dates.push(`${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`);
    }
  }

  // Match YYYY-MM-DD patterns like "2026-01-01"
  const ymdMatches = [...s.matchAll(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/g)];
  if (ymdMatches.length > 0) {
    for (const m of ymdMatches) {
      dates.push(`${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`);
    }
  }

  // Match Excel serial number e.g. 46302
  const excelMatch = s.match(/\b(4\d{4})\b/);
  if (excelMatch) {
    const serial = parseInt(excelMatch[1], 10);
    const d = new Date((serial - 25569) * 86400 * 1000);
    const day = String(d.getUTCDate()).padStart(2, '0');
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const y = d.getUTCFullYear();
    dates.push(`${y}-${m}-${day}`);
  }

  // Match Indonesian month names like "01 - 02 OKTOBER 2026" or "12 OKTOBER 2026"
  let foundMonth = 0;
  for (const [mName, mNum] of Object.entries(MONTH_NAMES_MAP)) {
    if (s.includes(mName)) {
      foundMonth = mNum;
      break;
    }
  }

  const yearMatch = s.match(/\b(20\d\d)\b/);
  const year = yearMatch ? yearMatch[1] : '2026';

  if (foundMonth > 0) {
    const dayMatches = [...s.matchAll(/\b(\d{1,2})\b/g)]
      .map(m => parseInt(m[1], 10))
      .filter(d => d >= 1 && d <= 31 && d !== 20 && d !== 26);
    for (const d of dayMatches) {
      dates.push(`${year}-${String(foundMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
  }

  return [...new Set(dates)];
}

function areDatesEquivalent(dateA: string, dateB: string): boolean {
  if (!dateA || !dateB) return false;
  if (dateA.trim().toLowerCase() === dateB.trim().toLowerCase()) return true;

  const parsedA = parseDateDays(dateA);
  const parsedB = parseDateDays(dateB);

  if (parsedA.length > 0 && parsedB.length > 0) {
    return parsedA.some(dA => parsedB.includes(dA));
  }
  return false;
}

function formatCleanDateString(rawStr: string): string {
  if (!rawStr) return '';
  const s = String(rawStr).trim();
  if (/^\d{2}-\d{2}-\d{4}(,\s*\d{2}-\d{2}-\d{4})*$/.test(s)) {
    return s;
  }
  const parsed = parseDateDays(s);
  if (parsed.length > 0) {
    const sorted = [...parsed].sort();
    return sorted
      .map(ymd => {
        const [y, m, d] = ymd.split('-');
        return `${d}-${m}-${y}`;
      })
      .join(', ');
  }
  return s;
}

function extractCleanDatesFromRow(row: any, fallbackDate = ''): string {
  // 1. Try tanggal_h1..tanggal_h10
  const hDates: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const val = row[`tanggal_h${i}`] || row[`TANGGAL_H${i}`];
    if (val && typeof val === 'string' && val.trim().length > 0) {
      const parts = val.trim().split(/[-/]/);
      if (parts.length === 3) {
        let d = '';
        let m = '';
        let y = '';
        if (parts[0].length === 4) {
          y = parts[0];
          m = parts[1].padStart(2, '0');
          d = parts[2].padStart(2, '0');
        } else {
          const p0 = parseInt(parts[0], 10);
          const p1 = parseInt(parts[1], 10);
          y = parts[2].length === 2 ? '20' + parts[2] : parts[2];
          if (p0 <= 12 && p1 <= 31) {
            m = String(p0).padStart(2, '0');
            d = String(p1).padStart(2, '0');
          } else {
            d = String(p0).padStart(2, '0');
            m = String(p1).padStart(2, '0');
          }
        }
        if (d && m && y) {
          const formatted = `${d}-${m}-${y}`;
          if (!hDates.includes(formatted)) hDates.push(formatted);
        }
      }
    }
  }

  if (hDates.length > 0) {
    return hDates.join(', ');
  }

  // 2. Direct columns
  const directDate = getRecordValue(row, [
    'jadwal_pelaksanaan',
    'JADWAL PELAKSANAAN',
    'tanggal',
    'TANGGAL',
    'tanggal_pelaksanaan',
    'tanggal_awal',
    'date',
    'pelaksanaan',
    'jadwal',
    'waktu_pelaksanaan'
  ]) || fallbackDate;

  return formatCleanDateString(directDate);
}

// -------------------------------------------------------------
// SUPABASE CLIENT & SYNC ENGINE
// -------------------------------------------------------------

const TABLE_FALLBACKS: Record<string, string[]> = {
  undangan: ['undangans', 'undangan', 'training_schedules', 'agenda_undangan', 'undangan_training', 'sheet_undangans'],
  trainings: ['training_schedules', 'undangans', 'trainings', 'training_schedule', 'jadwal_training', 'sheet_training'],
  stores: ['stores', 'toko', 'store', 'master_toko'],
  users: ['users', 'karyawan', 'user', 'master_karyawan'],
  akunPintar: ['data_pintar', 'akun_pintar', 'akunpintar', 'data_akun_pintar'],
  absensi: ['data_absensi', 'absensi', 'attendance', 'log_absensi', 'data_absensis'],
};

function getEffectiveSupabaseCredentials(sourceKey: keyof SupabaseConfigState['sources']) {
  const config = db.supabaseConfig.sources[sourceKey] || DEFAULT_SUPABASE_CONFIG.sources[sourceKey];
  let url = (config.url && config.url.trim()) ? config.url.trim() : (db.supabaseConfig.masterUrl || '').trim();
  let anonKey = (config.anonKey && config.anonKey.trim()) ? config.anonKey.trim() : (db.supabaseConfig.masterAnonKey || '').trim();
  let tableName = (config.tableName && config.tableName.trim()) ? config.tableName.trim() : DEFAULT_SUPABASE_CONFIG.sources[sourceKey].tableName;

  // Cross-fallback between trainings and undangan if one has credentials and the other doesn't
  if (!url || !anonKey) {
    if (sourceKey === 'trainings' && db.supabaseConfig.sources.undangan?.url) {
      url = url || (db.supabaseConfig.sources.undangan.url || '').trim();
      anonKey = anonKey || (db.supabaseConfig.sources.undangan.anonKey || '').trim();
    } else if (sourceKey === 'undangan' && db.supabaseConfig.sources.trainings?.url) {
      url = url || (db.supabaseConfig.sources.trainings.url || '').trim();
      anonKey = anonKey || (db.supabaseConfig.sources.trainings.anonKey || '').trim();
    }
  }

  return { url, anonKey, tableName };
}

// Push / Upsert data changes to Supabase with fallback table names support
async function pushToSupabase(
  sourceKey: 'akunPintar' | 'absensi',
  data: any,
  action: 'UPSERT' | 'DELETE' | 'DELETE_ALL' = 'UPSERT'
) {
  const { url, anonKey, tableName } = getEffectiveSupabaseCredentials(sourceKey);
  if (!url || !anonKey) {
    return; // Silently skip if Supabase credentials not yet configured
  }

  const cleanUrl = url.trim().replace(/\/+$/, '');
  const fallbacks = [tableName, ...(TABLE_FALLBACKS[sourceKey] || []).filter(t => t.toLowerCase() !== tableName.toLowerCase())];

  for (const tableToUse of fallbacks) {
    try {
      const endpoint = cleanUrl.includes('/rest/v1/') ? cleanUrl : `${cleanUrl}/rest/v1/${tableToUse}`;

      if (action === 'UPSERT') {
        const onConflictParam = sourceKey === 'akunPintar' ? '?on_conflict=nik' : sourceKey === 'absensi' ? '?on_conflict=id' : '';
        const targetEndpoint = endpoint.includes('?') ? `${endpoint}&${onConflictParam.slice(1)}` : `${endpoint}${onConflictParam}`;

        const res = await fetch(targetEndpoint, {
          method: 'POST',
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=representation',
          },
          body: JSON.stringify(Array.isArray(data) ? data : [data]),
        });

        if (res.status === 404) {
          // Try next fallback table name
          continue;
        }

        // If merge-duplicates returned 400 or 409 (e.g. if table lacks unique constraint on nik), fallback to PATCH:
        if (!res.ok && sourceKey === 'akunPintar' && data?.nik) {
          const patchUrl = `${endpoint}?nik=eq.${encodeURIComponent(data.nik)}`;
          const patchRes = await fetch(patchUrl, {
            method: 'PATCH',
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${anonKey}`,
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
            },
            body: JSON.stringify(data),
          });
          if (!patchRes.ok) {
            // If PATCH failed because row does not exist yet, do standard insert
            await fetch(endpoint, {
              method: 'POST',
              headers: {
                apikey: anonKey,
                Authorization: `Bearer ${anonKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(Array.isArray(data) ? data : [data]),
            });
          }
        }

        // If succeeded, update db source tableName if it changed
        if (res.ok && tableToUse !== db.supabaseConfig.sources[sourceKey].tableName) {
          db.supabaseConfig.sources[sourceKey].tableName = tableToUse;
        }
        return;
      } else if (action === 'DELETE') {
        const filterStr = data?.id ? `id=eq.${encodeURIComponent(data.id)}` : data?.nik ? `nik=eq.${encodeURIComponent(data.nik)}` : '';
        if (filterStr) {
          const deleteUrl = `${endpoint}?${filterStr}`;
          const res = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${anonKey}`,
            },
          });
          if (res.status === 404) continue;
          return;
        }
      } else if (action === 'DELETE_ALL') {
        const deleteUrl = `${endpoint}?or=(nik.neq.placeholder,id.neq.placeholder,waktu_absen.neq.placeholder)`;
        const res = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
        });
        if (res.status === 404) continue;
        return;
      }
    } catch (err) {
      console.warn(`⚠️ Supabase push attempt error for ${tableToUse}:`, err);
    }
  }
}

function buildSupabaseEndpoint(url: string, tableName: string): string {
  let cleanUrl = url.trim().replace(/\/+$/, '');
  if (cleanUrl.includes('/rest/v1/')) {
    if (cleanUrl.includes('?')) {
      return cleanUrl;
    }
    return `${cleanUrl}?select=*`;
  }
  return `${cleanUrl}/rest/v1/${tableName}?select=*`;
}

function getRecordValue(row: Record<string, any>, possibleKeys: string[]): string {
  for (const k of possibleKeys) {
    if (row[k] !== undefined && row[k] !== null) {
      return clean(row[k]);
    }
    // Check case-insensitive
    const lowerK = k.toLowerCase();
    for (const actualKey of Object.keys(row)) {
      if (actualKey.toLowerCase() === lowerK) {
        return clean(row[actualKey]);
      }
    }
  }
  return '';
}

// Fetch up to all rows from Supabase with pagination & fallback tables support
async function fetchAllFromSupabaseEndpoint(
  baseUrl: string,
  tableName: string,
  anonKey: string,
  fallbackTables: string[] = []
): Promise<{ rows: any[]; resolvedTable: string }> {
  const tablesToTry = [tableName, ...fallbackTables.filter(t => t.toLowerCase() !== tableName.toLowerCase())];
  let lastError: Error | null = null;

  for (let tIdx = 0; tIdx < tablesToTry.length; tIdx++) {
    const currentTable = tablesToTry[tIdx];
    try {
      const PAGE_SIZE = 1000;
      let allRows: any[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const endpoint = buildSupabaseEndpoint(baseUrl, currentTable);
        const hasQuery = endpoint.includes('?');
        const pageUrl = `${endpoint}${hasQuery ? '&' : '?'}limit=${PAGE_SIZE}&offset=${offset}`;

        const res = await fetch(pageUrl, {
          method: 'GET',
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
            Accept: 'application/json',
          },
        });

        if (!res.ok) {
          const errText = await res.text();
          let parsedErr = errText;
          try {
            const jsonErr = JSON.parse(errText);
            parsedErr = jsonErr.message || jsonErr.error || errText;
          } catch {}

          if (res.status === 404 && tIdx < tablesToTry.length - 1) {
            throw new Error(`TABLE_NOT_FOUND: ${parsedErr}`);
          }
          throw new Error(`HTTP ${res.status}: ${parsedErr}`);
        }

        const rows = await res.json();
        if (!Array.isArray(rows)) {
          throw new Error('Format data Supabase bukan array JSON.');
        }

        allRows = allRows.concat(rows);

        if (rows.length < PAGE_SIZE || allRows.length >= 25000) {
          hasMore = false;
        } else {
          offset += PAGE_SIZE;
        }
      }

      return { rows: allRows, resolvedTable: currentTable };
    } catch (err: any) {
      lastError = err;
      if (err.message && err.message.startsWith('TABLE_NOT_FOUND') && tIdx < tablesToTry.length - 1) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error(`Gagal membaca tabel "${tableName}" di Supabase.`);
}

// Single Source Importer from Supabase
export async function importSourceFromSupabase(sourceKey: keyof SupabaseConfigState['sources']): Promise<{
  success: boolean;
  count: number;
  source: string;
  error?: string;
}> {
  const { url, anonKey, tableName } = getEffectiveSupabaseCredentials(sourceKey);

  if (!url || !anonKey) {
    const msg = `URL atau Anon Key Supabase untuk "${db.supabaseConfig.sources[sourceKey]?.name || sourceKey}" belum diisi.`;
    db.supabaseConfig.sources[sourceKey].status = 'error';
    db.supabaseConfig.sources[sourceKey].error = msg;
    persistDb();
    return { success: false, count: 0, source: sourceKey, error: msg };
  }

  try {
    const fallbacks = TABLE_FALLBACKS[sourceKey] || [];
    const { rows: rawRows, resolvedTable } = await fetchAllFromSupabaseEndpoint(url, tableName, anonKey, fallbacks);

    if (resolvedTable !== tableName) {
      db.supabaseConfig.sources[sourceKey].tableName = resolvedTable;
    }

    // If Supabase returned 0 rows
    if (rawRows.length === 0) {
      if (sourceKey === 'akunPintar') {
        db.akunPintar = {};
        db.supabaseConfig.sources.akunPintar.status = 'success';
        db.supabaseConfig.sources.akunPintar.error = undefined;
        db.supabaseConfig.sources.akunPintar.count = 0;
        db.supabaseConfig.sources.akunPintar.lastSyncedAt = new Date().toISOString();
        db.lastSyncedAt = new Date().toISOString();
        persistDb();
        return { success: true, count: 0, source: 'akunPintar' };
      }
      if (sourceKey === 'absensi') {
        db.absensi = {};
        db.supabaseConfig.sources.absensi.status = 'success';
        db.supabaseConfig.sources.absensi.error = undefined;
        db.supabaseConfig.sources.absensi.count = 0;
        db.supabaseConfig.sources.absensi.lastSyncedAt = new Date().toISOString();
        db.lastSyncedAt = new Date().toISOString();
        persistDb();
        return { success: true, count: 0, source: 'absensi' };
      }

      const msg = `Tabel "${resolvedTable}" mengembalikan 0 baris data (kosong). Jika tabel di Supabase sebenarnya ada isinya, kemungkinan besar diblokir oleh Row Level Security (RLS) untuk role 'anon'. Solusi: Gunakan Service Role Key pada kolom API Key, atau jalankan di SQL Editor Supabase: CREATE POLICY "${resolvedTable}_read_all" ON public.${resolvedTable} FOR SELECT TO anon, authenticated USING (true);`;
      db.supabaseConfig.sources[sourceKey].status = 'error';
      db.supabaseConfig.sources[sourceKey].error = msg;
      db.supabaseConfig.sources[sourceKey].count = 0;
      persistDb();
      return { success: false, count: 0, source: sourceKey, error: msg };
    }

    if (sourceKey === 'users') {
      const newUsers: Record<string, UserRecord> = {};
      for (const row of rawRows) {
        const nik = getRecordValue(row, ['nik', 'NIK', 'user_id', 'id']);
        if (!nik) continue;
        const nama = getRecordValue(row, ['nama', 'NAMA', 'nama_lengkap', 'name']);
        const jabatan = getRecordValue(row, ['jabatan', 'JABATAN', 'posisi', 'role_name']);
        const kode_toko = getRecordValue(row, ['kode_toko', 'KODE TOKO', 'kode', 'store_code']);
        const nama_toko = getRecordValue(row, ['nama_toko', 'NAMA TOKO', 'toko', 'store_name']) || db.stores[kode_toko]?.nama_toko || kode_toko;
        const wa = getRecordValue(row, ['wa', 'WA', 'no_wa', 'whatsapp', 'phone']);
        const role = getRecordValue(row, ['role', 'ROLE', 'user_role']) || 'user';

        newUsers[nik] = {
          nik,
          nama,
          jabatan,
          kode_toko,
          nama_toko,
          wa,
          role,
        };
      }

      const count = Object.keys(newUsers).length;
      if (count === 0 && rawRows.length > 0) {
        const sampleKeys = Object.keys(rawRows[0] || {}).join(', ');
        const msg = `Ditemukan ${rawRows.length} baris di Supabase, tetapi tidak ada kolom NIK yang cocok. Kolom yang terdeteksi: [${sampleKeys}]. Pastikan nama kolom primary key adalah 'nik'.`;
        db.supabaseConfig.sources.users.status = 'error';
        db.supabaseConfig.sources.users.error = msg;
        persistDb();
        return { success: false, count: 0, source: 'users', error: msg };
      }

      db.users = newUsers;
      db.supabaseConfig.sources.users.count = count;
      db.supabaseConfig.sources.users.status = 'success';
      db.supabaseConfig.sources.users.lastSyncedAt = new Date().toISOString();
      db.supabaseConfig.sources.users.error = undefined;
      db.lastSyncedAt = new Date().toISOString();
      persistDb();
      return { success: true, count, source: 'users' };
    }

    if (sourceKey === 'stores') {
      const newStores: Record<string, StoreRecord> = {};
      for (const row of rawRows) {
        const kode_toko = getRecordValue(row, ['kode_toko', 'kode', 'KODE TOKO', 'store_code', 'id']);
        if (!kode_toko) continue;
        const nama_toko = getRecordValue(row, ['nama_toko', 'nama', 'NAMA TOKO', 'store_name']) || kode_toko;
        const nama_as = getRecordValue(row, ['nama_as', 'as', 'AS', 'area_supervisor']);
        const nama_am = getRecordValue(row, ['nama_am', 'am', 'AM', 'area_manager']);
        const wilayah = getRecordValue(row, ['wilayah', 'cabang', 'branch', 'area', 'region']) || 'SBY';

        newStores[kode_toko] = {
          kode_toko,
          nama_toko,
          nama_as,
          nama_am,
          wilayah,
        };
      }

      const count = Object.keys(newStores).length;
      if (count === 0 && rawRows.length > 0) {
        const sampleKeys = Object.keys(rawRows[0] || {}).join(', ');
        const msg = `Ditemukan ${rawRows.length} baris di Supabase, tetapi kolom kode_toko tidak ditemukan. Kolom yang terdeteksi: [${sampleKeys}].`;
        db.supabaseConfig.sources.stores.status = 'error';
        db.supabaseConfig.sources.stores.error = msg;
        persistDb();
        return { success: false, count: 0, source: 'stores', error: msg };
      }

      db.stores = newStores;
      db.supabaseConfig.sources.stores.count = count;
      db.supabaseConfig.sources.stores.status = 'success';
      db.supabaseConfig.sources.stores.lastSyncedAt = new Date().toISOString();
      db.supabaseConfig.sources.stores.error = undefined;
      db.lastSyncedAt = new Date().toISOString();
      persistDb();
      return { success: true, count, source: 'stores' };
    }

    if (sourceKey === 'trainings') {
      const newTrainings: TrainingRecord[] = [];
      for (const row of rawRows) {
        const nik = getRecordValue(row, ['nik', 'NIK', 'user_id', 'id']);
        const tanggal_awal = extractCleanDatesFromRow(row) || getRecordValue(row, [
          'jadwal_pelaksanaan',
          'JADWAL PELAKSANAAN',
          'tanggal_awal',
          'tanggal',
          'TANGGAL',
          'date',
          'tanggal_training',
          'tanggal_h1',
          'pelaksanaan'
        ]);
        let jenis_training = getRecordValue(row, ['jenis_training', 'training', 'JENIS TRAINING', 'jenis', 'nama_training']);

        if (!nik || !tanggal_awal) continue;
        if (!jenis_training) {
          jenis_training = 'TRAINING PESERTA';
        }

        let nama = getRecordValue(row, ['nama', 'NAMA', 'nama_lengkap']);
        if (!nama) nama = db.users[nik]?.nama || '';

        let kode_toko = getRecordValue(row, ['kode_toko', 'KODE TOKO', 'kode', 'store_code']) || db.users[nik]?.kode_toko || '';
        let nama_toko =
          getRecordValue(row, ['unit_toko', 'UNIT TOKO', 'toko', 'nama_toko', 'NAMA TOKO', 'store_name', 'store']) ||
          db.stores[kode_toko]?.nama_toko ||
          db.users[nik]?.nama_toko ||
          kode_toko;

        if (!kode_toko && nama_toko) {
          const foundStore = Object.values(db.stores).find(
            s => s.nama_toko && s.nama_toko.trim().toLowerCase() === nama_toko.trim().toLowerCase()
          );
          if (foundStore) {
            kode_toko = foundStore.kode_toko;
          }
        }

        const cabang = getRecordValue(row, ['cabang', 'wilayah', 'branch', 'area']) || db.stores[kode_toko]?.wilayah || 'SBY';
        const asVal = getRecordValue(row, ['as_val', 'as', 'AS', 'area_supervisor', 'nama_as']) || db.stores[kode_toko]?.nama_as || '';
        const amVal = getRecordValue(row, ['am_val', 'am', 'AM', 'area_manager', 'nama_am']) || db.stores[kode_toko]?.nama_am || '';
        const batch = getRecordValue(row, ['batch', 'BATCH', 'gelombang']);
        const status = getRecordValue(row, ['status', 'STATUS', 'keterangan']);

        newTrainings.push({
          tanggal_awal,
          nik,
          nama,
          kode_toko,
          nama_toko,
          jenis_training,
          cabang,
          as: asVal,
          am: amVal,
          batch,
          status,
        });
      }
      db.trainings = newTrainings;
      const count = newTrainings.length;
      db.supabaseConfig.sources.trainings.count = count;
      db.supabaseConfig.sources.trainings.status = 'success';
      db.supabaseConfig.sources.trainings.lastSyncedAt = new Date().toISOString();
      db.supabaseConfig.sources.trainings.error = undefined;
      db.lastSyncedAt = new Date().toISOString();
      persistDb();
      return { success: true, count, source: 'trainings' };
    }

    if (sourceKey === 'akunPintar') {
      const newAkunPintar: Record<string, AkunPintarRecord> = {};
      for (const row of rawRows) {
        const nik = getRecordValue(row, ['nik', 'NIK']);
        if (!nik) continue;

        const nama = getRecordValue(row, ['nama', 'NAMA']) || db.users[nik]?.nama || '';
        const jabatan = getRecordValue(row, ['jabatan', 'JABATAN']) || db.users[nik]?.jabatan || '';
        const wa = getRecordValue(row, ['wa', 'WA', 'no_wa']);
        const email = getRecordValue(row, ['email_pintar', 'email', 'EMAIL PINTAR']);
        const password = getRecordValue(row, ['password_pintar', 'password', 'PASSWORD']);
        const updated_at = getRecordValue(row, ['updated_at', 'created_at']) || new Date().toISOString();

        if (email || password || wa) {
          newAkunPintar[nik] = {
            nik,
            nama,
            jabatan,
            wa,
            email_pintar: email,
            password_pintar: password,
            updated_at,
            synced_to_supabase: true,
          };
        }
      }
      db.akunPintar = newAkunPintar;
      const count = Object.keys(newAkunPintar).length;
      db.supabaseConfig.sources.akunPintar.count = count;
      db.supabaseConfig.sources.akunPintar.status = 'success';
      db.supabaseConfig.sources.akunPintar.lastSyncedAt = new Date().toISOString();
      db.supabaseConfig.sources.akunPintar.error = undefined;
      db.lastSyncedAt = new Date().toISOString();
      persistDb();
      return { success: true, count, source: 'akunPintar' };
    }

    if (sourceKey === 'undangan') {
      const newUndangan: UndanganRecord[] = [];
      for (const row of rawRows) {
        const nik = getRecordValue(row, ['nik', 'NIK', 'user_id', 'id']);
        if (!nik) continue;

        const nama = getRecordValue(row, ['nama', 'NAMA', 'nama_lengkap']) || db.users[nik]?.nama || '';
        const jabatan = getRecordValue(row, ['jabatan', 'JABATAN', 'posisi']) || db.users[nik]?.jabatan || '';
        let kode_toko = getRecordValue(row, ['kode_toko', 'KODE TOKO', 'kode', 'store_code']) || db.users[nik]?.kode_toko || '';
        let nama_toko =
          getRecordValue(row, ['unit_toko', 'UNIT TOKO', 'toko', 'nama_toko', 'NAMA TOKO', 'store_name', 'store']) ||
          db.stores[kode_toko]?.nama_toko ||
          db.users[nik]?.nama_toko ||
          kode_toko;

        if (!kode_toko && nama_toko) {
          const foundStore = Object.values(db.stores).find(
            s => s.nama_toko && s.nama_toko.trim().toLowerCase() === nama_toko.trim().toLowerCase()
          );
          if (foundStore) {
            kode_toko = foundStore.kode_toko;
          }
        }

        const existingTraining = db.trainings.find(t => t.nik === nik);
        const asVal = getRecordValue(row, ['as_val', 'as', 'AS', 'area_supervisor', 'nama_as']) ||
          db.stores[kode_toko]?.nama_as ||
          existingTraining?.as ||
          '';
        const amVal = getRecordValue(row, ['am_val', 'am', 'AM', 'area_manager', 'nama_am']) ||
          db.stores[kode_toko]?.nama_am ||
          existingTraining?.am ||
          '';

        const tanggal = extractCleanDatesFromRow(row, existingTraining?.tanggal_awal) ||
          existingTraining?.tanggal_awal ||
          getRecordValue(row, [
            'jadwal_pelaksanaan',
            'JADWAL PELAKSANAAN',
            'jadwal',
            'pelaksanaan',
            'tanggal_pelaksanaan',
            'tanggal_awal',
            'tanggal',
            'TANGGAL',
            'date',
            'tanggal_training',
            'tanggal_h1',
            'waktu_pelaksanaan'
          ]) || '';

        const jenis_training = getRecordValue(row, ['jenis_training', 'training', 'JENIS TRAINING', 'jenis', 'nama_training']) ||
          existingTraining?.jenis_training ||
          'TRAINING PESERTA';

        let sistem_training = getRecordValue(row, ['sistem', 'SISTEM', 'sistem_training', 'SISTEM TRAINING', 'metode']);
        if (!sistem_training) {
          const upperTgl = tanggal.toUpperCase();
          const upperStatus = String(row.status || '').toUpperCase();
          if (upperTgl.includes('STREAMING') || upperStatus.includes('STREAMING')) {
            sistem_training = 'STREAMING';
          } else if (upperTgl.includes('ONLINE') || upperStatus.includes('ONLINE') || upperTgl.includes('ZOOM') || upperTgl.includes('GMEET')) {
            sistem_training = 'ONLINE';
          } else {
            sistem_training = 'OFFLINE';
          }
        }
        const batch = getRecordValue(row, ['batch', 'BATCH', 'gelombang']) || existingTraining?.batch || '';
        const status = getRecordValue(row, ['status', 'STATUS', 'keterangan']) || existingTraining?.status || '';

        const cabang = getRecordValue(row, ['cabang', 'CABANG', 'wilayah', 'branch', 'area']) ||
          db.stores[kode_toko]?.wilayah ||
          existingTraining?.cabang ||
          'SBY';

        newUndangan.push({
          nik,
          nama,
          jabatan,
          kode_toko,
          nama_toko,
          as: asVal,
          am: amVal,
          cabang,
          tanggal,
          jenis_training,
          sistem_training,
          batch,
          status,
        });
      }
      db.undangan = newUndangan;
      const count = newUndangan.length;
      db.supabaseConfig.sources.undangan.count = count;
      db.supabaseConfig.sources.undangan.status = 'success';
      db.supabaseConfig.sources.undangan.lastSyncedAt = new Date().toISOString();
      db.supabaseConfig.sources.undangan.error = undefined;
      db.lastSyncedAt = new Date().toISOString();
      persistDb();
      return { success: true, count, source: 'undangan' };
    }

    if (sourceKey === 'absensi') {
      const newAbsensi: Record<string, AbsensiRecord> = {};
      for (const row of rawRows) {
        const nik = getRecordValue(row, ['nik', 'NIK']);
        const tanggal = getRecordValue(row, ['tanggal', 'TANGGAL']);
        const jenis_training = getRecordValue(row, ['jenis_training', 'jenis', 'JENIS TRAINING']);
        if (!nik || !tanggal || !jenis_training) continue;

        const id = getRecordValue(row, ['id', 'ID']) || `${nik}_${tanggal}_${jenis_training}`;
        const nama = getRecordValue(row, ['nama', 'NAMA']) || db.users[nik]?.nama || '';
        const kode_toko = getRecordValue(row, ['kode_toko', 'kode']) || db.users[nik]?.kode_toko || '';
        const nama_toko = getRecordValue(row, ['nama_toko', 'toko']) || db.stores[kode_toko]?.nama_toko || db.users[nik]?.nama_toko || kode_toko;
        const waktu = getRecordValue(row, ['waktu_absen', 'waktu_formatted', 'created_at']) || new Date().toISOString();
        const status = (getRecordValue(row, ['status']) as 'HADIR') || 'HADIR';

        newAbsensi[id] = {
          id,
          tanggal,
          nik,
          nama,
          kode_toko,
          nama_toko,
          jenis_training,
          waktu_absen: waktu,
          waktu_formatted: waktu,
          status: 'HADIR',
          synced_to_supabase: true,
        };
      }
      db.absensi = newAbsensi;
      const count = Object.keys(newAbsensi).length;
      db.supabaseConfig.sources.absensi.count = count;
      db.supabaseConfig.sources.absensi.status = 'success';
      db.supabaseConfig.sources.absensi.lastSyncedAt = new Date().toISOString();
      db.supabaseConfig.sources.absensi.error = undefined;
      db.lastSyncedAt = new Date().toISOString();
      persistDb();
      return { success: true, count, source: 'absensi' };
    }

    return { success: false, count: 0, source: sourceKey, error: 'Sumber data tidak dikenali.' };
  } catch (err: any) {
    console.error(`❌ Error importing ${sourceKey} from Supabase:`, err);
    db.supabaseConfig.sources[sourceKey].status = 'error';
    db.supabaseConfig.sources[sourceKey].error = err.message || 'Gagal terhubung ke Supabase';
    persistDb();
    return { success: false, count: 0, source: sourceKey, error: err.message };
  }
}

// Bulk Sync All Configured Supabase Sources
export async function syncAllFromSupabase(): Promise<{
  success: boolean;
  userCount: number;
  storeCount: number;
  trainingCount: number;
  pintarCount: number;
  undanganCount: number;
  absensiCount: number;
  lastSyncedAt: string;
  details: Record<string, { success: boolean; count: number; error?: string }>;
}> {
  const sources: (keyof SupabaseConfigState['sources'])[] = ['users', 'stores', 'trainings', 'akunPintar', 'undangan', 'absensi'];
  const details: Record<string, { success: boolean; count: number; error?: string }> = {};

  for (const src of sources) {
    const creds = getEffectiveSupabaseCredentials(src);
    if (creds.url && creds.anonKey) {
      details[src] = await importSourceFromSupabase(src);
    } else {
      details[src] = {
        success: false,
        count: src === 'users' ? Object.keys(db.users).length : (db as any)[src]?.length || Object.keys((db as any)[src] || {}).length,
        error: 'URL / Key belum dikonfigurasi',
      };
    }
  }

  db.lastSyncedAt = new Date().toISOString();
  persistDb();

  const anySuccess = Object.values(details).some(d => d.success);

  return {
    success: anySuccess,
    userCount: Object.keys(db.users).length,
    storeCount: Object.keys(db.stores).length,
    trainingCount: db.trainings.length,
    pintarCount: Object.keys(db.akunPintar).length,
    undanganCount: db.undangan.length,
    absensiCount: Object.keys(db.absensi).length,
    lastSyncedAt: db.lastSyncedAt,
    details,
  };
}

export async function ensureDbReady() {
  if (Object.keys(db.users).length > 0) return;
  // If no users loaded and supabase is configured, attempt import
  const creds = getEffectiveSupabaseCredentials('users');
  if (creds.url && creds.anonKey) {
    await syncAllFromSupabase().catch(() => {});
  }
}

// Middleware: Ensure database is ready before processing API routes
app.use(async (_req: Request, _res: Response, next) => {
  try {
    if (Object.keys(db.users).length === 0) {
      await ensureDbReady();
    }
  } catch (err) {
    console.error('ensureDbReady middleware error:', err);
  }
  next();
});

interface SessionData {
  nik: string;
  role: string;
  expires: number;
}

function createSession(nik: string, role: string): string {
  const cleanNik = clean(nik);
  const expires = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const payload = {
    nik: cleanNik,
    role,
    expires,
    iat: Date.now(),
    nonce: Math.random().toString(36).substring(2, 10),
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
  const token = `tc_${payloadB64}.${signature}`;

  db.sessions[token] = {
    nik: cleanNik,
    role,
    expires,
  };
  persistDb();

  return token;
}

function verifyAndGetSession(token: string): SessionData | null {
  if (!token || typeof token !== 'string') return null;

  // 1. Fast in-memory lookup
  const inMem = db.sessions[token];
  if (inMem && inMem.expires > Date.now()) {
    return inMem;
  }

  // 2. Cryptographic verification for stateless serverless containers (e.g. Vercel)
  if (token.startsWith('tc_') && token.includes('.')) {
    try {
      const dotIndex = token.indexOf('.');
      const payloadB64 = token.substring(3, dotIndex);
      const signature = token.substring(dotIndex + 1);

      const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');

      const sigBuf = Buffer.from(signature);
      const expBuf = Buffer.from(expectedSig);

      if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
        const rawJson = Buffer.from(payloadB64, 'base64url').toString('utf-8');
        const payload = JSON.parse(rawJson);

        if (payload && payload.nik && payload.role && typeof payload.expires === 'number') {
          if (payload.expires > Date.now()) {
            const sessionData: SessionData = {
              nik: String(payload.nik),
              role: String(payload.role),
              expires: payload.expires,
            };
            db.sessions[token] = sessionData;
            return sessionData;
          }
        }
      }
    } catch {
      // Invalid token
    }
  }

  return null;
}

function authMiddleware(req: Request, res: Response, next: () => void) {
  let token = '';
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.replace('Bearer ', '').trim();
  } else if (req.query.token) {
    token = String(req.query.token).trim();
  }

  if (!token) {
    return res.status(401).json({ error: 'Akses ditolak. Token otentikasi tidak ditemukan.', code: 'UNAUTHORIZED' });
  }

  const session = verifyAndGetSession(token);

  if (!session) {
    if (db.sessions[token]) {
      delete db.sessions[token];
      persistDb();
    }
    return res.status(401).json({ error: 'Sesi telah kedaluwarsa. Silakan login kembali.', code: 'SESSION_EXPIRED' });
  }

  (req as any).userSession = session;
  next();
}

// --- API ROUTES ---

app.get('/api/health', (_req: Request, res: Response) => {
  return res.json({ status: 'ok', time: new Date().toISOString(), databaseReady: Object.keys(db.users).length > 0 });
});

app.get('/api', (_req: Request, res: Response) => {
  return res.json({
    name: 'Portal TC Surabaya API (Supabase Integrated)',
    status: 'ready',
    time: new Date().toISOString(),
    totalUsers: Object.keys(db.users).length,
  });
});

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
      error: `NIK "${cleanNik}" tidak ditemukan di database karyawan. Pastikan NIK Anda sudah terdaftar atau hubungi Administrator TC Surabaya.`,
    });
  }

  const akunPintar = db.akunPintar[cleanNik] || {
    nik: user.nik,
    nama: user.nama,
    jabatan: user.jabatan,
    wa: user.wa || '',
    email_pintar: '',
    password_pintar: '',
  };

  const token = createSession(cleanNik, user.role || 'user');

  return res.json({
    token,
    user: {
      nik: user.nik,
      nama: user.nama,
      jabatan: user.jabatan,
      kode_toko: user.kode_toko,
      nama_toko: user.nama_toko,
      wa: user.wa,
      role: user.role,
    },
    akunPintar: {
      nik: akunPintar.nik,
      nama: akunPintar.nama,
      jabatan: akunPintar.jabatan,
      wa: akunPintar.wa,
      email_pintar: akunPintar.email_pintar,
      password_pintar: akunPintar.password_pintar || '',
      has_password: Boolean(akunPintar.password_pintar && akunPintar.password_pintar.length > 0),
      updated_at: akunPintar.updated_at,
      synced_to_supabase: akunPintar.synced_to_supabase,
    },
    lastSyncedAt: db.lastSyncedAt,
  });
});

// 2. Admin Login
app.post('/api/auth/login-admin', (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Kata sandi admin wajib diisi.' });
  }

  const inputPass = password.trim();
  let isValid = false;

  if (db.adminPassword && db.adminPassword.trim().length > 0) {
    // Only accept the currently active updated password
    isValid = inputPass === db.adminPassword.trim();
  } else {
    isValid =
      inputPass === 'admin123' ||
      inputPass === 'admin123456' ||
      inputPass === 'tc_surabaya_2026' ||
      inputPass === 'surabaya2026';
  }

  if (!isValid) {
    return res.status(401).json({ error: 'Kata sandi Administrator salah.' });
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
      wa: '08123456789',
      role: 'admin',
    },
  });
});

// 2b. Logout Endpoint
app.post('/api/auth/logout', authMiddleware, (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    if (db.sessions[token]) {
      delete db.sessions[token];
      persistDb();
    }
  }
  return res.json({ success: true, message: 'Berhasil keluar.' });
});

// 3. Get Current Logged-in User
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
        wa: '08123456789',
        role: 'admin',
      },
    });
  }

  const cleanNik = clean(session.nik);
  const user = db.users[cleanNik] || Object.values(db.users).find(u => u.nik.toLowerCase() === cleanNik.toLowerCase());

  if (!user) {
    return res.status(404).json({ error: 'Data user tidak ditemukan di database.' });
  }

  const akunPintar = db.akunPintar[user.nik] || {
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
      role: user.role,
    },
    akunPintar: {
      nik: akunPintar.nik,
      nama: akunPintar.nama,
      jabatan: akunPintar.jabatan,
      wa: akunPintar.wa,
      email_pintar: akunPintar.email_pintar,
      password_pintar: akunPintar.password_pintar || '',
      has_password: Boolean(akunPintar.password_pintar && akunPintar.password_pintar.length > 0),
      updated_at: akunPintar.updated_at,
      synced_to_supabase: akunPintar.synced_to_supabase,
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
    synced_to_supabase: true,
  };

  db.akunPintar[user.nik] = updatedRecord;

  if (db.users[user.nik]) {
    db.users[user.nik].wa = cleanWa;
  }

  persistDb();

  // Push directly to Supabase table
  await pushToSupabase('akunPintar', {
    nik: updatedRecord.nik,
    nama: updatedRecord.nama,
    jabatan: updatedRecord.jabatan,
    wa: updatedRecord.wa,
    email_pintar: updatedRecord.email_pintar,
    password_pintar: updatedRecord.password_pintar,
    updated_at: updatedRecord.updated_at,
  }, 'UPSERT');

  return res.json({
    success: true,
    message: 'Data Akun Pintar berhasil disimpan dan disinkronkan ke database Supabase!',
    record: updatedRecord,
  });
});

// ==========================================
// MENU ABSENSI KEHADIRAN TRAINING
// ==========================================

// Helper to gather all training schedules of a user across db.undangan and db.trainings
function getUserAllSchedules(nik: string): Array<{
  tanggal: string;
  nik: string;
  nama: string;
  kode_toko: string;
  nama_toko: string;
  jenis_training: string;
  cabang: string;
  already_attended: boolean;
  absensi: any;
}> {
  const userNik = nik.trim().toLowerCase();
  const schedules: any[] = [];
  const seenKeys = new Set<string>();

  // 1. From db.undangan (clean format e.g. "01-10-2026, 02-10-2026")
  for (const u of db.undangan) {
    if (u.nik.trim().toLowerCase() === userNik) {
      const key = `${u.tanggal}_${u.jenis_training}`.toLowerCase();
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        const absKey = `${u.nik}_${u.tanggal}_${u.jenis_training}`;
        const abs = db.absensi[absKey] || Object.values(db.absensi).find(
          a => a.nik.toLowerCase() === userNik &&
               normalizeJenisStr(a.jenis_training) === normalizeJenisStr(u.jenis_training) &&
               (a.tanggal === u.tanggal || areDatesEquivalent(a.tanggal, u.tanggal))
        ) || null;

        schedules.push({
          tanggal: u.tanggal,
          nik: u.nik,
          nama: u.nama || db.users[nik]?.nama || '',
          kode_toko: u.kode_toko || db.users[nik]?.kode_toko || '',
          nama_toko: u.nama_toko || db.users[nik]?.nama_toko || '',
          jenis_training: u.jenis_training,
          cabang: 'SBY',
          already_attended: Boolean(abs),
          absensi: abs,
        });
      }
    }
  }

  // 2. From db.trainings (if not already represented)
  for (const t of db.trainings) {
    if (t.nik.trim().toLowerCase() === userNik) {
      const alreadyCovered = schedules.some(
        s => normalizeJenisStr(s.jenis_training) === normalizeJenisStr(t.jenis_training) &&
             (s.tanggal === t.tanggal_awal || areDatesEquivalent(s.tanggal, t.tanggal_awal))
      );
      if (!alreadyCovered) {
        const absKey = `${t.nik}_${t.tanggal_awal}_${t.jenis_training}`;
        const abs = db.absensi[absKey] || null;
        schedules.push({
          tanggal: t.tanggal_awal,
          nik: t.nik,
          nama: t.nama || db.users[nik]?.nama || '',
          kode_toko: t.kode_toko || db.users[nik]?.kode_toko || '',
          nama_toko: t.nama_toko || db.users[nik]?.nama_toko || '',
          jenis_training: t.jenis_training,
          cabang: t.cabang || 'SBY',
          already_attended: Boolean(abs),
          absensi: abs,
        });
      }
    }
  }

  return schedules;
}

// Helper to check if a user is registered for a specific date and training type
function findUserScheduleMatch(
  nik: string,
  targetDate: string,
  targetJenis: string
): { matched: boolean; schedule: any } {
  const userNik = nik.trim().toLowerCase();
  const normJenis = normalizeJenisStr(targetJenis);
  const normDate = normalizeDateStr(targetDate);

  // 1. Check in db.undangan
  for (const u of db.undangan) {
    if (u.nik.trim().toLowerCase() === userNik) {
      if (normalizeJenisStr(u.jenis_training) === normJenis) {
        if (
          normalizeDateStr(u.tanggal) === normDate ||
          areDatesEquivalent(u.tanggal, targetDate)
        ) {
          return {
            matched: true,
            schedule: {
              tanggal_awal: u.tanggal,
              nik: u.nik,
              nama: u.nama,
              kode_toko: u.kode_toko,
              nama_toko: u.nama_toko,
              jenis_training: u.jenis_training,
              cabang: 'SBY',
              as: u.as,
              am: u.am,
              batch: u.batch,
              status: u.status,
            },
          };
        }
      }
    }
  }

  // 2. Check in db.trainings
  for (const t of db.trainings) {
    if (t.nik.trim().toLowerCase() === userNik) {
      if (normalizeJenisStr(t.jenis_training) === normJenis) {
        if (
          normalizeDateStr(t.tanggal_awal) === normDate ||
          areDatesEquivalent(t.tanggal_awal, targetDate)
        ) {
          return { matched: true, schedule: t };
        }
      }
    }
  }

  return { matched: false, schedule: null };
}

// 5. Get Available Training Dates & Training Types
app.get('/api/trainings/schedule', (_req: Request, res: Response) => {
  const dateMap: Record<
    string,
    Record<string, { total_peserta: number; total_hadir: number }>
  > = {};
  const branchSet = new Set<string>();

  // 1. Populate from db.undangan (clean format e.g. "01-10-2026, 02-10-2026")
  for (const u of db.undangan) {
    const tgl = u.tanggal || 'Tanpa Tanggal';
    const jenis = u.jenis_training || 'Umum';
    branchSet.add('SBY');

    if (!dateMap[tgl]) {
      dateMap[tgl] = {};
    }
    if (!dateMap[tgl][jenis]) {
      dateMap[tgl][jenis] = { total_peserta: 0, total_hadir: 0 };
    }
    dateMap[tgl][jenis].total_peserta++;
  }

  // 2. If dateMap is empty or distinct dates exist in db.trainings, include them
  for (const t of db.trainings) {
    const tgl = t.tanggal_awal || 'Tanpa Tanggal';
    const jenis = t.jenis_training || 'Umum';
    if (t.cabang) branchSet.add(t.cabang.trim());

    const existingKey = Object.keys(dateMap).find(k => k === tgl || areDatesEquivalent(k, tgl));
    if (!existingKey) {
      if (!dateMap[tgl]) {
        dateMap[tgl] = {};
      }
      if (!dateMap[tgl][jenis]) {
        dateMap[tgl][jenis] = { total_peserta: 0, total_hadir: 0 };
      }
      dateMap[tgl][jenis].total_peserta++;
    }
  }

  // Count attendance from db.absensi
  for (const abs of Object.values(db.absensi)) {
    const tgl = abs.tanggal;
    const jenis = abs.jenis_training;
    const matchingDateKey = Object.keys(dateMap).find(k => k === tgl || areDatesEquivalent(k, tgl)) || tgl;
    if (dateMap[matchingDateKey] && dateMap[matchingDateKey][jenis]) {
      dateMap[matchingDateKey][jenis].total_hadir++;
    }
    if (abs.cabang) branchSet.add(abs.cabang.trim());
  }

  const result: TrainingDateOption[] = Object.entries(dateMap).map(([tanggal, jenisObj]) => {
    const jenis_list = Object.entries(jenisObj).map(([jenis_training, counts]) => ({
      jenis_training,
      total_peserta: counts.total_peserta,
      total_hadir: counts.total_hadir,
    }));
    const total_peserta = jenis_list.reduce((acc, curr) => acc + curr.total_peserta, 0);

    return {
      tanggal,
      total_peserta,
      jenis_list,
    };
  });

  // Sort chronologically by the earliest date in each schedule
  result.sort((a, b) => {
    const datesA = parseDateDays(a.tanggal);
    const datesB = parseDateDays(b.tanggal);
    const firstA = datesA[0] || a.tanggal;
    const firstB = datesB[0] || b.tanggal;
    return firstA.localeCompare(firstB);
  });

  return res.json({
    dates: result,
    scheduleOptions: result,
    branchOptions: Array.from(branchSet).sort(),
    totalTrainings: db.trainings.length || db.undangan.length,
    totalAbsensi: Object.keys(db.absensi).length,
  });
});

// 5b. Get My Training Schedules (supports both singular and plural paths)
const handleMySchedules = (req: Request, res: Response) => {
  const session = (req as any).userSession;
  if (!session || !session.nik) {
    return res.status(401).json({ error: 'Token tidak valid.' });
  }

  const mySchedules = getUserAllSchedules(session.nik);
  return res.json({ mySchedules });
};

app.get('/api/trainings/my-schedule', authMiddleware, handleMySchedules);
app.get('/api/trainings/my-schedules', authMiddleware, handleMySchedules);

function getIndonesianTodayYMD(): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const indoTime = new Date(utc + 7 * 3600000);
  const y = indoTime.getFullYear();
  const m = String(indoTime.getMonth() + 1).padStart(2, '0');
  const d = String(indoTime.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function checkTrainingDateEligibility(scheduledDateStr: string): {
  is_today_eligible: boolean;
  status: 'ACTIVE_TODAY' | 'EXPIRED' | 'UPCOMING' | 'UNKNOWN';
  todayYMD: string;
  scheduledDatesYMD: string[];
  message: string;
} {
  const todayYMD = getIndonesianTodayYMD();
  const scheduledDatesYMD = parseDateDays(scheduledDateStr);

  if (scheduledDatesYMD.length === 0) {
    return {
      is_today_eligible: true,
      status: 'ACTIVE_TODAY',
      todayYMD,
      scheduledDatesYMD: [],
      message: 'Tanggal training valid.',
    };
  }

  if (scheduledDatesYMD.includes(todayYMD)) {
    return {
      is_today_eligible: true,
      status: 'ACTIVE_TODAY',
      todayYMD,
      scheduledDatesYMD,
      message: 'Jadwal training sedang berlangsung hari ini.',
    };
  }

  // If today is after all scheduled dates -> EXPIRED
  const isPast = scheduledDatesYMD.every(d => d < todayYMD);
  if (isPast) {
    return {
      is_today_eligible: false,
      status: 'EXPIRED',
      todayYMD,
      scheduledDatesYMD,
      message: `Jadwal training telah berakhir (${scheduledDateStr}). Absensi tidak dapat dilakukan karena tanggal pelaksanaan sudah lewat.`,
    };
  }

  // If today is before all scheduled dates -> UPCOMING
  const isFuture = scheduledDatesYMD.every(d => d > todayYMD);
  if (isFuture) {
    return {
      is_today_eligible: false,
      status: 'UPCOMING',
      todayYMD,
      scheduledDatesYMD,
      message: `Jadwal training belum dimulai (${scheduledDateStr}). Absensi baru dapat dilakukan pada tanggal pelaksanaan training.`,
    };
  }

  return {
    is_today_eligible: false,
    status: 'UNKNOWN',
    todayYMD,
    scheduledDatesYMD,
    message: `Tanggal berjalan hari ini tidak sesuai dengan tanggal pelaksanaan training (${scheduledDateStr}).`,
  };
}

// 6. Check Participant Training Schedule Eligibility
app.post('/api/trainings/check-participant', authMiddleware, (req: Request, res: Response) => {
  const session = (req as any).userSession;
  const { tanggal, jenis_training } = req.body;

  if (!tanggal || !jenis_training) {
    return res.status(400).json({ error: 'Tanggal dan Jenis Training wajib disertakan.' });
  }

  const targetDate = String(tanggal).trim();
  const targetJenis = String(jenis_training).trim();

  const matchResult = findUserScheduleMatch(session.nik, targetDate, targetJenis);
  const allUserSchedules = getUserAllSchedules(session.nik);
  const otherSchedules = allUserSchedules.filter(
    s => !(normalizeJenisStr(s.jenis_training) === normalizeJenisStr(targetJenis) &&
           (s.tanggal === targetDate || areDatesEquivalent(s.tanggal, targetDate)))
  );

  if (!matchResult.matched || !matchResult.schedule) {
    return res.json({
      is_registered: false,
      is_today_eligible: false,
      date_status: 'UNKNOWN',
      date_message: `NIK ${session.nik} tidak terdaftar pada jadwal ini.`,
      already_attended: false,
      user_other_schedules: otherSchedules,
      message: `NIK ${session.nik} (${db.users[session.nik]?.nama || ''}) tidak terdaftar sebagai peserta training "${targetJenis}" pada tanggal "${targetDate}".`,
    });
  }

  const match = matchResult.schedule;
  const absKey = `${session.nik}_${targetDate}_${targetJenis}`;
  const existingAbs = db.absensi[absKey] || Object.values(db.absensi).find(
    a => a.nik.toLowerCase() === session.nik.toLowerCase() &&
         normalizeJenisStr(a.jenis_training) === normalizeJenisStr(match.jenis_training) &&
         (a.tanggal === targetDate || areDatesEquivalent(a.tanggal, targetDate))
  );

  const dateCheck = checkTrainingDateEligibility(targetDate);

  return res.json({
    is_registered: true,
    is_today_eligible: dateCheck.is_today_eligible,
    date_status: dateCheck.status,
    date_message: dateCheck.message,
    already_attended: Boolean(existingAbs),
    training: {
      tanggal: targetDate,
      nik: match.nik,
      nama: match.nama || db.users[session.nik]?.nama || '',
      kode_toko: match.kode_toko || db.users[session.nik]?.kode_toko || '',
      nama_toko: match.nama_toko || db.users[session.nik]?.nama_toko || '',
      jenis_training: match.jenis_training,
      cabang: match.cabang || 'SBY',
      as: match.as || db.stores[match.kode_toko]?.nama_as || '',
      am: match.am || db.stores[match.kode_toko]?.nama_am || '',
    },
    absensi: existingAbs,
    user_other_schedules: otherSchedules,
  });
});

// 7. Submit Attendance (Absensi Kehadiran Training)
app.post('/api/trainings/absensi', authMiddleware, async (req: Request, res: Response) => {
  const session = (req as any).userSession;
  const { tanggal, jenis_training } = req.body;

  if (!tanggal || !jenis_training) {
    return res.status(400).json({ error: 'Tanggal dan Jenis Training wajib disertakan.' });
  }

  const targetDate = String(tanggal).trim();
  const targetJenis = String(jenis_training).trim();

  // 1. Validate that user is a genuine registered participant in Trainings
  const matchResult = findUserScheduleMatch(session.nik, targetDate, targetJenis);
  if (!matchResult.matched || !matchResult.schedule) {
    return res.status(403).json({
      error: `Akses Absensi Ditolak: Anda tidak terdaftar sebagai peserta training "${targetJenis}" pada tanggal "${targetDate}".`,
    });
  }

  const match = matchResult.schedule;
  const user = db.users[session.nik] || {
    nik: session.nik,
    nama: match.nama,
    kode_toko: match.kode_toko,
    nama_toko: match.nama_toko,
  };

  const absKey = `${session.nik}_${targetDate}_${targetJenis}`;

  // 2. Check if already submitted
  if (db.absensi[absKey]) {
    return res.json({
      success: true,
      already_attended: true,
      message: 'Anda telah berhasil melakukan absensi kehadiran sebelumnya.',
      record: db.absensi[absKey],
    });
  }

  // 3. Validate date eligibility (training date must match today's date)
  const dateCheck = checkTrainingDateEligibility(targetDate);
  if (!dateCheck.is_today_eligible) {
    return res.status(400).json({
      error: `Akses Absensi Ditolak: ${dateCheck.message}`,
      date_status: dateCheck.status,
    });
  }

  const timeInfo = getIndonesianCurrentTime();
  const absensiRecord: AbsensiRecord = {
    id: absKey,
    tanggal: targetDate,
    nik: match.nik,
    nama: match.nama || user?.nama || '',
    kode_toko: match.kode_toko || user?.kode_toko || '',
    nama_toko: match.nama_toko || user?.nama_toko || match.kode_toko,
    jenis_training: targetJenis,
    cabang: match.cabang || 'SBY',
    waktu_absen: timeInfo.iso,
    waktu_formatted: timeInfo.formatted,
    status: 'HADIR',
    synced_to_supabase: true,
  };

  db.absensi[absKey] = absensiRecord;
  persistDb();

  // Push directly to Supabase table
  await pushToSupabase('absensi', {
    id: absensiRecord.id,
    tanggal: absensiRecord.tanggal,
    nik: absensiRecord.nik,
    nama: absensiRecord.nama,
    kode_toko: absensiRecord.kode_toko,
    nama_toko: absensiRecord.nama_toko,
    jenis_training: absensiRecord.jenis_training,
    cabang: absensiRecord.cabang,
    waktu_absen: absensiRecord.waktu_formatted,
    status: 'HADIR',
  }, 'UPSERT');

  return res.json({
    success: true,
    message: `Absensi berhasil dicatat! Terima kasih, ${absensiRecord.nama}. Kehadiran Anda pada training ${targetJenis} (${targetDate}) telah tersimpan.`,
    record: absensiRecord,
  });
});

// Admin Reset Absensi
app.post('/api/admin/reset-absensi', authMiddleware, async (req: Request, res: Response) => {
  const session = (req as any).userSession;
  if (session.role !== 'admin') {
    return res.status(403).json({ error: 'Akses khusus administrator.' });
  }

  db.absensi = {};
  persistDb();

  await pushToSupabase('absensi', null, 'DELETE_ALL');

  return res.json({
    success: true,
    message: 'Seluruh data absensi berhasil dibersihkan (kembali ke 0).',
    totalAbsensi: 0,
  });
});

// Admin Delete Single Attendance Record
app.delete('/api/admin/absensi/:id', authMiddleware, async (req: Request, res: Response) => {
  const session = (req as any).userSession;
  if (session.role !== 'admin') {
    return res.status(403).json({ error: 'Akses khusus administrator.' });
  }

  const id = decodeURIComponent(req.params.id);
  let recordKey = id;
  let record = db.absensi[id];

  if (!record) {
    const foundKey = Object.keys(db.absensi).find(k => k.startsWith(id + '_') || db.absensi[k].nik === id);
    if (foundKey) {
      recordKey = foundKey;
      record = db.absensi[foundKey];
    }
  }

  if (!record) {
    return res.status(404).json({ error: 'Data absensi tidak ditemukan.' });
  }

  delete db.absensi[recordKey];
  persistDb();

  await pushToSupabase('absensi', { nik: record.nik, id: record.id }, 'DELETE');

  return res.json({
    success: true,
    message: `Data absensi NIK ${record.nik} (${record.nama}) berhasil dihapus dari database!`,
    deleted: record,
  });
});

// Admin Bulk Delete All Attendance Records
app.delete('/api/admin/absensi', authMiddleware, async (req: Request, res: Response) => {
  const session = (req as any).userSession;
  if (session.role !== 'admin') {
    return res.status(403).json({ error: 'Akses khusus administrator.' });
  }

  const count = Object.keys(db.absensi).length;
  db.absensi = {};
  persistDb();

  await pushToSupabase('absensi', null, 'DELETE_ALL');

  return res.json({
    success: true,
    message: `Seluruh data absensi (${count} data) berhasil dihapus dari database!`,
    deletedCount: count,
  });
});

// 9. Admin: Get All Attendance Log & Statistics
app.get('/api/admin/absensi', authMiddleware, (req: Request, res: Response) => {
  const session = (req as any).userSession;
  if (session.role !== 'admin') {
    return res.status(403).json({ error: 'Akses khusus administrator TC Surabaya.' });
  }

  const { search = '', tanggal = 'all', jenis_training = 'all', status = 'all', cabang = 'all', page = '1', limit = '50' } = req.query;

  const searchQuery = String(search).toLowerCase().trim();
  const tanggalFilter = String(tanggal).trim();
  const jenisFilter = String(jenis_training).trim();
  const statusFilter = String(status).trim();
  const cabangFilter = String(cabang).trim();
  const pageNum = Math.max(1, parseInt(String(page)) || 1);
  const pageLimit = Math.min(200, Math.max(10, parseInt(String(limit)) || 50));

  let list: any[] = [];

  if (statusFilter === 'belum') {
    // Show only unattended participants
    list = db.trainings
      .filter(t => {
        const absKey = `${t.nik}_${t.tanggal_awal}_${t.jenis_training}`;
        return !db.absensi[absKey];
      })
      .map(t => {
        const user = db.users[t.nik];
        return {
          id: `${t.nik}_${t.tanggal_awal}_${t.jenis_training}`,
          tanggal: t.tanggal_awal,
          nik: t.nik,
          nama: t.nama || user?.nama || '',
          kode_toko: t.kode_toko || user?.kode_toko || '',
          nama_toko: t.nama_toko || user?.nama_toko || t.kode_toko,
          jenis_training: t.jenis_training,
          cabang: t.cabang || 'SBY',
          waktu_absen: '-',
          waktu_formatted: '-',
          status: 'BELUM_HADIR',
          is_hadir: false,
        };
      });
  } else {
    // List attendance records (HADIR)
    list = Object.values(db.absensi).map(a => ({
      ...a,
      status: 'HADIR',
      is_hadir: true,
    }));
  }

  if (tanggalFilter !== 'all') {
    list = list.filter(item => normalizeDateStr(item.tanggal) === normalizeDateStr(tanggalFilter) || areDatesEquivalent(item.tanggal, tanggalFilter));
  }

  if (jenisFilter !== 'all') {
    list = list.filter(item => normalizeJenisStr(item.jenis_training) === normalizeJenisStr(jenisFilter));
  }

  if (statusFilter !== 'all' && statusFilter !== 'belum') {
    list = list.filter(item => item.status === statusFilter || (statusFilter === 'hadir' && item.is_hadir));
  }

  if (cabangFilter !== 'all') {
    list = list.filter(item => (item.cabang || 'SBY').toLowerCase() === cabangFilter.toLowerCase());
  }

  if (searchQuery) {
    list = list.filter(
      item =>
        item.nik.toLowerCase().includes(searchQuery) ||
        item.nama.toLowerCase().includes(searchQuery) ||
        item.kode_toko.toLowerCase().includes(searchQuery) ||
        item.nama_toko.toLowerCase().includes(searchQuery) ||
        item.jenis_training.toLowerCase().includes(searchQuery) ||
        item.tanggal.toLowerCase().includes(searchQuery) ||
        (item.cabang || '').toLowerCase().includes(searchQuery)
    );
  }

  // Sort descending by attendance time or date
  list.sort((a, b) => {
    if (a.waktu_absen && b.waktu_absen && a.waktu_absen !== '-' && b.waktu_absen !== '-') {
      return new Date(b.waktu_absen).getTime() - new Date(a.waktu_absen).getTime();
    }
    return (b.tanggal || '').localeCompare(a.tanggal || '');
  });

  const total = list.length;
  const totalPages = Math.ceil(total / pageLimit) || 1;
  const offset = (pageNum - 1) * pageLimit;
  const paginated = list.slice(offset, offset + pageLimit);

  // Generate unique date and training type options for filters
  const dateSet = new Set<string>();
  const jenisSet = new Set<string>();
  const cabangSet = new Set<string>();

  for (const t of db.trainings) {
    if (t.tanggal_awal) dateSet.add(t.tanggal_awal.trim());
    if (t.jenis_training) jenisSet.add(t.jenis_training.trim());
    if (t.cabang) cabangSet.add(t.cabang.trim());
  }
  for (const a of Object.values(db.absensi)) {
    if (a.tanggal) dateSet.add(a.tanggal.trim());
    if (a.jenis_training) jenisSet.add(a.jenis_training.trim());
    if (a.cabang) cabangSet.add(a.cabang.trim());
  }

  return res.json({
    data: paginated,
    pagination: {
      total,
      page: pageNum,
      limit: pageLimit,
      totalPages,
    },
    filterOptions: {
      dates: Array.from(dateSet),
      trainingTypes: Array.from(jenisSet),
      cabangList: Array.from(cabangSet),
    },
    summary: {
      total: list.length,
      totalHadir: Object.keys(db.absensi).length,
      totalBelum: Math.max(0, db.trainings.length - Object.keys(db.absensi).length),
      totalPesertaTraining: db.trainings.length,
      percentage: db.trainings.length > 0
        ? Number(((Object.keys(db.absensi).length / db.trainings.length) * 100).toFixed(1))
        : 0,
      persentaseHadir: db.trainings.length > 0
        ? Number(((Object.keys(db.absensi).length / db.trainings.length) * 100).toFixed(1))
        : 0,
    },
  });
});

// 9b. Admin: Get List of Participants Who Have Not Attended
const handleGetBelumAbsen = (req: Request, res: Response) => {
  const session = (req as any).userSession;
  if (session.role !== 'admin') {
    return res.status(403).json({ error: 'Akses khusus administrator TC Surabaya.' });
  }

  const { search = '', tanggal = 'all', jenis_training = 'all', cabang = 'all' } = req.query;

  const searchQuery = String(search).toLowerCase().trim();
  const tanggalFilter = String(tanggal).trim();
  const jenisFilter = String(jenis_training).trim();
  const cabangFilter = String(cabang).trim();

  let unvisitedTrainings = db.trainings.filter(t => {
    const absKey = `${t.nik}_${t.tanggal_awal}_${t.jenis_training}`;
    return !db.absensi[absKey];
  });

  if (tanggalFilter !== 'all') {
    unvisitedTrainings = unvisitedTrainings.filter(t => normalizeDateStr(t.tanggal_awal) === normalizeDateStr(tanggalFilter));
  }

  if (jenisFilter !== 'all') {
    unvisitedTrainings = unvisitedTrainings.filter(t => normalizeJenisStr(t.jenis_training) === normalizeJenisStr(jenisFilter));
  }

  if (cabangFilter !== 'all') {
    unvisitedTrainings = unvisitedTrainings.filter(t => (t.cabang || 'SBY').toLowerCase() === cabangFilter.toLowerCase());
  }

  if (searchQuery) {
    unvisitedTrainings = unvisitedTrainings.filter(
      t =>
        (t.nik || '').toLowerCase().includes(searchQuery) ||
        (t.nama || '').toLowerCase().includes(searchQuery) ||
        (t.kode_toko || '').toLowerCase().includes(searchQuery) ||
        (t.nama_toko || '').toLowerCase().includes(searchQuery) ||
        (t.jenis_training || '').toLowerCase().includes(searchQuery) ||
        (t.tanggal_awal || '').toLowerCase().includes(searchQuery)
    );
  }

  const data = unvisitedTrainings.map(t => {
    const user = db.users[t.nik];
    const akunPintar = db.akunPintar[t.nik];
    return {
      nik: t.nik,
      nama: t.nama || user?.nama || 'Tanpa Nama',
      jabatan: user?.jabatan || '',
      kode_toko: t.kode_toko || user?.kode_toko || '',
      nama_toko: t.nama_toko || user?.nama_toko || t.kode_toko || '',
      wa: akunPintar?.wa || user?.wa || '',
      tanggal: t.tanggal_awal,
      jenis_training: t.jenis_training,
      cabang: t.cabang || 'SBY',
      is_hadir: false,
    };
  });

  return res.json({
    total: data.length,
    count: data.length,
    data,
    filters: {
      tanggal: tanggalFilter,
      jenis_training: jenisFilter,
      cabang: cabangFilter,
    },
  });
};

app.get('/api/admin/belum-absen', authMiddleware, handleGetBelumAbsen);
app.get('/api/admin/absensi/belum', authMiddleware, handleGetBelumAbsen);

// 10. Export CSV Absensi Training (supports /api/admin/absensi/export-csv and /api/admin/export-absensi-csv)
const handleExportAbsensi = (req: Request, res: Response) => {
  const { search = '', tanggal = 'all', jenis_training = 'all', cabang = 'all', status = 'all' } = req.query;
  const searchQuery = String(search).toLowerCase().trim();
  const tanggalFilter = String(tanggal).trim();
  const jenisFilter = String(jenis_training).trim();
  const cabangFilter = String(cabang).trim();
  const statusFilter = String(status).trim();

  let list = Object.values(db.absensi);

  if (tanggalFilter !== 'all') {
    list = list.filter(a => normalizeDateStr(a.tanggal) === normalizeDateStr(tanggalFilter));
  }
  if (jenisFilter !== 'all') {
    list = list.filter(a => normalizeJenisStr(a.jenis_training) === normalizeJenisStr(jenisFilter));
  }
  if (cabangFilter !== 'all') {
    list = list.filter(a => (a.cabang || 'SBY').toLowerCase() === cabangFilter.toLowerCase());
  }
  if (statusFilter !== 'all') {
    list = list.filter(a => (a.status || 'HADIR').toLowerCase() === statusFilter.toLowerCase());
  }
  if (searchQuery) {
    list = list.filter(
      a =>
        a.nik.toLowerCase().includes(searchQuery) ||
        (a.nama || '').toLowerCase().includes(searchQuery) ||
        (a.kode_toko || '').toLowerCase().includes(searchQuery) ||
        (a.nama_toko || '').toLowerCase().includes(searchQuery) ||
        (a.jenis_training || '').toLowerCase().includes(searchQuery) ||
        (a.tanggal || '').toLowerCase().includes(searchQuery)
    );
  }

  let csv = '\uFEFF"TANGGAL","NIK","NAMA","KODE TOKO","NAMA TOKO","JENIS TRAINING","CABANG","STATUS","WAKTU ABSEN"\n';

  for (const a of list) {
    const tgl = (a.tanggal || '').replace(/"/g, '""');
    const nik = (a.nik || '').replace(/"/g, '""');
    const nama = (a.nama || '').replace(/"/g, '""');
    const kode = (a.kode_toko || '').replace(/"/g, '""');
    const toko = (a.nama_toko || '').replace(/"/g, '""');
    const jenis = (a.jenis_training || '').replace(/"/g, '""');
    const cbg = (a.cabang || 'SBY').replace(/"/g, '""');
    const st = (a.status || 'HADIR').replace(/"/g, '""');
    const waktu = (a.waktu_formatted || a.waktu_absen || '').replace(/"/g, '""');

    csv += `"${tgl}","${nik}","${nama}","${kode}","${toko}","${jenis}","${cbg}","${st}","${waktu}"\n`;
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="Rekap_Absensi_TC_Surabaya_${Date.now()}.csv"`);
  return res.send(csv);
};

app.get('/api/admin/absensi/export-csv', authMiddleware, handleExportAbsensi);
app.get('/api/admin/export-absensi-csv', authMiddleware, handleExportAbsensi);

// 10b. Export CSV Peserta Belum Absen Training
const handleExportBelumAbsen = (req: Request, res: Response) => {
  const { search = '', tanggal = 'all', jenis_training = 'all', cabang = 'all' } = req.query;
  const searchQuery = String(search).toLowerCase().trim();
  const tanggalFilter = String(tanggal).trim();
  const jenisFilter = String(jenis_training).trim();
  const cabangFilter = String(cabang).trim();

  let unvisitedTrainings = db.trainings.filter(t => {
    const absKey = `${t.nik}_${t.tanggal_awal}_${t.jenis_training}`;
    return !db.absensi[absKey];
  });

  if (tanggalFilter !== 'all') {
    unvisitedTrainings = unvisitedTrainings.filter(t => normalizeDateStr(t.tanggal_awal) === normalizeDateStr(tanggalFilter));
  }
  if (jenisFilter !== 'all') {
    unvisitedTrainings = unvisitedTrainings.filter(t => normalizeJenisStr(t.jenis_training) === normalizeJenisStr(jenisFilter));
  }
  if (cabangFilter !== 'all') {
    unvisitedTrainings = unvisitedTrainings.filter(t => (t.cabang || 'SBY').toLowerCase() === cabangFilter.toLowerCase());
  }
  if (searchQuery) {
    unvisitedTrainings = unvisitedTrainings.filter(
      t =>
        t.nik.toLowerCase().includes(searchQuery) ||
        (t.nama || '').toLowerCase().includes(searchQuery) ||
        (t.kode_toko || '').toLowerCase().includes(searchQuery) ||
        (t.nama_toko || '').toLowerCase().includes(searchQuery) ||
        (t.jenis_training || '').toLowerCase().includes(searchQuery) ||
        (t.tanggal_awal || '').toLowerCase().includes(searchQuery)
    );
  }

  let csv = '\uFEFF"NIK","NAMA","JABATAN","KODE TOKO","NAMA TOKO","TANGGAL TRAINING","JENIS TRAINING","CABANG","STATUS"\n';

  for (const t of unvisitedTrainings) {
    const user = db.users[t.nik];
    const nik = (t.nik || '').replace(/"/g, '""');
    const nama = (t.nama || user?.nama || '').replace(/"/g, '""');
    const jab = (user?.jabatan || '').replace(/"/g, '""');
    const kode = (t.kode_toko || user?.kode_toko || '').replace(/"/g, '""');
    const toko = (t.nama_toko || user?.nama_toko || t.kode_toko || '').replace(/"/g, '""');
    const tgl = (t.tanggal_awal || '').replace(/"/g, '""');
    const jenis = (t.jenis_training || '').replace(/"/g, '""');
    const cbg = (t.cabang || 'SBY').replace(/"/g, '""');

    csv += `"${nik}","${nama}","${jab}","${kode}","${toko}","${tgl}","${jenis}","${cbg}","BELUM ABSEN"\n`;
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="Peserta_Belum_Absen_TC_Surabaya_${Date.now()}.csv"`);
  return res.send(csv);
};

app.get('/api/admin/export-belum-absen-csv', authMiddleware, handleExportBelumAbsen);
app.get('/api/admin/belum-absen/export-csv', authMiddleware, handleExportBelumAbsen);
app.get('/api/admin/absensi/belum/export-csv', authMiddleware, handleExportBelumAbsen);

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
    synced_to_supabase: true,
  };

  db.akunPintar[user.nik] = updatedRecord;
  if (db.users[user.nik]) {
    db.users[user.nik].wa = cleanWa;
  }
  persistDb();

  await pushToSupabase('akunPintar', {
    nik: updatedRecord.nik,
    nama: updatedRecord.nama,
    jabatan: updatedRecord.jabatan,
    wa: updatedRecord.wa,
    email_pintar: updatedRecord.email_pintar,
    password_pintar: updatedRecord.password_pintar,
    updated_at: updatedRecord.updated_at,
  }, 'UPSERT');

  return res.json({
    success: true,
    message: 'Data Akun Pintar berhasil diperbarui dan disinkronkan ke Supabase!',
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

  await pushToSupabase('akunPintar', { nik }, 'DELETE');

  return res.json({
    success: true,
    message: `Data Akun Pintar untuk NIK ${nik} (${user.nama}) berhasil dihapus dan dikosongkan!`,
  });
});

// 13. Dashboard Recap Statistics
app.get('/api/rekap/stats', (req: Request, res: Response) => {
  const usersList = Object.values(db.users);
  const totalKaryawan = usersList.length;

  let totalTerisi = 0;
  const tokoMap: Record<string, { nama_toko: string; total: number; terisi: number }> = {};
  const jabatanMap: Record<string, { total: number; terisi: number }> = {};

  for (const user of usersList) {
    const akun = db.akunPintar[user.nik];
    const isFilled = Boolean(akun && akun.email_pintar && akun.email_pintar.trim().length > 0);

    if (isFilled) {
      totalTerisi++;
    }

    // Toko Stats
    const kode = user.kode_toko || 'HQ';
    if (!tokoMap[kode]) {
      tokoMap[kode] = {
        nama_toko: user.nama_toko || kode,
        total: 0,
        terisi: 0,
      };
    }
    tokoMap[kode].total++;
    if (isFilled) {
      tokoMap[kode].terisi++;
    }

    // Jabatan Stats
    const jab = user.jabatan || 'Lainnya';
    if (!jabatanMap[jab]) {
      jabatanMap[jab] = { total: 0, terisi: 0 };
    }
    jabatanMap[jab].total++;
    if (isFilled) {
      jabatanMap[jab].terisi++;
    }
  }

  const totalBelum = totalKaryawan - totalTerisi;
  const completionPercentage = totalKaryawan > 0 ? Number(((totalTerisi / totalKaryawan) * 100).toFixed(1)) : 0;

  const jabatanStats = Object.entries(jabatanMap)
    .map(([jabatan, stat]) => ({
      jabatan,
      total: stat.total,
      terisi: stat.terisi,
      belum: stat.total - stat.terisi,
      percentage: stat.total > 0 ? Number(((stat.terisi / stat.total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const tokoRankings = Object.entries(tokoMap)
    .map(([kode_toko, stat]) => ({
      kode_toko,
      nama_toko: stat.nama_toko,
      total: stat.total,
      terisi: stat.terisi,
      percentage: stat.total > 0 ? Number(((stat.terisi / stat.total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const isSupabaseConfigured = Boolean(
    db.supabaseConfig.masterUrl ||
    Object.values(db.supabaseConfig.sources).some(s => Boolean(s.url && s.anonKey))
  );

  return res.json({
    totalKaryawan,
    totalTerisi,
    totalBelum,
    totalToko: Object.keys(tokoMap).length,
    completionPercentage,
    totalTrainings: db.trainings.length,
    totalUndangan: db.undangan.length,
    totalAbsensi: Object.keys(db.absensi).length,
    lastSyncedAt: db.lastSyncedAt,
    supabaseConnected: isSupabaseConfigured,
    supabaseConfig: db.supabaseConfig,
    jabatanStats,
    topToko: tokoRankings.slice(0, 10),
  });
});

// 13b. Change Admin Password
app.post('/api/admin/change-password', authMiddleware, (req: Request, res: Response) => {
  const session = (req as any).userSession;
  if (!session || session.role !== 'admin') {
    return res.status(403).json({ error: 'Akses ditolak. Hanya Administrator TC Surabaya yang dapat mengubah kata sandi.' });
  }

  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Kata sandi saat ini dan kata sandi baru wajib diisi.' });
  }

  let isCurrentValid = false;
  if (db.adminPassword && db.adminPassword.trim().length > 0) {
    isCurrentValid = currentPassword === db.adminPassword.trim();
  } else {
    isCurrentValid =
      currentPassword === 'admin123' ||
      currentPassword === 'tc_surabaya_2026' ||
      currentPassword === 'surabaya2026';
  }

  if (!isCurrentValid) {
    return res.status(400).json({ error: 'Kata sandi saat ini tidak cocok atau salah.' });
  }

  if (newPassword.trim().length < 6) {
    return res.status(400).json({ error: 'Kata sandi baru minimal harus 6 karakter.' });
  }

  if (confirmPassword && newPassword.trim() !== confirmPassword.trim()) {
    return res.status(400).json({ error: 'Konfirmasi kata sandi baru tidak sesuai.' });
  }

  const activePass = db.adminPassword && db.adminPassword.trim().length > 0 ? db.adminPassword.trim() : 'admin123';
  if (newPassword.trim() === activePass) {
    return res.status(400).json({ error: 'Kata sandi baru tidak boleh sama dengan kata sandi saat ini.' });
  }

  db.adminPassword = newPassword.trim();
  persistDb();

  return res.json({
    success: true,
    message: 'Kata sandi Administrator berhasil diperbarui! Kata sandi lama telah dinonaktifkan sepenuhnya dan tidak dapat digunakan lagi.',
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

// 15. Supabase Configuration & Sync Endpoints
app.get('/api/admin/supabase-config', authMiddleware, (req: Request, res: Response) => {
  const session = (req as any).userSession;
  if (session.role !== 'admin') {
    return res.status(403).json({ error: 'Akses khusus administrator.' });
  }

  return res.json({
    supabaseConfig: db.supabaseConfig,
    lastSyncedAt: db.lastSyncedAt,
    counts: {
      users: Object.keys(db.users).length,
      stores: Object.keys(db.stores).length,
      trainings: db.trainings.length,
      akunPintar: Object.keys(db.akunPintar).length,
      undangan: db.undangan.length,
      absensi: Object.keys(db.absensi).length,
    },
  });
});

app.post('/api/admin/supabase-config', authMiddleware, (req: Request, res: Response) => {
  const session = (req as any).userSession;
  if (session.role !== 'admin') {
    return res.status(403).json({ error: 'Akses khusus administrator.' });
  }

  const { masterUrl, masterAnonKey, sources } = req.body;

  if (typeof masterUrl === 'string') {
    db.supabaseConfig.masterUrl = masterUrl.trim();
  }
  if (typeof masterAnonKey === 'string') {
    db.supabaseConfig.masterAnonKey = masterAnonKey.trim();
  }

  if (sources && typeof sources === 'object') {
    for (const key of ['users', 'stores', 'trainings', 'akunPintar', 'undangan', 'absensi'] as (keyof SupabaseConfigState['sources'])[]) {
      if (sources[key]) {
        db.supabaseConfig.sources[key] = {
          ...db.supabaseConfig.sources[key],
          url: clean(sources[key].url),
          anonKey: clean(sources[key].anonKey),
          tableName: clean(sources[key].tableName) || DEFAULT_SUPABASE_CONFIG.sources[key].tableName,
        };
      }
    }
  }

  persistDb();

  return res.json({
    success: true,
    message: 'Konfigurasi Supabase berhasil disimpan.',
    supabaseConfig: db.supabaseConfig,
  });
});

// Import specific single source from Supabase (e.g. users, stores, trainings, akunPintar, undangan, absensi)
app.post('/api/admin/supabase-sync/:source', authMiddleware, async (req: Request, res: Response) => {
  const session = (req as any).userSession;
  if (session.role !== 'admin') {
    return res.status(403).json({ error: 'Akses khusus administrator.' });
  }

  const { source } = req.params;

  if (source === 'all') {
    const result = await syncAllFromSupabase();
    return res.json(result);
  }

  if (!['users', 'stores', 'trainings', 'akunPintar', 'undangan', 'absensi'].includes(source)) {
    return res.status(400).json({ error: `Sumber data "${source}" tidak valid.` });
  }

  const result = await importSourceFromSupabase(source as keyof SupabaseConfigState['sources']);
  return res.json({
    ...result,
    lastSyncedAt: db.lastSyncedAt,
    userCount: Object.keys(db.users).length,
    storeCount: Object.keys(db.stores).length,
    trainingCount: db.trainings.length,
    pintarCount: Object.keys(db.akunPintar).length,
    undanganCount: db.undangan.length,
    absensiCount: Object.keys(db.absensi).length,
  });
});

// 16. Force Sync All Supabase Trigger
app.post('/api/admin/sync', authMiddleware, async (req: Request, res: Response) => {
  const session = (req as any).userSession;
  if (session.role !== 'admin') {
    return res.status(403).json({ error: 'Akses khusus administrator.' });
  }

  const result = await syncAllFromSupabase();
  return res.json(result);
});

// 17. Export CSV Akun Pintar
app.get('/api/admin/export-csv', authMiddleware, (req: Request, res: Response) => {
  const users = Object.values(db.users);
  let csv = '\uFEFF"nik","nama","Jabatan","wa","email_pintar","password_pintar"\n';

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

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="AkunPintar_TC_Surabaya_${Date.now()}.csv"`);
  return res.send(csv);
});

// 18. Get Undangan Schedule (Agenda Jadwal Training)
app.get('/api/undangan', authMiddleware, (req: Request, res: Response) => {
  const session = (req as any).userSession;
  const {
    search = '',
    nik = '',
    nama = '',
    kode_toko = '',
    nama_toko = '',
    as = 'all',
    am = 'all',
    cabang = 'all',
    jenis_training = 'all',
    sistem_training = 'all',
    tanggal = 'all',
    myOnly = 'false',
    page = '1',
    limit = '25',
  } = req.query;

  const searchQuery = String(search).toLowerCase().trim();
  const nikFilter = String(nik).toLowerCase().trim();
  const namaFilter = String(nama).toLowerCase().trim();
  const kodeTokoFilter = String(kode_toko).toLowerCase().trim();
  const namaTokoFilter = String(nama_toko).toLowerCase().trim();
  const asFilter = String(as).trim();
  const amFilter = String(am).trim();
  const cabangFilter = String(cabang).trim();
  const jenisFilter = String(jenis_training).trim();
  const sistemFilter = String(sistem_training).trim();
  const tanggalFilter = String(tanggal).trim();
  const isMyOnly = myOnly === 'true' || myOnly === '1';

  const pageNum = Math.max(1, parseInt(String(page)) || 1);
  const pageLimit = Math.min(500, Math.max(10, parseInt(String(limit)) || 25));

  let list = db.undangan;

  if (isMyOnly && session.nik && session.role !== 'admin') {
    list = list.filter(item => item.nik.toLowerCase() === session.nik.toLowerCase());
  }

  if (nikFilter) {
    list = list.filter(item => item.nik.toLowerCase().includes(nikFilter));
  }

  if (namaFilter) {
    list = list.filter(item => item.nama.toLowerCase().includes(namaFilter));
  }

  if (kodeTokoFilter) {
    list = list.filter(item => item.kode_toko.toLowerCase().includes(kodeTokoFilter));
  }

  if (namaTokoFilter) {
    list = list.filter(item => item.nama_toko.toLowerCase().includes(namaTokoFilter));
  }

  if (asFilter && asFilter !== 'all') {
    list = list.filter(item => item.as.toLowerCase() === asFilter.toLowerCase());
  }

  if (amFilter && amFilter !== 'all') {
    list = list.filter(item => item.am.toLowerCase() === amFilter.toLowerCase());
  }

  if (cabangFilter && cabangFilter !== 'all') {
    list = list.filter(item => (item.cabang || 'SBY').toLowerCase() === cabangFilter.toLowerCase());
  }

  if (jenisFilter && jenisFilter !== 'all') {
    list = list.filter(item => item.jenis_training.toLowerCase() === jenisFilter.toLowerCase());
  }

  if (sistemFilter && sistemFilter !== 'all') {
    list = list.filter(item => item.sistem_training.toLowerCase() === sistemFilter.toLowerCase());
  }

  if (tanggalFilter && tanggalFilter !== 'all') {
    list = list.filter(item => item.tanggal.toLowerCase() === tanggalFilter.toLowerCase());
  }

  if (searchQuery) {
    list = list.filter(
      item =>
        item.nik.toLowerCase().includes(searchQuery) ||
        item.nama.toLowerCase().includes(searchQuery) ||
        item.kode_toko.toLowerCase().includes(searchQuery) ||
        item.nama_toko.toLowerCase().includes(searchQuery) ||
        item.as.toLowerCase().includes(searchQuery) ||
        item.am.toLowerCase().includes(searchQuery) ||
        (item.cabang || '').toLowerCase().includes(searchQuery) ||
        item.jabatan.toLowerCase().includes(searchQuery) ||
        item.tanggal.toLowerCase().includes(searchQuery) ||
        item.jenis_training.toLowerCase().includes(searchQuery) ||
        item.sistem_training.toLowerCase().includes(searchQuery)
    );
  }

  const asSet = new Set<string>();
  const amSet = new Set<string>();
  const cabangSet = new Set<string>();
  const jenisSet = new Set<string>();
  const sistemSet = new Set<string>();
  const tanggalSet = new Set<string>();
  const tokoSet = new Set<string>();

  for (const item of db.undangan) {
    if (item.as) asSet.add(item.as.trim());
    if (item.am) amSet.add(item.am.trim());
    if (item.cabang) cabangSet.add(item.cabang.trim());
    else cabangSet.add('SBY');
    if (item.jenis_training) jenisSet.add(item.jenis_training.trim());
    if (item.sistem_training) sistemSet.add(item.sistem_training.trim());
    if (item.tanggal) tanggalSet.add(item.tanggal.trim());
    if (item.kode_toko) tokoSet.add(item.kode_toko.trim());
  }

  const asOptions = Array.from(asSet).sort();
  const amOptions = Array.from(amSet).sort();
  const cabangOptions = Array.from(cabangSet).sort();
  const jenisOptions = Array.from(jenisSet).sort();
  const sistemOptions = Array.from(sistemSet).sort();
  const tanggalOptions = Array.from(tanggalSet).sort();

  const total = list.length;
  const totalPages = Math.ceil(total / pageLimit) || 1;
  const offset = (pageNum - 1) * pageLimit;
  const paginated = list.slice(offset, offset + pageLimit).map(item => ({
    ...item,
    cabang: item.cabang || 'SBY',
  }));

  const myTotal = session.nik && session.role !== 'admin'
    ? db.undangan.filter(u => u.nik.toLowerCase() === session.nik.toLowerCase()).length
    : 0;

  return res.json({
    data: paginated,
    pagination: {
      total,
      page: pageNum,
      limit: pageLimit,
      totalPages,
    },
    filterOptions: {
      asOptions,
      amOptions,
      cabangOptions,
      jenisOptions,
      sistemOptions,
      tanggalOptions,
    },
    summary: {
      totalPeserta: db.undangan.length,
      totalToko: tokoSet.size,
      totalAS: asSet.size,
      totalAM: amSet.size,
      totalCabang: cabangSet.size,
      myTotal,
    },
  });
});

// 19. Export Undangan to CSV
app.get('/api/undangan/export-csv', authMiddleware, (req: Request, res: Response) => {
  const { search = '', cabang = 'all', jenis = 'all', sistem = 'all', tanggal = 'all' } = req.query;
  const searchQuery = String(search).toLowerCase().trim();
  const cabangFilter = String(cabang).trim();
  const jenisFilter = String(jenis).trim();
  const sistemFilter = String(sistem).trim();
  const tanggalFilter = String(tanggal).trim();

  let list = db.undangan;

  if (cabangFilter !== 'all') {
    list = list.filter(u => (u.cabang || 'SBY').toLowerCase() === cabangFilter.toLowerCase());
  }
  if (jenisFilter !== 'all') {
    list = list.filter(u => (u.jenis_training || '').toLowerCase() === jenisFilter.toLowerCase());
  }
  if (sistemFilter !== 'all') {
    list = list.filter(u => (u.sistem_training || '').toLowerCase() === sistemFilter.toLowerCase());
  }
  if (tanggalFilter !== 'all') {
    list = list.filter(u => (u.tanggal || '').toLowerCase() === tanggalFilter.toLowerCase());
  }
  if (searchQuery) {
    list = list.filter(
      u =>
        (u.nik || '').toLowerCase().includes(searchQuery) ||
        (u.nama || '').toLowerCase().includes(searchQuery) ||
        (u.kode_toko || '').toLowerCase().includes(searchQuery) ||
        (u.nama_toko || '').toLowerCase().includes(searchQuery) ||
        (u.cabang || '').toLowerCase().includes(searchQuery) ||
        (u.jenis_training || '').toLowerCase().includes(searchQuery) ||
        (u.tanggal || '').toLowerCase().includes(searchQuery)
    );
  }

  let csv = '\uFEFF"NIK","NAMA","JABATAN","KODE TOKO","TOKO","CABANG","AS","AM","TANGGAL","JENIS TRAINING","SISTEM TRAINING"\n';

  for (const u of list) {
    const nik = (u.nik || '').replace(/"/g, '""');
    const nama = (u.nama || '').replace(/"/g, '""');
    const jab = (u.jabatan || '').replace(/"/g, '""');
    const kode = (u.kode_toko || '').replace(/"/g, '""');
    const toko = (u.nama_toko || '').replace(/"/g, '""');
    const cbg = (u.cabang || 'SBY').replace(/"/g, '""');
    const asVal = (u.as || '').replace(/"/g, '""');
    const amVal = (u.am || '').replace(/"/g, '""');
    const tgl = (u.tanggal || '').replace(/"/g, '""');
    const jenisVal = (u.jenis_training || '').replace(/"/g, '""');
    const sistemVal = (u.sistem_training || '').replace(/"/g, '""');

    csv += `"${nik}","${nama}","${jab}","${kode}","${toko}","${cbg}","${asVal}","${amVal}","${tgl}","${jenisVal}","${sistemVal}"\n`;
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="Agenda_Jadwal_Undangan_${Date.now()}.csv"`);
  return res.send(csv);
});

// 20. Admin: Clear Source Data (Reset Data Sumber Spreadsheet)
app.post('/api/admin/clear-source-data', authMiddleware, (req: Request, res: Response) => {
  const session = (req as any).userSession;
  if (session.role !== 'admin') {
    return res.status(403).json({ error: 'Akses khusus administrator.' });
  }

  const { target = 'all' } = req.body || {};

  if (target === 'all' || target === 'users') {
    db.users = {};
  }
  if (target === 'all' || target === 'stores') {
    db.stores = {};
  }
  if (target === 'all' || target === 'trainings') {
    db.trainings = [];
  }
  if (target === 'all' || target === 'undangan') {
    db.undangan = [];
  }
  if (target === 'all' || target === 'akunPintar') {
    db.akunPintar = {};
  }
  if (target === 'all' || target === 'absensi') {
    db.absensi = {};
  }

  db.lastSyncedAt = '';

  if (db.supabaseConfig?.sources) {
    for (const key of Object.keys(db.supabaseConfig.sources) as (keyof typeof db.supabaseConfig.sources)[]) {
      if (db.supabaseConfig.sources[key]) {
        db.supabaseConfig.sources[key].status = 'idle';
        db.supabaseConfig.sources[key].count = 0;
        db.supabaseConfig.sources[key].lastSyncedAt = '';
      }
    }
  }

  persistDb(true);

  return res.json({
    success: true,
    message: 'Semua data sumber spreadsheet berhasil dihapus dari database aplikasi. Database siap mengimpor data bersih dari Supabase.',
    counts: {
      users: Object.keys(db.users).length,
      stores: Object.keys(db.stores).length,
      trainings: db.trainings.length,
      undangan: db.undangan.length,
      akunPintar: Object.keys(db.akunPintar).length,
      absensi: Object.keys(db.absensi).length,
    },
  });
});

export default app;
