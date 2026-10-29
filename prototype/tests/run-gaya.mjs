// UJI PEMILIH WARNA (tombol ◀ ▶) — permintaan user 2026-10-29:
//   "untuk pemilihan warna pada editor objek gunakan tombol kanan kiri untuk
//    memilih"
//
//   cd prototype && node tests/run-gaya.mjs
//
// Yang diperiksa: daftar warna per jenis objek, langkah kiri/kanan (termasuk
// memutar dari ujung ke ujung), gaya tak dikenal, dan label posisi.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const tmp = mkdtempSync(join(tmpdir(), 'isola-gaya-'))
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
  const G = await bangun('src/scene/gaya.ts', 'gaya.mjs')
  const P = await bangun('src/iso/palette.ts', 'palet.mjs')

  console.log('1. daftar warna per jenis objek')
  cek('balok memakai material balok',
    G.kunciGaya(undefined).length === P.MATERIAL_KEYS.length,
    `${G.kunciGaya(undefined).length} material`)
  cek('lantai memakai palet lantai',
    G.kunciGaya('lantai').join() === P.FLOOR_KEYS.join())
  cek('dinding memakai palet dinding + material',
    G.kunciGaya('dinding').join() === P.WALL_STYLE_KEYS.join())
  cek('material lebih dari satu halaman (perlu tombol kiri)',
    P.MATERIAL_KEYS.length > 20, `${P.MATERIAL_KEYS.length} material`)

  console.log('2. tombol KANAN (▶) maju satu warna')
  const m = P.MATERIAL_KEYS
  cek('dari warna ke-1 ke warna ke-2', G.gayaBerikut(undefined, m[0], 1) === m[1])
  cek('dari warna ke-3 ke warna ke-4', G.gayaBerikut(undefined, m[2], 1) === m[3])

  console.log('3. tombol KIRI (◀) mundur satu warna')
  cek('dari warna ke-2 ke warna ke-1', G.gayaBerikut(undefined, m[1], -1) === m[0])
  cek('dari warna ke-10 ke warna ke-9', G.gayaBerikut(undefined, m[9], -1) === m[8])

  console.log('4. memutar di ujung daftar')
  cek('▶ dari warna terakhir kembali ke pertama',
    G.gayaBerikut(undefined, m[m.length - 1], 1) === m[0])
  cek('◀ dari warna pertama ke warna terakhir',
    G.gayaBerikut(undefined, m[0], -1) === m[m.length - 1])

  console.log('5. bolak-balik kembali ke warna semula')
  let cur = m[5]
  cur = G.gayaBerikut(undefined, cur, 1)
  cur = G.gayaBerikut(undefined, cur, -1)
  cek('maju lalu mundur = warna awal', cur === m[5], cur)

  console.log('6. gaya tidak dikenal / kosong')
  cek('▶ mulai dari warna pertama', G.gayaBerikut(undefined, 'gaya-asing', 1) === m[0])
  cek('◀ mulai dari warna terakhir',
    G.gayaBerikut(undefined, 'gaya-asing', -1) === m[m.length - 1])
  cek('style kosong tidak error', typeof G.gayaBerikut(undefined, undefined, 1) === 'string')
  cek('indeks gaya asing = -1', G.indeksGaya(undefined, 'gaya-asing') === -1)

  console.log('7. label posisi (dipakai di panel)')
  cek('label warna pertama', G.labelPosisiGaya(undefined, m[0]) === `1/${m.length}`,
    G.labelPosisiGaya(undefined, m[0]))
  cek('label warna kelima', G.labelPosisiGaya(undefined, m[4]) === `5/${m.length}`)
  cek('label kosong untuk gaya asing', G.labelPosisiGaya(undefined, 'gaya-asing') === '')

  console.log('8. lantai & dinding ikut bisa dipilih kiri/kanan')
  const f = P.FLOOR_KEYS
  cek('lantai ▶ maju', G.gayaBerikut('lantai', f[0], 1) === f[1 % f.length])
  cek('lantai ◀ dari awal memutar ke akhir',
    G.gayaBerikut('lantai', f[0], -1) === f[f.length - 1])
  const d = P.WALL_STYLE_KEYS
  cek('dinding ▶ maju', G.gayaBerikut('dinding', d[0], 1) === d[1 % d.length])
} catch (e) {
  gagal++
  console.log('  GAGAL uji error —', e.message)
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

console.log(gagal === 0 ? '\nSEMUA UJI LULUS' : `\n${gagal} UJI GAGAL`)
process.exit(gagal === 0 ? 0 : 1)
