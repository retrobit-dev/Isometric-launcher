// Skema scene: lihat docs/03-SCENE-SCHEMA.md
//
// RUANGAN: TIDAK ADA ATURAN/KUNCI (permintaan user 2026-10-28 "hapus semua
// aturan ruangan, nanti saya beri referensi baru"). Dimensi, tinggi dinding,
// dan palet bebas diubah kapan saja; nilai di bawah hanya nilai bawaan.
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

// ATURAN RUANGAN DIHAPUS (permintaan user 2026-10-28): tidak ada lagi kunci.
// Nilai `room` dari file import selalu dipakai apa adanya (divalidasi), dan
// ROOM_FIXED hanya dipakai sebagai nilai bawaan saat file tidak menyebutnya.
export const ROOM_FROM_FILE = true

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
  // mengunci OBJEK saja (sementara — bisa dibuka lagi)
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
