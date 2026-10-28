// SEED balok8: 8 kelompok objek placeholder dari daftar objek user.
// Semua balok ber-material pembeda, posisi/ukuran usulan dalam kelipatan 0.1,
// siap dikoreksi user lewat editor (drag snap 0.1).
// Denah: DT = dinding kanan (bidang w=0), DB = dinding kiri (bidang e=0).
import { ROOM_FIXED, type Scene, type SceneObject } from './types'

export const SEED_OBJECTS: SceneObject[] = [
  // 1) meja guru + laptop + kalkulator (di atas meja)
  {
    id: 'meja-guru', label: 'Meja Guru',
    pos: { e: 9, w: 8.5, z: 0 }, size: { e: 3.5, w: 2, z: 1.2 },
    style: 'night-wood', app: null, layer: 'main',
  },
  {
    id: 'laptop-meja', label: 'Laptop (komputer)',
    pos: { e: 10, w: 9, z: 1.2 }, size: { e: 1, w: 0.7, z: 0.3 },
    style: 'slate', app: 'komputer', layer: 'main',
  },
  {
    id: 'kalkulator-meja', label: 'Kalkulator (paket grafik)',
    pos: { e: 11.5, w: 8.7, z: 1.2 }, size: { e: 0.6, w: 0.4, z: 0.2 },
    style: 'metal-light', app: 'kalkulator-grafik', layer: 'main',
  },
  // 2) rak materi matematika — menempel DB
  {
    id: 'rak-materi', label: 'Rak Materi Matematika',
    pos: { e: 0, w: 4, z: 0 }, size: { e: 0.8, w: 3, z: 4.5 },
    style: 'wood-dark', app: 'materi-matematika', layer: 'main',
  },
  // 3) papan jadwal mengajar — gantung DB
  {
    id: 'papan-jadwal', label: 'Papan Jadwal Mengajar',
    pos: { e: 0, w: 10, z: 4.5 }, size: { e: 0.3, w: 6, z: 3 },
    style: 'board', app: 'jadwal-mengajar', layer: 'main',
  },
  // 4) lemari arsip (absensi/jurnal/nilai) — DB sisi selatan
  {
    id: 'lemari-arsip', label: 'Lemari Arsip & Nilai',
    pos: { e: 0, w: 15, z: 0 }, size: { e: 1.2, w: 3.5, z: 4 },
    style: 'wood', app: 'arsip-nilai', layer: 'main',
  },
  // 5) jam dinding digital — DB tinggi
  {
    id: 'jam-digital', label: 'Jam Digital + Countdown',
    pos: { e: 0, w: 2, z: 8.5 }, size: { e: 0.2, w: 2, z: 0.8 },
    style: 'slate', app: 'jam-countdown', layer: 'main',
  },
  // 6) kalender bulanan — DT
  {
    id: 'kalender-dt', label: 'Kalender Bulanan',
    pos: { e: 16, w: 0, z: 4.5 }, size: { e: 1.5, w: 0.2, z: 1.5 },
    style: 'paper-night', app: 'kalender', layer: 'main',
  },
  // 7) jendela + tirai + pintu — DT (sesuai kesepakatan jendela @ DT)
  {
    id: 'jendela-dt', label: 'Jendela (cuaca/waktu)',
    pos: { e: 5, w: 0, z: 4 }, size: { e: 4, w: 0.3, z: 3.5 },
    style: 'metal-light', app: 'cuaca', layer: 'main',
  },
  {
    id: 'tirai-dt', label: 'Tirai Jendela',
    pos: { e: 4.4, w: 0.1, z: 3.6 }, size: { e: 0.6, w: 0.3, z: 4.4 },
    style: 'curtain', app: null, layer: 'main',
  },
  {
    id: 'pintu-dt', label: 'Pintu',
    pos: { e: 18, w: 0, z: 0 }, size: { e: 1.8, w: 0.3, z: 4 },
    style: 'wood-dark', app: null, layer: 'main',
  },
  // 8) standing lamp indikator baterai — dekat meja
  {
    id: 'lampu-baterai', label: 'Lampu Baterai',
    pos: { e: 13, w: 7, z: 0 }, size: { e: 0.6, w: 0.6, z: 4 },
    style: 'lamp-amber', app: 'baterai', layer: 'main',
  },
]

export function seedScene(): Scene {
  return {
    version: 1,
    room: { ...ROOM_FIXED },
    objects: structuredClone(SEED_OBJECTS),
    meta: { locked: false, savedAt: null },
  }
}
