// UJI KEBERSIHAN ASET REFERENSI (ronde 17, permintaan user 2026-10-29:
// "hapus semua objek yang dibuat dari referensi, kita buat sendiri saja").
//   cd prototype && node tests/run-aset.mjs
//
// Yang diuji: TIDAK ADA lagi sisa jalur sprite/versi pixel hasil potongan
// gambar referensi — baik berkas gambar, modul pemuat, field data, maupun
// rujukan di kode. Kalau suatu saat objek buatan sendiri butuh aset, uji ini
// yang harus diperbarui lebih dulu.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const tmp = mkdtempSync(join(tmpdir(), 'isola-aset-'))
let gagal = 0
const cek = (nama, lulus, detail = '') => {
  if (!lulus) gagal++
  console.log(`  ${lulus ? 'OK  ' : 'GAGAL'} ${nama}${detail ? ' — ' + detail : ''}`)
}

/** semua berkas sumber (untuk memeriksa sisa rujukan sprite) */
const sumber = []
const jelajah = (dir) => {
  for (const nama of readdirSync(dir)) {
    const p = join(dir, nama)
    if (statSync(p).isDirectory()) jelajah(p)
    else if (/\.(ts|tsx)$/.test(nama)) sumber.push(p)
  }
}
jelajah('src')

console.log('1. berkas sprite referensi')
cek('folder public/aset sudah dihapus', !existsSync('public/aset'))
cek('modul pemuat sprite sudah dihapus', !existsSync('src/scene/aset.ts'))

console.log('2. rujukan di kode')
/** buang komentar supaya kalimat dokumentasi tidak ikut dianggap kode */
const tanpaKomentar = (isi) => isi
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
const kode = sumber.map(p => ({ p, isi: tanpaKomentar(readFileSync(p, 'utf8')) }))
// yang dicari = API jalur sprite (bukan sekadar kata dalam komentar/properti
// data lama yang justru dibersihkan di store.ts)
const API_SPRITE = /drawSprite|daftarSprite|spriteSiap|daftarNamaAset|muatAset|ukuranAset|PRESETS_PIXEL|buatPixel|presetPixelOf/
const sprite = kode.filter(x => API_SPRITE.test(x.isi))
cek('tidak ada API jalur sprite / versi pixel di kode', sprite.length === 0,
  sprite.map(x => x.p).join(','))

console.log('3. data scene lama tetap aman')
const out = join(tmp, 'store.mjs')
execFileSync('npx', ['esbuild', 'src/scene/store.ts', '--bundle', '--format=esm',
  '--platform=node', `--outfile=${out}`], { stdio: 'pipe' })
const S = await import(pathToFileURL(out).href)
const scene = S.normalisasiScene({
  version: 1,
  objects: [{
    id: 'x', label: 'x', pos: { e: 1, w: 1, z: 0 }, size: { e: 1, w: 1, z: 1 },
    style: 'wood', sprite: 'meja-guru',
  }],
})
const o = scene.objects[0]
cek('field sprite dari scene lama dibuang', o && !('sprite' in o), o ? Object.keys(o).join(',') : 'objek hilang')
cek('objek tetap ada setelah dibersihkan', !!o)

// objek sisa preset referensi (katalog kosong) harus dibuang saat dimuat,
// tetapi LATAR (lantai & dinding) dipertahankan
const scene2 = S.normalisasiScene({
  version: 1,
  objects: [
    { id: 'l', label: 'lantai', pos: { e: 0, w: 0, z: 0 }, size: { e: 20, w: 20, z: 0.2 },
      style: 'lantai-terakota', role: 'lantai', latar: true },
    { id: 'm', label: 'meja', pos: { e: 2, w: 2, z: 0 }, size: { e: 2, w: 1, z: 1 },
      style: 'wood', preset: 'meja-guru' },
  ],
})
cek('objek sisa preset referensi dibuang',
  scene2.objects.length === 1 && scene2.objects[0].id === 'l',
  scene2.objects.map(x => x.id).join(','))
cek('LATAR tidak ikut terbuang', scene2.objects.some(x => x.latar === true))

console.log(gagal === 0 ? '\nSEMUA UJI ASET LULUS' : `\n${gagal} UJI GAGAL`)
process.exit(gagal === 0 ? 0 : 1)
