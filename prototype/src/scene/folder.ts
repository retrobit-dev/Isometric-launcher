import { ROTASI_FOLDER, UKURAN_MIN, normalRotasi, type SceneObject } from './types'

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

/**
 * PUTAR FOLDER — kelipatan 30° (permintaan user 2026-10-29, setelah memilih
 * "rotasi folder" dengan "langkah 30°").
 *
 * Seluruh anggota diputar mengelilingi POROS TENGAH folder (titik tengah kotak
 * pembatas): posisi tiap objek mengorbit poros itu, dan `rotasi` tiap objek
 * sendiri ikut ditambah 30° supaya bentuknya tetap sejajar dengan folder.
 * Objek terkunci dan latar tidak ikut. Ketinggian (z) tidak berubah.
 */
export function putarFolder(
  objects: SceneObject[],
  gid: string,
  arah: 1 | -1 = 1,
): SceneObject[] {
  const bb = bboxFolder(objects, gid)
  if (bb.ukuran.e === 0 && bb.ukuran.w === 0) return objects
  const pe = bulat(bb.nilai.e + bb.ukuran.e / 2)
  const pw = bulat(bb.nilai.w + bb.ukuran.w / 2)
  const th = (arah * ROTASI_FOLDER * Math.PI) / 180
  const co = Math.cos(th)
  const si = Math.sin(th)
  const ids = new Set(
    anggotaFolder(objects, gid).filter(o => !o.kunci).map(o => o.id),
  )
  if (ids.size === 0) return objects
  return objects.map(o => {
    if (!ids.has(o.id)) return o
    const ce = o.pos.e + o.size.e / 2
    const cw = o.pos.w + o.size.w / 2
    const de = ce - pe
    const dw = cw - pw
    const ne = pe + de * co - dw * si
    const nw = pw + de * si + dw * co
    return {
      ...o,
      pos: {
        ...o.pos,
        e: bulat(ne - o.size.e / 2),
        w: bulat(nw - o.size.w / 2),
      },
      rotasi: normalRotasi((o.rotasi ?? 0) + arah * ROTASI_FOLDER),
    }
  })
}

/**
 * UBAH UKURAN FOLDER — "panjangkan / lebarkan / tinggikan seluruh isi folder
 * sebagai satu kesatuan" (permintaan user 2026-10-29).
 *
 * `nilai` = UKURAN KOTAK PEMBATAS folder pada sumbu itu (bukan ukuran satu
 * objek). Semua anggota diskalakan dengan faktor yang sama terhadap SUDUT
 * MINIMUM sebagai jangkar, jadi:
 *   • jarak antar bagian ikut membesar/mengecil secara proporsional;
 *   • susunan folder tidak berubah bentuk;
 *   • posisi & ukuran tiap bagian tetap angka 3 desimal yang sah.
 * Objek terkunci tidak ikut.
 */
export function skalaFolder(
  objects: SceneObject[],
  gid: string,
  sumbu: Sumbu,
  nilai: number,
): SceneObject[] {
  const bb = bboxFolder(objects, gid)
  const dasar = bb.ukuran[sumbu]
  if (dasar <= 0) return objects
  const f = nilai / dasar
  if (!Number.isFinite(f) || f <= 0 || Math.abs(f - 1) < 1e-9) return objects
  const jangkar = bb.nilai[sumbu]
  const ids = new Set(
    anggotaFolder(objects, gid).filter(o => !o.kunci).map(o => o.id),
  )
  if (ids.size === 0) return objects
  return objects.map(o => {
    if (!ids.has(o.id)) return o
    return {
      ...o,
      pos: { ...o.pos, [sumbu]: bulat(jangkar + (o.pos[sumbu] - jangkar) * f) },
      size: { ...o.size, [sumbu]: Math.max(UKURAN_MIN, bulat(o.size[sumbu] * f)) },
    }
  })
}

/**
 * HAPUS FOLDER — membuang SEMUA anggota (termasuk sub-folder bersarang).
 * Dipisah dari App supaya bisa diuji tanpa React; konfirmasi & URUNGKAN tetap
 * diurus App.
 */
export function hapusFolder(objects: SceneObject[], gid: string): SceneObject[] {
  const ids = new Set(anggotaFolder(objects, gid).map(o => o.id))
  if (ids.size === 0) return objects
  return objects.filter(o => !ids.has(o.id))
}

export interface OpsiDuplikat {
  /** id grup baru untuk salinan (wajib unik) */
  gidBaru: string
  /** nama folder salinan (bawaan: nama asli) */
  nama?: string
  /** geser salinan pada sumbu e/w supaya tidak menumpuk persis di aslinya */
  de?: number
  dw?: number
}

/**
 * DUPLIKAT FOLDER — menyalin SEMUA anggota (termasuk sub-folder bersarang)
 * menjadi folder BARU yang berdiri sendiri (permintaan user 2026-10-29:
 * "tambahkan juga fitur duplikat dan hapus folder, yang artinya untuk semua
 * objek dalam folder").
 *
 * Salinan:
 *   • dapat id baru (`gidBaru-1`, `gidBaru-2`, …) dan grup baru;
 *   • sub-folder di dalamnya juga dapat id grup baru (struktur bersarang tetap);
 *   • digeser `de`/`dw` dari aslinya supaya kelihatan;
 *   • dilepas dari kunci objek asal (sama seperti duplikat satu objek);
 *   • ditaruh paling atas (`urutan` di atas semua objek yang ada).
 */
export function duplikatFolder(
  objects: SceneObject[],
  gid: string,
  opsi: OpsiDuplikat,
): { objects: SceneObject[]; baru: SceneObject[] } {
  const anggota = anggotaFolder(objects, gid)
  if (anggota.length === 0) return { objects, baru: [] }
  const de = opsi.de ?? 1
  const dw = opsi.dw ?? 1

  // peta id grup lama -> id grup baru (folder utama + sub-folder bersarang)
  const petaGrup = new Map<string, string>([[gid, opsi.gidBaru]])
  let anak = 0
  for (const o of anggota) {
    if (!o.grup || petaGrup.has(o.grup)) continue
    anak += 1
    petaGrup.set(o.grup, `${opsi.gidBaru}-sub-${anak}`)
  }

  const urutanAwal = objects.reduce((m, o) => Math.max(m, o.urutan ?? 0), 0) + 1

  const baru: SceneObject[] = anggota.map((o, i) => {
    const grupBaru = (o.grup && petaGrup.get(o.grup)) || opsi.gidBaru
    const indukBaru = o.grupInduk ? petaGrup.get(o.grupInduk) ?? o.grupInduk : undefined
    return {
      ...o,
      id: `${opsi.gidBaru}-${i + 1}`,
      label: `${o.label} (salinan)`,
      pos: {
        ...o.pos,
        e: bulat(o.pos.e + de),
        w: bulat(o.pos.w + dw),
      },
      grup: grupBaru,
      // nama folder utama memakai `opsi.nama`; sub-folder memakai nama aslinya
      grupNama: grupBaru === opsi.gidBaru
        ? (opsi.nama ?? o.grupNama)
        : o.grupNama,
      grupInduk: indukBaru,
      kunci: undefined,
      layer: 'main',
      urutan: urutanAwal + i,
    }
  })
  return { objects: [...objects, ...baru], baru }
}

/** gabungkan dua daftar (nilai sudut minimum semua anggota, tanpa melihat kunci) */
export function titikFolder(objects: SceneObject[], gid: string): Record<Sumbu, number> {
  return bboxFolder(objects, gid).nilai
}
