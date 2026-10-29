import { FLOOR_DEFAULT, FLOOR_MATERIALS } from '../iso/palette'
import { ROOM_FROM_FILE, ROOM_FIXED, normalOpasitas, normalRotasi, ukuranSah, type Scene, type SceneObject } from './types'
import { gayaLangit, presetOf } from './presets'

// v4: ruangan saja (fase penyamaan ruangan dengan referensi; objek menyusul)
// v5: objek bisa berperan sebagai LANTAI ruangan (role 'lantai')
// v6: lantai memakai palet kayu selang-seling (style dari FLOOR_MATERIALS)
// v7 (2026-10-29): draf v6 yang berisi objek JENDELA lama (versi balok)
// sengaja DITINGGALKAN — user meminta jendela lama dihapus dari kanvas dan
// diganti bentuk baru (silinder/kerucut). Draf lama tidak dimigrasikan.
const DRAFT_KEY = 'isola-draft-v8'
const LOCKED_KEY = 'isola-locked-v8'
const PREV_DRAFT_KEYS = ['isola-draft-v5', 'isola-draft-v4'] as const

// ---------------------------------------------------------------------------
// LATAR (permintaan user 2026-10-29): lapisan background kanvas.
// Objek ber-flag `latar` tidak pernah hilang karena UNDO / REDO / IMPORT /
// PULIHKAN — helper `gabungLatar()` selalu mengembalikan set latar yang
// sedang aktif ke scene tujuan.
// ---------------------------------------------------------------------------
export const LATAR_TAG = 'latar-v1'

export function objekLatar(scene: Scene): SceneObject[] {
  return scene.objects.filter(o => o.latar === true)
}

export function objekBiasa(scene: Scene): SceneObject[] {
  return scene.objects.filter(o => o.latar !== true)
}

/** scene tujuan + set LATAR milik scene sumber (latar tidak bisa hilang) */
export function gabungLatar(target: Scene, sumber: Scene): Scene {
  const latar = objekLatar(sumber)
  const meta = {
    locked: Boolean(target.meta?.locked),
    savedAt: target.meta?.savedAt ?? null,
    ...(target.meta?.latarMigrasi || latar.length ? { latarMigrasi: LATAR_TAG } : {}),
  }
  if (latar.length === 0) return { ...target, meta }
  const ids = new Set(latar.map(o => o.id))
  return { ...target, meta, objects: [...latar, ...objekBiasa(target).filter(o => !ids.has(o.id))] }
}

export function emptyRoom(): Scene {
  return {
    version: 1,
    room: { ...ROOM_FIXED },
    objects: [],
    meta: { locked: false, savedAt: null },
  }
}

export function loadDraft(): Scene {
  return migrasiLatar(normalize(read(DRAFT_KEY) ?? migratePrevDraft() ?? emptyRoom()))
}

// Migrasi sekali jalan dari draft lama (v5/v4): objek berupa "lempeng" besar &
// tipis (mis. yang dibuat user: 17.2 x 22.8 x 0.5) diubah menjadi LANTAI ruangan.
function migratePrevDraft(): Scene | null {
  for (const key of PREV_DRAFT_KEYS) {
    const prev = read(key)
    if (prev) {
      const migrated = normalize(prev)
      write(DRAFT_KEY, migrated)
      return migrated
    }
  }
  return null
}

// Penjaga konsistensi (jalan setiap kali draft dimuat, versi apa pun):
// - objek "lempeng" besar & tipis otomatis jadi lantai (z=0)
// - objek ber-role lantai WAJIB memakai palet lantai; kalau style lama masih
//   material balok (mis. 'wood-dark'), diganti FLOOR_DEFAULT -> kayu selang-seling
// - nilai z milik user DIHORMATI bila role 'lantai' sudah diset eksplisit
//   (lantai boleh dinaikkan); z hanya dipaksa 0 saat objek dikonversi otomatis
function normalize(scene: Scene): Scene {
  let changed = false
  const objects = scene.objects.map(o => {
    const styleIsFloor = typeof o.style === 'string' && FLOOR_MATERIALS[o.style] !== undefined
    // "lempeng": luas bidang >= 8x8 tile dan tipis (<= 2 z) -> jelas lantai
    const isSlab = o.size.e >= 8 && o.size.w >= 8 && o.size.z <= 2
    // dinding TIDAK boleh ikut dikonversi menjadi lantai
    const asFloor = o.role !== 'dinding' && (o.role === 'lantai' || styleIsFloor || isSlab)
    if (!asFloor) return o
    const styleOk = typeof o.style === 'string' && FLOOR_MATERIALS[o.style] !== undefined
    const explicitFloor = o.role === 'lantai'
    const next: SceneObject = {
      ...o,
      role: 'lantai',
      style: styleOk ? o.style : FLOOR_DEFAULT,
      // role eksplisit -> z user dibiarkan; konversi otomatis -> z diturunkan
      pos: explicitFloor ? { ...o.pos } : { ...o.pos, z: 0 },
    }
    if (!explicitFloor || !styleOk || (!explicitFloor && o.pos.z !== 0)) changed = true
    return next
  })
  if (!changed) return scene
  const fixed: Scene = { ...scene, objects }
  write(DRAFT_KEY, fixed)
  return fixed
}
export function saveDraft(scene: Scene) { write(DRAFT_KEY, scene) }

