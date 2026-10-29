// KATALOG OBJEK (preset)
//
// 2026-10-29 — RONDE 17. Permintaan user: "hapus semua objek yang dibuat dari
// referensi, kita buat sendiri saja sesuai instruksi, gaya dan tema yang
// sesuai dengan aplikasi ini".
//
//   • SELURUH preset hasil jiplak gambar referensi DIHAPUS, termasuk VERSI
//     PIXEL/sprite-nya: rak-buku, meja-guru, kursi-putar, papan-tulis,
//     papan-gabus, jendela, lampu-meja, tanaman-pot, tempat-sampah, laptop,
//     tumpukan-buku, kalkulator, bingkai-foto, gelas-pensil.
//   • Ronde 18 (2026-10-29): katalog diisi lagi dari NOL dengan objek buatan
//     sendiri. Objek #1 = JENDELA (dinding kanan / DT). Setiap objek baru
//     mengikuti:
//       - tema   : docs/05-TEMA-DIORAMA-HANGAT.md (diorama hangat, garis tepi)
//       - palet  : docs/07-PALET-REFERENSI.md (warna wajib dari palet)
//       - kontrak: docs/04-KONTRAK-RENDERER.md (geometri & urutan gambar)
//
// PENTING saat menulis bagian yang tipis (lipatan kain, bayangan halus, awan):
// pakai bt() — garis tepi 2 px pada bidang setipis 0.05 akan MENELAN warna
// aslinya dan tampak seperti balok hitam. Pelajaran dari tirai jendela ronde 18.
//
// Alat bantu menulis objek baru (semua angka bebas sampai 3 desimal):
//   b(e, w, z, se, sw, sz, style, bentuk?, puncak?, miring?)
//       satu bagian = satu balok (default) atau bentuk lain
//   bt(...)  = bagian TANPA garis tepi (lipatan kain, bayangan halus)
//   bp(...)  = bentuk 'profil' dengan siluet bebas [[u, z], …] (0..1)
//   beranim(x, { jenis, laju, besar, fase }) = beri animasi pada bagian
//
// Bentuk yang didukung renderer: balok, silinder, kerucut, bola, cakram, daun,
// profil. Aturan angka: SEMUA bagian ditulis eksplisit (tanpa loop/angka acak)
// supaya prototipe web dan APK menghasilkan gambar yang sama.
//
// ARAH KAMERA (penting saat menulis objek): kamera isometrik melihat dari arah
// +e dan +w. Muka yang harus terlihat pengguna (muka laci, layar, dsb.)
// diletakkan di sisi w/e BESAR.

import { ukuranSah } from './types'
import type { Animasi, SceneObject } from './types'

type Bentuk = 'balok' | 'silinder' | 'kerucut' | 'bola' | 'cakram' | 'daun' | 'profil'

interface Bahan {
  e: number
  w: number
  z: number
  se: number
  sw: number
  sz: number
  style: string
  bentuk?: Bentuk
  puncak?: number
  miring?: number
  /** siluet bebas untuk bentuk 'profil' — [u, z] 0..1 */
  profil?: [number, number][]
  anim?: Animasi
  /** false = tanpa garis tepi (dipakai untuk lipatan kain supaya halus) */
  tepi?: boolean
  /** true = bidang KACA LANGIT dinamis (langit + cuaca mengikuti jam) */
  langit?: boolean
}

export interface Preset {
  id: string
  nama: string
  ket: string
  pasang: 'lantai' | 'dinding-kanan' | 'dinding-kiri'
  lebar: number
  dalam: number
  bagian: Bahan[]
}

const b = (
  e: number, w: number, z: number,
  se: number, sw: number, sz: number,
  style: string,
  bentuk?: Bentuk, puncak?: number, miring?: number,
): Bahan => ({
  e, w, z, se, sw, sz, style,
  ...(bentuk ? { bentuk } : {}),
  ...(puncak !== undefined ? { puncak } : {}),
  ...(miring !== undefined ? { miring } : {}),
})

/** bagian tanpa garis tepi (lipatan kain, bayangan halus) */
const bt = (
  e: number, w: number, z: number,
  se: number, sw: number, sz: number,
  style: string,
  bentuk?: Bentuk, puncak?: number,
): Bahan => ({ ...b(e, w, z, se, sw, sz, style, bentuk, puncak), tepi: false })

/** bagian bentuk 'profil' (siluet bebas [u, z] 0..1) */
const bp = (
  e: number, w: number, z: number,
  se: number, sw: number, sz: number,
  style: string, titik: [number, number][],
): Bahan => ({ ...b(e, w, z, se, sw, sz, style, 'profil'), profil: titik })

/** bagian KACA LANGIT: digambar sebagai langit dinamis, bukan warna statis */
const bk = (
  e: number, w: number, z: number,
  se: number, sw: number, sz: number,
  style: string,
): Bahan => ({ ...b(e, w, z, se, sw, sz, style), langit: true })

