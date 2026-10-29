import { useEffect, useRef, useState } from 'react'

/**
 * KOLOM ANGKA + TOMBOL − / + (dipakai panel editor objek DAN kartu folder).
 *
 * Permintaan user 2026-10-29:
 *   • "untuk posisi tambahkan tombol + dan - dengan kelipatan 0,1"
 *   • "untuk selanjutnya semua tombol + dan - dengan kelipatan 0,1"
 * Jadi SEMUA tombol ± di aplikasi memakai langkah 0,1 — posisi maupun ukuran.
 * Nilai tetap bisa DIKETIK bebas sampai 0,001; tombol ± hanya jalan pintas 0,1.
 */

/** langkah semua tombol − / + (permintaan user: kelipatan 0,1) */
export const LANGKAH_0_1 = 0.1

const snap3 = (v: number) => Math.round(v * 1000) / 1000

/**
 * Tombol − / + yang bisa DITAHAN (permintaan user 2026-10-29: "buat tombol +
 * dan − bisa ditahan agar tidak perlu klik satu-satu berulang").
 * Ketuk = satu langkah 0,1. Tahan > 320 ms = berulang otomatis tiap 70 ms.
 * Memakai pointer capture supaya tetap berhenti walau jari bergeser keluar.
 */
export function HoldBtn(p: {
  dir: 1 | -1
  onStep: (dir: 1 | -1) => void
  disabled?: boolean
  /** label tombol; bawaan '+' / '−'. Dipakai pemilih warna (◀ / ▶). */
  label?: string
  /** keterangan saat jari ditahan / kursor berhenti */
  title?: string
}) {
  const tunda = useRef<number | null>(null)
  const ulang = useRef<number | null>(null)
  const stop = () => {
    if (tunda.current !== null) { window.clearTimeout(tunda.current); tunda.current = null }
    if (ulang.current !== null) { window.clearInterval(ulang.current); ulang.current = null }
  }
  useEffect(() => stop, [])
  return (
    <button
      className="sbtn hold"
      disabled={p.disabled}
      aria-label={p.title ?? (p.dir > 0 ? 'tambah 0.1 (tahan untuk berulang)' : 'kurangi 0.1 (tahan untuk berulang)')}
      title={p.title}
      onPointerDown={ev => {
        ev.preventDefault()
        try { (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId) } catch { /* abaikan */ }
        p.onStep(p.dir)
        tunda.current = window.setTimeout(() => {
          ulang.current = window.setInterval(() => p.onStep(p.dir), 70)
        }, 320)
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onBlur={stop}
      onContextMenu={ev => ev.preventDefault()}
    >
      {p.label ?? (p.dir > 0 ? '+' : '−')}
    </button>
  )
}

export default function NumField(p: {
  label: string
  value: number
  min: number
  onChange: (v: number) => void
  disabled?: boolean
  /** jumlah desimal yang ditampilkan (bawaan 3 = presisi 0,001) */
  desimal?: number
}) {
  const desimal = p.desimal ?? 3
  const [text, setText] = useState(p.value.toFixed(desimal))
  const [focused, setFocused] = useState(false)
  // nilai acuan untuk penambahan berulang: prop bisa tertinggal satu render,
  // jadi langkah dihitung dari ref ini supaya tahan-tombol tidak "macet".
  const nilaiRef = useRef(p.value)

  // sinkron dari luar (drag objek, tombol ±, ganti objek terpilih)
  useEffect(() => {
    nilaiRef.current = p.value
    if (!focused) setText(p.value.toFixed(desimal))
  }, [p.value, focused, desimal])

  /** satu langkah tombol tahan: SELALU 0,1 (permintaan user) */
  const step = (dir: 1 | -1) => {
    const diketik = parseFloat(text.replace(',', '.'))
    const dasar = focused && Number.isFinite(diketik) ? snap3(diketik) : nilaiRef.current
    const v = Math.max(p.min, snap3(dasar + dir * LANGKAH_0_1))
    nilaiRef.current = v
    p.onChange(v)
    setText(v.toFixed(desimal))
  }

  const commit = (raw?: string) => {
    const src = raw ?? text
    const n = parseFloat(src.replace(',', '.'))
    const v = Number.isFinite(n) ? snap3(n) : p.value
    const clamped = Math.max(p.min, v)
    p.onChange(clamped)
    setText(clamped.toFixed(desimal))
  }

  return (
    <div className="row">
      <span className="rl">{p.label}</span>
      <HoldBtn dir={-1} disabled={p.disabled} onStep={step} />
      <input
        className="rinput"
        inputMode="decimal"
        value={text}
        disabled={p.disabled}
        onFocus={ev => { setFocused(true); ev.currentTarget.select() }}
        onChange={ev => setText(ev.target.value)}
        onBlur={() => { setFocused(false); commit() }}
        onKeyDown={ev => {
          if (ev.key === 'Enter') { commit(); ev.currentTarget.blur() }
          if (ev.key === 'Escape') { setText(p.value.toFixed(desimal)); ev.currentTarget.blur() }
          if (ev.key === 'ArrowUp') { ev.preventDefault(); commit(String(p.value + LANGKAH_0_1)) }
          if (ev.key === 'ArrowDown') { ev.preventDefault(); commit(String(p.value - LANGKAH_0_1)) }
        }}
        aria-label={`${p.label} (bisa diketik, tombol ± 0,1)`}
      />
      <HoldBtn dir={1} disabled={p.disabled} onStep={step} />
    </div>
  )
}
