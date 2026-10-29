// SUMBER CUACA — permintaan user 2026-10-29: "warna langit sesuaikan jam atau
// waktu pada perangkat ... tambahkan hujan ... sesuai cuaca nyata".
//
// Dua mode:
//   • OTOMATIS — cuaca NYATA dari Open-Meteo (gratis, tanpa API key).
//   • MANUAL   — user memilih sendiri (cerah/berawan/gerimis/hujan/badai),
//                dipakai untuk uji dan saat offline.
//
// LOKASI (perbaikan 2026-10-29): dulu `p.lat && p.lon` selalu terisi titik
// cadangan Semarang, sehingga izin lokasi TIDAK PERNAH diminta dan cuaca yang
// diambil selalu cuaca Semarang — padahal user di Rembang (±95 km) dan
// cuacanya beda. Sekarang:
//   sumber 'perangkat' -> minta lokasi perangkat lebih dulu; bila ditolak/
//                         tidak tersedia, pakai kota pilihan (default REMBANG)
//   sumber 'kota'      -> selalu pakai koordinat kota pilihan
//
// Hasil disimpan di localStorage (perangkat), bukan di scene: cuaca adalah
// keadaan lingkungan, bukan milik layout.

import type { Cuaca } from '../iso/langit'
import { cuacaDariKode } from '../iso/langit'

export type ModeCuaca = 'otomatis' | 'manual'
/** dari mana koordinat diambil */
export type SumberLokasi = 'perangkat' | 'kota'

export interface PengaturanCuaca {
  mode: ModeCuaca
  manual: Cuaca
  sumber: SumberLokasi
  /** kode kota pilihan (lihat KOTA) */
  kota: string
  /** koordinat efektif (hasil perangkat atau kota pilihan) */
  lat: number
  lon: number
}

/** kota pilihan di sekitar user; koordinat pusat kota */
export interface Kota {
  id: string
  nama: string
  lat: number
  lon: number
}

export const KOTA: Kota[] = [
  { id: 'rembang', nama: 'REMBANG', lat: -6.7082, lon: 111.3416 },
  { id: 'pati', nama: 'PATI', lat: -6.7559, lon: 111.0388 },
  { id: 'lasem', nama: 'LASEM', lat: -6.6922, lon: 111.4469 },
  { id: 'kudus', nama: 'KUDUS', lat: -6.8048, lon: 110.8405 },
  { id: 'jepara', nama: 'JEPARA', lat: -6.5891, lon: 110.6687 },
  { id: 'semarang', nama: 'SEMARANG', lat: -6.9667, lon: 110.4167 },
  { id: 'yogyakarta', nama: 'YOGYAKARTA', lat: -7.7956, lon: 110.3695 },
  { id: 'surabaya', nama: 'SURABAYA', lat: -7.2575, lon: 112.7521 },
  { id: 'jakarta', nama: 'JAKARTA', lat: -6.2088, lon: 106.8456 },
]

/** kota bawaan = REMBANG (lokasi user), bukan Semarang */
export const KOTA_AWAL = 'rembang'

export function kotaOf(id: string): Kota {
  return KOTA.find(k => k.id === id) ?? KOTA[0]
}

const KUNCI = 'isola-cuaca-v1'
const KUNCI_CACHE = 'isola-cuaca-cache-v1'
/** cuaca diambil ulang tiap 10 menit */
const UMUR_CACHE_MS = 10 * 60 * 1000

export function pengaturanAwal(): PengaturanCuaca {
  const k = kotaOf(KOTA_AWAL)
  return { mode: 'otomatis', manual: 'cerah', sumber: 'perangkat', kota: k.id, lat: k.lat, lon: k.lon }
}

export function muatPengaturanCuaca(): PengaturanCuaca {
  try {
    const raw = localStorage.getItem(KUNCI)
    if (!raw) return pengaturanAwal()
    const p = JSON.parse(raw) as Partial<PengaturanCuaca>
    const kota = typeof p.kota === 'string' && KOTA.some(k => k.id === p.kota) ? p.kota : KOTA_AWAL
    const k = kotaOf(kota)
    return {
      mode: p.mode === 'manual' ? 'manual' : 'otomatis',
      manual: (['cerah', 'berawan', 'gerimis', 'hujan', 'badai'] as Cuaca[]).includes(p.manual as Cuaca)
        ? (p.manual as Cuaca)
        : 'cerah',
      sumber: p.sumber === 'kota' ? 'kota' : 'perangkat',
      kota,
      // Koordinat dihitung ULANG dari kota / lokasi perangkat; angka lama di
      // localStorage (dulu selalu Semarang) sengaja TIDAK dipakai, supaya
      // pengguna lama tidak terus melihat cuaca kota yang salah.
      lat: k.lat,
      lon: k.lon,
    }
  } catch {
    return pengaturanAwal()
  }
}

