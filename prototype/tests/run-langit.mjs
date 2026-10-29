// UJI LANGIT & CUACA — permintaan user 2026-10-29:
//   "warna background menyesuaikan warna langit nyata ... animasi pergerakan
//    bulan atau matahari ... awan jika berawan ... hujan rintik-rintik ketika
//    gerimis ... warna langit sesuaikan jam atau waktu pada perangkat, bagi
//    menjadi suasana pagi, siang, senja, malam, dan fajar."
//
//   cd prototype && node tests/run-langit.mjs
//
// Yang diperiksa: pembagian fase dari jam, bahwa SEMUA warna langit berasal dari
// palet referensi 342 warna, pemetaan cuaca (termasuk kode WMO Open-Meteo),
// posisi matahari/bulan, dan keadaan global yang dipakai renderer.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const tmp = mkdtempSync(join(tmpdir(), 'isola-langit-'))
let gagal = 0
const cek = (nama, lulus, detail = '') => {
  if (!lulus) gagal++
  console.log(`  ${lulus ? 'OK  ' : 'GAGAL'} ${nama}${detail ? ' — ' + detail : ''}`)
}
const bangun = (entri, nama) => {
  const out = join(tmp, nama)
  execFileSync('npx', ['esbuild', entri, '--bundle', '--format=esm', '--platform=node',
    `--outfile=${out}`], { stdio: 'pipe' })
  return import(pathToFileURL(out).href)
}

