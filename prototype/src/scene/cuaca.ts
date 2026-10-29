// SUMBER CUACA — permintaan user 2026-10-29: "warna langit sesuaikan jam atau
// waktu pada perangkat ... tambahkan hujan ... sesuai cuaca nyata".
//
// Dua mode:
//   • OTOMATIS — cuaca NYATA dari Open-Meteo (gratis, tanpa API key). Butuh
//     internet + izin lokasi (browser: Geolocation, APK nanti: izin lokasi).
//     Kalau gagal (offline/lokasi ditolak), otomatis jatuh ke CERAH dan tidak
//     pernah memblokir aplikasi.
//   • MANUAL — user memilih sendiri (cerah/berawan/gerimis/hujan/badai),
//     dipakai untuk uji dan saat offline.
//
// Hasil disimpan di localStorage (perangkat), bukan di scene: cuaca adalah
// keadaan lingkungan, bukan milik layout.

import type { Cuaca } from '../iso/langit'
import { cuacaDariKode } from '../iso/langit'

export type ModeCuaca = 'otomatis' | 'manual'

export interface PengaturanCuaca {
  mode: ModeCuaca
  manual: Cuaca
  /** lokasi tetap (dipakai bila izin lokasi tidak diberikan) */
  lat: number
  lon: number
}

const KUNCI = 'isola-cuaca-v1'
const KUNCI_CACHE = 'isola-cuaca-cache-v1'
/** Semarang — titik cadangan bila lokasi perangkat tidak tersedia */
export const LOKASI_CADANGAN = { lat: -6.9667, lon: 110.4167 }
/** cuaca diambil ulang tiap 10 menit */
const UMUR_CACHE_MS = 10 * 60 * 1000

export function pengaturanAwal(): PengaturanCuaca {
  return { mode: 'otomatis', manual: 'cerah', ...LOKASI_CADANGAN }
}

export function muatPengaturanCuaca(): PengaturanCuaca {
  try {
    const raw = localStorage.getItem(KUNCI)
    if (!raw) return pengaturanAwal()
    const p = JSON.parse(raw) as Partial<PengaturanCuaca>
    return {
      mode: p.mode === 'manual' ? 'manual' : 'otomatis',
      manual: (['cerah', 'berawan', 'gerimis', 'hujan', 'badai'] as Cuaca[]).includes(p.manual as Cuaca)
        ? (p.manual as Cuaca)
        : 'cerah',
      lat: typeof p.lat === 'number' ? p.lat : LOKASI_CADANGAN.lat,
      lon: typeof p.lon === 'number' ? p.lon : LOKASI_CADANGAN.lon,
    }
  } catch {
    return pengaturanAwal()
  }
}

export function simpanPengaturanCuaca(p: PengaturanCuaca) {
  try { localStorage.setItem(KUNCI, JSON.stringify(p)) } catch { /* abaikan */ }
}

/** minta lokasi perangkat; menolak dengan cepat bila tidak diizinkan */
function lokasi(): Promise<{ lat: number; lon: number }> {
  return new Promise(resolve => {
    const geo = typeof navigator !== 'undefined' ? navigator.geolocation : undefined
    if (!geo) { resolve(LOKASI_CADANGAN); return }
    let selesai = false
    const batal = setTimeout(() => { if (!selesai) { selesai = true; resolve(LOKASI_CADANGAN) } }, 4000)
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
        resolve(LOKASI_CADANGAN)
      },
      { timeout: 4000, maximumAge: 10 * 60 * 1000 },
    )
  })
}

/**
 * Ambil cuaca nyata. Mengembalikan null bila gagal (offline / API menolak);
 * pemanggil lalu memakai cuaca terakhir / CERAH.
 */
export async function ambilCuacaNyata(p: PengaturanCuaca): Promise<Cuaca | null> {
  try {
    const cache = JSON.parse(localStorage.getItem(KUNCI_CACHE) ?? 'null') as
      | { t: number; cuaca: Cuaca }
      | null
    if (cache && Date.now() - cache.t < UMUR_CACHE_MS) return cache.cuaca
  } catch { /* cache rusak -> lanjut ambil baru */ }

  try {
    const { lat, lon } = p.lat && p.lon ? { lat: p.lat, lon: p.lon } : await lokasi()
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&current=weather_code`
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) return null
    const j = (await r.json()) as { current?: { weather_code?: number } }
    const kode = j.current?.weather_code
    if (typeof kode !== 'number') return null
    const cuaca = cuacaDariKode(kode)
    try { localStorage.setItem(KUNCI_CACHE, JSON.stringify({ t: Date.now(), cuaca })) } catch { /* abaikan */ }
    return cuaca
  } catch {
    return null
  }
}

/** jam perangkat dalam desimal (14.5 = 14:30), mengikuti zona waktu lokal */
export function jamPerangkat(d = new Date()): number {
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600
}
