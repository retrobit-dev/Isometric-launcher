// Skema scene: lihat docs/03-SCENE-SCHEMA.md
//
// RUANGAN TERKUNCI PERMANEN (keputusan user): dimensi, tinggi dinding, dan
// palet tidak dapat diedit oleh editor, import, maupun reset. Perubahan
// ruangan hanya lewat perubahan kode oleh developer atas permintaan eksplisit.
export const ROOM_FIXED = {
  e: 20,
  w: 19,
  wallZ: 12,
  palette: 'kayu-nude',
} as const

export type Layer = 'underlay' | 'main' | 'overlay'

export interface SceneObject {
  id: string
  label: string
  pos: { e: number; w: number; z: number }
  size: { e: number; w: number; z: number }
  style: string | { top: string; left: string; right: string }
  app: string | null
  // underlay = di bawah objek main (karpet, bayangan, decal)
  // main     = urutan kedalaman normal (furniture/app)
  // overlay  = di atas semua (lampu gantung, balok plafon, tanaman menjulang)
  layer?: Layer
}

export interface SceneMeta {
  // mengunci OBJEK saja (sementara — bisa dibuka lagi); ruangan selalu terkunci
  locked: boolean
  savedAt: string | null
}

export interface Scene {
  version: 1
  room: typeof ROOM_FIXED
  objects: SceneObject[]
  meta?: SceneMeta
}

export const EMPTY_SCENE: Scene = {
  version: 1,
  room: { ...ROOM_FIXED },
  objects: [],
  meta: { locked: false, savedAt: null },
}
