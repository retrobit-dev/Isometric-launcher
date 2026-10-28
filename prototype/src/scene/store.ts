import { FLOOR_DEFAULT, FLOOR_MATERIALS } from '../iso/palette'
import { ROOM_FROM_FILE, ROOM_FIXED, type Scene, type SceneObject } from './types'

// v4: ruangan saja (fase penyamaan ruangan dengan referensi; objek menyusul)
// v5: objek bisa berperan sebagai LANTAI ruangan (role 'lantai')
// v6: lantai memakai palet kayu selang-seling (style dari FLOOR_MATERIALS)
const DRAFT_KEY = 'isola-draft-v6'
const LOCKED_KEY = 'isola-locked-v6'
const PREV_DRAFT_KEYS = ['isola-draft-v5', 'isola-draft-v4'] as const

export function emptyRoom(): Scene {
  return {
    version: 1,
    room: { ...ROOM_FIXED },
    objects: [],
    meta: { locked: false, savedAt: null },
  }
}

export function loadDraft(): Scene {
  return normalize(read(DRAFT_KEY) ?? migratePrevDraft() ?? emptyRoom())
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

/** scene terakhir di file server (null bila belum ada / gagal) */
export async function loadSceneFile(): Promise<Scene | null> {
  try {
    const r = await fetch(API_SCENE, { cache: 'no-store' })
    if (!r.ok) return null
    const txt = await r.text()
    if (!txt) return null
    const data = JSON.parse(txt)
    const raw = data && typeof data === 'object' && 'scene' in data ? data.scene : data
    return validateScene(raw)
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
      body: JSON.stringify({ savedAt: new Date().toISOString(), scene }),
    })
    return r.ok
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
        e: Math.max(0.1, num(ob.size.e)),
        w: Math.max(0.1, num(ob.size.w)),
        z: Math.max(0.1, num(ob.size.z)),
      },
      style: typeof ob.style === 'string' || (typeof ob.style === 'object' && ob.style !== null)
        ? ob.style as SceneObject['style']
        : 'wood',
      app: typeof ob.app === 'string' ? ob.app : null,
      ...(ob.rot === 1 || ob.rot === 2 || ob.rot === 3 ? { rot: ob.rot } : { rot: 0 }),
      ...(typeof ob.refleksi === 'boolean' ? { refleksi: ob.refleksi } : {}),
      ...(typeof ob.pantulan === 'boolean' ? { pantulan: ob.pantulan } : {}),
      ...(ob.polaRot === 1 ? { polaRot: 1 as const } : {}),
      ...(ob.role === 'lantai' || ob.role === 'dinding' ? { role: ob.role } : {}),
      ...(ob.side === 'kiri' || ob.side === 'kanan' ? { side: ob.side } : {}),
      layer: ob.layer === 'underlay' || ob.layer === 'overlay' ? ob.layer : 'main',
      // grup & kunci ikut dipertahankan saat import/normalisasi
      ...(typeof ob.grup === 'string' && ob.grup ? { grup: ob.grup } : {}),
      ...(typeof ob.grupNama === 'string' && ob.grupNama ? { grupNama: ob.grupNama } : {}),
      ...(typeof ob.grupInduk === 'string' && ob.grupInduk ? { grupInduk: ob.grupInduk } : {}),
      ...(ob.kunci === 'warna' || ob.kunci === 'semua' ? { kunci: ob.kunci } : {}),
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
  return {
    version: 1,
    room,
    objects,
    meta: {
      locked: Boolean(m?.locked),
      savedAt: typeof m?.savedAt === 'string' ? m.savedAt : null,
    },
  }
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}
