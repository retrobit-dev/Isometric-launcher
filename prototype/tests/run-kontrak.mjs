// UJI KONTRAK RENDERER — dijalankan sebelum rilis APK (docs/04 §8).
//
//   cd prototype && node tests/run-kontrak.mjs
//
// Menguji tiga hal yang paling rawan "beda tafsir" antara prototipe web dan
// renderer APK:
//   1. normalisasi scene  -> semua angka kelipatan 0.1, id unik, urutan stabil
//   2. katalog preset     -> ukuran sah, tidak ada koordinat negatif
//   3. urutan gambar      -> hash urutan (latar / layer / urutan / depth) stabil
//
// Berkas .ts dibundel dulu dengan esbuild (sudah ada di dependensi vite),
// karena Node tidak bisa mengimpor TypeScript secara langsung.

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const tmp = mkdtempSync(join(tmpdir(), 'isola-kontrak-'))
let gagal = 0

function bundle(entri) {
  const keluar = join(tmp, `${entri.replace(/[\\/]/g, '_')}.mjs`)
  execFileSync('npx', ['esbuild', `src/${entri}`, '--bundle', '--format=esm',
    '--platform=node', `--outfile=${keluar}`], { stdio: 'pipe' })
  return import(pathToFileURL(keluar).href)
}

function cek(nama, syarat, detail = '') {
  if (syarat) {
    console.log(`  OK   ${nama}${detail ? ' — ' + detail : ''}`)
  } else {
    gagal++
    console.log(`  GAGAL ${nama}${detail ? ' — ' + detail : ''}`)
  }
}

const kelipatan01 = (v) => Math.abs(Math.round(v * 10) - v * 10) < 1e-6