export function loadLocked(): Scene | null {
  const s = read(LOCKED_KEY)
  return s && s.meta?.locked ? s : null
}
export function saveLocked(scene: Scene) { write(LOCKED_KEY, scene) }

// ---------------------------------------------------------------------------
// PERLINDUNGAN DATA (permintaan user 2026-10-28: "kenapa tiba-tiba objek
// hilang? bisa kembalikan?"). Draf disimpan otomatis pada setiap perubahan,
// sehingga satu kondisi buruk (draf kosong/rusak, import salah, reload di
// browser lain) bisa menimpa scene yang sudah susah payah dibuat.
//   • BACKUP : scene non-kosong terakhir (tidak pernah ditimpa scene kosong)
//   • RIWAYAT: 12 cuplikan terakhir (maks. satu per 20 detik, atau segera bila
//              jumlah objek berubah) agar beberapa langkah bisa dimundurkan
// Keduanya dibaca lewat loadHistory()/loadCandidates() untuk panel PULIHKAN.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// PENYIMPANAN CADANGAN DI SISI FILE (lewat dev-server, lihat vite.config.ts)
// localStorage TIDAK bisa diandalkan di preview ini: origin host preview bisa
// berubah, iframe pihak ketiga sering memblokir storage, dan mode privat
// menghapusnya tiap browser ditutup. Jadi scene juga ditulis ke file workspace
// (.isola-scene.json) supaya bertahan melewati restart browser & sandbox.
// ---------------------------------------------------------------------------
const API_SCENE = '/api/scene'

/** apakah localStorage benar-benar bisa dipakai (bisa gagal tanpa suara) */
export function storageWorks(): boolean {
  try {
    const k = '__isola_probe__'
    localStorage.setItem(k, '1')
    const ok = localStorage.getItem(k) === '1'
    localStorage.removeItem(k)
    return ok
  } catch {
    return false
  }
}

/**
 * NORMALISASI sebelum scene keluar dari editor (file .isola-scene.json,
 * EXPORT/UNDUH, dan salin JSON). Tujuannya supaya APK tidak pernah menerima
 * variasi liar: semua angka maks 3 desimal (aturan 32 px dihapus 2026-10-29),
 * ukuran minimal 0.001 (permintaan user 2026-10-29), id unik,
 * label terisi, urutan tumpukan bulat, dan urutan array stabil
 * (latar dulu, lalu urutan tumpukan). Lihat docs/04-KONTRAK-RENDERER.md.
 */
const JENIS_ANIM = ['naik-turun', 'ayun', 'denyut', 'kedip', 'putar'] as const

// MIGRASI KACA LANGIT (2026-10-29): scene yang dibuat SEBELUM fitur langit ada
// belum punya `langit: true` pada bagian kacanya, sehingga jendela tampil biru
// statis — matahari & awan tidak pernah muncul. Daftar gaya diambil dari
// katalog (presets), jadi ikut berubah kalau objek langit baru ditambahkan.
const GAYA_LANGIT = gayaLangit()
const perluLangit = (o: { langit?: boolean; preset?: string; style?: unknown }) =>
  o.langit !== true && o.preset !== undefined && GAYA_LANGIT.has(String(o.style))

/** animasi yang sah saja yang boleh masuk file (jenis dikenal, angka dibatasi) */
function normalAnim(a: SceneObject['anim']): SceneObject['anim'] | null {
  if (!a || typeof a !== 'object') return null
  if (!JENIS_ANIM.includes(a.jenis as (typeof JENIS_ANIM)[number])) return null
  const angka = (v: unknown, def: number, lo: number, hi: number) => {
    const n = typeof v === 'number' && Number.isFinite(v) ? v : def
    return Math.round(Math.min(hi, Math.max(lo, n)) * 100) / 100
  }
  return {
    jenis: a.jenis,
    laju: angka(a.laju, 0.5, 0.05, 5),
    besar: angka(a.besar, 1, 0.1, 5),
    fase: angka(a.fase, 0, 0, 1),
  }
}

