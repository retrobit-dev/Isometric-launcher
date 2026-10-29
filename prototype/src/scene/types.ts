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

/**
 * ANIMASI OBJEK (permintaan user 2026-10-29: "objek bisa diedit dan
 * ditambahkan animasi"). Animasi TIDAK mengubah data scene: posisi/ukuran di
 * JSON tetap sama, renderer hanya menggeser/memutar saat menggambar, sehingga
 * hit-test, bbox, grup, kunci, dan file APK tidak terpengaruh.
 */
export type JenisAnim = 'naik-turun' | 'ayun' | 'denyut' | 'kedip' | 'putar'

export interface Animasi {
  jenis: JenisAnim
  /** getaran per detik (default 0.5 = satu siklus per 2 detik) */
  laju?: number
  /** besar gerakan, pengali (default 1) */
  besar?: number
  /** geser fase 0..1 supaya bagian yang sama tidak bergerak serempak */
  fase?: number
}

/**
 * PRESISI UKURAN OBJEK (permintaan user 2026-10-29).
 *
 * Dulu: minimum 0,01 tile dan angka dibulatkan 3 desimal.
 * Sekarang: minimum **0,001 tile** dan semua ukuran memakai kelipatan 0,001.
 *
 * 0,001 tile = 0,0568 px internal saat zoom ×1 (dan 0,128 px di tablet
 * 2560×1600), jadi ini murni presisi data — bukan tombol ukuran piksel.
 */
export const UKURAN_MIN = 0.001
/**
 * ROTASI OBJEK (permintaan user 2026-10-29: "rotasi pada editor objek buat
 * dengan kelipatan 30 derajat").
 *
 * `rotasi` = derajat mengelilingi poros vertikal objek, selalu kelipatan 30
 * (0..330) -> 12 posisi. Ini BUKAN rotasi kamera (itu `yaw`, kelipatan 15°),
 * dan bukan pula rotasi 90° (footprint hanya bertukar di 90/270
 * supaya tetap tajam, lihat iso/box.ts).
 *
 * Data lama memakai `rot` 0..3 (= 90° per langkah) dan tetap dibaca: saat
 * normalisasi `rot` diubah menjadi `rotasi` = rot*90.
 */
/** langkah tombol rotasi PADA SATU OBJEK (panel editor objek) */
export const ROTASI_LANGKAH = 30

/**
 * Langkah tombol rotasi FOLDER (permintaan user 2026-10-29: "untuk rotasi
 * folder kelipatan 15 derajat saja"). Lebih halus dari rotasi objek karena
 * seluruh isi folder ikut berputar.
 */
export const ROTASI_FOLDER = 15

/**
 * GRID rotasi yang disimpan: 15°. Dipakai normalisasi supaya hasil rotasi
 * folder 15° TIDAK dibulatkan balik ke 30° (kalau grid 30°, sudut 15 hilang).
 * Tombol objek tetap melangkah 30°, jadi nilai ganjil (15, 45, …) hanya lahir
 * dari rotasi folder.
 */
export const ROTASI_GRID = 15

/** derajat rotasi yang sah: kelipatan grid 15°, dibungkus ke 0..345 */
export function normalRotasi(deg: number): number {
  const n = Number.isFinite(deg) ? deg : 0
  const b = Math.round(n / ROTASI_GRID) * ROTASI_GRID
  return ((b % 360) + 360) % 360
}

/** batas transparansi paling tembus pandang (5% = hampir hilang) */
export const OPASITAS_MIN = 0.05

/**
 * TRANSPARANSI OBJEK (permintaan user 2026-10-29: "tambahkan juga fitur untuk
 * mengatur transparasi objek dan folder").
 * `opasitas` 0.05..1 — 1 atau tidak diisi berarti pekat (normal).
 */
export function normalOpasitas(v: unknown): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : 1
  return Math.round(Math.min(1, Math.max(OPASITAS_MIN, n)) * 100) / 100
}

