// UJI ANIMASI (docs/04 §4b) — dijalankan tanpa browser.
//   cd prototype && node tests/run-animasi.mjs
// Memastikan: transform hanya dipakai saat menggambar, selalu di-restore,
// dan DATA scene (pos/size) tidak pernah berubah.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const tmp = mkdtempSync(join(tmpdir(), 'isola-anim-'))
let gagal = 0
const cek = (nama, lulus, detail = '') => {
  if (!lulus) gagal++
  console.log(`  ${lulus ? 'OK  ' : 'GAGAL'} ${nama}${detail ? ' — ' + detail : ''}`)
}

try {
  const out = join(tmp, 'box.mjs')
  execFileSync('npx', ['esbuild', 'src/iso/box.ts', '--bundle', '--format=esm',
    '--platform=node', `--outfile=${out}`], { stdio: 'pipe' })
  const B = await import(pathToFileURL(out).href)

  const catat = []
  const mkCtx = () => {
    const st = { fillStyle: '', strokeStyle: '', lineWidth: 1, lineJoin: '', imageSmoothingEnabled: true }
    return new Proxy(st, {
      get(t, k) {
        if (k in t) return t[k]
        if (k === 'translate') return (x, y) => catat.push('translate')
        if (k === 'rotate') return () => catat.push('rotate')
        if (k === 'scale') return () => catat.push('scale')
        if (k === 'save') return () => catat.push('save')
        if (k === 'restore') return () => catat.push('restore')
        return () => {}
      },
      set(t, k, v) { t[k] = v; return true },
    })
  }

  const dasar = {
    id: 'x', label: 'x', pos: { e: 2, w: 2, z: 0 },
    size: { e: 1, w: 1, z: 1 }, style: 'kayu-terakota', app: null,
  }
  const jalankan = (patch) => {
    catat.length = 0
    B.drawObject(mkCtx(), { ...dasar, ...patch })
    return catat
  }

  console.log('1. tanpa animasi')
  const kosong = jalankan({})
  cek('tidak memakai transform', kosong.length === 0, kosong.join(',') || 'tidak ada')

  console.log('2. tiap jenis animasi')
  for (const [jenis, wajib] of [
    ['naik-turun', 'translate'],
    ['ayun', 'rotate'],
    ['denyut', 'scale'],
    ['putar', 'rotate'],
  ]) {
    const c = jalankan({ anim: { jenis, laju: 1, besar: 1 } })
    cek(`${jenis} memakai ${wajib}`, c.includes(wajib) && c.includes('save') && c.includes('restore'), c.join(','))
  }

  console.log('3. kedip = 30% siklus tidak digambar')
  const faseKedip = []
  for (let i = 0; i < 40; i++) {
    const c = jalankan({ anim: { jenis: 'kedip', laju: 1, besar: 1, fase: i / 40 } })
    faseKedip.push(c.length === 0)
  }
  const nKosong = faseKedip.filter(Boolean).length
  cek('ada fase mati (1..40 dari 40 sampel)', nKosong > 0 && nKosong < 40, `${nKosong}/40 sampel tidak digambar`)

  console.log('4. data scene tidak berubah')
  const asli = JSON.stringify(dasar)
  jalankan({ anim: { jenis: 'ayun', laju: 2, besar: 3, fase: 0.5 } })
  cek('pos/size tetap sama', JSON.stringify(dasar) === asli)
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

console.log(gagal === 0 ? '\nSEMUA UJI ANIMASI LULUS' : `\n${gagal} UJI GAGAL`)
process.exit(gagal === 0 ? 0 : 1)
