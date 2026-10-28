import { ROOM_FIXED, ROOM_TEMP_UNLOCKED, type Scene, type SceneObject } from './types'

// v4: ruangan saja (fase penyamaan ruangan dengan referensi; objek menyusul)
const DRAFT_KEY = 'isola-draft-v4'
const LOCKED_KEY = 'isola-locked-v4'

export function emptyRoom(): Scene {
  return {
    version: 1,
    room: { ...ROOM_FIXED },
    objects: [],
    meta: { locked: false, savedAt: null },
  }
}

export function loadDraft(): Scene {
  return read(DRAFT_KEY) ?? emptyRoom()
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
      layer: ob.layer === 'underlay' || ob.layer === 'overlay' ? ob.layer : 'main',
    })
  }
  const m = d.meta as Partial<Scene['meta']> | undefined
  const r = d.room as Partial<Scene['room']> | undefined
  // kunci ruangan dibuka sementara -> nilai room dari file boleh dipakai,
  // kalau tidak (terkunci) selalu diganti konstanta ROOM_FIXED
  const room = ROOM_TEMP_UNLOCKED && r
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
