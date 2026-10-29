import { useEffect, useRef, useState } from 'react'
import type { Kandidat } from '../scene/store'

/**
 * KARTU PULIHKAN — permintaan user 2026-10-29:
 *   "buatkan fitur untuk mengembalikan objek yg hilang ketika refresh localhost"
 *
 * Menampilkan SEMUA salinan scene yang masih tersimpan (penyimpanan browser:
 * cadangan, riwayat, scene terkunci, draf; ditambah file di server) beserta
 * jumlah objek & waktunya. Ketuk PULIHKAN pada baris yang diinginkan untuk
 * memuat kembali scene itu.
 *
 * Kartu ini MELAYANG (bisa digeser, tembus pandang) dan bukan modal gelap,
 * sama seperti kartu folder & kartu cuaca — objek di belakangnya tetap terlihat
 * (permintaan user ronde 23).
 *
 * Baris yang punya objek LEBIH BANYAK dari scene sekarang ditandai "(+N)" dan
 * disorot, karena itulah yang paling mungkin berisi objek yang hilang.
 */
interface Props {
  daftar: Kandidat[]
  memuat: boolean
  /** jumlah objek scene yang sedang dipakai */
  aktif: number
  onPilih: (k: Kandidat) => void
  onSegarkan: () => void
  onClose: () => void
}

const jamDari = (ms: number): string => {
  if (!ms) return 'tanpa cap waktu'
  const d = new Date(ms)
  const dua = (n: number) => String(n).padStart(2, '0')
  return `${dua(d.getDate())}/${dua(d.getMonth() + 1)} ${dua(d.getHours())}:${dua(d.getMinutes())}`
}

export default function Pulihkan(p: Props) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ dx: number; dy: number } | null>(null)
  const [pos, setPos] = useState(() => ({
    x: Math.max(4, Math.min(window.innerWidth - 348, 12)),
    y: 52,
  }))

  const clampPos = (x: number, y: number) => {
    const el = boxRef.current
    const bw = el?.offsetWidth ?? 336
    const bh = el?.offsetHeight ?? 300
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

  // ESC menutup kartu (sama seperti kartu folder)
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') p.onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [p])

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
      className="panel foldercard pulihkancard"
      style={{ left: pos.x, top: pos.y }}
      role="dialog"
      aria-label="pulihkan objek"
    >
      <div
        className="phead grab"
        onPointerDown={onHeadDown}
        onPointerMove={onHeadMove}
        onPointerUp={onHeadUp}
        onPointerCancel={onHeadUp}
        title="seret untuk memindahkan kartu pulihkan"
      >
        <span className="pgrip" aria-hidden>⠿</span>
        <span style={{ flex: 1 }}>PULIHKAN {p.aktif} OBJEK</span>
        <button className="sbtn" onClick={p.onClose} aria-label="tutup kartu pulihkan">✕</button>
      </div>

      <div className="pbody">
        <div className="phint">
          scene sekarang: {p.aktif} objek. pilih salinan untuk dimuat kembali.
        </div>

        {p.memuat && <div className="phint">membaca salinan…</div>}

        {!p.memuat && p.daftar.length === 0 && (
          <div className="phint">belum ada salinan yang bisa dipulihkan.</div>
        )}

        {p.daftar.map((k, i) => {
          const lebih = k.n - p.aktif
          return (
            <div className="prow" key={`${k.label}-${i}`}>
              <div className="prowinfo">
                <span className="prowlabel" title={k.label}>{k.label}</span>
                <span className="prowmeta">
                  {k.n} objek{lebih > 0 ? ` (+${lebih})` : ''} · {jamDari(k.waktu)}
                </span>
              </div>
              <button
                className={lebih > 0 ? 'sbtn on' : 'sbtn'}
                onClick={() => p.onPilih(k)}
                title={`muat kembali ${k.n} objek dari ${k.label} (bisa di-URUNGKAN)`}
              >
                PULIHKAN
              </button>
            </div>
          )
        })}

        <div className="row" style={{ marginTop: 2 }}>
          <button className="sbtn wide" onClick={p.onSegarkan} title="baca ulang semua salinan">
            ↻ SEGARKAN
          </button>
        </div>
      </div>
    </div>
  )
}
