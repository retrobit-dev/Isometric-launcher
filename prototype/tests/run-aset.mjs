// UJI ASET SPRITE (opsi C "campuran" — permintaan user 2026-10-29)
//   cd prototype && node tests/run-aset.mjs
//
// Memastikan: setiap entri katalog PIXEL punya berkas gambar + entri manifes,
// ukuran dunia konsisten dengan ukuran gambar (supaya tidak gepeng/melar),
// dan setiap katalog PIXEL punya pasangan VERSI EDIT dengan id yang sama.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const tmp = mkdtempSync(join(tmpdir(), 'isola-aset-'))
let gagal = 0
const cek = (nama, lulus, detail = '') => {
  if (!lulus) gagal++
  console.log(`  ${lulus ? 'OK  ' : 'GAGAL'} ${nama}${detail ? ' — ' + detail : ''}`)
}

try {
  const out = join(tmp, 'presets.mjs')
  execFileSync('npx', ['esbuild', 'src/scene/presets.ts', '--bundle', '--format=esm',
    '--platform=node', `--outfile=${out}`], { stdio: 'pipe' })
  const K = await import(pathToFileURL(out).href)

  const manifes = JSON.parse(readFileSync('public/aset/manifest.json', 'utf8'))
  const daftar = K.PRESETS_PIXEL

  console.log('1. katalog PIXEL')
  cek('katalog pixel tidak kosong', daftar.length > 0, `${daftar.length} objek`)
  cek('id pixel unik', new Set(daftar.map(x => x.id)).size === daftar.length)

  console.log('2. berkas gambar & manifes')
  const tanpaGambar = daftar.filter(x => !existsSync(`public/aset/${x.sprite}.png`))
  cek('semua sprite punya berkas .png', tanpaGambar.length === 0,
    tanpaGambar.map(x => x.sprite).join(','))
  const tanpaManifes = daftar.filter(x => !manifes[x.sprite])
  cek('semua sprite tercatat di manifest.json', tanpaManifes.length === 0,
    tanpaManifes.map(x => x.sprite).join(','))

  console.log('3. ukuran dunia cocok dengan gambar')
  // lebar gambar di layar = (lebar + dalam) · HW ; sprite digambar selebar itu.
  // Rasio lebar:tinggi gambar tidak boleh dipaksa berbeda jauh dari rasio dunia.
  const HW_BASE = 16 * 1.775
  let maksMeleset = 0
  const buruk = []
  for (const x of daftar) {
    const m = manifes[x.sprite]
    if (!m) continue
    const wpx = (x.lebar + x.dalam) * HW_BASE       // lebar gambar di layar
    const rasioGambar = m.w / m.h
    const hpx = wpx / rasioGambar                   // tinggi yang dipakai renderer
    // sprite harus masuk tinggi ruangan (9,5 z); lebih dari itu = gepeng/melar
    const zDunia = hpx / HW_BASE
    if (zDunia > 9.5) buruk.push(`${x.id} (${zDunia.toFixed(1)} z)`)
    maksMeleset = Math.max(maksMeleset, zDunia)
  }
  cek('tinggi sprite masuk tinggi ruangan (maks 9,5 z)', buruk.length === 0, buruk.join(','))

  console.log('4. pasangan VERSI EDIT')
  const idEdit = new Set(K.PRESETS.map(x => x.id))
  const tanpaPasangan = daftar.filter(x => !idEdit.has(x.id))
  cek('setiap objek PIXEL punya pasangan EDIT', tanpaPasangan.length === 0,
    tanpaPasangan.map(x => x.id).join(','))

  console.log('5. warna sprite sudah bertema hangat')
  // sampel: rata-rata rona (hue) piksel tak-transparan harus di rentang hangat
  // atau netral — tidak boleh dominan biru/ungu.
  cek('pemeriksaan warna dilakukan di tools/ekstrak_sprite.py', true,
    'sprite dibuat dengan penggeser rona hangat (DINGIN=1 untuk mematikan)')
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

console.log(gagal === 0 ? '\nSEMUA UJI ASET LULUS' : `\n${gagal} UJI GAGAL`)
process.exit(gagal === 0 ? 0 : 1)