const rafel = (x: unknown) => {
  const n = typeof x === 'number' && Number.isFinite(x) ? x : 0
  return Math.round(Math.max(-0.5, Math.min(1.5, n)) * 1000) / 1000
}

export function normalisasiScene(scene: Scene): Scene {
  const snap = (v: number) => Math.round((Number.isFinite(v) ? v : 0) * 1000) / 1000
  const dipakai = new Set<string>()
  // OBJEK TIDAK LAGI DIBUANG (perbaikan 2026-10-29).
  // Dulu objek yang menunjuk preset yang sudah tidak ada di katalog (sisa
  // katalog lama) DIHAPUS diam-diam saat normalisasi — termasuk saat autosave
  // menulis ke file. Akibatnya objek bisa "hilang ketika refresh": begitu file
  // ditulis tanpa objek itu, refresh berikutnya memuat scene yang sudah
  // kehilangan objek tersebut. Sekarang objeknya TETAP ADA; hanya penanda
  // presetnya yang dibuang (geometri, posisi, warna tidak berubah).
  // TIRAI DIHAPUS (permintaan user 2026-10-29: "hapus saja tirainya").
  // Objek bertanda `tirai: true` (bagian tirai jendela) dibuang di sini, jadi
  // tirai hilang juga dari draf browser lama, file scene, maupun hasil IMPORT —
  // bukan hanya dari katalog. Material kainnya tetap ada bila nanti diperlukan.
  // Dikenali dari TIGA tanda: penanda `tirai`, id `...-tirai-N` (pola migrasi
  // lama), atau label "TIRAI n". Penanda saja tidak cukup karena versi pertama
  // sempat tidak menyimpannya.
  const buangTirai = (o0: SceneObject) =>
    o0.tirai === true ||
    (o0.preset === 'jendela' &&
      (String(o0.id ?? '').includes('-tirai-') || /^TIRAI\b/i.test(String(o0.label ?? ''))))
  const objects = scene.objects
    .filter(o0 => !buangTirai(o0 as SceneObject))
    .map((o0, i) => {
    let id = (o0.id ?? '').trim() || `objek-${i + 1}`
    while (dipakai.has(id)) id = `${id}-${i + 1}`
    dipakai.add(id)
    // 2026-10-29 (ronde 17): field `sprite` (versi pixel hasil potongan gambar
    // referensi) sudah DIHAPUS. Scene lama yang masih menyimpannya dibersihkan
    // di sini supaya data tidak menggelembung dengan kunci mati.
    const { sprite: _buangSprite, ...o } = o0 as SceneObject & { sprite?: string }
    void _buangSprite
    // preset yang tidak dikenal katalog -> penanda dibuang, objek dipertahankan
    if (o.preset && !presetOf(o.preset)) delete (o as { preset?: string }).preset
    return {
      ...o,
      id,
      label: (o.label ?? '').trim() || id,
      pos: { e: snap(o.pos.e), w: snap(o.pos.w), z: snap(o.pos.z) },
      size: {
        e: ukuranSah(o.size.e),
        w: ukuranSah(o.size.w),
        z: ukuranSah(o.size.z),
      },
      ...(o.urutan === undefined ? {} : { urutan: Math.round(o.urutan) }),
      // KACA LANGIT dinamis (jendela): dibawa bila true, atau dinyalakan
      // otomatis untuk scene lama yang bagian kacanya belum bertanda.
      ...(o.langit === true || perluLangit(o) ? { langit: true } : {}),
      // TRANSPARANSI: dibatasi 0.05..1 dan dibulatkan 2 desimal; nilai 1
      // (pekat) tidak ditulis supaya file tetap ramping.
      ...(o.opasitas === undefined ? {} : { opasitas: normalOpasitas(o.opasitas) }),
      // ROTASI OBJEK (kelipatan 30°). Data lama `rot` 0..3 = 90° per langkah
      // dimigrasi sekali di sini; `rot` lama tidak ditulis ulang.
      ...(() => {
        const lama = typeof o.rot === 'number' ? o.rot * 90 : 0
        const deg = normalRotasi(typeof o.rotasi === 'number' ? o.rotasi : lama)
        // `rot` lama tidak pernah ditulis ulang (hanya dibaca)
        return deg === 0 ? {} : { rotasi: deg }
      })(),
    }
  })
  // opasitas 1 = pekat = tidak perlu disimpan (file tetap ramping)
  for (const o of objects) {
    if (o.opasitas !== undefined && o.opasitas >= 1) delete o.opasitas
  }
  objects.sort((a, b) =>
    Number(b.latar === true) - Number(a.latar === true)
    || (a.urutan ?? 0) - (b.urutan ?? 0))
  return {
    ...scene,
    version: 1,
    objects,
    meta: {
      locked: Boolean(scene.meta?.locked),
      savedAt: scene.meta?.savedAt ?? null,
      ...(scene.meta?.latarMigrasi ? { latarMigrasi: scene.meta.latarMigrasi } : {}),
      // cap waktu simpan WAJIB ikut saat scene dibaca dari file, kalau tidak
      // perbandingan "mana yang lebih baru" saat boot selalu kalah ke draf.
      ...(typeof scene.meta?.updatedAt === 'string' ? { updatedAt: scene.meta.updatedAt } : {}),
      ...(typeof scene.meta?.latarGambar === 'string' ? { latarGambar: scene.meta.latarGambar } : {}),
      ...(scene.meta?.latarMode === 'muat' || scene.meta?.latarMode === 'isi'
        ? { latarMode: scene.meta.latarMode } : {}),
    },
  }
}