export function simpanPengaturanCuaca(p: PengaturanCuaca) {
  try { localStorage.setItem(KUNCI, JSON.stringify(p)) } catch { /* abaikan */ }
}

/** ganti kota pilihan -> koordinat & sumber ikut diganti */
export function gantiKota(p: PengaturanCuaca, id: string): PengaturanCuaca {
  const k = kotaOf(id)
  return { ...p, kota: k.id, lat: k.lat, lon: k.lon, sumber: 'kota' }
}

/** jarak dua titik (km) — dipakai uji supaya salah lokasi cepat ketahuan */
export function jarakKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** minta lokasi perangkat; cepat menyerah bila tidak diizinkan */
function lokasi(waktuTunggu = 5000): Promise<{ lat: number; lon: number } | null> {
  return new Promise(resolve => {
    const geo = typeof navigator !== 'undefined' ? navigator.geolocation : undefined
    if (!geo) { resolve(null); return }
    let selesai = false
    const batal = setTimeout(() => { if (!selesai) { selesai = true; resolve(null) } }, waktuTunggu)
    geo.getCurrentPosition(
      pos => {
        if (selesai) return
        selesai = true
        clearTimeout(batal)
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude })
      },
      () => {
        if (selesai) return
        selesai = true
        clearTimeout(batal)
        resolve(null)     // ditolak/tidak tersedia -> pemanggil pakai kota pilihan
      },
      { timeout: waktuTunggu, maximumAge: 10 * 60 * 1000, enableHighAccuracy: false },
    )
  })
}

/**
 * Tentukan koordinat efektif untuk satu permintaan cuaca.
 * Murni (tidak menyentuh jaringan) supaya mudah diuji.
 */
export async function koordinatEfektif(
  p: PengaturanCuaca,
  ambilLokasi: () => Promise<{ lat: number; lon: number } | null> = () => lokasi(),
): Promise<{ lat: number; lon: number; dari: SumberLokasi }> {
  if (p.sumber === 'kota') {
    const k = kotaOf(p.kota)
    return { lat: k.lat, lon: k.lon, dari: 'kota' }
  }
  const g = await ambilLokasi()
  if (g && Number.isFinite(g.lat) && Number.isFinite(g.lon)) return { ...g, dari: 'perangkat' }
  // izin ditolak / tidak tersedia -> kota pilihan user (bukan Semarang paksa)
  const k = kotaOf(p.kota)
  return { lat: k.lat, lon: k.lon, dari: 'kota' }
}

/** kunci cache ikut koordinat: ganti kota = cache lama tidak dipakai */
export function kunciCache(lat: number, lon: number): string {
  return `${KUNCI_CACHE}:${lat.toFixed(2)},${lon.toFixed(2)}`
}

/**
 * Ambil cuaca nyata. Mengembalikan null bila gagal (offline / API menolak);
 * pemanggil lalu memakai cuaca manual / terakhir.
 */
export async function ambilCuacaNyata(
  p: PengaturanCuaca,
  opsi: {
    ambilLokasi?: () => Promise<{ lat: number; lon: number } | null>
    ambilJaringan?: typeof fetch
    sekarangMs?: () => number
  } = {},
): Promise<Cuaca | null> {
  const kunci = async () => {
    const { lat, lon } = await koordinatEfektif(p, opsi.ambilLokasi)
    return { lat, lon, k: kunciCache(lat, lon) }
  }
  const kini = opsi.sekarangMs ?? (() => Date.now())

  try {
    const { lat, lon, k } = await kunci()
    const cache = JSON.parse(localStorage.getItem(k) ?? 'null') as { t: number; cuaca: Cuaca } | null
    if (cache && kini() - cache.t < UMUR_CACHE_MS) return cache.cuaca

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&current=weather_code`
    const r = await (opsi.ambilJaringan ?? fetch)(url, { cache: 'no-store' })
    if (!r.ok) return null
    const j = (await r.json()) as { current?: { weather_code?: number } }
    const kode = j.current?.weather_code
    if (typeof kode !== 'number') return null
    const cuaca = cuacaDariKode(kode)
    try { localStorage.setItem(k, JSON.stringify({ t: kini(), cuaca })) } catch { /* abaikan */ }
    return cuaca
  } catch {
    return null
  }
}

/** jam perangkat dalam desimal (14.5 = 14:30), mengikuti zona waktu lokal */
export function jamPerangkat(d = new Date()): number {
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600
}