/** beri animasi ke satu bagian */
const beranim = (x: Bahan, a: Animasi): Bahan => ({ ...x, anim: a })

/** katalog objek — objek buatan sendiri, ditulis satu per satu. */
export const PRESETS: Preset[] = [
  // ================================================================ JENDELA ==
  // RONDE 19 — versi SIMPEL sesuai permintaan user: "saya hanya ingin membuat
  // Jendela". Tanpa tirai, tanpa batang gorden, tanpa matahari/awan, tanpa
  // palang silang. Isi hanya:
  //   1) empat batang kusen kayu (kiri, kanan, atas, bawah)
  //   2) satu bidang kaca biru langit
  //   3) satu papan ambang di bawah jendela
  // Dipasang di DINDING KANAN (DT). Kamera melihat dari +e/+w, jadi tebal
  // jendela tumbuh ke +w (dari permukaan dinding ke dalam ruangan).
  {
    id: 'jendela', nama: 'JENDELA',
    ket: 'kusen kayu + kaca + ambang bawah. Dipasang di dinding kanan.',
    pasang: 'dinding-kanan', lebar: 4.2, dalam: 0.5,
    bagian: [
      // --- satu bidang kaca (paling belakang, digambar lebih dulu) ---
      // KACA LANGIT DINAMIS: warna & isi kaca mengikuti jam perangkat
      // (fajar/pagi/siang/senja/malam) dan cuaca (cerah s/d badai).
      bk(0.26, 0.12, 2.46, 3.68, 0.05, 3.88, 'kaca-langit'),
      // --- empat batang kusen (di depan kaca) ---
      b(0.00, 0.04, 2.20, 0.26, 0.30, 4.40, 'kayu-tepi'),    // tiang kiri
      b(3.94, 0.04, 2.20, 0.26, 0.30, 4.40, 'kayu-tepi'),    // tiang kanan
      b(0.00, 0.04, 6.34, 4.20, 0.30, 0.26, 'kayu-tepi'),    // ambang atas
      b(0.00, 0.04, 2.20, 4.20, 0.30, 0.26, 'kayu-tepi'),    // ambang bawah
      // --- papan ambang menjorok ke ruangan ---
      b(0.00, 0.00, 2.06, 4.20, 0.36, 0.14, 'kayu-tepi'),
    ],
  },

  // ============================================================= MEJA KERJA ==
  // Permintaan user 2026-10-29: "buatkan objek meja kerja".
  // Pilihan user: alas LEBAR 3,0 x 1,2 tile, kayu TERANG (kayu-meja), dipasang
  // di lantai (bukan menempel dinding).
  //
  // Bentuk (ronde kedua, setelah render pertama dinilai kurang terbaca):
  //   - alas meja 3,0 x 1,2, tebal 0,16
  //   - kaki kayu gelap di sisi KIRI (2 buah)
  //   - LEMARI LACI (pedestal) di sisi KANAN setinggi kolong meja, dengan DUA
  //     muka laci + gagang logam — ini yang membuatnya terbaca sebagai meja
  //     kerja, bukan bangku
  //   - lis depan & belakang antara kaki
  // Tinggi total 1,60 tile, masih DI BAWAH ambang jendela (z 2,06), jadi meja
  // bisa berdiri di depan jendela tanpa menutupi kaca.
  //
  // Sumbu: kamera melihat dari +e/+w, jadi muka yang harus tampak (muka laci)
  // diletakkan di sisi w BESAR. Angka ditulis eksplisit, urutan `bagian` =
  // urutan gambar: kaki & pedestal dulu, alas paling akhir (paling depan).
  {
    id: 'meja-kerja', nama: 'MEJA KERJA',
    ket: 'Meja kerja 3,0 x 1,2: alas kayu terang, 2 kaki kiri, lemari 2 laci di kanan.',
    pasang: 'lantai', lebar: 3.0, dalam: 1.2,
    bagian: [
      // --- kaki kiri (0,16 x 0,16 x 1,44) ---
      b(0.06, 0.06, 0.00, 0.16, 0.16, 1.44, 'kayu-gelap'),   // kaki belakang kiri
      b(0.06, 0.98, 0.00, 0.16, 0.16, 1.44, 'kayu-gelap'),   // kaki depan kiri
      // --- lemari laci di sisi KANAN ---
      b(2.34, 0.10, 0.00, 0.60, 0.90, 1.44, 'walnut'),       // badan lemari (gelap, biar laci kontras)
      // --- lis antara kaki (di bawah alas) ---
      b(0.22, 0.10, 1.18, 2.12, 0.10, 0.26, 'kayu-gelap'),   // lis belakang
      b(0.22, 0.98, 1.18, 2.12, 0.10, 0.26, 'kayu-gelap'),   // lis depan
      // --- dua muka laci (sisi depan, w 1,06..1,14) ---
      b(2.38, 1.00, 0.78, 0.52, 0.14, 0.56, 'kayu-meja'),    // muka laci atas
      b(2.38, 1.00, 0.16, 0.52, 0.14, 0.56, 'kayu-meja'),    // muka laci bawah
      // --- gagang logam tiap laci ---
      b(2.56, 1.14, 0.98, 0.16, 0.05, 0.07, 'metal'),        // gagang atas (kuningan)
      b(2.56, 1.14, 0.36, 0.16, 0.05, 0.07, 'metal'),        // gagang bawah (kuningan)
      // --- alas meja (paling atas, digambar terakhir) ---
      b(0.00, 0.00, 1.44, 3.00, 1.20, 0.16, 'kayu-meja'),
    ],
  },

  // ============================================================ TANAMAN POT ==
  // Permintaan user 2026-10-29: "bisa buatkan tanaman yang ada di pot".
  // Jawaban user: pot keramik (awalnya KREM), dipasang di sebelah kanan meja,
  // masuk katalog + langsung dipasang. Ronde lanjutan (masih 2026-10-29):
  // user minta "buat tanaman lebih tinggi, warna pot buat lebih gelap" ->
  // pot diganti `bata` (#b0501f, keramik tanah liat gelap) dan batang
  // ditinggikan 1,20 -> 2,60 dengan daun ikut dipanjangkan ±40 %. Jenis tanaman dipilih oleh saya atas
  // permintaan user ("sarankan yang paling mudah dan bagus untuk dibuat
  // animasi") -> PALANG / DRACAENA: daun panjang tumbuh dari batang pendek.
  //
  // KENAPA PALANG: satu daun = satu bagian (`bentuk:'daun'`), jadi tiap daun
  // bisa diberi animasi `ayun` dengan `fase` sendiri. Hasilnya daun bergoyang
  // BERGANTIAN seperti tertiup angin, tanpa mesin animasi baru dan tanpa
  // mengubah data scene (lihat docs/04 §4b).
  //
  // Bentuk (12 bagian, urutan = urutan gambar; daun jauh digambar dulu):
  //   1) pot: `profil` — siluet bebas, menyempit di bawah + bibir tebal di atas
  //   2) tanah: balok `walnut` yang menonjol 0,10 di atas bibir pot
  //   3) batang: balok `kayu-tua` 0,12 x 0,12, dari dalam tanah
  //   4-12) sembilan daun `daun-sage` / `daun-gelap`, semua beranim `ayun`
  // Tinggi total ±5,7 tile (pot 1,34 + batang 2,60 + daun terpanjang 2,40),
  // jadi lebih tinggi daripada meja kerja (1,60) dan terlihat sebagai pohon
  // hias sudut ruangan. Bila user minta lebih tinggi lagi, cukup besarkan
  // tinggi batang + panjang daun; bentuknya tidak perlu diubah.
  //
  // Arah `miring` (derajat): 90 = tegak lurus ke atas, <90 = condong ke +e
  // (depan-kanan), >90 = condong ke -e (belakang-kiri). Lebar daun tumbuh ke w.
  {
    id: 'tanaman-pot', nama: 'TANAMAN POT',
    ket: 'Tanaman palang tinggi dalam pot keramik gelap; 9 daun bergoyang bergantian.',
    pasang: 'lantai', lebar: 1.8, dalam: 1.8,
    bagian: [
      // --- 1. badan pot (siluet: alas sempit, melebar ke atas) ---
      bp(0.05, 0.05, 0.00, 1.30, 1.30, 1.10, 'bata', [
        [0.30, 0.00], [0.70, 0.00],   // alas pot (sempit)
        [0.88, 0.36], [0.94, 0.80],   // naik & melebar
        [1.00, 0.96], [1.00, 1.00],   // tepat di bawah bibir
        [0.00, 1.00], [0.00, 0.96],   // sisi kiri
        [0.06, 0.80], [0.12, 0.36],
      ]),
      // --- 2. bibir pot (sedikit lebih lebar, supaya bentuk pot terbaca) ---
      b(0.00, 0.00, 1.06, 1.40, 1.40, 0.18, 'bata'),
      // --- 3. tanah di dalam bibir pot ---
      b(0.12, 0.12, 1.04, 1.16, 1.16, 0.12, 'walnut'),
      // --- 4. batang tinggi (pucuk di z 3,76) ---
      b(0.64, 0.64, 1.16, 0.14, 0.14, 2.60, 'kayu-tua'),
      // --- 5-13. daun: BELAKANG dulu (condong -e), lalu TENGAH, lalu DEPAN ---
      beranim(b(0.76, 0.70, 3.20, 2.05, 0.18, 0.80, 'daun-gelap', 'daun', undefined, 130),
        { jenis: 'ayun', laju: 0.18, besar: 0.8, fase: 0.55 }),
      beranim(b(0.70, 0.82, 3.14, 1.85, 0.18, 0.74, 'daun-sage', 'daun', undefined, 145),
        { jenis: 'ayun', laju: 0.18, besar: 0.8, fase: 0.70 }),
      beranim(b(0.66, 0.64, 3.26, 2.25, 0.18, 0.88, 'daun-gelap', 'daun', undefined, 108),
        { jenis: 'ayun', laju: 0.18, besar: 0.8, fase: 0.85 }),
      // daun tegak paling tinggi (ujung ±5,7)
      beranim(b(0.64, 0.76, 3.30, 2.40, 0.18, 0.94, 'daun-sage', 'daun', undefined, 92),
        { jenis: 'ayun', laju: 0.18, besar: 0.8, fase: 0.00 }),
      beranim(b(0.72, 0.86, 3.16, 1.90, 0.18, 0.78, 'daun-gelap', 'daun', undefined, 118),
        { jenis: 'ayun', laju: 0.18, besar: 0.8, fase: 0.30 }),
      beranim(b(0.60, 0.80, 3.22, 2.00, 0.18, 0.82, 'daun-sage', 'daun', undefined, 72),
        { jenis: 'ayun', laju: 0.18, besar: 0.8, fase: 0.15 }),
      beranim(b(0.56, 0.72, 3.16, 1.70, 0.18, 0.72, 'daun-gelap', 'daun', undefined, 48),
        { jenis: 'ayun', laju: 0.18, besar: 0.8, fase: 0.42 }),
      beranim(b(0.66, 0.84, 3.10, 1.50, 0.18, 0.66, 'daun-sage', 'daun', undefined, 30),
        { jenis: 'ayun', laju: 0.18, besar: 0.8, fase: 0.62 }),
      beranim(b(0.80, 0.80, 3.06, 1.35, 0.18, 0.62, 'daun-gelap', 'daun', undefined, 60),
        { jenis: 'ayun', laju: 0.18, besar: 0.8, fase: 0.78 }),
    ],
  },
]

