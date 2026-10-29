// PEMILIH WARNA / MATERIAL — permintaan user 2026-10-29:
//   "untuk pemilihan warna pada editor objek gunakan tombol kanan kiri untuk
//    memilih"
//
// Dulu editor objek hanya punya SATU tombol yang selalu maju (⟳), jadi untuk
// kembali ke warna sebelumnya user harus memutar seluruh daftar (74 material).
// Sekarang ada tombol ◀ dan ▶: masing-masing mundur/maju satu warna, dan bisa
// DITAHAN untuk berulang cepat.
//
// Logika daftar ditaruh di sini (bukan di dalam komponen) supaya bisa diuji
// tanpa browser: daftar kunci per jenis objek + langkah ke kiri/kanan.

import { FLOOR_KEYS, MATERIAL_KEYS, WALL_STYLE_KEYS } from '../iso/palette'

export type Arah = 1 | -1

/** daftar warna yang sah untuk satu objek, menurut perannya */
export function kunciGaya(role: string | undefined): string[] {
  if (role === 'lantai') return FLOOR_KEYS
  if (role === 'dinding') return WALL_STYLE_KEYS
  return MATERIAL_KEYS
}

/** posisi warna sekarang di dalam daftar; -1 bila gaya tidak dikenal */
export function indeksGaya(role: string | undefined, cur: unknown): number {
  const keys = kunciGaya(role)
  return typeof cur === 'string' ? keys.indexOf(cur) : -1
}

/**
 * Warna berikutnya / sebelumnya.
 * Gaya yang TIDAK Dikenal (data lama / hasil impor) tidak membuat daftar
 * berhenti: ▶ mulai dari warna pertama, ◀ mulai dari warna terakhir.
 */
export function gayaBerikut(role: string | undefined, cur: unknown, arah: Arah): string {
  const keys = kunciGaya(role)
  const i = indeksGaya(role, cur)
  if (i < 0) return arah > 0 ? keys[0] : keys[keys.length - 1]
  return keys[(i + arah + keys.length) % keys.length]
}

/** label posisi, mis. "3/74"; string kosong bila gaya tidak dikenal */
export function labelPosisiGaya(role: string | undefined, cur: unknown): string {
  const i = indeksGaya(role, cur)
  if (i < 0) return ''
  return `${i + 1}/${kunciGaya(role).length}`
}
