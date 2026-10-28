import { EMPTY_SCENE, type Scene, type SceneObject } from './types'

const KEY = 'isola-scene-v1'

export function loadScene(): Scene {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(EMPTY_SCENE)
    const parsed = validateScene(JSON.parse(raw))
    return parsed ?? structuredClone(EMPTY_SCENE)
  } catch {
    return structuredClone(EMPTY_SCENE)
  }
}

export function saveScene(scene: Scene) {
  try {
    localStorage.setItem(KEY, JSON.stringify(scene))
  } catch {
    /* storage penuh/private — abaikan, editor tetap jalan di memori */
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
      pos: {
        e: num(ob.pos.e), w: num(ob.pos.w), z: num(ob.pos.z),
      },
      size: {
        e: Math.max(0.5, num(ob.size.e)),
        w: Math.max(0.5, num(ob.size.w)),
        z: Math.max(0.5, num(ob.size.z)),
      },
      style: typeof ob.style === 'string' || (typeof ob.style === 'object' && ob.style !== null)
        ? ob.style as SceneObject['style']
        : 'wood',
      app: typeof ob.app === 'string' ? ob.app : null,
    })
  }
  return {
    version: 1,
    room: d.room ?? structuredClone(EMPTY_SCENE.room),
    objects,
  }
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}
