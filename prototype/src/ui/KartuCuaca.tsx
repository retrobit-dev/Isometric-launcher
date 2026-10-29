import { useEffect, useRef, useState } from 'react'
import { KOTA, type PengaturanCuaca } from '../scene/cuaca'

/**
 * KARTU CUACA — pengaturan sumber cuaca.
 *
 * Kenapa ada: dulu aplikasi memakai koordinat cadangan Semarang tanpa pernah
 * meminta izin lokasi, jadi user di Rembang melihat cuaca kota lain
 * (permintaan perbaikan user 2026-10-29). Kartu ini memberi dua pilihan:
 *
 *   SUMBER  PERANGKAT  minta izin lokasi; bila ditolak -> pakai KOTA pilihan
 *           KOTA       selalu pakai koordinat kota pilihan
 *   KOTA    Rembang (bawaan), Pati, Lasem, Kudus, Jepara, Semarang, ...
 *
 * Sesuai permintaan user, TIDAK ada angka koordinat/kode cuaca di layar —
 * hanya nama sumber dan nama kota. Kartu ini melayang & bisa digeser seperti
 * kartu folder, bukan modal yang menutupi ruangan.
 */
interface Props {
  pengaturan: PengaturanCuaca
  /** cuaca yang sedang dipakai (hanya untuk baris keterangan) */
  aktif: string
  onSumber: (s: 'perangkat' | 'kota') => void
  onKota: (id: string) => void
  onClose: () => void
}

export default function KartuCuaca(p: Props) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ dx: number; dy: number } | null>(null)
  const [pos, setPos] = useState(() => ({
    x: Math.max(4, Math.min(window.innerWidth - 300, 12)),
    y: Math.max(4, window.innerHeight - 300),
  }))

  const clampPos = (x: number, y: number) => {
    const el = boxRef.current
    const bw = el?.offsetWidth ?? 272
    const bh = el?.offsetHeight ?? 260
    return {
      x: Math.max(4, Math.min(Math.max(4, window.innerWidth - bw - 4), x)),
      y: Math.max(4, Math.min(Math.max(4, window.innerHeight - bh - 4), y)),
    }
  }

  useEffect(() => {
    const onResize = () => setPos(q => clampPos(q.x, q.y))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onHeadDown = (ev: React.PointerEvent) => {
    dragRef.current = { dx: ev.clientX - pos.x, dy: ev.clientY - pos.y }
    ;(ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId)
  }
  const onHeadMove = (ev: React.PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    setPos(clampPos(ev.clientX - d.dx, ev.clientY - d.dy))
  }
  const onHeadUp = () => { dragRef.current = null }

  return (
    <div
      ref={boxRef}
      className="panel foldercard"
      style={{ left: pos.x, top: pos.y }}
      role="dialog"
      aria-label="pengaturan cuaca"
    >
      <div
        className="phead grab"
        onPointerDown={onHeadDown}
        onPointerMove={onHeadMove}
        onPointerUp={onHeadUp}
        onPointerCancel={onHeadUp}
        title="seret untuk memindahkan kartu cuaca"
      >
        <span className="pgrip" aria-hidden>⠿</span>
        <span style={{ flex: 1 }}>CUACA</span>
        <button className="sbtn" onClick={p.onClose} aria-label="tutup kartu cuaca">✕</button>
      </div>

      <div className="pbody">
        <div className="row">
          <span className="rl">sumber</span>
          <button
            className={p.pengaturan.sumber === 'perangkat' ? 'sbtn wide on' : 'sbtn wide'}
            onClick={() => p.onSumber('perangkat')}
            title="minta izin lokasi perangkat; bila ditolak, pakai kota pilihan"
          >
            PERANGKAT
          </button>
          <button
            className={p.pengaturan.sumber === 'kota' ? 'sbtn wide on' : 'sbtn wide'}
            onClick={() => p.onSumber('kota')}
            title="selalu pakai koordinat kota pilihan di bawah"
          >
            KOTA
          </button>
        </div>

        <div className="rl" style={{ marginTop: 2 }}>kota</div>
        <div className="pgrid">
          {KOTA.map(k => (
            <button
              key={k.id}
              className={p.pengaturan.kota === k.id ? 'sbtn wide on' : 'sbtn wide'}
              onClick={() => p.onKota(k.id)}
              title={`pakai cuaca ${k.nama}`}
            >
              {k.nama}
            </button>
          ))}
        </div>

        <div className="phint">
          cuaca sekarang: {p.aktif}
          {p.pengaturan.sumber === 'perangkat' ? ' · ikut lokasi perangkat' : ''}
        </div>
      </div>
    </div>
  )
}
