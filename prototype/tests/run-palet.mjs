// UJI PALET REFERENSI — 342 warna dari gambar "COLOR PALETTE (rainbow + brown
// and gray)". Memastikan SEMUA warna yang keluar ke kanvas berasal dari palet.
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

  console.log('1. bentuk palet')
  cek('18 kolom x 19 tingkat', R.PALET_REF.length === 19 && R.PALET_REF.every(r => r.length === 18))
  cek('342 warna unik', R.SEMUA.length === 342 && new Set(R.SEMUA).size === 342, String(R.SEMUA.length))
  cek('semua hex 6 digit', R.SEMUA.every(c => HEX.test(c)))
  cek('nama kolom lengkap 18', R.KOLOM.length === 18)
  cek('kolom terakhir cokelat & abu', R.KOLOM[16] === 'cokelat' && R.KOLOM[17] === 'abu-abu')
  cek('latar OLED murni', R.OLED === '#000000')

  console.log('2. tangga gelap/terang')
  // lewati baris 1 (paling terang) & 19 (paling gelap): di ujung tangga tidak
  // ada lagi langkah yang mungkin
  const dasar = R.SEMUA.filter(c => {
    const t = R.posisi(c).tingkat
    return t > 1 && t < 19 && R.SEMUA.indexOf(c) % 7 === 0
  })
  cek('gelap() selalu lebih gelap', dasar.every(c => luma(R.gelap(c, 1)) < luma(c)),
    dasar.filter(c => !(luma(R.gelap(c, 1)) < luma(c))).slice(0, 3).join(','))
  cek('terang() selalu lebih terang', dasar.every(c => luma(R.terang(c, 1)) > luma(c)),
    dasar.filter(c => !(luma(R.terang(c, 1)) > luma(c))).slice(0, 3).join(','))
  cek('gelap() tidak pernah keluar palet', dasar.every(c => R.diPalet(R.gelap(c, 3))))
  cek('gelap(5) mentok di baris tergelap', R.posisi(R.gelap(R.SEMUA[0], 40)).tingkat === 19,
    String(R.posisi(R.gelap(R.SEMUA[0], 40)).tingkat))

  console.log('3. pemetaan warna lama -> palet')
  const uji = ['#dd8b3f', '#f2c17b', '#d9822f', '#a8541c', '#4d3a35', '#f7e6c4', '#8a9a4a', '#4c8f8a']
  cek('semua hasil pemetaan ada di palet', uji.every(h => R.diPalet(R.kePalet(h))),
    uji.map(h => `${h}->${R.kePalet(h)}`).join(' '))
  cek('krem tetap hangat (bukan pink)', R.posisi(R.kePalet('#f7e6c4')).kolom === 17,
    R.kePalet('#f7e6c4'))
  cek('abu tetap abu (kolom 18)', R.posisi(R.kePalet('#4d3a35')).kolom === 18,
    R.kePalet('#4d3a35'))
  cek('warna yang sudah di palet tidak diubah', R.kePalet('#c26420') === '#c26420')

  console.log('4. palet.ts memakai palet')
  const nilaiHex = []
  const kumpul = (v) => {
    if (typeof v === 'string') { if (HEX.test(v)) nilaiHex.push(v) } 
    else if (v && typeof v === 'object') Object.values(v).forEach(kumpul)
  }
  kumpul(P.PAL); kumpul(P.MATERIALS); kumpul(P.FLOOR_MATERIALS); kumpul(P.WALL_MATERIALS)
  const luar = nilaiHex.filter(h => !R.diPalet(h) && h !== '#000000')
  cek('warna dasar/material/lantai/dinding semuanya dari palet', luar.length === 0, luar.slice(0, 5).join(' '))
  cek('tidak ada material magenta (penanda bug) di katalog', !Object.values(P.MATERIALS).some(m => m.top === '#ff00ff'))

  console.log('5. cadangan JSON')
  const ref = JSON.parse(readFileSync('../docs/04-palet-referensi.json', 'utf8'))
  cek('docs/04-palet-referensi.json = modul', JSON.stringify(ref.baris) === JSON.stringify(R.PALET_REF))
  const pal = JSON.parse(readFileSync('../docs/04-palet.json', 'utf8'))
  cek('docs/04-palet.json = palette.ts', JSON.stringify(pal.materi) === JSON.stringify(P.MATERIALS)
    && JSON.stringify(pal.lantai) === JSON.stringify(P.FLOOR_MATERIALS))
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

console.log(gagal === 0 ? '\nSEMUA UJI PALET LULUS' : `\n${gagal} UJI PALET GAGAL`)
process.exit(gagal === 0 ? 0 : 1)