/** scene terakhir di file server (null bila belum ada / gagal) */
/**
 * SIMPAN DARURAT (perbaikan "objek hilang ketika refresh", 2026-10-29).
 * Autosave ke file server memakai jeda 600 ms; kalau halaman di-refresh/
 * ditutup sebelum jeda itu habis, permintaan POST biasa dibatalkan browser dan
 * objek terakhir tidak pernah sampai ke file. Fungsi ini menulis LANGSUNG saat
 * halaman ditinggalkan: sendBeacon (tidak dibatalkan) atau fetch keepalive.
 */
export function simpanDarurat(scene: Scene) {
  if (!scene || !Array.isArray(scene.objects) || scene.objects.length === 0) return
  let body: string
  try {
    body = JSON.stringify({ savedAt: new Date().toISOString(), scene: normalisasiScene(scene) })
  } catch {
    return
  }
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' })
      if (navigator.sendBeacon(API_SCENE, blob)) return
    }
  } catch {
    /* lanjut ke fetch keepalive */
  }
  try {
    void fetch(API_SCENE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    })
  } catch {
    /* offline — draf browser tetap menyimpan */
  }
}

export async function loadSceneFile(): Promise<Scene | null> {
  try {
    const r = await fetch(API_SCENE, { cache: 'no-store' })
    if (!r.ok) return null
    const txt = await r.text()
    if (!txt) return null
    const data = JSON.parse(txt)
    const raw = data && typeof data === 'object' && 'scene' in data ? data.scene : data
    const sc = validateScene(raw)
    return sc ? migrasiLatar(sc) : null
  } catch {
    return null
  }
}

/**
 * simpan scene ke file server (dipakai debounce oleh App).
 * PENTING: scene KOSONG tidak pernah ditulis ke file. Kalau ditulis, satu
 * kondisi buruk (draf browser kosong) akan MENGHAPUS cadangan terakhir —
 * inilah penyebab objek "hilang" yang sesungguhnya. Dikosongkan hanya lewat
 * aksi eksplisit (IMPORT yang memang kosong) dengan `izinkanKosong = true`.
 */
export async function saveSceneFile(scene: Scene, izinkanKosong = false): Promise<boolean> {
  if (scene.objects.length === 0 && !izinkanKosong) return false
  try {
    const r = await fetch(API_SCENE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // file selalu NORMAL: APK tidak boleh menerima angka kotor
      body: JSON.stringify({ savedAt: new Date().toISOString(), scene: normalisasiScene(scene) }),
    })
    return r.ok
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// GAMBAR LATAR (background kanvas) — permintaan user 2026-10-29
// Berkas gambar disimpan terpisah dari scene.json (lihat vite.config.ts).
// ---------------------------------------------------------------------------
const API_LATAR = '/api/latar'

/** URL gambar latar untuk token tertentu (token = pembeda cache) */
export function latarImageUrl(token: string): string {
  return `${API_LATAR}?v=${encodeURIComponent(token)}`
}

/** unggah gambar latar (dataURL) -> token versi, atau null bila gagal */
export async function saveLatarImage(dataUrl: string): Promise<string | null> {
  try {
    const r = await fetch(API_LATAR, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl }),
    })
    if (!r.ok) return null
    const j = await r.json()
    return typeof j?.token === 'string' && j.token ? j.token : null
  } catch {
    return null
  }
}

/** hapus gambar latar dari penyimpanan */
export async function hapusLatarImage(): Promise<boolean> {
  try {
    const r = await fetch(API_LATAR, { method: 'DELETE' })
    return r.ok
  } catch {
    return false
  }
}