try {
  const L = await bangun('src/iso/langit.ts', 'langit.mjs')
  const R = await bangun('src/iso/palet-referensi.ts', 'palet.mjs')
  const palet = new Set(R.PALET_REF.flat())

  console.log('1. fase waktu dari jam perangkat')
  const harap = [
    [5, 'fajar'], [5.9, 'fajar'], [6, 'pagi'], [7.25, 'pagi'], [9.99, 'pagi'],
    [10, 'siang'], [12, 'siang'], [14.9, 'siang'], [15, 'senja'], [17.5, 'senja'],
    [18, 'malam'], [23.9, 'malam'], [0, 'malam'], [3, 'malam'], [4.5, 'fajar'],
  ]
  let faseSah = true
  for (const [jam, fase] of harap) {
    const d = L.faseDariJam(jam)
    if (d !== fase) { faseSah = false; console.log(`      ${jam} -> ${d} (harap ${fase})`) }
  }
  cek('fajar/pagi/siang/senja/malam tepat di batas jam', faseSah)
  cek('jam di luar 0..24 tetap dinormalkan', L.faseDariJam(25.5) === L.faseDariJam(1.5),
    `${L.faseDariJam(25.5)}`)

  console.log('2. semua warna langit dari palet referensi (342 warna)')
  const fase = ['fajar', 'pagi', 'siang', 'senja', 'malam']
  let semuaPalet = true
  const detailBuruk = []
  for (const f of fase) {
    const l = L.langitFase(f)
    for (const hex of [...l.pita, l.awan]) {
      if (!palet.has(hex)) { semuaPalet = false; detailBuruk.push(`${f}:${hex}`) }
    }
  }
  cek('6 pita + awan tiap fase ada di palet', semuaPalet, detailBuruk.join(',') || '5 fase x 7 warna')
  cek('malam memakai bulan + bintang',
    L.langitFase('malam').benda === 'bulan' && L.langitFase('malam').bintang === true)
  cek('siang tidak menampilkan bintang', L.langitFase('siang').bintang === false)
  cek('tiap fase punya 6 pita', fase.every(f => L.langitFase(f).pita.length === 6))

  console.log('3. cuaca')
  const cuaca = ['cerah', 'berawan', 'gerimis', 'hujan', 'badai']
  cek('cerah = tanpa hujan', L.efekCuaca('cerah').hujan === 0)
  cek('berawan = ada awan, tanpa hujan',
    L.efekCuaca('berawan').awan >= 2 && L.efekCuaca('berawan').hujan === 0)
  cek('gerimis = hujan rintik + pelangi',
    L.efekCuaca('gerimis').hujan > 0 && L.efekCuaca('gerimis').pelangi === true)
  cek('badai = hujan terbanyak + kilat',
    L.efekCuaca('badai').hujan > L.efekCuaca('hujan').hujan && L.efekCuaca('badai').kilat === true)
  cek('hujan/badai memakai langit mendung',
    L.efekCuaca('hujan').mendung?.length === 6 && L.efekCuaca('badai').mendung?.length === 6)
  let cuacaPalet = true
  for (const c of cuaca) {
    const m = L.efekCuaca(c).mendung
    if (m && !m.every(h => palet.has(h))) cuacaPalet = false
  }
  cek('warna mendung juga dari palet', cuacaPalet)

  console.log('4. kode cuaca WMO (Open-Meteo)')
  const wmo = [
    [0, 'cerah'], [2, 'berawan'], [3, 'berawan'], [45, 'berawan'],
    [53, 'gerimis'], [55, 'gerimis'], [63, 'hujan'], [65, 'hujan'],
    [80, 'hujan'], [95, 'badai'], [99, 'badai'],
  ]
  let wmoSah = true
  for (const [kode, harapan] of wmo) {
    const d = L.cuacaDariKode(kode)
    if (d !== harapan) { wmoSah = false; console.log(`      ${kode} -> ${d} (harap ${harapan})`) }
  }
  cek('pemetaan kode WMO benar', wmoSah)

  console.log('5. gerak matahari & bulan')
  const pagi = L.posisiBenda(7, 'pagi')
  const sore = L.posisiBenda(17, 'senja')
  cek('matahari terbit di kiri, terbenam di kanan', pagi.u < 0.35 && sore.u > 0.65,
    `${pagi.u.toFixed(2)} -> ${sore.u.toFixed(2)}`)
  cek('matahari paling tinggi saat tengah hari',
    L.posisiBenda(12, 'siang').v < pagi.v && L.posisiBenda(12, 'siang').v < sore.v)
  cek('malam menampilkan bulan', L.posisiBenda(21, 'malam').bulan === true)
  cek('posisi deterministik (bukan acak)',
    L.posisiBenda(12, 'siang').u === L.posisiBenda(12, 'siang').u)

  console.log('6. migrasi scene lama (belum punya langit: true)')
  const S = await bangun('src/scene/store.ts', 'store.mjs')
  const lama = {
    version: 1,
    room: { e: 20, w: 20, wallZ: 9.5, palette: 'hangat' },
    objects: [
      // kaca jendela lama: preset benar, tapi TANPA field langit
      { id: 'kaca', label: 'kaca', pos: { e: 12.26, w: 0.34, z: 2.46 },
        size: { e: 3.68, w: 0.05, z: 3.88 }, style: 'kaca-langit', app: null,
        layer: 'main', urutan: 5, preset: 'jendela', grup: 'g-j' },
      // objek biasa dengan gaya lain tidak boleh ikut jadi langit
      { id: 'kayu', label: 'kayu', pos: { e: 1, w: 1, z: 0 },
        size: { e: 1, w: 1, z: 1 }, style: 'kayu-tepi', app: null, layer: 'main', urutan: 6 },
    ],
    meta: { locked: false, savedAt: null },
  }
  const hasil = S.normalisasiScene(lama)
  cek('kaca scene lama otomatis memakai langit dinamis',
    hasil.objects.find(o => o.id === 'kaca')?.langit === true)
  cek('objek gaya lain tidak ikut jadi langit',
    hasil.objects.find(o => o.id === 'kayu')?.langit === undefined)
  const sudah = S.normalisasiScene({ ...lama, objects: [
    { ...lama.objects[0], langit: undefined, preset: undefined, style: 'kaca-langit' },
  ] })
  cek('bagian kaca tanpa preset tidak dipaksa', sudah.objects[0].langit === undefined)

  console.log('7. keadaan global yang dipakai renderer')
  L.setLangit({ jam: 20.5, cuaca: 'hujan' })
  const k = L.getLangit()
  cek('setLangit/getLangit menyimpan jam & cuaca', k.jam === 20.5 && k.cuaca === 'hujan',
    `${k.jam}/${k.cuaca}`)
  L.setLangit({ jam: 26 })
  cek('jam dibungkus ke 0..24', L.getLangit().jam === 2, String(L.getLangit().jam))
  L.setLangit({ jam: 12, cuaca: 'cerah' })
} catch (e) {
  gagal++
  console.log('  GAGAL uji error —', e.message)
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

console.log(gagal === 0 ? '\nSEMUA UJI LULUS' : `\n${gagal} UJI GAGAL`)
process.exit(gagal === 0 ? 0 : 1)
