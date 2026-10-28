// Skema scene: lihat docs/03-SCENE-SCHEMA.md
export interface SceneObject {
  id: string
  label: string
  pos: { e: number; w: number; z: number }
  size: { e: number; w: number; z: number }
  style: string | { top: string; left: string; right: string }
  app: string | null
}

export interface Scene {
  version: 1
  room: { e: number; w: number; wallZ: number; palette: string }
  objects: SceneObject[]
}

export const EMPTY_SCENE: Scene = {
  version: 1,
  room: { e: 22, w: 22, wallZ: 6.5, palette: 'linoleum-dado' },
  objects: [],
}