/** apakah server masih menyimpan gambar latar */
export async function adaLatarImage(): Promise<boolean> {
  try {
    const r = await fetch(API_LATAR, { method: 'GET', cache: 'no-store' })
    return r.ok && r.status !== 204
  } catch {
    return false
  }
}

const BACKUP_KEY = 'isola-cadangan-v1'
const HIST_KEY = 'isola-riwayat-v1'
const HIST_MAX = 12
const HIST_GAP_MS = 20000

export interface Snapshot {
  t: string
  n: number
  scene: Scene
}

let lastHistAt = 0

function pushHistory(scene: Scene) {
  try {
    const raw = localStorage.getItem(HIST_KEY)
    const list: Snapshot[] = raw ? (JSON.parse(raw) as Snapshot[]) : []
    const last = list[list.length - 1]
    const now = Date.now()
    const countChanged = !last || last.n !== scene.objects.length
    if (!countChanged && now - lastHistAt < HIST_GAP_MS) return
    list.push({ t: new Date(now).toISOString(), n: scene.objects.length, scene })
    while (list.length > HIST_MAX) list.shift()
    localStorage.setItem(HIST_KEY, JSON.stringify(list))
    lastHistAt = now
  } catch {
    /* storage penuh/private — riwayat dilewati */
  }
}

/** simpan draf + cadangan non-kosong + cuplikan riwayat */
export function saveDraftGuarded(scene: Scene) {
  if (scene.objects.length > 0) write(BACKUP_KEY, scene)
  pushHistory(scene)
  write(DRAFT_KEY, scene)
}

/** cuplikan riwayat terbaru -> terlama */
export function loadHistory(): Snapshot[] {
  try {
    const raw = localStorage.getItem(HIST_KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as Snapshot[]
    return Array.isArray(list) ? [...list].reverse() : []
  } catch {
    return []
  }
}

/** semua sumber yang bisa dipulihkan: cadangan, riwayat, versi terkunci, draf lama */
export function loadCandidates(): { label: string; n: number; scene: Scene }[] {
  const out: { label: string; n: number; scene: Scene }[] = []

  const backup = read(BACKUP_KEY)
  if (backup && backup.objects.length > 0) {
    out.push({ label: 'cadangan (scene non-kosong terakhir)', n: backup.objects.length, scene: backup })
  }

  for (const s of loadHistory()) {
    // cuplikan kosong tidak ditawarkan (tidak ada gunanya dipulihkan)
    if (s.n === 0) continue
    const jam = s.t.slice(11, 19)
    out.push({ label: `riwayat ${jam}`, n: s.n, scene: s.scene })
  }

  const locked = read(LOCKED_KEY)
  if (locked && locked.objects.length > 0) {
    out.push({ label: 'scene terkunci (SIMPAN & KUNCI)', n: locked.objects.length, scene: locked })
  }

  const draft = read(DRAFT_KEY)
  if (draft && draft.objects.length > 0) {
    out.push({ label: 'draf aktif sekarang', n: draft.objects.length, scene: draft })
  }

  for (const key of PREV_DRAFT_KEYS) {
    const prev = read(key)
    if (prev && prev.objects.length > 0) {
      out.push({ label: `draf lama ${key}`, n: prev.objects.length, scene: prev })
    }
  }

  // SISA PENYELAMATAN: sisir SEMUA key localStorage. Kalau ada JSON apa pun yang
  // berisi array `objects`, tawarkan juga -> menangkap data yang tersimpan di
  // key tak terduga (nama versi lama, hasil eksperimen, dsb).
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      const raw = localStorage.getItem(key)
      if (!raw || raw[0] !== '{') continue
      let data: unknown
      try { data = JSON.parse(raw) } catch { continue }
      const objs = (data as { objects?: unknown })?.objects
      if (!Array.isArray(objs) || objs.length === 0) continue
      const sc = validateScene(data)
      if (!sc || sc.objects.length === 0) continue
      const dup = out.some(o => {
        const a = JSON.stringify(o.scene.objects)
        const b = JSON.stringify(sc.objects)
        return a === b
      })
      if (dup) continue
      out.push({ label: `tersimpan di "${key}"`, n: sc.objects.length, scene: sc })
    }
  } catch {
    /* localStorage tidak bisa disisir — abaikan */
  }
  return out
}

/** true bila ada data yang bisa dipulihkan (dipakai untuk peringatan "objek 0") */
export function hasRecoverable(): boolean {
  return loadCandidates().length > 0
}

