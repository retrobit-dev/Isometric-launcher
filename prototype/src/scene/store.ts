import { seedScene } from './seed'
import { ROOM_FIXED, type Scene, type SceneObject } from './types'

// v3: draft default kini berisi seed balok8 (8 kelompok placeholder)
const DRAFT_KEY = 'isola-draft-v3'
const LOCKED_KEY = 'isola-locked-v3'

export function loadDraft(): Scene {
  return read(DRAFT_KEY) ?? seedScene()
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
  return {
    version: 1,
    // ruangan TERKUNCI: nilai room dari file import selalu diganti konstanta
    room: { ...ROOM_FIXED },
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
