// Skema scene: lihat docs/03-SCENE-SCHEMA.md
//
// RUANGAN TERKUNCI PERMANEN (keputusan user): dimensi, tinggi dinding, dan
// palet tidak dapat diedit oleh editor, import, maupun reset. Perubahan
// ruangan hanya lewat perubahan kode oleh developer atas permintaan eksplisit.
export interface RoomDims {
  readonly e: number
  readonly w: number
  readonly wallZ: number
  readonly palette: string
}

export const ROOM_FIXED: RoomDims = {
  e: 20,
  w: 19,
  wallZ: 12,
  palette: 'malam-biru',
}

// KUNCI RUANGAN DIBUKA SEMENTARA (permintaan user 2026-10-28): ruangan sedang
// disamakan dengan gambar referensi. Selama true, ukuran/palet ruangan boleh
// diubah dan scene dari import menang atas ROOM_FIXED. Ubah ke false untuk
// mengunci lagi setelah ruangan disepakati (docs/01 §0).
export const ROOM_TEMP_UNLOCKED = true

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
  room: RoomDims
  objects: SceneObject[]
  meta?: SceneMeta
}

export const EMPTY_SCENE: Scene = {
  version: 1,
  room: { ...ROOM_FIXED },
  objects: [],
  meta: { locked: false, savedAt: null },
}
