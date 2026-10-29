// UJI GAYA RETRO (ronde 38, 2026-10-29)
//   cd prototype && node tests/run-retro.mjs
//
// Permintaan user: "untuk semuanya bisakah style nya dan palette warna nya
// dibuat lebih ke arah retro pixel art?" — jawaban user: ciri = DITHERING,
// palet = ENDESGA 32, cakupan = SEMUA bagian.
//
// Uji ini menjaga TIGA hal yang mudah rusak lagi tanpa sadar:
//   1. Tidak ada lagi pencampuran warna di jalur gambar (campuran = warna di
//      luar palet). Dithering wajib dipakai sebagai gantinya.
//   2. Dithering benar-benar terpasang di SEMUA bidang besar: dinding, lantai,
//      objek (balok/silinder/bola), dan langit.
//   3. Renderer offline (Python) memakai matriks Bayer dan rencana langit yang
//      SAMA dengan prototipe web.
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

let gagal = 0
const cek = (nama, lulus, detail = '') => {
  if (!lulus) gagal++
  console.log(`  ${lulus ? 'OK  ' : 'GAGAL'} ${nama}${detail ? ' — ' + detail : ''}`)
}
const baca = (p) => readFileSync(p, 'utf8')
const tmp = mkdtempSync(join(tmpdir(), 'isola-retro-'))

try {
  const box = baca('src/iso/box.ts')
  const room = baca('src/iso/room.ts')
  const langit = baca('src/iso/langit.ts')
  const palet = baca('src/iso/palet-referensi.ts')
  const retro = baca('src/iso/palet-retro.ts')
  const dither = baca('src/iso/dither.ts')
  const py = baca('../tools/render_scene.py')

  console.log('1. palet tunggal: referensi 51 warna')
  const D = await import(pathToFileURL(join(tmp, 'd.mjs')).href, { with: {} }).catch(() => null)
  void D
  execFileSync('npx', ['esbuild', 'src/iso/palet-retro.ts', '--bundle', '--format=esm',
    '--platform=node', `--outfile=${join(tmp, 'retro.mjs')}`], { stdio: 'pipe' })
  const RT = await import(pathToFileURL(join(tmp, 'retro.mjs')).href)
  cek('palet 51 warna', RT.PALET_RETRO.length === 51)
  cek('latar luar tetap hitam OLED (aturan ronde 13 masih berlaku)',
    /OLED = '#000000'/.test(palet), '#000000')
  cek('modul palet menyebut palet referensi 51 warna', /51 warna/i.test(retro))
  cek('aturan "342 warna" sudah tidak dipakai (diganti 51 warna ronde 39)',
    /DIBATALKAN|dibatalkan/.test(palet) || /DIBATALKAN|dibatalkan/.test(retro))

  console.log('2. dithering wajib, pencampuran warna dilarang')
  cek('langit tidak lagi memakai campur()', !/function campur|pitaHalus/.test(langit))
  cek('langit memakai rencanaLangit + polaDither',
    /rencanaLangit/.test(langit) && /polaDither/.test(langit))
  cek('dinding & lantai memakai polaBayang', /polaBayang/.test(room))
  cek('balok memakai polaDither di pita nada', /polaDither/.test(box))
  cek('silinder memakai polaDither di batas terang/gelap',
    /polaDither\(ctx, c\.right, c\.left/.test(box))
  cek('bola memakai lapisan dither', /polaDither\(ctx, c\.left, c\.top/.test(box))
  const rgbaArtwork = [box, room, langit].join('\n').match(/rgba\(/g) ?? []
  cek('tidak ada rgba() di jalur gambar (hanya UI/editor)', rgbaArtwork.length === 0,
    String(rgbaArtwork.length))

  console.log('3. matriks Bayer')
  const bayer = (src) => (src.match(/\[\s*0,\s*8,\s*2,\s*10\s*\]/) ? true : false)
  cek('BAYER4 4x4 ada di modul TS', bayer(dither))
  cek('BAYER4 sama di renderer Python', bayer(py))
  cek('level dibulatkan ke 1/16 (pola identik antar perangkat)',
    /round\(t \* 16\)/.test(dither) && /round\(level \* 16\)/.test(py))
  const skalaTs = Number((dither.match(/export const SKALA = (\d+)/) || [])[1])
  const skalaPy = Number((py.match(/SKALA_DITHER = (\d+)/) || [])[1])
  cek('skala sel pola 3x3 (ronde 40: makin kasar)', skalaTs === 3, String(skalaTs))
  cek('skala sel pola sama di TS & Python', skalaTs === skalaPy,
    `TS ${skalaTs} vs PY ${skalaPy}`)

  console.log('4. renderer offline ikut aturan')
  cek('Python punya pola dither bertumpuk (_isi_pola)', /def _isi_pola/.test(py))
  cek('Python punya rencana langit yang sama', /def _rencana_langit/.test(py))
  cek('Python tidak lagi memakai _campur/_pita_halus di jalur gambar',
    !/_campur\(|_pita_halus\(/.test(py.replace(/def _campur|def _pita_halus/g, '')))
  cek('Python memakai tangga nada palet (gelap/terang)',
    /TANGGA\[/.test(py) && /GELAP_MAKS/.test(py))
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

console.log(gagal === 0 ? '\nSEMUA UJI RETRO LULUS' : `\n${gagal} UJI RETRO GAGAL`)
process.exit(gagal === 0 ? 0 : 1)