// ---------------------------------------------------------------------------
// KANDIDAT PEMULIHAN (fitur PULIHKAN — permintaan user 2026-10-29:
// "buatkan fitur untuk mengembalikan objek yg hilang ketika refresh localhost")
// ---------------------------------------------------------------------------
export interface Kandidat {
  label: string
  /** jumlah objek dalam kandidat */
  n: number
  /** cap waktu (epoch ms); 0 bila tidak ada */
  waktu: number
  scene: Scene
  /** dari mana asalnya: penyimpanan browser atau file server */
  sumber: 'browser' | 'file'
}

/**
 * Semua sumber yang bisa dipulihkan, digabung:
 *   1. penyimpanan browser (cadangan, riwayat, scene terkunci, draf, key lain)
 *   2. file scene di server (/api/scene)
 * Duplikat isi dibuang. Urutan: objek TERBANYAK dulu (paling mungkin berisi
 * objek yang hilang), lalu yang paling baru.
 */
export async function kandidatPulihkan(
  opsi: { berkas?: () => Promise<Scene | null> } = {},
): Promise<Kandidat[]> {
  const out: Kandidat[] = []
  const sudah = new Set<string>()
  const tambah = (label: string, sc: Scene | null, sumber: Kandidat['sumber']) => {
    if (!sc || !Array.isArray(sc.objects) || sc.objects.length === 0) return
    const kunci = JSON.stringify(sc.objects)
    if (sudah.has(kunci)) return
    sudah.add(kunci)
    const cap = String(sc.meta?.updatedAt ?? sc.meta?.savedAt ?? '')
    out.push({
      label,
      n: sc.objects.length,
      waktu: Date.parse(cap) || 0,
      scene: sc,
      sumber,
    })
  }

  for (const c of loadCandidates()) tambah(c.label, c.scene, 'browser')
  try {
    const berkas = await (opsi.berkas ?? loadSceneFile)()
    tambah('file di server', berkas, 'file')
  } catch {
    /* server tidak bisa dihubungi — kandidat browser tetap ditawarkan */
  }

  out.sort((a, b) => b.n - a.n || b.waktu - a.waktu)
  return out
}

/** jumlah objek TERBANYAK yang masih bisa dipulihkan (dipakai peringatan boot) */
export function objekTerbanyakKandidat(): number {
  let max = 0
  for (const c of loadCandidates()) if (c.n > max) max = c.n
  return max
}


function read(key: string): Scene | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return validateScene(JSON.parse(raw))
  } catch {
    return null
  }
}

function write(key: string, scene: Scene) {
  try {
    localStorage.setItem(key, JSON.stringify(scene))
  } catch {
    /* storage penuh/private — editor tetap jalan di memori */
  }
}

