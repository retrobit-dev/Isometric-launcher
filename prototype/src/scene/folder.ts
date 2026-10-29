import type { SceneObject } from './types'

/**
 * OPERASI FOLDER (grup) — dipisah dari App.tsx supaya bisa diuji tanpa React.
 * Permintaan user 2026-10-29:
 *   "tambahkan juga fitur untuk memindahkan folder objek sesuai posisi z"
 *   "untuk posisi E, W, Z jangan gunakan -1, 0, +1 tetapi angka koordinat saja"
 *
 * Aturan:
 *   • anggota folder = gid itu + SELURUH sub-folder bersarang (`grupInduk`),
 *     objek latar tidak pernah ikut;
 *   • nilai e/w/z yang dipakai UI = SUDUT MINIMUM kotak pembatas folder,
 *     sama seperti arti `pos` pada satu objek;
 *   • memindahkan folder = semua anggota digeser dengan SELISIH yang sama,
 *     jadi susunan di dalam folder tidak berubah;
 *   • objek terkunci (`kunci` terisi) tidak ikut bergeser.
 */

const bulat = (v: number) => Math.round(v * 1000) / 1000

export type Sumbu = 'e' | 'w' | 'z'

export interface BboxFolder {
  /** sudut minimum (nilai yang ditampilkan di UI) */
  nilai: Record<Sumbu, number>
  /** ukuran kotak pembatas */
  ukuran: Record<Sumbu, number>
  /** jumlah anggota yang terkunci (tidak ikut bergeser) */
  terkunci: number
}

/** semua objek dalam satu folder, termasuk sub-folder bersarang */
export function anggotaFolder(objects: SceneObject[], gid: string): SceneObject[] {
  const semua = new Set<string>([gid])
  let tambah = true
  while (tambah) {
    tambah = false
    for (const o of objects) {
      if (o.grupInduk && semua.has(o.grupInduk) && o.grup && !semua.has(o.grup)) {
        semua.add(o.grup)
        tambah = true
      }
    }
  }
  return objects.filter(o => o.grup !== undefined && semua.has(o.grup) && !o.latar)
}

/** kotak pembatas folder dalam koordinat ruang (e/w/z) */
export function bboxFolder(objects: SceneObject[], gid: string): BboxFolder {
  const anggota = anggotaFolder(objects, gid)
  const bisa = anggota.filter(o => !o.kunci)
  const terkunci = anggota.length - bisa.length
  if (bisa.length === 0) {
    return {
      nilai: { e: 0, w: 0, z: 0 },
      ukuran: { e: 0, w: 0, z: 0 },
      terkunci,
    }
  }
  const min = { e: Infinity, w: Infinity, z: Infinity }
  const max = { e: -Infinity, w: -Infinity, z: -Infinity }
  for (const o of bisa) {
    min.e = Math.min(min.e, o.pos.e); max.e = Math.max(max.e, o.pos.e + o.size.e)
    min.w = Math.min(min.w, o.pos.w); max.w = Math.max(max.w, o.pos.w + o.size.w)
    min.z = Math.min(min.z, o.pos.z); max.z = Math.max(max.z, o.pos.z + o.size.z)
  }
  return {
    nilai: { e: bulat(min.e), w: bulat(min.w), z: bulat(min.z) },
    ukuran: { e: bulat(max.e - min.e), w: bulat(max.w - min.w), z: bulat(max.z - min.z) },
    terkunci,
  }
}

/**
 * Pindahkan folder ke KOORDINAT tujuan pada satu sumbu.
 * Mengembalikan daftar objek BARU (objek yang tidak ikut dikembalikan apa adanya).
 * `sumbu === 'z'`: anggota yang akan menembus lantai (z < 0) dilewati.
 */
export function pindahFolder(
  objects: SceneObject[],
  gid: string,
  sumbu: Sumbu,
  nilai: number,
): SceneObject[] {
  const { nilai: min } = bboxFolder(objects, gid)
  const delta = bulat(nilai - min[sumbu])
  if (delta === 0) return objects
  const ids = new Set(
    anggotaFolder(objects, gid).filter(o => !o.kunci).map(o => o.id),
  )
  if (ids.size === 0) return objects
  return objects.map(o => {
    if (!ids.has(o.id)) return o
    const baru = bulat(o.pos[sumbu] + delta)
    if (sumbu === 'z' && baru < 0) return o
    return { ...o, pos: { ...o.pos, [sumbu]: baru } }
  })
}

/** gabungkan dua daftar (nilai sudut minimum semua anggota, tanpa melihat kunci) */
export function titikFolder(objects: SceneObject[], gid: string): Record<Sumbu, number> {
  return bboxFolder(objects, gid).nilai
}
