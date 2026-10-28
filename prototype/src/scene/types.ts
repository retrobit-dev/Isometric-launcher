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
  // role 'lantai' = objek ini BUKAN balok, melainkan bidang lantai ruangan:
  // digambar sebagai ubin datar seluas (pos e..e+size.e, w..w+size.w),
  // memakai palet lantai, dan diabaikan oleh renderer balok & refleksi.
  // role 'dinding' = bidang dinding vertikal (kiri/DB atau kanan/DT) yang
  // mengikuti tepi belakang lantai. `side` menentukan bidang mana yang dipakai:
  //   'kiri'  -> bidang e = pos.e, membentang sepanjang size.w  (dinding DB)
  //   'kanan' -> bidang w = pos.w, membentang sepanjang size.e  (dinding DT)
  // Tinggi dinding = size.z, mulai dari pos.z.
  role?: 'lantai' | 'dinding'
  side?: 'kiri' | 'kanan'
  // rotasi terhadap sumbu z, kelipatan 90 derajat (0..3). Rotasi ganjil
  // menukar panjang/lebar (footprint) sehingga balok berputar 90/270 derajat.
  rot?: 0 | 1 | 2 | 3
  // pantulan objek ini di lantai (default ON bila tidak diisi)
  refleksi?: boolean
  // underlay = di bawah objek main (karpet, bayangan, decal)
  // main     = urutan kedalaman normal (furniture/app)
  // overlay  = di atas semua (lampu gantung, balok plafon, tanaman menjulang)
  layer?: Layer
  // GRUP: objek dengan `grup` sama dianggap satu kesatuan saat dipilih &
  // digeser — menyeret satu anggota menggeser semua anggota dengan jarak yang
  // sama, sehingga susunan relatifnya tetap. Ukuran/warna/rotasi tetap
  // per objek (bisa diatur sendiri-sendiri).
  grup?: string
  // nama folder grup (ditampilkan di DAFTAR OBJEK, bisa di-rename user)
  grupNama?: string
  // KUNCI pengeditan per objek:
  //   'warna' = posisi/ukuran/rotasi/layer/peran/sisi/hapus DIKUNCI,
  //             hanya material (warna) yang masih bisa diubah
  //   'semua' = terkunci total, termasuk warna
  // tidak diisi = bebas
  kunci?: 'warna' | 'semua'
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