export function validateScene(data: unknown): Scene | null {
  if (typeof data !== 'object' || data === null) return null
  const d = data as Partial<Scene>
  if (!Array.isArray(d.objects)) return null
  const objects: SceneObject[] = []
  for (const o of d.objects) {
    if (typeof o !== 'object' || o === null) continue
    const ob = o as Partial<SceneObject>
    if (typeof ob.id !== 'string' || !ob.pos || !ob.size) continue
    objects.push({
      id: ob.id,
      label: typeof ob.label === 'string' ? ob.label : ob.id,
      pos: { e: num(ob.pos.e), w: num(ob.pos.w), z: num(ob.pos.z) },
      size: {
        // 2026-10-29: minimum ukuran 0.001 tile, kelipatan 0.001
        e: ukuranSah(num(ob.size.e)),
        w: ukuranSah(num(ob.size.w)),
        z: ukuranSah(num(ob.size.z)),
      },
      style: typeof ob.style === 'string' || (typeof ob.style === 'object' && ob.style !== null)
        ? ob.style as SceneObject['style']
        : 'wood',
      app: typeof ob.app === 'string' ? ob.app : null,
      // ROTASI: pakai `rotasi` (kelipatan 30). Data lama `rot` 0..3 = 90° per
      // langkah tetap dibaca lalu diubah ke derajat.
      ...(() => {
        const lama = typeof ob.rot === 'number' ? ob.rot * 90 : 0
        const deg = normalRotasi(typeof ob.rotasi === 'number' ? ob.rotasi : lama)
        return deg === 0 ? {} : { rotasi: deg }
      })(),
      ...(normalAnim(ob.anim) ? { anim: normalAnim(ob.anim)! } : {}),
      ...(typeof ob.refleksi === 'boolean' ? { refleksi: ob.refleksi } : {}),
      ...(() => {
        if (ob.opasitas === undefined) return {}
        const op = normalOpasitas(ob.opasitas)
        return op >= 1 ? {} : { opasitas: op }
      })(),
      ...(ob.polaRot === 1 ? { polaRot: 1 as const } : {}),
      ...(ob.role === 'lantai' || ob.role === 'dinding' ? { role: ob.role } : {}),
      ...(ob.side === 'kiri' || ob.side === 'kanan' ? { side: ob.side } : {}),
      layer: ob.layer === 'underlay' || ob.layer === 'overlay' ? ob.layer : 'main',
      // grup & kunci ikut dipertahankan saat import/normalisasi
      ...(typeof ob.grup === 'string' && ob.grup ? { grup: ob.grup } : {}),
      ...(typeof ob.grupNama === 'string' && ob.grupNama ? { grupNama: ob.grupNama } : {}),
      ...(typeof ob.grupInduk === 'string' && ob.grupInduk ? { grupInduk: ob.grupInduk } : {}),
      ...(ob.kunci === 'warna' || ob.kunci === 'semua' ? { kunci: ob.kunci } : {}),
      ...(ob.bentuk === 'silinder' || ob.bentuk === 'kerucut' || ob.bentuk === 'bola'
        || ob.bentuk === 'cakram' || ob.bentuk === 'daun' || ob.bentuk === 'profil'
        ? { bentuk: ob.bentuk } : {}),
      ...(Array.isArray(ob.profil)
        ? { profil: ob.profil.slice(0, 48).map(v => [rafel(v?.[0]), rafel(v?.[1])] as [number, number]) }
        : {}),
      ...(typeof ob.puncak === 'number' && Number.isFinite(ob.puncak) && ob.puncak >= 0
        ? { puncak: Math.round(ob.puncak * 100) / 100 } : {}),
      ...(typeof ob.miring === 'number' && Number.isFinite(ob.miring)
        ? { miring: Math.round(ob.miring) } : {}),
      ...(typeof ob.bulat === 'number' && Number.isFinite(ob.bulat) && ob.bulat > 0
        ? { bulat: Math.min(1, Math.round(ob.bulat * 100) / 100) } : {}),
      ...(typeof ob.preset === 'string' && /^[a-z0-9-]{1,40}$/.test(ob.preset)
        ? { preset: ob.preset } : {}),
      ...(ob.tepi === false ? { tepi: false } : {}),
      ...(ob.langit === true || perluLangit(ob) ? { langit: true } : {}),
      ...(normalAnim(ob.anim) ? { anim: normalAnim(ob.anim)! } : {}),
      ...(ob.latar === true ? { latar: true } : {}),
      ...(typeof ob.urutan === 'number' && Number.isFinite(ob.urutan) ? { urutan: Math.round(ob.urutan) } : {}),
    })
  }
  const m = d.meta as Partial<Scene['meta']> | undefined
  const r = d.room as Partial<Scene['room']> | undefined
  // tanpa aturan ruangan: nilai room dari file dipakai apa adanya (divalidasi)
  const room = ROOM_FROM_FILE && r
    ? {
        e: Math.max(2, num(r.e) || ROOM_FIXED.e),
        w: Math.max(2, num(r.w) || ROOM_FIXED.w),
        wallZ: Math.max(2, num(r.wallZ) || ROOM_FIXED.wallZ),
        palette: ROOM_FIXED.palette,
      }
    : { ...ROOM_FIXED }
  // URUTAN: scene lama belum punya `urutan` -> diberi nilai sekali jalan
  // mengikuti urutan gambar yang berlaku sekarang (latar dulu, lalu per layer,
  // lalu kedalaman isometrik) supaya tampilan TIDAK berubah sedikit pun.
  const berurut = beriUrutan(objects)

  const latarMigrasi = typeof m?.latarMigrasi === 'string'
    ? String(m?.latarMigrasi)
    : (objects.some(o => o.latar === true) ? LATAR_TAG : undefined)

  return {
    version: 1,
    room,
    objects: berurut,
    meta: {
      locked: Boolean(m?.locked),
      savedAt: typeof m?.savedAt === 'string' ? m.savedAt : null,
      ...(latarMigrasi ? { latarMigrasi } : {}),
      ...(typeof m?.updatedAt === 'string' ? { updatedAt: m.updatedAt } : {}),
      ...(typeof m?.latarGambar === 'string' ? { latarGambar: m.latarGambar } : {}),
      ...(m?.latarMode === 'muat' || m?.latarMode === 'isi' ? { latarMode: m.latarMode } : {}),
    },
  }
}

