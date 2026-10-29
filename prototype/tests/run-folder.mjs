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

  console.log('6. aman untuk nilai aneh')
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
