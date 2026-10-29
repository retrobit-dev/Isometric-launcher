// UJI PALET RETRO ENDESGA 32 (ronde 38, 2026-10-29).
// Permintaan user: "style dan palette warna dibuat lebih ke arah retro pixel
// art" -> palet = ENDESGA 32, ciri = DITHERING.
// Uji ini memastikan: (a) paletnya benar 51 warna referensi, (b) tangga nada konsisten,
// (c) SEMUA warna di palette.ts anggota palet, (d) cadangan JSON sinkron.
//   cd prototype && node tests/run-palet.mjs
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const tmp = mkdtempSync(join(tmpdir(), 'isola-palet-'))
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
const HEX = /^#[0-9a-f]{6}$/
const luma = (h) => {
  const n = parseInt(h.slice(1), 16)
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114
}

try {
  const R = await bangun('src/iso/palet-referensi.ts', 'ref.mjs')
  const P = await bangun('src/iso/palette.ts', 'palette.mjs')
  const D = await bangun('src/iso/dither.ts', 'dither.mjs')

  console.log('1. bentuk palet referensi 51 warna')
  cek('51 warna unik', R.PALET_RETRO.length === 51 && new Set(R.PALET_RETRO).size === 51,
    String(R.PALET_RETRO.length))
  cek('semua hex 6 digit', R.PALET_RETRO.every(c => HEX.test(c)))
  cek('SEMUA = 51 warna (satu-satunya warna sah)', R.SEMUA.length === 51)
  cek('latar OLED murni tetap #000000', R.OLED === '#000000')
  cek('grid desain 19 tingkat x 18 kolom tetap ada',
    R.PALET_REF.length === 19 && R.PALET_REF.every(r => r.length === 18))
  cek('setiap sel grid desain sudah anggota palet',
    R.PALET_REF.every(r => r.every(c => R.diPalet(c))))

  console.log('2. tangga nada')
  cek('setiap warna palet masuk tepat satu tangga',
    R.TANGGA.flat().length === 51 && new Set(R.TANGGA.flat()).size === 51
      && R.TANGGA.length === 10,
    `${R.TANGGA.length} tangga`)
  cek('tiap tangga urut dari gelap ke terang',
    R.TANGGA.every(t => t.every((c, i) => i === 0 || luma(c) > luma(t[i - 1]))))
  const bukanDasar = R.SEMUA.filter(c => {
    const { tangga, tingkat } = R.tanggaDari(c)
    return tingkat > 0 && tingkat < R.TANGGA[tangga].length - 1
  })
  cek('gelap() selalu lebih gelap', bukanDasar.every(c => luma(R.gelap(c, 1)) < luma(c)),
    bukanDasar.filter(c => !(luma(R.gelap(c, 1)) < luma(c))).slice(0, 3).join(','))
  cek('terang() selalu lebih terang', bukanDasar.every(c => luma(R.terang(c, 1)) > luma(c)),
    bukanDasar.filter(c => !(luma(R.terang(c, 1)) > luma(c))).slice(0, 3).join(','))
  cek('gelap()/terang() tidak pernah keluar palet',
    R.SEMUA.every(c => R.diPalet(R.gelap(c, 3)) && R.diPalet(R.terang(c, 3))))
  cek('gelap(40) mentok di nada tergelap palet', R.gelap(R.SEMUA[0], 40) === R.GELAP_MAKS,
    R.gelap(R.SEMUA[0], 40))

  console.log('3. pemetaan warna -> palet')
  const uji = ['#dd8b3f', '#f2c17b', '#d9822f', '#a8541c', '#4d3a35', '#f7e6c4', '#8a9a4a', '#4c8f8a']
  cek('semua hasil pemetaan ada di palet', uji.every(h => R.diPalet(R.kePalet(h))),
    uji.map(h => `${h}->${R.kePalet(h)}`).join(' '))
  cek('warna yang sudah di palet tidak diubah', R.kePalet('#e4b98a') === '#e4b98a')
  cek('warna di luar palet selalu digeser', !R.diPalet('#123457') && R.diPalet(R.kePalet('#123457')),
    R.kePalet('#123457'))

  console.log('4. pola dither (ciri retro)')
  cek('matriks Bayer 4x4 berisi 16 ambang berbeda',
    new Set(D.BAYER4.flat()).size === 16 && D.BAYER4.flat().every(v => v >= 0 && v <= 15))
  const hitung = (lv) => {
    let n = 0
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (D.pikselB(x, y, lv)) n++
    return n
  }
  cek('level 0 = tanpa piksel kedua', hitung(0) === 0)
  cek('level 1 = semua piksel kedua', hitung(1) === 16)
  cek('level 0,5 = separuh piksel', hitung(0.5) === 8, String(hitung(0.5)))
  cek('jumlah piksel naik seiring level',
    [0.25, 0.5, 0.75].every((lv, i, a) => i === 0 || hitung(lv) > hitung(a[i - 1])))

  console.log('5. palette.ts memakai palet')
  const nilaiHex = []
  const kumpul = (v) => {
    if (typeof v === 'string') { if (HEX.test(v)) nilaiHex.push(v) }
    else if (v && typeof v === 'object') Object.values(v).forEach(kumpul)
  }
  kumpul(P.PAL); kumpul(P.MATERIALS); kumpul(P.FLOOR_MATERIALS); kumpul(P.WALL_MATERIALS)
  const luar = nilaiHex.filter(h => !R.diPalet(h) && h !== '#000000')
  cek('warna dasar/material/lantai/dinding semuanya dari 51 warna', luar.length === 0,
    `${nilaiHex.length} warna, luar palet: ${luar.slice(0, 5).join(' ')}`)
  cek('tidak ada material magenta (penanda bug) di katalog',
    !Object.values(P.MATERIALS).some(m => m.top === '#ff0044'))

  console.log('6. cadangan JSON')
  const ref = JSON.parse(readFileSync('../docs/04-palet-referensi.json', 'utf8'))
  cek('docs/04-palet-referensi.json = grid desain modul',
    JSON.stringify(ref.baris) === JSON.stringify(R.PALET_REF))
  const retro = JSON.parse(readFileSync('../docs/04-palet-retro.json', 'utf8'))
  cek('docs/04-palet-retro.json = 51 warna + tangga',
    JSON.stringify(retro.palet) === JSON.stringify(R.PALET_RETRO)
    && JSON.stringify(retro.tangga) === JSON.stringify(R.TANGGA))
  cek('docs/04-palet-retro.json memuat matriks Bayer',
    JSON.stringify(retro.bayer4) === JSON.stringify(D.BAYER4))
  const pal = JSON.parse(readFileSync('../docs/04-palet.json', 'utf8'))
  cek('docs/04-palet.json = palette.ts', JSON.stringify(pal.materi) === JSON.stringify(P.MATERIALS)
    && JSON.stringify(pal.lantai) === JSON.stringify(P.FLOOR_MATERIALS))
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

console.log(gagal === 0 ? '\nSEMUA UJI PALET LULUS' : `\n${gagal} UJI PALET GAGAL`)
process.exit(gagal === 0 ? 0 : 1)
