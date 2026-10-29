// MIGRASI TIRAI JENDELA — permintaan user 2026-10-29:
//   "bisakah tambahkan tirai di sisi kanan jendela"
//
// Tirai ditambahkan ke PRESET `jendela`, jadi jendela yang DIBUAT BARU langsung
// punya tirai. Jendela yang sudah ada di scene (dibuat sebelum tirai ini ada)
// perlu dilengkapi sekali jalan — kalau tidak, user tidak akan melihat tirai
// pada jendela lamanya.
//
// Aturan migrasi (sekali saja, ditandai `meta.tiraiV1`):
//   • cari bagian KACA (penanda `langit: true`) milik preset jendela;
//   • titik asal preset dihitung dari posisi kaca (kaca ada di lokal
//     0.26 / 0.12 / 2.46), jadi tirai ikut bergeser bila jendela dipindah;
//   • tirai yang berbentuk lipatan dipasang dengan koordinat absolut yang sama
//     seperti kalau jendela baru dibuat;
//   • JENDELA YANG DIPUTAR / DICERMINKAN dilewati (pemetaan lokal tidak lagi
//     lurus) — user bisa tambah jendela baru atau menyalin tirai manual;
//   • sesudah migrasi, `meta.tiraiV1 = true`, sehingga tirai yang SENGAJA
//     dihapus user TIDAK muncul kembali saat aplikasi dibuka lagi.
//
// Semua angka lokal diambil dari preset (lihat presets.ts) — angkanya memang
// ditulis eksplisit, bukan dihitung dari loop, supaya web dan APK sama.

import { PRESETS } from './presets'
import type { Scene, SceneObject } from './types'

/** posisi lokal kaca di dalam preset jendela (lihat presets.ts) */
const KACA_LOKAL = { e: 0.26, w: 0.12, z: 2.46 }
const PRESET_JENDELA = 'jendela'

/**
 * Material kaca. Kaca dikenali dari GAYA-nya, bukan hanya penanda `langit`:
 * user bisa mengganti material kaca lewat pemilih warna ◀ ▶, dan jendelanya
 * tetap harus dianggap jendela supaya tirainya tidak dipasang ulang.
 */
const GAYA_KACA = new Set(['kaca-langit', 'kaca-terang', 'kaca-jendela'])

/** material kain yang dianggap bagian tirai */
const GAYA_TIRAI = new Set(['tirai-putih', 'tirai-gorden', 'tirai-lipat', 'krem-hangat', 'lilin', 'kain-merah'])

const snap = (v: number) => Math.round(v * 1000) / 1000

/** bagian tirai pada preset jendela (koordinat lokal) */
export function bagianTirai() {
  const p = PRESETS.find(x => x.id === PRESET_JENDELA)
  if (!p) return []
  return p.bagian.filter(b => b.tirai === true)
}

/**
 * Apakah objek ini bagian tirai pada jendela ber-grup `grup`?
 * Dicek dari penanda ATAU dari gaya kain — supaya tirai hasil versi pertama
 * (yang penandanya sempat hilang saat normalisasi) tetap dikenali.
 */
function bagianTiraiDari(o: SceneObject, grup: string | undefined): boolean {
  if (o.preset !== PRESET_JENDELA) return false
  if (grup && o.grup !== grup) return false
  return o.tirai === true || (typeof o.style === 'string' && GAYA_TIRAI.has(o.style))
}

/** sudah ada tirai untuk jendela ini? (dicek per grup) */
function sudahAdaTirai(objects: SceneObject[], grup: string | undefined): boolean {
  return objects.some(o => bagianTiraiDari(o, grup))
}

const bulat = (v: number) => Math.round(v * 1000) / 1000

/**
 * BUANG TIRAI GANDA untuk satu jendela.
 * Kejadian nyata 2026-10-29: penanda `meta.tiraiV1` hilang saat normalisasi,
 * migrasi jalan lagi, dan tirai terpasang dua kali (4 menjadi 8 objek).
 * Di sini duplikat (grup + gaya + posisi + ukuran sama) disisakan SATU — yang
 * paling atas tumpukannya.
 */
