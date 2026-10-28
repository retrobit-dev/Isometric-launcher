// Skema scene: lihat docs/03-SCENE-SCHEMA.md
//
// RUANGAN TERKUNCI PERMANEN (keputusan user): dimensi, tinggi dinding, dan
// palet tidak dapat diedit oleh editor, import, maupun reset. Perubahan
// ruangan hanya lewat perubahan kode oleh developer atas permintaan eksplisit.
// STATUS SAAT INI: TERKUNCI LAGI (keputusan user 2026-10-28: "ukuran dan posisi
// ruangan sama dengan yang ada di tampilan preview sekarang"). Nilai di bawah
// adalah nilai yang dibekukan — jangan diubah tanpa permintaan eksplisit.
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

// Kunci ruangan. true = dibuka sementara (import boleh menimpa dimensi ruangan).
// false = TERKUNCI: nilai `room` dari file import selalu diganti ROOM_FIXED.
export const ROOM_TEMP_UNLOCKED = false

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
  // mengunci OBJEK saja (sementara — bisa dibuka lagi); ruangan terkunci permanen
  // (kecuali sedang dibuka sementara lewat ROOM_TEMP_UNLOCKED)
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
