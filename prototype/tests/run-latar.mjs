// Uji GAMBAR LATAR (background kanvas) — butuh dev server di :5173
//   node tests/run-latar.mjs
const BASE = process.env.ISOLA_BASE || 'http://localhost:5173'
let gagal = 0
const ok = (nama, lulus, info = '') => {
  if (!lulus) gagal++
  console.log(`  ${lulus ? 'OK  ' : 'GAGAL'} ${nama}${info ? ` — ${info}` : ''}`)
}

// PNG 1x1 transparan (dataURL sah, cukup untuk uji simpan/ambil)
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

console.log('1. endpoint gambar latar')
const awal = await fetch(`${BASE}/api/latar`)
ok('GET awal menjawab 200/204', awal.status === 200 || awal.status === 204, `status ${awal.status}`)
const lama = awal.status === 200 ? Buffer.from(await awal.arrayBuffer()) : null

const post = await fetch(`${BASE}/api/latar`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ dataUrl: PNG }),
})
const j = await post.json().catch(() => ({}))
ok('POST menerima dataURL', post.ok && j.ok === true, JSON.stringify(j))
ok('token dikembalikan', typeof j.token === 'string' && j.token.length > 0, String(j.token))

const get = await fetch(`${BASE}/api/latar`)
const buf = Buffer.from(await get.arrayBuffer())
ok('GET mengembalikan gambar', get.status === 200 && buf.length > 0, `${buf.length} byte`)
ok('Content-Type gambar', String(get.headers.get('content-type')).startsWith('image/'), String(get.headers.get('content-type')))

console.log('2. penolakan data yang salah')
const salah = await fetch(`${BASE}/api/latar`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ dataUrl: 'bukan-gambar' }),
})
ok('dataURL palsu ditolak', salah.status === 400, `status ${salah.status}`)

console.log('3. hapus gambar latar')
const del = await fetch(`${BASE}/api/latar`, { method: 'DELETE' })
ok('DELETE berhasil', del.ok, `status ${del.status}`)
const kosong = await fetch(`${BASE}/api/latar`)
ok('setelah hapus -> 204', kosong.status === 204, `status ${kosong.status}`)

// pulihkan gambar lama bila ada (jangan merusak scene user)
if (lama && lama.length > 0) {
  const dUrl = 'data:image/png;base64,' + lama.toString('base64')
  await fetch(`${BASE}/api/latar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl: dUrl }),
  })
  console.log('  (gambar latar lama dipulihkan)')
}

console.log(gagal === 0 ? '\nSEMUA UJI LATAR LULUS' : `\n${gagal} UJI GAGAL`)
process.exit(gagal === 0 ? 0 : 1)