/** jumlah desimal semua angka geometri (posisi & ukuran) */
export const GEOMETRI_DESIMAL = 3
/** pembulatan ke 0,001 */
export function bulatkan3(v: number): number {
  const n = Math.round(v * 1000) / 1000
  return Object.is(n, -0) ? 0 : n
}
/** ukuran yang sah: ≥ 0,001 dan kelipatan 0,001 */
export function ukuranSah(v: number): number {
  return Math.max(UKURAN_MIN, bulatkan3(v))
}

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
  /** derajat, kelipatan 30 (0..330) — lihat normalRotasi() */
  rotasi?: number
  /**
   * KACA LANGIT dinamis (permintaan user 2026-10-29): bila true, objek ini
   * digambar sebagai jendela berisi langit + cuaca (fase waktu dari jam
   * perangkat, awan/hujan/kilat mengikuti cuaca), BUKAN warna bidang statis.
   */
  langit?: boolean
  /**
   * transparansi 0.05..1 (1/tidak diisi = pekat). Berlaku saat digambar, jadi
   * data posisi/ukuran TIDAK berubah: hit-test, grup, kunci, dan file scene
   * tetap sama.
   */
  opasitas?: number
  /** LAMA: 0..3 (= 90° per langkah). Hanya dibaca, ditulis ulang jadi `rotasi`. */
  rot?: 0 | 1 | 2 | 3
  // REFLEKSI OBJEK = objek dicerminkan (mirror): warna sisi kiri & kanan
  // bertukar sehingga arah cahaya/bentuk objek terbalik. Berlaku untuk OBJEK
  // ini saja, bukan kamera atau ruangan. Default OFF.
  refleksi?: boolean
  // PANTULAN = bayangan cermin objek ini di permukaan lantai. Default ON.
  pantulan?: boolean
  // SUDUT (derajat) untuk bentuk 'daun': 90 = tegak, 0 = mendatar ke +e.
  miring?: number
  // GARIS TEPI 1px berwarna lebih gelap (ciri gambar referensi). Bawaan ON;
  // set false untuk bagian yang terlalu kecil sehingga garisnya mengganggu.
  tepi?: boolean
  // ANIMASI tampilan (tidak mengubah data): lihat interface Animasi di atas.
  anim?: Animasi
  // ARAH PAPAN LANTAI: 0 = papan membentang sepanjang sumbu e (bawaan),
  // 1 = diputar 90 derajat sehingga membentang sepanjang sumbu w.
  // Hanya berpengaruh untuk lantai ber-pola 'papan' (kayu).
  polaRot?: 0 | 1
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
  // SUB-FOLDER: id grup induk. Grup boleh bersarang (folder di dalam folder);
  // semua anggota satu grup memakai grupNama & grupInduk yang sama.
  grupInduk?: string
  /** id preset asal objek ini (null/undefined = dibuat manual) */
  preset?: string

  // BENTUK dasar objek (permintaan user 2026-10-29: silinder & kerucut supaya
  // objek lebih mirip referensi). Default = 'balok'.
  //   balok    = kotak isometrik 3 sisi (perilaku lama)
  //   silinder = tabung tegak, alas & tutup elips, sisi 24 segmen
  //   kerucut  = kerucut tegak, alas elips, puncak di tengah atas
  //   bola     = bulatan (daun, bola lampu); jari-jari = min(e,w,z)/2
  //   cakram   = bulatan DATAR menghadap ruangan (matahari/langit di kaca
  //              jendela, jam dinding, hiasan bulat); sumbu = bidang e-z
  //   daun     = bentuk daun lonjong berujung runcing di bidang e-z.
  //              size.e = panjang daun, size.z = lebar daun, `miring` = sudut
  //              sumbu daun (derajat, 90 = tegak ke atas, 0 = ke arah +e).
  // Footprint (size.e × size.w) tetap dipakai sebagai kotak pembatas.
  bentuk?: 'balok' | 'silinder' | 'kerucut' | 'bola' | 'cakram' | 'daun' | 'profil'
  /**
   * PROFIL (permintaan user 2026-10-29: "kenapa masih terlihat kotak-kotak"):
   * bentuk BEBAS yang digambar sebagai siluet 2D lalu dijembatani (extrude)
   * selebar `size.w`. Daftar titik `[u, z]`:
   *   u = 0..1 selebar size.e (boleh lebih untuk tonjolan)
   *   z = 0..1 setinggi size.z (0 = bawah)
   * Dipakai untuk bentuk yang tidak bisa dibuat dari balok/silinder:
   * sandaran kursi yang membulat, kap lampu, daun meja, gagang, dll.
   * Titik harus urut mengelilingi siluet (searah/berlawanan jarum jam).
   */
  profil?: [number, number][]
  // khusus bentuk 'kerucut': perbandingan jari-jari PUNCAK terhadap alas
  //   tidak diisi / 0 = kerucut runcing
  //   0.45        = kap lampu (frustum menyempit ke atas)
  //   1           = sama dengan silinder
  //   1.15        = pot bunga (mulut pot lebih lebar dari dasar)
  puncak?: number
  // URUTAN TUMPUKAN (permintaan user 2026-10-29): angka bulat yang menentukan
  // siapa digambar di atas siapa DI DALAM lapisan yang sama (semakin besar =
  // semakin ke depan/overlay). Objek baru & hasil duplikat selalu mendapat
  // nilai paling besar -> otomatis menimpa objek lain. Tombol NAIKKAN /
  // TURUNKAN di panel editor & DAFTAR OBJEK hanya menukar nilai ini dengan
  // tetangganya. Tidak diisi = urut otomatis berdasarkan kedalaman isometrik.
  urutan?: number
  // LATAR = lapisan BACKGROUND kanvas (permintaan user 2026-10-29: kelima objek
  // lama — lantai, 2 dinding, 2 balok — dijadikan latar). Objek latar:
  //   • digambar paling bawah (di belakang semua perabot)
  //   • TIDAK muncul di DAFTAR OBJEK, tidak bisa dipilih/diubah/dihapus
  //   • tidak tersentuh UNDO / REDO / IMPORT / PULIHKAN
  //   • tetap tersimpan & ter-export di scene.json
  latar?: boolean
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
  // penanda migrasi LATAR sekali jalan: bila terisi, objek lama TIDAK lagi
  // otomatis dipindahkan ke latar (supaya "BUKA LATAR" tidak terulang).
  latarMigrasi?: string
  // CAP WAKTU SIMPAN TERAKHIR (ISO). Dipakai saat aplikasi dibuka untuk
  // memilih mana yang lebih baru: draf browser atau file .isola-scene.json.
  // Tanpa ini, tab lama yang baru dibuka bisa menimpa file dengan scene usang.
  updatedAt?: string | null
  // GAMBAR LATAR (background kanvas) — permintaan user 2026-10-29:
  // user membuat gambar ruangan sendiri (Paint / aplikasi lain) lalu memasangnya
  // sebagai lapisan latar. Scene hanya menyimpan TOKEN versi gambar; berkasnya
  // disimpan terpisah (/api/latar di preview, assets/latar.png di APK).
  latarGambar?: string | null
  // cara gambar dipetakan ke kanvas internal 640x400:
  //   'isi' = memenuhi kanvas (sisi lebih = terpotong)  -> bawaan
  //   'muat' = utuh di tengah (bisa ada tepi kosong)
  latarMode?: 'isi' | 'muat'
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
