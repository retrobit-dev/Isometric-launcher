// UJI PINDAH FOLDER — koordinat e/w/z (permintaan user 2026-10-29:
// "tambahkan juga fitur untuk memindahkan folder objek sesuai posisi z" dan
// "untuk posisi E, W, Z jangan gunakan -1, 0, +1 tetapi angka koordinat saja").
//   cd prototype && node tests/run-folder.mjs
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const tmp = mkdtempSync(join(tmpdir(), 'isola-folder-'))
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
  const F = await bangun('src/scene/folder.ts', 'folder.mjs')

  // jendela: 2 bagian dalam folder, 1 sub-folder berisi 1 bagian, 1 latar, 1 terkunci
  const o = (id, pos, size, ekstra = {}) => ({
    id, label: id, pos, size, style: 'kayu-tepi', app: null, layer: 'main', ...ekstra,
  })
  const objects = [
    o('lantai', { e: 0, w: 0, z: 0 }, { e: 20, w: 20, z: 0.2 }, { role: 'lantai', latar: true }),
    o('w1', { e: 12, w: 0.5, z: 2.5 }, { e: 0.2, w: 0.2, z: 4 }, { grup: 'g-j', grupNama: 'JENDELA' }),
    o('w2', { e: 13, w: 0.5, z: 2.6 }, { e: 0.2, w: 0.2, z: 3.8 }, { grup: 'g-j', grupNama: 'JENDELA' }),
    o('w3', { e: 12.6, w: 0.5, z: 6.5 }, { e: 0.8, w: 0.1, z: 0.2 },
      { grup: 'g-sub', grupNama: 'JENDELA / GORDEN', grupInduk: 'g-j' }),
    o('w4', { e: 14, w: 0.5, z: 3 }, { e: 0.4, w: 0.4, z: 0.4 },
      { grup: 'g-j', grupNama: 'JENDELA', kunci: 'semua' }),
    o('bebas', { e: 1, w: 1, z: 0 }, { e: 1, w: 1, z: 1 }),
  ]

  console.log('1. anggota folder')
  const anggota = F.anggotaFolder(objects, 'g-j').map(x => x.id)
  cek('folder + sub-folder ikut', anggota.includes('w1') && anggota.includes('w2')
    && anggota.includes('w3') && anggota.includes('w4'), anggota.join(','))
  cek('objek di luar folder tidak ikut', !anggota.includes('bebas'))
  cek('latar tidak ikut', !anggota.includes('lantai'))

  console.log('2. kotak pembatas = sudut minimum')
  const bb = F.bboxFolder(objects, 'g-j')
  cek('e minimum 12', bb.nilai.e === 12, String(bb.nilai.e))
  cek('w minimum 0.5', bb.nilai.w === 0.5, String(bb.nilai.w))
  cek('z minimum 2.5', bb.nilai.z === 2.5, String(bb.nilai.z))
  cek('tinggi kotak 4.2', bb.ukuran.z === 4.2, String(bb.ukuran.z))
  cek('1 anggota terkunci dilaporkan', bb.terkunci === 1, String(bb.terkunci))

  console.log('3. pindah sumbu Z (permintaan utama)')
  const naik = F.pindahFolder(objects, 'g-j', 'z', 5)
  const zOf = (arr, id) => arr.find(x => x.id === id).pos.z
  cek('z minimum jadi 5', F.bboxFolder(naik, 'g-j').nilai.z === 5, String(F.bboxFolder(naik, 'g-j').nilai.z))
  cek('selisih sama untuk semua bagian', zOf(naik, 'w1') === 5 && zOf(naik, 'w2') === 5.1, `${zOf(naik, 'w1')},${zOf(naik, 'w2')}`)
  cek('sub-folder ikut', zOf(naik, 'w3') === 9)
  cek('objek terkunci tidak bergeser', zOf(naik, 'w4') === 3)
  cek('objek di luar folder tidak bergeser', zOf(naik, 'bebas') === 0)
  cek('e & w tidak berubah', naik.find(x => x.id === 'w1').pos.e === 12 && naik.find(x => x.id === 'w1').pos.w === 0.5)

  console.log('4. pindah sumbu E dan W')
  const geserE = F.pindahFolder(objects, 'g-j', 'e', 3.25)
  cek('e minimum jadi 3.25', F.bboxFolder(geserE, 'g-j').nilai.e === 3.25)
  cek('susunan di dalam folder tetap', geserE.find(x => x.id === 'w2').pos.e - geserE.find(x => x.id === 'w1').pos.e === 1)
  const geserW = F.pindahFolder(objects, 'g-j', 'w', 0.25)
  cek('w minimum jadi 0.25', F.bboxFolder(geserW, 'g-j').nilai.w === 0.25)

  console.log('5. z tidak boleh menembus lantai')
  const bawah = F.pindahFolder(objects, 'g-j', 'z', -10)
  cek('bagian yang akan < 0 tetap di tempatnya', zOf(bawah, 'w1') === 2.5, String(zOf(bawah, 'w1')))
  cek('tidak ada nilai z negatif', bawah.every(x => x.pos.z >= 0))

  console.log('6. putar folder 15 derajat')
  // dua objek berjarak 2 satuan pada sumbu e, poros di tengah kotak pembatas
  const p0 = [
    o('a', { e: -1, w: -0.5, z: 1 }, { e: 2, w: 1, z: 1 }, { grup: 'g-p' }),
    o('b', { e: 1, w: -0.5, z: 1 }, { e: 2, w: 1, z: 1 }, { grup: 'g-p' }),
    o('k', { e: 5, w: 0, z: 0 }, { e: 1, w: 1, z: 1 }, { grup: 'g-p', kunci: 'semua' }),
  ]
  const p1 = F.putarFolder(p0, 'g-p', 1)
  const pA = p1.find(x => x.id === 'a')
  const pB = p1.find(x => x.id === 'b')
  cek('rotasi tiap anggota +15', pA.rotasi === 15 && pB.rotasi === 15, `${pA.rotasi},${pB.rotasi}`)
  const jarak = (x, y) => Math.hypot(
    (x.pos.e + x.size.e / 2) - (y.pos.e + y.size.e / 2),
    (x.pos.w + x.size.w / 2) - (y.pos.w + y.size.w / 2),
  )
  cek('jarak antar objek tetap', Math.abs(jarak(pA, pB) - jarak(p0[0], p0[1])) < 0.002,
    `${jarak(pA, pB).toFixed(3)} vs ${jarak(p0[0], p0[1]).toFixed(3)}`)
  cek('objek terkunci tidak berputar/bergeser',
    p1.find(x => x.id === 'k').pos.e === 5 && p1.find(x => x.id === 'k').rotasi === undefined)
  cek('z tidak berubah', pA.pos.z === 1)
  // 24 langkah x 15 derajat = 360 derajat -> kembali ke posisi awal
  let p2 = p0
  for (let i = 0; i < 24; i++) p2 = F.putarFolder(p2, 'g-p', 1)
  const p2a = p2.find(x => x.id === 'a')
  cek('24 x 15 derajat kembali ke awal',
    Math.abs(p2a.pos.e - (-1)) < 0.002 && Math.abs(p2a.pos.w - (-0.5)) < 0.002,
    `${p2a.pos.e},${p2a.pos.w}`)
  cek('rotasi kembali 0 setelah 24 langkah', p2a.rotasi === undefined || p2a.rotasi === 0,
    String(p2a.rotasi))

  console.log('7. ubah ukuran folder sebagai satu kesatuan')
  const s0 = [
    o('u1', { e: 0, w: 0, z: 2 }, { e: 1, w: 0.4, z: 1 }, { grup: 'g-u' }),
    o('u2', { e: 2, w: 0, z: 2 }, { e: 1, w: 0.4, z: 3 }, { grup: 'g-u' }),
  ]
  const lebarE = F.skalaFolder(s0, 'g-u', 'e', 6)   // semula 3 -> 6 (x2)
  cek('panjang folder jadi 6', F.bboxFolder(lebarE, 'g-u').ukuran.e === 6,
    String(F.bboxFolder(lebarE, 'g-u').ukuran.e))
  cek('ukuran tiap bagian ikut x2',
    lebarE.find(x => x.id === 'u1').size.e === 2 && lebarE.find(x => x.id === 'u2').size.e === 2)
  cek('sudut minimum tetap (jangkar di sudut)', F.bboxFolder(lebarE, 'g-u').nilai.e === 0)
  cek('jarak antar bagian ikut x2',
    lebarE.find(x => x.id === 'u2').pos.e - lebarE.find(x => x.id === 'u1').pos.e === 4,
    String(lebarE.find(x => x.id === 'u2').pos.e - lebarE.find(x => x.id === 'u1').pos.e))

  const tinggi = F.skalaFolder(s0, 'g-u', 'z', 6)   // semula 3 -> 6 (x2)
  cek('tinggi folder jadi 6', F.bboxFolder(tinggi, 'g-u').ukuran.z === 6)
  cek('dasar folder tetap di z 2', F.bboxFolder(tinggi, 'g-u').nilai.z === 2)

  const lebarW = F.skalaFolder(s0, 'g-u', 'w', 0.2)
  cek('lebar folder jadi 0.2', F.bboxFolder(lebarW, 'g-u').ukuran.w === 0.2)

  const denganKunci = F.skalaFolder(
    [...s0, o('uk', { e: 5, w: 0, z: 0 }, { e: 1, w: 1, z: 1 }, { grup: 'g-u', kunci: 'semua' })],
    'g-u', 'e', 9,
  )
  cek('objek terkunci tidak ikut diskalakan',
    denganKunci.find(x => x.id === 'uk').size.e === 1)

  console.log('8. aman untuk nilai aneh')
  cek('delta 0 -> objek tidak berubah', F.pindahFolder(objects, 'g-j', 'z', 2.5) === objects)
  cek('folder tak dikenal -> tidak berubah', F.pindahFolder(objects, 'tidak-ada', 'z', 9) === objects)
} catch (e) {
  gagal++
  console.log('  GAGAL uji error —', e.message)
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

console.log(gagal === 0 ? '\nSEMUA UJI LULUS' : `\n${gagal} UJI GAGAL`)
process.exit(gagal === 0 ? 0 : 1)
