// PEMUAT ASET SPRITE (opsi C "campuran", permintaan user 2026-10-29)
//
// Sprite adalah potongan LANGSUNG dari gambar referensi (lihat
// ekstrak_sprite.py di akar repo). Dimuat sekali saat aplikasi dibuka, lalu
// didaftarkan ke renderer (iso/box.ts). Selama belum selesai dimuat, objek
// versi pixel digambar sebagai kotak penanda — tidak ada crash, tidak ada
// kedipan selamanya.
import { daftarSprite } from '../iso/box'

export interface UkuranAset {
  w: number
  h: number
  /** rasio lebar/tinggi gambar asli (untuk menghitung ukuran dunia) */
  rasio: number
}

let manifes: Record<string, UkuranAset> = {}
let selesai: Promise<void> | null = null
const gambar: Record<string, HTMLImageElement> = {}

const ALAMAT = '/aset/'

async function muatSatu(nama: string): Promise<void> {
  const img = new Image()
  img.src = `${ALAMAT}${nama}.png`
  await new Promise<void>((selesai2) => {
    img.onload = () => selesai2()
    img.onerror = () => selesai2()   // gagal = tetap kotak penanda
  })
  if (img.naturalWidth > 0) {
    gambar[nama] = img
    daftarSprite(nama, img)
  }
}

/** muat manifes + semua gambar. Aman dipanggil berkali-kali. */
export function muatAset(): Promise<void> {
  if (selesai) return selesai
  selesai = (async () => {
    try {
      const r = await fetch(`${ALAMAT}manifest.json`, { cache: 'no-cache' })
      if (!r.ok) return
      manifes = await r.json()
      await Promise.all(Object.keys(manifes).map(muatSatu))
    } catch {
      /* tanpa aset: objek pixel tampil sebagai kotak */
    }
  })()
  return selesai
}

/** ukuran asli sprite (px) — 0 bila belum termuat */
export function ukuranAset(nama: string): UkuranAset | null {
  const m = manifes[nama]
  if (m) return m
  const img = gambar[nama]
  return img ? { w: img.naturalWidth, h: img.naturalHeight, rasio: img.naturalWidth / img.naturalHeight } : null
}

/** daftar nama aset yang tersedia (dipakai panel & uji) */
export function daftarNamaAset(): string[] {
  return Object.keys(manifes)
}
