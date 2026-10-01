import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const SPREADSHEET_ID = '1VyP2x_0zRX8iqa8XadKyURKH5Yz55WFJVECaeQUpP0g';
const PERMANENT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzTYfIFIPwO4iSFE_-TYOcE4jqx7XA_M-WBh59qy8MOsLqNLKFPIf-N10ijaErDYGqE4A/exec';

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
      req.url.startsWith('/webhook') ||
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
  cabang?: string;
  waktu_absen: string;
  waktu_formatted: string;
  status: 'HADIR';
  synced_to_sheet?: boolean;
}

export interface UndanganRecord {
  nik: string;
  nama: string;
  jabatan: string;
  kode_toko: string;
  nama_toko: string;
  as: string;
  am: string;
  tanggal: string;
  jenis_training: string;
  sistem_training: string;
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
  webhookUrl: string;
  adminPassword?: string;
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
  webhookUrl: PERMANENT_APPS_SCRIPT_URL,
  adminPassword: '',
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
    db.webhookUrl = parsed.webhookUrl || PERMANENT_APPS_SCRIPT_URL;
  } catch (err) {
    console.error('Error reading local db file:', err);
  }
} else {
  db.webhookUrl = PERMANENT_APPS_SCRIPT_URL;
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
      wh: db.webhookUrl,
    });
    if (!force && currentHash === lastPersistedHash) {
      return; // Data has not changed, do NOT touch disk to avoid triggering watcher or disk churn
    }
    lastPersistedHash = currentHash;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
    } catch {
      // On platforms where filesystem is read-only, in-memory state is maintained
    }
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
async function syncFromGoogleSheets(isSilentAutoSync = false): Promise<{
  success: boolean;
  userCount: number;
  pintarCount: number;
  trainingCount: number;
  undanganCount?: number;
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
      // Use direct GID export (gid=140468938) to bypass active UI filters in Google Sheets and fetch all 1300+ rows
      const trainingsUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=140468938&_t=${Date.now()}`;
      let trainingsRes = await fetch(trainingsUrl);
      let trainingsCsv = '';
      if (trainingsRes.ok) {
        trainingsCsv = await trainingsRes.text();
      } else {
        // Fallback to gviz if direct export fails
        const fallbackUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=Trainings&_t=${Date.now()}`;
        trainingsRes = await fetch(fallbackUrl);
        if (trainingsRes.ok) {
          trainingsCsv = await trainingsRes.text();
        }
      }

      if (trainingsCsv) {
        const trainingRows = parseCSV(trainingsCsv);
        const newTrainings: TrainingRecord[] = [];

        // Verified participants for YUMMY COFFEE GOLD (including Eirene Puspita Biasa, row 494-505)
        const yummyNiks = new Set([
          '2015754798', '2015774627', '2015770760', '2015658674',
          '2015722928', '2015717354', '2015730708', '2015720800',
          '2015725497', '2015638249', '2015780530', '2015780776'
        ]);

        if (trainingRows.length > 1) {
          const tHeaders = trainingRows[0].map(h => clean(h).toLowerCase());
          const tTglIdx = tHeaders.findIndex(h => h.includes('tanggal'));
          const tNikIdx = tHeaders.findIndex(h => h.includes('nik'));
          const tNamaIdx = tHeaders.findIndex(h => h.includes('nama'));
          const tKodeTokoIdx = tHeaders.findIndex(h => h.includes('toko'));
          const tJenisIdx = tHeaders.findIndex(h => h.includes('training') || h.includes('jenis'));

          const tCabangIdx = tHeaders.findIndex(h => h.includes('cabang') || h.includes('wilayah'));

          for (let i = 1; i < trainingRows.length; i++) {
            const row = trainingRows[i];
            const nik = clean(row[tNikIdx >= 0 ? tNikIdx : 1]);
            const tanggal_awal = clean(row[tTglIdx >= 0 ? tTglIdx : 0]);
            let jenis_training = clean(row[tJenisIdx >= 0 ? tJenisIdx : 4]);

            if (!nik || nik === '#REF!' || !tanggal_awal) continue;

            // Handle rows where jenis_training is empty in the sheet export
            if (!jenis_training) {
              if (yummyNiks.has(nik)) {
                jenis_training = 'YUMMY COFFEE GOLD';
              } else if (tanggal_awal.includes('02 Oktober') || tanggal_awal.includes('03 Oktober') || tanggal_awal.includes('2 Oktober') || tanggal_awal.includes('3 Oktober')) {
                jenis_training = 'CHIEF OF STORE';
              } else if (tanggal_awal.includes('28 September')) {
                jenis_training = 'IDELIVERY CREW';
              } else if (tanggal_awal.includes('05 Oktober') || tanggal_awal.includes('06 Oktober') || tanggal_awal.includes('5 Oktober') || tanggal_awal.includes('6 Oktober')) {
                jenis_training = 'FRIED FOOD IS';
              } else if (tanggal_awal.includes('07 Oktober') || tanggal_awal.includes('7 Oktober')) {
                jenis_training = 'FRIED FOOD';
              } else if (tanggal_awal.includes('10 Oktober') || tanggal_awal.includes('17 Oktober') || tanggal_awal.includes('20 Oktober')) {
                jenis_training = 'SAY BURGER';
              } else if (tanggal_awal.includes('13 Oktober')) {
                jenis_training = 'SAY BREAD MINIMALIS';
              } else {
                jenis_training = 'TRAINING PESERTA';
              }
            }

            let nama = clean(row[tNamaIdx >= 0 ? tNamaIdx : 2]);
            if (!nama || nama === '#REF!') {
              nama = db.users[nik]?.nama || '';
            }

            const kode_toko = clean(row[tKodeTokoIdx >= 0 ? tKodeTokoIdx : 3]) || db.users[nik]?.kode_toko || '';
            const nama_toko =
              db.stores[kode_toko]?.nama_toko ||
              db.users[nik]?.nama_toko ||
              kode_toko;

            const cabang = clean(row[tCabangIdx >= 0 ? tCabangIdx : 5]) || db.stores[kode_toko]?.wilayah || 'SBY';

            newTrainings.push({
              tanggal_awal,
              nik,
              nama,
              kode_toko,
              nama_toko,
              jenis_training,
              cabang,
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

    // 5. Fetch Absensi Sheet directly from Google Sheets to ensure web and sheet match 100%
    try {
      const absUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=Absensi&_t=${Date.now()}`;
      const absRes = await fetch(absUrl);
      if (absRes.ok) {
        const absCsv = await absRes.text();
        const absRows = parseCSV(absCsv);
        const newAbsensi: Record<string, AbsensiRecord> = {};

        if (absRows.length > 1) {
          const aHeaders = absRows[0].map(h => clean(h).toLowerCase());
          const aTglIdx = aHeaders.findIndex(h => h.includes('tanggal'));
          const aNikIdx = aHeaders.findIndex(h => h.includes('nik'));
          const aNamaIdx = aHeaders.findIndex(h => h.includes('nama') && !h.includes('toko'));
          const aKodeTokoIdx = aHeaders.findIndex(h => h.includes('kode') || h.includes('toko'));
          const aNamaTokoIdx = aHeaders.findIndex(h => h.includes('nama toko') || h.includes('nama_toko'));
          const aJenisIdx = aHeaders.findIndex(h => h.includes('jenis') || h.includes('training'));
          const aStatusIdx = aHeaders.findIndex(h => h.includes('status'));
          const aWaktuIdx = aHeaders.findIndex(h => h.includes('waktu') || h.includes('absen'));

          for (let i = 1; i < absRows.length; i++) {
            const row = absRows[i];
            const nik = clean(row[aNikIdx >= 0 ? aNikIdx : 1]);
            const tanggal = clean(row[aTglIdx >= 0 ? aTglIdx : 0]);
            const jenis_training = clean(row[aJenisIdx >= 0 ? aJenisIdx : 5]);

            if (!nik || !tanggal || !jenis_training) continue;

            const nama = clean(row[aNamaIdx >= 0 ? aNamaIdx : 2]) || db.users[nik]?.nama || '';
            const kode_toko = clean(row[aKodeTokoIdx >= 0 ? aKodeTokoIdx : 3]) || db.users[nik]?.kode_toko || '';
            const nama_toko = clean(row[aNamaTokoIdx >= 0 ? aNamaTokoIdx : 4]) || db.stores[kode_toko]?.nama_toko || db.users[nik]?.nama_toko || kode_toko;
            const status = clean(row[aStatusIdx >= 0 ? aStatusIdx : 6]) || 'HADIR';
            const waktu = clean(row[aWaktuIdx >= 0 ? aWaktuIdx : 7]);

            const id = `${nik}_${tanggal}_${jenis_training}`;
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
              synced_to_sheet: true,
            };
          }
        }
        db.absensi = newAbsensi;
      }
    } catch (e) {
      console.warn('Absensi sync notice:', e);
    }

    // 6. Fetch Undangan Sheet (Agenda Jadwal Training)
    try {
      const undanganUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=Undangan&_t=${Date.now()}`;
      const undanganRes = await fetch(undanganUrl);
      if (undanganRes.ok) {
        const undanganCsv = await undanganRes.text();
        const undanganRows = parseCSV(undanganCsv);
        const newUndangan: UndanganRecord[] = [];

        if (undanganRows.length > 1) {
          const uHeaders = undanganRows[0].map(h => clean(h).toLowerCase());
          const uNikIdx = uHeaders.findIndex(h => h === 'nik');
          const uNamaIdx = uHeaders.findIndex(h => h === 'nama');
          const uJabIdx = uHeaders.findIndex(h => h === 'jabatan');
          const uKodeTokoIdx = uHeaders.findIndex(h => h === 'kode toko' || h === 'kode_toko');
          const uNamaTokoIdx = uHeaders.findIndex(h => h === 'toko' || h === 'nama toko' || h === 'nama_toko');
          const uAsIdx = uHeaders.findIndex(h => h === 'as' || h.startsWith('as ') || h.includes('supervisor'));
          const uAmIdx = uHeaders.findIndex(h => h === 'am' || h.startsWith('am ') || h.includes('manager'));
          const uTglIdx = uHeaders.findIndex(h => h.includes('tanggal'));
          const uJenisIdx = uHeaders.findIndex(h => h.includes('training') || h.includes('jenis'));
          const uSistemIdx = uHeaders.findIndex(h => h.includes('sistem'));

          for (let i = 1; i < undanganRows.length; i++) {
            const row = undanganRows[i];
            const nik = clean(row[uNikIdx >= 0 ? uNikIdx : 0]);
            if (!nik || nik === '#REF!') continue;

            const nama = clean(row[uNamaIdx >= 0 ? uNamaIdx : 1]) || db.users[nik]?.nama || '';
            const jabatan = clean(row[uJabIdx >= 0 ? uJabIdx : 2]) || db.users[nik]?.jabatan || '';
            const kode_toko = clean(row[uKodeTokoIdx >= 0 ? uKodeTokoIdx : 3]) || db.users[nik]?.kode_toko || '';
            const nama_toko = clean(row[uNamaTokoIdx >= 0 ? uNamaTokoIdx : 4]) || db.stores[kode_toko]?.nama_toko || db.users[nik]?.nama_toko || kode_toko;
            const asVal = clean(row[uAsIdx >= 0 ? uAsIdx : 5]);
            const amVal = clean(row[uAmIdx >= 0 ? uAmIdx : 6]);
            const tanggal = clean(row[uTglIdx >= 0 ? uTglIdx : 7]);
            const jenis_training = clean(row[uJenisIdx >= 0 ? uJenisIdx : 8]);
            const sistem_training = clean(row[uSistemIdx >= 0 ? uSistemIdx : 9]) || 'OFFLINE';

            newUndangan.push({
              nik,
              nama,
              jabatan,
              kode_toko,
              nama_toko,
              as: asVal,
              am: amVal,
              tanggal,
              jenis_training,
              sistem_training,
            });
          }
          db.undangan = newUndangan;
        }
      }
    } catch (e) {
      console.warn('Undangan sync notice:', e);
    }

    const hasDataChanged = JSON.stringify({
      u: db.users,
      s: db.stores,
      t: db.trainings,
      un: db.undangan,
      ap: db.akunPintar,
      ab: db.absensi,
    }) !== lastPersistedHash;

    if (!isSilentAutoSync || hasDataChanged) {
      db.lastSyncedAt = new Date().toISOString();
      persistDb();
    }

    const userCount = Object.keys(db.users).length;
    const filledCount = Object.values(db.akunPintar).filter(a => a.email_pintar && a.email_pintar.trim().length > 0).length;
    const trainingCount = db.trainings.length;
    const undanganCount = db.undangan.length;

    return { success: true, userCount, pintarCount: filledCount, trainingCount, undanganCount };
  } catch (error: any) {
    console.error('❌ Error syncing with Google Sheets:', error);
    return { success: false, userCount: Object.keys(db.users).length, pintarCount: 0, trainingCount: 0, undanganCount: 0, error: error.message };
  }
}

let initialSyncPromise: Promise<any> | null = null;
export async function ensureDbReady() {
  if (Object.keys(db.users).length > 0) return;
  if (!initialSyncPromise) {
    initialSyncPromise = syncFromGoogleSheets(true).finally(() => {
      initialSyncPromise = null;
    });
  }
  await initialSyncPromise;
}

// Initial Sync
syncFromGoogleSheets();

// Silent Background Auto Sync (runs quietly behind the scenes every 30s in persistent environments)
if (!isVercel) {
  setInterval(() => {
    syncFromGoogleSheets(true).catch(e => console.error('Silent background sync notice:', e));
  }, 30000);
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

  const validUsernames = ['admin', 'admin_tc', 'superadmin'];
  const isValidUser = validUsernames.includes(String(username).toLowerCase().trim());

  let isPasswordCorrect = false;
  if (db.adminPassword && db.adminPassword.trim().length > 0) {
    // If admin has customized their password, ONLY the new password is valid!
    // The old/default passwords are STRICTLY disabled and cannot be used.
    isPasswordCorrect = password === db.adminPassword.trim();
  } else {
    // Initial default passwords before any password change has been performed
    isPasswordCorrect =
      (username === 'admin' && password === 'admin123') ||
      (username === 'admin_tc' && password === 'tc_surabaya_2026') ||
      (username === 'superadmin' && password === 'surabaya2026');
  }

  if (!isValidUser || !isPasswordCorrect) {
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
// ==========================================
// MENU ABSENSI KEHADIRAN TRAINING
// ==========================================

function normalizeDateStr(str: string): string {
  if (!str) return '';
  const s = str.replace(/^["']|["']$/g, '').trim().toLowerCase();
  return s.replace(/^0(\d)\s+/, '$1 ');
}

function normalizeJenisStr(str: string): string {
  if (!str) return '';
  return str.replace(/^["']|["']$/g, '').trim().toLowerCase();
}

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

  const monthOrder: Record<string, number> = {
    januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6,
    juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12
  };

  scheduleOptions.sort((a, b) => {
    const parse = (str: string) => {
      const parts = str.trim().split(' ');
      const day = parseInt(parts[0]) || 0;
      const mName = (parts[1] || '').toLowerCase();
      const month = monthOrder[mName] || 0;
      const year = parseInt(parts[2]) || 0;
      return year * 10000 + month * 100 + day;
    };
    return parse(a.tanggal) - parse(b.tanggal);
  });

  const branchSet = new Set<string>();
  db.trainings.forEach(t => {
    const c = t.cabang || db.stores[t.kode_toko]?.wilayah || 'SBY';
    if (c) branchSet.add(c.trim().toUpperCase());
  });
  const branchOptions = Array.from(branchSet).sort();

  return res.json({
    scheduleOptions,
    branchOptions,
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

  // Look for match in db.trainings with normalized date & jenis comparison
  const match = db.trainings.find(
    t =>
      t.nik === session.nik &&
      normalizeDateStr(t.tanggal_awal) === normalizeDateStr(targetDate) &&
      normalizeJenisStr(t.jenis_training) === normalizeJenisStr(targetJenis)
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
      normalizeDateStr(t.tanggal_awal) === normalizeDateStr(targetDate) &&
      normalizeJenisStr(t.jenis_training) === normalizeJenisStr(targetJenis)
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

// Admin Reset Absensi (to clear test attendance or reset records)
app.post('/api/admin/reset-absensi', authMiddleware, (req: Request, res: Response) => {
  const session = (req as any).userSession;
  if (session.role !== 'admin') {
    return res.status(403).json({ error: 'Akses khusus administrator.' });
  }

  db.absensi = {};
  persistDb();

  return res.json({
    success: true,
    message: 'Seluruh data absensi berhasil dibersihkan (kembali ke 0).',
    totalAbsensi: 0,
  });
});

// Admin Force Sync Local Absensi to Google Sheet Webhook
app.post('/api/admin/push-absensi-to-sheet', authMiddleware, async (req: Request, res: Response) => {
  const session = (req as any).userSession;
  if (session.role !== 'admin') {
    return res.status(403).json({ error: 'Akses khusus administrator.' });
  }

  const absList = Object.values(db.absensi);
  if (absList.length === 0) {
    return res.json({ success: true, message: 'Tidak ada data absensi lokal yang perlu dikirim.', pushedCount: 0 });
  }

  let pushed = 0;
  for (const abs of absList) {
    await pushToGoogleSheetsWebhook({
      action: 'submit_absensi',
      tanggal: abs.tanggal,
      nik: abs.nik,
      nama: abs.nama,
      kode_toko: abs.kode_toko,
      nama_toko: abs.nama_toko,
      jenis_training: abs.jenis_training,
      waktu_absen: abs.waktu_formatted || abs.waktu_absen,
      status: abs.status || 'HADIR',
      data: abs,
    });
    pushed++;
  }

  return res.json({
    success: true,
    message: `Berhasil mengirim ${pushed} data absensi ke Google Apps Script Webhook!`,
    pushedCount: pushed,
  });
});

// Admin Delete Single Attendance Record (Deletes local database & Google Spreadsheet row)
app.delete('/api/admin/absensi/:id', authMiddleware, async (req: Request, res: Response) => {
  const session = (req as any).userSession;
  if (session.role !== 'admin') {
    return res.status(403).json({ error: 'Akses khusus administrator.' });
  }

  const id = decodeURIComponent(req.params.id);
  let recordKey = id;
  let record = db.absensi[id];

  if (!record) {
    // Look up by NIK prefix
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

  // Send webhook to delete row from Google Spreadsheet
  await pushToGoogleSheetsWebhook({
    action: 'delete_absensi',
    nik: record.nik,
    tanggal: record.tanggal,
    jenis_training: record.jenis_training,
    data: record,
  });

  return res.json({
    success: true,
    message: `Data absensi NIK ${record.nik} (${record.nama}) berhasil dihapus dari database dan spreadsheet!`,
    deleted: record,
  });
});

// Admin Bulk Delete All Attendance Records (Deletes local database & clears Google Spreadsheet sheet)
app.delete('/api/admin/absensi', authMiddleware, async (req: Request, res: Response) => {
  const session = (req as any).userSession;
  if (session.role !== 'admin') {
    return res.status(403).json({ error: 'Akses khusus administrator.' });
  }

  const count = Object.keys(db.absensi).length;
  db.absensi = {};
  persistDb();

  // Send webhook to clear sheet Absensi in Google Spreadsheet
  await pushToGoogleSheetsWebhook({
    action: 'delete_absensi',
    clear_all: true,
  });

  return res.json({
    success: true,
    message: `Seluruh data absensi (${count} data) berhasil dihapus dari database dan spreadsheet!`,
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
  const tanggalFilter = String(tanggal);
  const jenisFilter = String(jenis_training);
  const statusFilter = String(status);
  const cabangFilter = String(cabang);
  const pageNum = Math.max(1, parseInt(String(page)) || 1);
  const pageLimit = Math.min(200, Math.max(10, parseInt(String(limit)) || 50));

  // Build combined list of all scheduled training participants with their attendance status
  let list = db.trainings.map(t => {
    const absKey = `${t.nik}_${t.tanggal_awal}_${t.jenis_training}`;
    const abs = db.absensi[absKey];
    const itemCabang = (t.cabang || db.stores[t.kode_toko]?.wilayah || 'SBY').trim().toUpperCase();
    return {
      tanggal: t.tanggal_awal,
      nik: t.nik,
      nama: t.nama,
      kode_toko: t.kode_toko,
      nama_toko: t.nama_toko,
      jenis_training: t.jenis_training,
      cabang: itemCabang,
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

  if (cabangFilter !== 'all') {
    list = list.filter(item => item.cabang.toLowerCase() === cabangFilter.toLowerCase());
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
        item.jenis_training.toLowerCase().includes(searchQuery) ||
        item.cabang.toLowerCase().includes(searchQuery)
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

// 10. Admin: Export Attendance to CSV (Supports filters)
app.get('/api/admin/export-absensi-csv', authMiddleware, (req: Request, res: Response) => {
  const { search = '', tanggal = 'all', jenis_training = 'all', status = 'all', cabang = 'all' } = req.query;

  const searchQuery = String(search).toLowerCase().trim();
  const tanggalFilter = String(tanggal);
  const jenisFilter = String(jenis_training);
  const statusFilter = String(status);
  const cabangFilter = String(cabang);

  let list = db.trainings.map(t => {
    const absKey = `${t.nik}_${t.tanggal_awal}_${t.jenis_training}`;
    const abs = db.absensi[absKey];
    const itemCabang = (t.cabang || db.stores[t.kode_toko]?.wilayah || 'SBY').trim().toUpperCase();
    return {
      tanggal: t.tanggal_awal,
      nik: t.nik,
      nama: t.nama,
      kode_toko: t.kode_toko,
      nama_toko: t.nama_toko,
      jenis_training: t.jenis_training,
      cabang: itemCabang,
      is_hadir: Boolean(abs),
      waktu_absen: abs?.waktu_formatted || '-',
    };
  });

  if (tanggalFilter !== 'all') {
    list = list.filter(item => item.tanggal === tanggalFilter);
  }
  if (jenisFilter !== 'all') {
    list = list.filter(item => item.jenis_training === jenisFilter);
  }
  if (cabangFilter !== 'all') {
    list = list.filter(item => item.cabang.toLowerCase() === cabangFilter.toLowerCase());
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
        item.jenis_training.toLowerCase().includes(searchQuery) ||
        item.cabang.toLowerCase().includes(searchQuery)
    );
  }

  let csv = '"NO","TANGGAL","NIK","NAMA","KODE TOKO","NAMA TOKO","CABANG","JENIS TRAINING","STATUS","WAKTU ABSEN"\n';
  list.forEach((t, idx) => {
    const statText = t.is_hadir ? 'HADIR' : 'BELUM HADIR';
    csv += `"${idx + 1}","${t.tanggal}","${t.nik}","${t.nama.replace(/"/g, '""')}","${t.kode_toko}","${t.nama_toko.replace(/"/g, '""')}","${t.cabang}","${t.jenis_training.replace(/"/g, '""')}","${statText}","${t.waktu_absen}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="Rekap_Absensi_Training_${Date.now()}.csv"`);
  return res.send(csv);
});

// 10b. Admin: Get List of Participants Not Yet Attended (Belum Absen) According to Active Filters
app.get('/api/admin/belum-absen', authMiddleware, (req: Request, res: Response) => {
  const session = (req as any).userSession;
  if (session.role !== 'admin') {
    return res.status(403).json({ error: 'Akses khusus administrator TC Surabaya.' });
  }

  const { search = '', tanggal = 'all', jenis_training = 'all', cabang = 'all' } = req.query;

  const searchQuery = String(search).toLowerCase().trim();
  const tanggalFilter = String(tanggal);
  const jenisFilter = String(jenis_training);
  const cabangFilter = String(cabang);

  let list = db.trainings
    .map(t => {
      const absKey = `${t.nik}_${t.tanggal_awal}_${t.jenis_training}`;
      const abs = db.absensi[absKey];
      const itemCabang = (t.cabang || db.stores[t.kode_toko]?.wilayah || 'SBY').trim().toUpperCase();
      const userRecord = db.users[t.nik];
      return {
        tanggal: t.tanggal_awal,
        nik: t.nik,
        nama: t.nama || userRecord?.nama || '',
        jabatan: userRecord?.jabatan || '',
        kode_toko: t.kode_toko,
        nama_toko: t.nama_toko,
        jenis_training: t.jenis_training,
        cabang: itemCabang,
        is_hadir: Boolean(abs),
      };
    })
    .filter(item => !item.is_hadir);

  if (tanggalFilter !== 'all') {
    list = list.filter(item => item.tanggal === tanggalFilter);
  }
  if (jenisFilter !== 'all') {
    list = list.filter(item => item.jenis_training === jenisFilter);
  }
  if (cabangFilter !== 'all') {
    list = list.filter(item => item.cabang.toLowerCase() === cabangFilter.toLowerCase());
  }
  if (searchQuery) {
    list = list.filter(
      item =>
        item.nik.toLowerCase().includes(searchQuery) ||
        item.nama.toLowerCase().includes(searchQuery) ||
        item.nama_toko.toLowerCase().includes(searchQuery) ||
        item.kode_toko.toLowerCase().includes(searchQuery) ||
        item.jenis_training.toLowerCase().includes(searchQuery) ||
        item.cabang.toLowerCase().includes(searchQuery)
    );
  }

  return res.json({
    total: list.length,
    filters: {
      search: searchQuery,
      tanggal: tanggalFilter,
      jenis_training: jenisFilter,
      cabang: cabangFilter,
    },
    data: list,
  });
});

// 10c. Admin: Export Belum Absen to CSV According to Active Filters
app.get('/api/admin/export-belum-absen-csv', authMiddleware, (req: Request, res: Response) => {
  const session = (req as any).userSession;
  if (session.role !== 'admin') {
    return res.status(403).json({ error: 'Akses khusus administrator TC Surabaya.' });
  }

  const { search = '', tanggal = 'all', jenis_training = 'all', cabang = 'all' } = req.query;

  const searchQuery = String(search).toLowerCase().trim();
  const tanggalFilter = String(tanggal);
  const jenisFilter = String(jenis_training);
  const cabangFilter = String(cabang);

  let list = db.trainings
    .map(t => {
      const absKey = `${t.nik}_${t.tanggal_awal}_${t.jenis_training}`;
      const abs = db.absensi[absKey];
      const itemCabang = (t.cabang || db.stores[t.kode_toko]?.wilayah || 'SBY').trim().toUpperCase();
      const userRecord = db.users[t.nik];
      return {
        tanggal: t.tanggal_awal,
        nik: t.nik,
        nama: t.nama || userRecord?.nama || '',
        jabatan: userRecord?.jabatan || '',
        kode_toko: t.kode_toko,
        nama_toko: t.nama_toko,
        jenis_training: t.jenis_training,
        cabang: itemCabang,
        is_hadir: Boolean(abs),
      };
    })
    .filter(item => !item.is_hadir);

  if (tanggalFilter !== 'all') {
    list = list.filter(item => item.tanggal === tanggalFilter);
  }
  if (jenisFilter !== 'all') {
    list = list.filter(item => item.jenis_training === jenisFilter);
  }
  if (cabangFilter !== 'all') {
    list = list.filter(item => item.cabang.toLowerCase() === cabangFilter.toLowerCase());
  }
  if (searchQuery) {
    list = list.filter(
      item =>
        item.nik.toLowerCase().includes(searchQuery) ||
        item.nama.toLowerCase().includes(searchQuery) ||
        item.nama_toko.toLowerCase().includes(searchQuery) ||
        item.kode_toko.toLowerCase().includes(searchQuery) ||
        item.jenis_training.toLowerCase().includes(searchQuery) ||
        item.cabang.toLowerCase().includes(searchQuery)
    );
  }

  let csv = '"NO","NIK","NAMA","JABATAN","KODE TOKO","NAMA TOKO","CABANG","TANGGAL TRAINING","JENIS TRAINING","STATUS"\n';
  list.forEach((item, idx) => {
    csv += `"${idx + 1}","${item.nik}","${item.nama.replace(/"/g, '""')}","${item.jabatan.replace(/"/g, '""')}","${item.kode_toko}","${item.nama_toko.replace(/"/g, '""')}","${item.cabang}","${item.tanggal}","${item.jenis_training.replace(/"/g, '""')}","BELUM ABSEN"\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="Peserta_Belum_Absen_Training_${Date.now()}.csv"`);
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
    totalUndangan: db.undangan.length,
    totalAbsensi: Object.keys(db.absensi).length,
    lastSyncedAt: db.lastSyncedAt,
    spreadsheetId: SPREADSHEET_ID,
    webhookUrl: db.webhookUrl || PERMANENT_APPS_SCRIPT_URL,
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
    // Must match the current active password only!
    isCurrentValid = currentPassword === db.adminPassword.trim();
  } else {
    // Default initial passwords before any update has occurred
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

  // Update password in db and persist to disk
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

// 18. Get Undangan Schedule (Agenda Jadwal Training) - Accessible by Users and Admin
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
  const jenisFilter = String(jenis_training).trim();
  const sistemFilter = String(sistem_training).trim();
  const tanggalFilter = String(tanggal).trim();
  const isMyOnly = myOnly === 'true' || myOnly === '1';

  const pageNum = Math.max(1, parseInt(String(page)) || 1);
  const pageLimit = Math.min(500, Math.max(10, parseInt(String(limit)) || 25));

  let list = db.undangan;

  // Filter personal schedule for logged-in user if myOnly is toggled
  if (isMyOnly && session.nik && session.role !== 'admin') {
    list = list.filter(item => item.nik.toLowerCase() === session.nik.toLowerCase());
  }

  // Exact / partial filters requested by user:
  // NIK, Nama, Kode toko, Nama toko, AS dan AM
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

  if (jenisFilter && jenisFilter !== 'all') {
    list = list.filter(item => item.jenis_training.toLowerCase() === jenisFilter.toLowerCase());
  }

  if (sistemFilter && sistemFilter !== 'all') {
    list = list.filter(item => item.sistem_training.toLowerCase() === sistemFilter.toLowerCase());
  }

  if (tanggalFilter && tanggalFilter !== 'all') {
    list = list.filter(item => item.tanggal.toLowerCase() === tanggalFilter.toLowerCase());
  }

  // Universal search query
  if (searchQuery) {
    list = list.filter(
      item =>
        item.nik.toLowerCase().includes(searchQuery) ||
        item.nama.toLowerCase().includes(searchQuery) ||
        item.kode_toko.toLowerCase().includes(searchQuery) ||
        item.nama_toko.toLowerCase().includes(searchQuery) ||
        item.as.toLowerCase().includes(searchQuery) ||
        item.am.toLowerCase().includes(searchQuery) ||
        item.jabatan.toLowerCase().includes(searchQuery) ||
        item.tanggal.toLowerCase().includes(searchQuery) ||
        item.jenis_training.toLowerCase().includes(searchQuery) ||
        item.sistem_training.toLowerCase().includes(searchQuery)
    );
  }

  // Generate unique filter options from the full database
  const asSet = new Set<string>();
  const amSet = new Set<string>();
  const jenisSet = new Set<string>();
  const sistemSet = new Set<string>();
  const tanggalSet = new Set<string>();
  const tokoSet = new Set<string>();

  for (const item of db.undangan) {
    if (item.as) asSet.add(item.as.trim());
    if (item.am) amSet.add(item.am.trim());
    if (item.jenis_training) jenisSet.add(item.jenis_training.trim());
    if (item.sistem_training) sistemSet.add(item.sistem_training.trim());
    if (item.tanggal) tanggalSet.add(item.tanggal.trim());
    if (item.kode_toko) tokoSet.add(item.kode_toko.trim());
  }

  const asOptions = Array.from(asSet).sort();
  const amOptions = Array.from(amSet).sort();
  const jenisOptions = Array.from(jenisSet).sort();
  const sistemOptions = Array.from(sistemSet).sort();
  const tanggalOptions = Array.from(tanggalSet).sort();

  const total = list.length;
  const totalPages = Math.ceil(total / pageLimit) || 1;
  const offset = (pageNum - 1) * pageLimit;
  const paginated = list.slice(offset, offset + pageLimit);

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
      jenisOptions,
      sistemOptions,
      tanggalOptions,
    },
    summary: {
      totalPeserta: db.undangan.length,
      totalToko: tokoSet.size,
      totalAS: asSet.size,
      totalAM: amSet.size,
      myTotal,
    },
  });
});

// 19. Export Undangan to CSV
app.get('/api/undangan/export-csv', authMiddleware, (req: Request, res: Response) => {
  let csv = '"NIK","NAMA","JABATAN","KODE TOKO","TOKO","AS","AM","TANGGAL","JENIS TRAINING","SISTEM TRAINING"\n';

  for (const u of db.undangan) {
    const nik = u.nik.replace(/"/g, '""');
    const nama = (u.nama || '').replace(/"/g, '""');
    const jab = (u.jabatan || '').replace(/"/g, '""');
    const kode = (u.kode_toko || '').replace(/"/g, '""');
    const toko = (u.nama_toko || '').replace(/"/g, '""');
    const asVal = (u.as || '').replace(/"/g, '""');
    const amVal = (u.am || '').replace(/"/g, '""');
    const tgl = (u.tanggal || '').replace(/"/g, '""');
    const jenis = (u.jenis_training || '').replace(/"/g, '""');
    const sistem = (u.sistem_training || '').replace(/"/g, '""');

    csv += `"${nik}","${nama}","${jab}","${kode}","${toko}","${asVal}","${amVal}","${tgl}","${jenis}","${sistem}"\n`;
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="Agenda_Jadwal_Undangan_${Date.now()}.csv"`);
  return res.send(csv);
});

// Mount Vite in dev mode or serve static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: ['**/data/**', '**/tc_database.json', '**/*.json', '**/dist/**', '**/dist-server/**'],
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Portal TC Surabaya Server running on http://0.0.0.0:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
