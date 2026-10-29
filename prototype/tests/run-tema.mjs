// UJI TEMA "DIORAMA HANGAT" — memastikan palet web, palet offline, dan
// katalog preset tetap satu keluarga warna.
//   cd prototype && node tests/run-tema.mjs
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const tmp = mkdtempSync(join(tmpdir(), 'isola-tema-'))
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
const HEX = /^#[0-9a-f]{6}$/i
const lum = (h) => {
  const n = parseInt(h.slice(1), 16)
  return (((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114)
}

try {
  const P = await bangun('src/iso/palette.ts', 'palette.mjs')
  const K = await bangun('src/scene/presets.ts', 'presets.mjs')

  console.log('1. warna dasar')
  // 2026-10-29: latar belakang = HITAM OLED murni (permintaan user)
  cek('void = hitam OLED #000000', P.PAL.void === '#000000', P.PAL.void)
  cek('dinding teduh lebih gelap dari muka cahaya',
    lum(P.PAL.wallB) < lum(P.PAL.wallT), `${P.PAL.wallB} < ${P.PAL.wallT}`)
  cek('tidak ada biru/ungu dingin di warna dasar',
    ['wallB', 'wallT', 'trimB', 'trimT', 'floorBase', 'floorAlt', 'floorC', 'grout', 'skirtL', 'skirtR']
      .every(k => { const n = parseInt(P.PAL[k].slice(1), 16); const b = n & 255; return b < ((n >> 16 & 255) + 20) }))

  console.log('2. material tiga nada')
  const buruk = Object.entries(P.MATERIALS).filter(([, m]) =>
    !HEX.test(m.top) || !HEX.test(m.left) || !HEX.test(m.right))
  cek('semua material berupa hex 6 digit', buruk.length === 0, buruk.map(([k]) => k).join(','))

  const terbalik = Object.entries(P.MATERIALS).filter(([, m]) =>
    !(lum(m.top) > lum(m.right) && lum(m.right) >= lum(m.left)))
  // pastel sengaja punya nada berbeda; hanya tema utama yang diuji ketat
  const terbalikTema = terbalik.filter(([k]) => !k.startsWith('pastel-'))
  cek('urutan nada top > right >= left (tema utama)', terbalikTema.length === 0,
    terbalikTema.map(([k]) => k).join(','))

  // Ronde 38: palet Endesga 32 memang punya nada biru/abu. Yang diuji: material
  // TEMA UTAMA (kayu, kertas, kain, cahaya) tetap hangat; biru/abu hanya boleh
  // muncul di aksen yang memang dingin (kaca, besi, kursi gelap, zaitun).
  const DINGIN_SAH = [
    'teal', 'kaca-langit', 'buku-biru', 'book-blue', 'chair-dark', 'abu', 'abu-tua',
    'perak', 'perak-tua', 'buku-gelap', 'zaitun-tua', 'buku-zaitun-tepi', 'kusen-putih',
    'papan-putih', 'kertas-putih',
  ]
  // RONDE 39: palet referensi memang punya hijau/zaitun yang kanal birunya
  // sedikit di atas merah. "Dingin" sekarang = BIRU benar-benar mendominasi
  // (kanal biru paling tinggi), bukan sekadar b > r.
  const dingin = Object.entries(P.MATERIALS).filter(([k, m]) => {
    if (k.startsWith('pastel-') || DINGIN_SAH.includes(k)) return false
    const n = parseInt(m.top.slice(1), 16)
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
    return b > r + 10 && b > g + 10
  })
  cek('material tema tidak kebiruan', dingin.length === 0, dingin.map(([k]) => k).join(','))

  console.log('3. katalog memakai style yang ada')
  const styleDipakai = new Set()
  for (const pr of K.PRESETS) for (const x of pr.bagian) styleDipakai.add(x.style)
  const hilang = [...styleDipakai].filter(s => !P.MATERIALS[s])
  cek('semua style preset ada di palet', hilang.length === 0, hilang.join(','))
  cek('tidak ada style magenta (tak dikenal)', hilang.length === 0)

  console.log('4. lantai & dinding')
  const lantaiBuruk = Object.entries(P.FLOOR_MATERIALS).filter(([, f]) =>
    !['ubin', 'papan'].includes(f.pattern) || f.tones.length !== 3
    || !f.tones.every(t => HEX.test(t)) || !HEX.test(f.grout))
  cek('semua lantai sah', lantaiBuruk.length === 0, lantaiBuruk.map(([k]) => k).join(','))
  cek('lantai bawaan papan-batu', P.FLOOR_DEFAULT === 'lantai-papan-batu', P.FLOOR_DEFAULT)
  cek('dinding bawaan Tudor', P.WALL_DEFAULT === 'dinding-tudor', P.WALL_DEFAULT)

  console.log('5. docs/04-palet.json = palette.ts')
  const json = JSON.parse(readFileSync('../docs/04-palet.json', 'utf8'))
  const sama = (a, b) => JSON.stringify(a) === JSON.stringify(b)
  cek('materi sama', sama(json.materi, P.MATERIALS))
  cek('lantai sama', sama(json.lantai, P.FLOOR_MATERIALS))
  cek('dinding sama', sama(json.dinding, P.WALL_MATERIALS))
  if (!sama(json.materi, P.MATERIALS)) console.log('     -> jalankan: node gen_palet.mjs')
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

console.log(gagal === 0 ? '\nSEMUA UJI TEMA LULUS' : `\n${gagal} UJI GAGAL`)
process.exit(gagal === 0 ? 0 : 1)