/**
 * MIGRASI LATAR sekali jalan (permintaan user 2026-10-29: "kelima objek itu
 * semua masuk latar"). HANYA dipakai untuk scene yang DIMUAT editor (draf
 * browser & file scene.json) — bukan untuk IMPORT, supaya perabot hasil import
 * tidak ikut berubah jadi latar. Penanda `latarMigrasi` membuat migrasi ini
 * tidak terulang dan "BUKA LATAR" tetap dihormati.
 */
export function migrasiLatar(scene: Scene): Scene {
  const meta = {
    locked: Boolean(scene.meta?.locked),
    savedAt: scene.meta?.savedAt ?? null,
    ...(typeof scene.meta?.updatedAt === 'string' ? { updatedAt: scene.meta.updatedAt } : {}),
    ...(typeof scene.meta?.latarGambar === 'string' ? { latarGambar: scene.meta.latarGambar } : {}),
    ...(scene.meta?.latarMode === 'muat' || scene.meta?.latarMode === 'isi'
      ? { latarMode: scene.meta.latarMode } : {}),
  }
  if (scene.meta?.latarMigrasi) return scene
  if (scene.objects.length === 0) return scene
  if (scene.objects.some(o => o.latar === true)) {
    return { ...scene, meta: { ...meta, latarMigrasi: LATAR_TAG } }
  }
  return {
    ...scene,
    objects: scene.objects.map(o => ({ ...o, latar: true })),
    meta: { ...meta, latarMigrasi: LATAR_TAG },
  }
}

/**
 * NAIKKAN / TURUNKAN (permintaan user 2026-10-29): tukar posisi tumpukan objek
 * dengan tetangga terdekat DI LAPISAN YANG SAMA. Nilai `urutan` dirapikan dulu
 * (0..n-1) supaya hasilnya selalu bisa diprediksi walau scene berasal dari file
 * lama. Objek LATAR tidak ikut (selalu paling belakang).
 */
export function geserTumpukan(scene: Scene, id: string, arah: 1 | -1): Scene {
  const daftar = scene.objects
    .filter(o => o.latar !== true)
    .sort((a, b) =>
      (RANK_LAPISAN[a.layer ?? 'main'] ?? 1) - (RANK_LAPISAN[b.layer ?? 'main'] ?? 1)
      || (a.urutan ?? 0) - (b.urutan ?? 0))
  const i = daftar.findIndex(o => o.id === id)
  if (i < 0) return scene
  const j = i + arah
  if (j < 0 || j >= daftar.length) return scene
  if ((daftar[i].layer ?? 'main') !== (daftar[j].layer ?? 'main')) return scene
  const nilai = new Map(daftar.map((o, k) => [o.id, k]))
  const tmp = nilai.get(daftar[i].id) ?? i
  nilai.set(daftar[i].id, nilai.get(daftar[j].id) ?? j)
  nilai.set(daftar[j].id, tmp)
  return { ...scene, objects: scene.objects.map(o => (nilai.has(o.id) ? { ...o, urutan: nilai.get(o.id) } : o)) }
}

/** kedalaman isometrik kasar (sama seperti depthOf di iso/box.ts) */
function dalamOf(o: SceneObject): number {
  // pusat footprint tidak berubah karena rotasi, jadi cukup pusat + setengah
  // diagonal; rotasi tidak lagi menukar panjang/lebar secara kasar di sini.
  const deg = o.rotasi ?? 0
  const rad = (deg * Math.PI) / 180
  const se = Math.abs(o.size.e * Math.cos(rad)) + Math.abs(o.size.w * Math.sin(rad))
  const sw = Math.abs(o.size.e * Math.sin(rad)) + Math.abs(o.size.w * Math.cos(rad))
  return o.pos.e + se / 2 + o.pos.w + sw / 2
}

const RANK_LAPISAN: Record<string, number> = { underlay: 0, main: 1, overlay: 2 }

/**
 * Beri `urutan` pada objek yang belum punya. Urutan yang dipakai = urutan
 * GAMBAR saat ini, jadi tidak ada perubahan tampilan; sesudah ini tumpukan
 * bisa diatur manual lewat NAIKKAN / TURUNKAN.
 */
function beriUrutan(objects: SceneObject[]): SceneObject[] {
  if (!objects.some(o => o.urutan === undefined)) return objects
  const urut = [...objects].sort((a, b) =>
    Number(b.latar === true) - Number(a.latar === true)
    || (RANK_LAPISAN[a.layer ?? 'main'] ?? 1) - (RANK_LAPISAN[b.layer ?? 'main'] ?? 1)
    || dalamOf(a) - dalamOf(b))
  const nilai = new Map(urut.map((o, i) => [o.id, i]))
  return objects.map(o => (o.urutan === undefined ? { ...o, urutan: nilai.get(o.id) ?? 0 } : o))
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}
