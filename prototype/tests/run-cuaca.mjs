// UJI SUMBER CUACA — perbaikan 2026-10-29: user di REMBANG melihat gerimis
// padahal di Rembang tidak hujan. Penyebabnya koordinat cadangan selalu
// Semarang dan izin lokasi TIDAK PERNAH diminta.
//
//   cd prototype && node tests/run-cuaca.mjs
//
// Diuji tanpa jaringan: fetch dan geolocation dipalsukan.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const tmp = mkdtempSync(join(tmpdir(), 'isola-cuaca-'))
let gagal = 0
const cek = (nama, lulus, detail = '') => {
  if (!lulus) gagal++
  console.log(`  ${lulus ? 'OK  ' : 'GAGAL'} ${nama}${detail ? ' — ' + detail : ''}`)
}

// localStorage tiruan
const simpanan = new Map()
globalThis.localStorage = {
  getItem: k => (simpanan.has(k) ? simpanan.get(k) : null),
  setItem: (k, v) => simpanan.set(k, String(v)),
  removeItem: k => simpanan.delete(k),
  clear: () => simpanan.clear(),
}

// fetch tiruan: mencatat URL, mengembalikan kode cuaca tertentu
let kodeCuaca = 2
const urlDiminta = []
const fetchPalsu = async (url) => {
  urlDiminta.push(String(url))
  return { ok: true, json: async () => ({ current: { weather_code: kodeCuaca } }) }
}

try {
  const out = join(tmp, 'cuaca.mjs')
  execFileSync('npx', ['esbuild', 'src/scene/cuaca.ts', '--bundle', '--format=esm', '--platform=node',
    `--outfile=${out}`], { stdio: 'pipe' })
  const C = await import(pathToFileURL(out).href)

  console.log('1. lokasi bawaan = REMBANG (bukan Semarang)')
  const awal = C.pengaturanAwal()
  cek('kota awal rembang', awal.kota === 'rembang', awal.kota)
  const rembang = C.kotaOf('rembang')
  const semarang = C.kotaOf('semarang')
  cek('koordinat rembang benar',
    Math.abs(rembang.lat + 6.7082) < 0.01 && Math.abs(rembang.lon - 111.3416) < 0.01,
    `${rembang.lat},${rembang.lon}`)
  const jarak = C.jarakKm(rembang, semarang)
  cek('jarak rembang-semarang > 80 km (alasan cuaca bisa beda)',
    jarak > 80, `${jarak.toFixed(0)} km`)

  console.log('2. sumber KOTA tidak memakai GPS')
  let gpsDipanggil = 0
  const gps = async () => { gpsDipanggil++; return { lat: -6.7082, lon: 111.3416 } }
  const kotaSaja = { ...awal, sumber: 'kota', kota: 'rembang' }
  const k1 = await C.koordinatEfektif(kotaSaja, gps)
  cek('gps tidak dipanggil saat sumber=kota', gpsDipanggil === 0)
  cek('koordinat = kota pilihan', k1.dari === 'kota' && Math.abs(k1.lat + 6.7082) < 0.01)

  console.log('3. sumber PERANGKAT benar-benar meminta lokasi')
  const dariPerangkat = { ...awal, sumber: 'perangkat' }
  gpsDipanggil = 0
  const k2 = await C.koordinatEfektif(dariPerangkat, async () => {
    gpsDipanggil++
    return { lat: -6.71, lon: 111.35 }
  })
  cek('gps dipanggil untuk sumber=perangkat', gpsDipanggil === 1)
  cek('koordinat perangkat dipakai', k2.dari === 'perangkat' && Math.abs(k2.lat + 6.71) < 0.01)

  console.log('4. izin ditolak / tidak tersedia -> kota pilihan (bukan Semarang)')
  const k3 = await C.koordinatEfektif(dariPerangkat, async () => null)
  cek('jatuh ke kota pilihan', k3.dari === 'kota' && Math.abs(k3.lat + 6.7082) < 0.01,
    `${k3.lat},${k3.lon}`)
  const k4 = await C.koordinatEfektif({ ...dariPerangkat, kota: 'pati' }, async () => null)
  cek('ikuti kota yang dipilih user (pati)', Math.abs(k4.lat + 6.7559) < 0.01, `${k4.lat}`)

  console.log('5. permintaan cuaca memakai koordinat Rembang & kode WMO')
  kodeCuaca = 2
  urlDiminta.length = 0
  const c1 = await C.ambilCuacaNyata({ ...awal, sumber: 'kota' },
    { ambilLokasi: gps, ambilJaringan: fetchPalsu })
  cek('kode 2 -> BERAWAN', c1 === 'berawan', String(c1))
  cek('URL memuat lintang Rembang', /latitude=-6\.708/.test(urlDiminta[0]), urlDiminta[0]?.slice(0, 82))

  console.log('6. cache per koordinat, ganti kota = ambil ulang')
  urlDiminta.length = 0
  const c2 = await C.ambilCuacaNyata({ ...awal, sumber: 'kota' },
    { ambilLokasi: gps, ambilJaringan: fetchPalsu })
  cek('permintaan kedua memakai cache (tanpa fetch)', urlDiminta.length === 0 && c2 === 'berawan')
  kodeCuaca = 61
  const c3 = await C.ambilCuacaNyata({ ...awal, sumber: 'kota', kota: 'jakarta' },
    { ambilLokasi: gps, ambilJaringan: fetchPalsu })
  cek('kota lain tidak memakai cache Rembang', urlDiminta.length === 1, `${urlDiminta.length} fetch`)
  cek('kode 61 -> HUJAN', c3 === 'hujan', String(c3))

  console.log('7. offline / API gagal -> null (pemanggil pakai mode manual)')
  const c4 = await C.ambilCuacaNyata({ ...awal, sumber: 'kota', kota: 'kudus' }, {
    ambilLokasi: gps,
    ambilJaringan: async () => { throw new Error('offline') },
  })
  cek('gagal jaringan mengembalikan null', c4 === null)

  console.log('8. pengaturan lama (tanpa field sumber) dimigrasikan')
  simpanan.clear()
  simpanan.set('isola-cuaca-v1', JSON.stringify({ mode: 'otomatis', manual: 'cerah', lat: -6.9667, lon: 110.4167 }))
  const lama = C.muatPengaturanCuaca()
  cek('sumber default perangkat', lama.sumber === 'perangkat', lama.sumber)
  cek('kota default rembang', lama.kota === 'rembang', lama.kota)
  cek('koordinat Semarang lama TIDAK dipakai',
    Math.abs(lama.lat + 6.7082) < 0.01, `${lama.lat},${lama.lon}`)
} catch (e) {
  gagal++
  console.log('  GAGAL uji error —', e.message)
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

console.log(gagal === 0 ? '\nSEMUA UJI LULUS' : `\n${gagal} UJI GAGAL`)
process.exit(gagal === 0 ? 0 : 1)