/**
 * Gaya (material) yang dipakai bagian LANGIT pada katalog.
 * Dipakai migrasi scene lama: objek yang tersimpan SEBELUM fitur langit ada
 * belum punya field `langit`, jadi kacanya tergambar biru statis tanpa
 * matahari/awan. normalisasiScene() memakai daftar ini untuk menyalakannya.
 */
export function gayaLangit(): Set<string> {
  const out = new Set<string>()
  for (const p of PRESETS) for (const b of p.bagian) if (b.langit) out.add(b.style)
  return out
}

export function presetOf(id: string): Preset | undefined {
  return PRESETS.find(p => p.id === id)
}

const snap = (v: number) => Math.round(v * 1000) / 1000

/** pecah satu preset menjadi objek-objek scene (satu objek per bagian) */
export function buatPreset(opts: {
  preset: Preset
  e: number
  w: number
  z: number
  grup: string
  nama: string
  urutanAwal: number
  idAwal: string
}): SceneObject[] {
  const { preset, grup, nama, urutanAwal, idAwal } = opts
  const e0 = snap(opts.e)
  const w0 = snap(opts.w)
  const z0 = snap(opts.z)
  return preset.bagian.map((bag, i) => ({
    id: `${idAwal}-${i + 1}`,
    label: `${nama} ${i + 1}`,
    pos: { e: snap(e0 + bag.e), w: snap(w0 + bag.w), z: snap(z0 + bag.z) },
    size: {
      e: ukuranSah(bag.se),
      w: ukuranSah(bag.sw),
      z: ukuranSah(bag.sz),
    },
    style: bag.style,
    ...(bag.bentuk ? { bentuk: bag.bentuk } : {}),
    ...(bag.puncak !== undefined ? { puncak: bag.puncak } : {}),
    ...(bag.miring !== undefined ? { miring: bag.miring } : {}),
    ...(bag.profil ? { profil: bag.profil } : {}),
    ...(bag.anim ? { anim: bag.anim } : {}),
    ...(bag.tepi === false ? { tepi: false } : {}),
    ...(bag.langit ? { langit: true } : {}),
    preset: preset.id,
    app: null,
    layer: 'main' as const,
    grup,
    grupNama: nama,
    urutan: urutanAwal + i,
  }))
}

// Alat bantu di atas dipakai saat menambah objek baru; `b`/`bt`/`bp`/`beranim`
// sengaja tetap ada walau katalog kosong supaya penulisan preset berikutnya
// tidak perlu mengubah kontrak file ini.
export type { Bahan, Bentuk }
