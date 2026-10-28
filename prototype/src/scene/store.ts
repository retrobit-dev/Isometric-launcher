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
      ...(ob.role === 'lantai' || ob.role === 'dinding' ? { role: ob.role } : {}),
      ...(ob.side === 'kiri' || ob.side === 'kanan' ? { side: ob.side } : {}),
      layer: ob.layer === 'underlay' || ob.layer === 'overlay' ? ob.layer : 'main',
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
