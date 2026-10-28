// Skema scene: lihat docs/03-SCENE-SCHEMA.md
export interface SceneObject {
  id: string
  label: string
  pos: { e: number; w: number; z: number }
  size: { e: number; w: number; z: number }
  style: string | { top: string; left: string; right: string }
  app: string | null
}

export interface SceneMeta {
  locked: boolean
  savedAt: string | null
}

export interface Scene {
  version: 1
  room: { e: number; w: number; wallZ: number; palette: string }
  objects: SceneObject[]
  meta?: SceneMeta
}

export const EMPTY_SCENE: Scene = {
  version: 1,
  room: { e: 22, w: 22, wallZ: 6.5, palette: 'kayu-nude' },
  objects: [],
  meta: { locked: false, savedAt: null },
}