try {
  const store = await bundle('scene/store.ts')
  const presets = await bundle('scene/presets.ts')
  const box = await bundle('iso/box.ts')

  // ---------------------------------------------------------------- 1. skema
  console.log('1. normalisasi scene')
  const kotor = {
    version: 1,
    room: { e: 20, w: 19, wallZ: 12, palette: 'malam-biru' },
    objects: [
      { id: 'a', label: '', pos: { e: 1.234, w: -0.06, z: 0 }, size: { e: 0, w: 2.999, z: 0.04 }, style: 'wood', app: null, urutan: 3 },
      { id: 'a', label: 'kembar', pos: { e: 2, w: 2, z: 0 }, size: { e: 1, w: 1, z: 1 }, style: 'wood', app: null, urutan: 1, latar: true },
      { id: 'b', label: 'balok', pos: { e: 3, w: 3, z: 0 }, size: { e: 1, w: 1, z: 1 }, style: 'wood', app: null, urutan: 2 },
    ],
    meta: { locked: false, savedAt: null },
  }
  const bersih = store.normalisasiScene(kotor)
  const angka = bersih.objects.flatMap(o => [o.pos.e, o.pos.w, o.pos.z, o.size.e, o.size.w, o.size.z])
  cek('semua angka kelipatan 0.1', angka.every(kelipatan01), angka.join(', '))
  cek('ukuran minimal 0.1', bersih.objects.every(o => o.size.e >= 0.1 && o.size.w >= 0.1 && o.size.z >= 0.1))
  cek('id unik', new Set(bersih.objects.map(o => o.id)).size === bersih.objects.length)
  cek('label tidak kosong', bersih.objects.every(o => o.label.length > 0))
  cek('urutan bulat', bersih.objects.every(o => o.urutan === undefined || Number.isInteger(o.urutan)))
  cek('latar di urutan pertama', bersih.objects[0].latar === true)
  cek('meta hanya 3 field', Object.keys(bersih.meta).every(k => ['locked', 'savedAt', 'latarMigrasi'].includes(k)),
    Object.keys(bersih.meta).join(','))

  // ------------------------------------------------------------- 2. katalog
  console.log('2. katalog preset')
  const daftar = presets.PRESETS
  cek('ada preset', daftar.length > 0, `${daftar.length} preset`)
  let bagianTotal = 0
  let katalogSah = true
  let katalogDetail = ''
  for (const p of daftar) {
    const bagian = presets.buatPreset({
      preset: p, e: 0, w: 0, z: 0,
      grup: 'grup-uji', nama: p.nama, urutanAwal: 0, idAwal: p.id,
    })
    bagianTotal += bagian.length
    const sah = bagian.length > 0
      && bagian.every(o => o.size.e >= 0.1 && o.size.w >= 0.1 && o.size.z >= 0.1)
      && bagian.every(o => o.pos.e >= 0 && o.pos.w >= 0 && o.pos.z >= 0)
      && bagian.every(o => kelipatan01(o.pos.e) && kelipatan01(o.pos.w) && kelipatan01(o.pos.z)
        && kelipatan01(o.size.e) && kelipatan01(o.size.w) && kelipatan01(o.size.z))
      && new Set(bagian.map(o => o.id)).size === bagian.length
      && bagian.every(o => o.grup === 'grup-uji')
      // bentuk hanya boleh balok (tidak diisi) / silinder / kerucut
      && bagian.every(o => o.bentuk === undefined
        || ['silinder', 'kerucut', 'bola', 'cakram'].includes(o.bentuk))
      // puncak hanya untuk kerucut, nilainya >= 0 dan 2 desimal
      && bagian.every(o => o.puncak === undefined
        || (o.bentuk === 'kerucut' && o.puncak >= 0
          && Math.abs(o.puncak * 100 - Math.round(o.puncak * 100)) < 1e-6))
    if (!sah) { katalogSah = false; katalogDetail += ` ${p.id}` }
  }
  cek('semua preset sah (ukuran, koordinat, id, grup, bentuk)', katalogSah, katalogDetail || `${bagianTotal} bagian`)
  const bentukPakai = new Set(daftar.flatMap(pr => pr.bagian.map(x => x.bentuk ?? 'balok')))
  cek('katalog memakai bentuk baru', bentukPakai.has('silinder') && bentukPakai.has('kerucut'),
    [...bentukPakai].join(','))
  cek('id preset unik', new Set(daftar.map(p => p.id)).size === daftar.length)

  // --------------------------------------------------------- 3. urutan gambar
  console.log('3. urutan gambar')
  const contoh = {
    version: 1,
    room: { e: 20, w: 19, wallZ: 12, palette: 'malam-biru' },
    objects: [
      { id: 'lantai', label: 'lantai', pos: { e: 0, w: 0, z: 0 }, size: { e: 10, w: 10, z: 0.2 }, style: 'lantai-kayu', role: 'lantai', latar: true, urutan: 0 },
      { id: 'dinding', label: 'dinding', pos: { e: 0, w: 0, z: 0 }, size: { e: 0.2, w: 10, z: 12 }, style: 'dinding-navy', role: 'dinding', side: 'kiri', latar: true, urutan: 1 },
      { id: 'meja', label: 'meja', pos: { e: 2, w: 2, z: 0 }, size: { e: 4, w: 2, z: 2 }, style: 'wood', app: null, layer: 'main', urutan: 5 },
      { id: 'lampu', label: 'lampu', pos: { e: 3, w: 3, z: 2 }, size: { e: 1, w: 1, z: 1 }, style: 'lamp-amber', app: null, layer: 'main', urutan: 6 },
      { id: 'buku', label: 'buku', pos: { e: 5, w: 2, z: 0 }, size: { e: 1, w: 1, z: 1 }, style: 'book-red', app: null, layer: 'main', urutan: 5 },
    ],
    meta: { locked: false, savedAt: null },
  }
  const solid = contoh.objects.filter(o => o.role !== 'lantai' && o.role !== 'dinding' && o.latar !== true)
  const urutanMain = box.sortedObjects(solid.filter(o => (o.layer ?? 'main') === 'main')).map(o => o.id)
  cek('urutan main sesuai field urutan', urutanMain.join(',') === 'meja,buku,lampu', urutanMain.join(','))
  const hash = createHash('sha1').update(urutanMain.join('|')).digest('hex').slice(0, 12)
  // hash acuan dicatat di docs/04 §8. Bila berubah, urutan gambar berubah:
  // periksa dulu apakah memang disengaja, baru perbarui angka di sini + docs.
  const ACUAN = 'b1d32a86ae59'
  cek('hash urutan acuan', hash === ACUAN, `sekarang ${hash}, acuan ${ACUAN}`)
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

console.log(gagal === 0 ? '\nSEMUA UJI LULUS' : `\n${gagal} UJI GAGAL`)
process.exit(gagal === 0 ? 0 : 1)