function rapikanTirai(objects: SceneObject[], grup: string | undefined): { objects: SceneObject[]; dibuang: number } {
  const kunci = new Map<string, SceneObject>()
  let dibuang = 0
  for (const o of objects) {
    if (!bagianTiraiDari(o, grup)) continue
    const k = [
      o.grup ?? '', String(o.style), bulat(o.pos.e), bulat(o.pos.w), bulat(o.pos.z),
      bulat(o.size.e), bulat(o.size.w), bulat(o.size.z),
    ].join('|')
    const ada = kunci.get(k)
    if (!ada) { kunci.set(k, o); continue }
    // simpan yang urutannya lebih besar (digambar paling depan), buang lainnya
    if ((o.urutan ?? 0) > (ada.urutan ?? 0)) kunci.set(k, o)
    dibuang++
  }
  if (dibuang === 0) return { objects, dibuang: 0 }
  const disimpan = new Set(kunci.values())
  const hasil: SceneObject[] = []
  for (const o of objects) {
    if (bagianTiraiDari(o, grup) && !disimpan.has(o)) continue
    hasil.push(o)
  }
  return { objects: hasil, dibuang }
}

/**
 * Lengkapi jendela lama dengan tirai. Fungsi murni: tidak menyentuh storage.
 * Mengembalikan scene yang sama bila tidak ada yang perlu ditambah.
 */
export function migrasiTirai(scene: Scene): { scene: Scene; ditambah: number; dibuang: number } {
  if (!scene || !Array.isArray(scene.objects)) return { scene, ditambah: 0, dibuang: 0 }
  if (scene.meta?.tiraiV1 === true) return { scene, ditambah: 0, dibuang: 0 }

  const bagian = bagianTirai()
  if (bagian.length === 0) return { scene, ditambah: 0, dibuang: 0 }

  const tambahan: SceneObject[] = []
  let urutanTerakhir = scene.objects.reduce((m, o) => Math.max(m, o.urutan ?? 0), 0)
  const idDipakai = new Set(scene.objects.map(o => o.id))

  // kaca = penanda jendela (satu per jendela). Bisa lebih dari satu kandidat
  // bila material kaca pernah diganti; ambil yang paling lebar per grup.
  const kandidatKaca = scene.objects.filter(o =>
    o.preset === PRESET_JENDELA &&
    (o.langit === true || (typeof o.style === 'string' && GAYA_KACA.has(o.style))))
  const perGrup = new Map<string, SceneObject>()
  for (const o of kandidatKaca) {
    const g = o.grup ?? `__${o.id}`
    const ada = perGrup.get(g)
    if (!ada || o.size.e > ada.size.e) perGrup.set(g, o)
  }
  const kacaList = [...perGrup.values()]

  // rapikan tirai ganda yang mungkin sudah ada (dari migrasi versi lama)
  let objects = scene.objects
  let dibuangGanda = 0
  for (const kaca of kacaList) {
    const r = rapikanTirai(objects, kaca.grup)
    objects = r.objects
    dibuangGanda += r.dibuang
  }

  for (const kaca of kacaList) {
    // jendela yang diputar/dicerminkan tidak bisa dipetakan lurus -> lewati
    if ((kaca.rotasi ?? 0) !== 0 || kaca.refleksi === true) continue
    if (sudahAdaTirai([...objects, ...tambahan], kaca.grup)) continue

    const e0 = kaca.pos.e - KACA_LOKAL.e
    const w0 = kaca.pos.w - KACA_LOKAL.w
    const z0 = kaca.pos.z - KACA_LOKAL.z
    const namaGrup = kaca.grupNama ?? 'JENDELA'
    const gid = kaca.grup ?? 'jendela'

    bagian.forEach((bag, i) => {
      const dasar = `${gid}-tirai-${i + 1}`
      let id = dasar
      let n = 2
      while (idDipakai.has(id)) { id = `${dasar}-${n}`; n++ }
      idDipakai.add(id)
      urutanTerakhir += 1
      tambahan.push({
        id,
        label: `TIRAI ${i + 1}`,
        pos: { e: snap(e0 + bag.e), w: snap(w0 + bag.w), z: snap(z0 + bag.z) },
        size: { e: snap(bag.se), w: snap(bag.sw), z: snap(bag.sz) },
        style: bag.style,
        ...(bag.tepi === false ? { tepi: false } : {}),
        tirai: true,
        preset: PRESET_JENDELA,
        app: null,
        layer: 'main',
        grup: kaca.grup,
        ...(kaca.grup ? { grupNama: namaGrup } : {}),
        urutan: urutanTerakhir,
      })
    })
  }

  const metaBaru = { ...(scene.meta ?? { locked: false, savedAt: null }), tiraiV1: true }

  if (tambahan.length === 0 && dibuangGanda === 0) {
    // tetap tandai supaya pengecekan tidak diulang terus
    return { scene: { ...scene, meta: metaBaru }, ditambah: 0, dibuang: 0 }
  }

  return {
    scene: { ...scene, objects: [...objects, ...tambahan], meta: metaBaru },
    ditambah: tambahan.length,
    dibuang: dibuangGanda,
  }
}
