import { useEffect, useRef, useState } from 'react'
import { FLOOR_DEFAULT, FLOOR_KEYS, MATERIAL_KEYS, WALL_STYLE_KEYS, floorMat } from '../iso/palette'
import type { SceneObject } from '../scene/types'

interface Props {
  obj: SceneObject
  onChange: (patch: Partial<SceneObject>) => void
  onMove: (de: number, dw: number) => void
  onResize: (de: number, dw: number, dz: number) => void
  onCycleStyle: () => void
  onCycleKunci: () => void
  /** naikkan ke atas objek sebelumnya (overlay) / turunkan ke bawah objek berikutnya */
  onRaise: () => void
  onLower: () => void
  /** posisi tumpukan objek ini, mis. "3 / 6" */
  tumpukan: string
  onRotate: () => void
  onDuplicate: () => void
  onDelete: () => void
  onClose: () => void
  onSave: () => void
  dirty: boolean
}

// semua nilai objek dalam kelipatan 0.1
const snap = (v: number) => Math.round(v * 10) / 10

/**
 * Field angka yang bisa DIKETIK langsung (permintaan user 2026-10-28:
 * "untuk editor objek bisakah angka diisi manual?") sekaligus tetap punya
 * tombol − / + untuk penyesuaian 0.1.
 *
 * Nilai diketik disimpan sebagai teks lokal supaya mengetik "1." atau "-"
 * tidak langsung dipaksa; commit terjadi saat Enter, blur, atau tombol ±.
 */
function NumField(p: {
  label: string
  value: number
  min: number
  onChange: (v: number) => void
  disabled?: boolean
}) {
  const [text, setText] = useState(p.value.toFixed(1))
  const [focused, setFocused] = useState(false)

  // sinkron dari luar (drag objek, tombol ±, ganti objek terpilih)
  useEffect(() => {
    if (!focused) setText(p.value.toFixed(1))
  }, [p.value, focused])

  const commit = (raw?: string) => {
    const src = raw ?? text
    const n = parseFloat(src.replace(',', '.'))
    const v = Number.isFinite(n) ? snap(n) : p.value
    const clamped = Math.max(p.min, v)
    p.onChange(clamped)
    setText(clamped.toFixed(1))
  }

  return (
    <div className="row">
      <span className="rl">{p.label}</span>
      <button className="sbtn" disabled={p.disabled} onClick={() => commit(String(p.value - 0.1))}>−</button>
      <input
        className="rinput"
        inputMode="decimal"
        value={text}
        onFocus={ev => { setFocused(true); ev.currentTarget.select() }}
        onChange={ev => setText(ev.target.value)}
        onBlur={() => { setFocused(false); commit() }}
        onKeyDown={ev => {
          if (ev.key === 'Enter') { commit(); ev.currentTarget.blur() }
          if (ev.key === 'Escape') { setText(p.value.toFixed(1)); ev.currentTarget.blur() }
          if (ev.key === 'ArrowUp') { ev.preventDefault(); commit(String(p.value + 0.1)) }
          if (ev.key === 'ArrowDown') { ev.preventDefault(); commit(String(p.value - 0.1)) }
        }}
        aria-label={`${p.label} objek (bisa diketik)`}
      />
      <button className="sbtn" disabled={p.disabled} onClick={() => commit(String(p.value + 0.1))}>+</button>
    </div>
  )
}

export default function EditPanel(p: Props) {
  const o = p.obj
  const isFloor = o.role === 'lantai'
  const styleName = typeof o.style === 'string' ? o.style : 'custom'
  const keys = isFloor ? FLOOR_KEYS : o.role === 'dinding' ? WALL_STYLE_KEYS : MATERIAL_KEYS
  const matIdx = keys.indexOf(styleName)
  const rot = o.rot ?? 0
  const cermin = o.refleksi === true          // objek dicerminkan (mirror)
  const pantul = o.pantulan !== false         // bayangan objek di lantai
  // KUNCI per objek (permintaan user): 'warna' = semua mati kecuali material,
  // 'semua' = mati total. `frozen` mematikan geometri, `noColor` mematikan warna.
  const kunci = o.kunci
  const frozen = kunci === 'warna' || kunci === 'semua'
  const noColor = kunci === 'semua'
  const kunciLabel = kunci === 'warna' ? 'WARNA SAJA' : kunci === 'semua' ? 'TOTAL' : 'BEBAS'

  // --- panel bisa DIGESER (permintaan user) supaya tidak menutupi objek ---
  const [pos, setPos] = useState({ x: 10, y: 10 })
  const dragRef = useRef<{ dx: number; dy: number } | null>(null)
  const boxRef = useRef<HTMLDivElement | null>(null)

  // SIMPAN: jeda kecil supaya label tombol berubah TERSIMPAN lalu kembali
  const [tersimpan, setTersimpan] = useState(false)
  const savedTimer = useRef<number | null>(null)
  useEffect(() => () => { if (savedTimer.current) window.clearTimeout(savedTimer.current) }, [])

  // jaga panel tetap utuh di dalam layar (termasuk setelah layar diputar/di-resize)
  const clampPos = (x: number, y: number) => {
    const el = boxRef.current
    const bw = el?.offsetWidth ?? 264
    const bh = el?.offsetHeight ?? 360
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

  const simpan = () => {
    // pastikan angka yang sedang diketik ikut tersimpan
    const aktif = document.activeElement
    if (aktif instanceof HTMLElement && aktif.closest('.panel') === boxRef.current) aktif.blur()
    p.onSave()
    setTersimpan(true)
    if (savedTimer.current) window.clearTimeout(savedTimer.current)
    savedTimer.current = window.setTimeout(() => setTersimpan(false), 2000)
  }

  return (
    <div
      ref={boxRef}
      className="panel"
      style={{ left: pos.x, top: pos.y }}
      role="dialog"
      aria-label={`editor objek ${o.label}`}
    >
      <div
        className="phead grab"
        onPointerDown={onHeadDown}
        onPointerMove={onHeadMove}
        onPointerUp={onHeadUp}
        onPointerCancel={onHeadUp}
        title="seret untuk memindahkan panel"
      >
        <span className="pgrip" aria-hidden>⠿</span>
        <input
          className="pinput"
          value={o.label}
          onChange={ev => p.onChange({ label: ev.target.value })}
          disabled={frozen}
          aria-label="label objek"
        />
        <button className="sbtn" onClick={p.onClose} aria-label="tutup panel">✕</button>
      </div>
      <div className="pbody">
      <div className="pgrid">
        <NumField
          label="posisi e" value={o.pos.e} min={-99}
          onChange={v => p.onChange({ pos: { ...o.pos, e: v } })}
          disabled={frozen}
        />
        <NumField
          label="posisi w" value={o.pos.w} min={-99}
          onChange={v => p.onChange({ pos: { ...o.pos, w: v } })}
          disabled={frozen}
        />
        <NumField
          label="posisi z" value={o.pos.z} min={0}
          onChange={v => p.onChange({ pos: { ...o.pos, z: v } })}
          disabled={frozen}
        />
        <NumField
          label="panjang" value={o.size.e} min={0.1}
          onChange={v => p.onChange({ size: { ...o.size, e: v } })}
          disabled={frozen}
        />
        <NumField
          label="lebar" value={o.size.w} min={0.1}
          onChange={v => p.onChange({ size: { ...o.size, w: v } })}
          disabled={frozen}
        />
        <NumField
          label="tinggi" value={o.size.z} min={0.1}
          onChange={v => p.onChange({ size: { ...o.size, z: v } })}
          disabled={frozen}
        />
      </div>
      <div className="row">
        <span className="rl">rotasi</span>
        <button
          className="sbtn wide"
          disabled={frozen}
          onClick={p.onRotate}
          title="memutar OBJEK INI 90° pada poros vertikalnya (bukan kamera/ruangan); rotasi ganjil menukar panjang & lebar"
        >
          {rot * 90}° ⟳
        </button>
      </div>
      <div className="row">
        <span className="rl">refleksi</span>
        <button
          className={cermin ? 'sbtn wide on' : 'sbtn wide'}
          disabled={frozen}
          onClick={() => p.onChange({ refleksi: !cermin })}
          title="OBJEK INI dicerminkan (mirror): sisi kiri & kanan bertukar, arah cahaya terbalik — bukan efek kamera"
        >
          {cermin ? 'CERMIN ✓' : 'NORMAL'}
        </button>
      </div>
      <div className="row">
        <span className="rl">pantulan</span>
        <button
          className={pantul ? 'sbtn wide on' : 'sbtn wide'}
          disabled={frozen}
          onClick={() => p.onChange({ pantulan: !pantul })}
          title="bayangan cermin OBJEK INI di permukaan lantai"
        >
          {pantul ? 'AKTIF ✓' : 'MATI'}
        </button>
      </div>
      {o.role === 'dinding' && (
        <div className="row">
          <span className="rl">sisi</span>
          <button
            className="sbtn wide"
            disabled={frozen}
            onClick={() => p.onChange({ side: o.side === 'kiri' ? 'kanan' : 'kiri' })}
            title="kiri = dinding DB (bidang e), kanan = dinding DT (bidang w)"
          >
            {(o.side ?? 'kiri').toUpperCase()} ⟳
          </button>
        </div>
      )}
      <div className="row">
        <span className="rl">{isFloor ? 'pola' : 'material'}</span>
        <button className="sbtn wide" disabled={noColor} onClick={p.onCycleStyle}>
          {styleName}{matIdx >= 0 ? ` (${matIdx + 1}/${keys.length})` : ''} ⟳
        </button>
      </div>
      {isFloor && floorMat(styleName).pattern === 'papan' && (
        <div className="row">
          <span className="rl">arah papan</span>
          <button
            className="sbtn wide"
            disabled={frozen}
            onClick={() => p.onChange({ polaRot: o.polaRot === 1 ? 0 : 1 })}
            title="putar arah papan lantai 90° — 0° membentang sepanjang sumbu e, 90° sepanjang sumbu w"
          >
            {o.polaRot === 1 ? '90° (sumbu w) ⟳' : '0° (sumbu e) ⟳'}
          </button>
        </div>
      )}
      <div className="row">
        <span className="rl">kunci</span>
        <button
          className={kunci ? 'sbtn wide on' : 'sbtn wide'}
          onClick={p.onCycleKunci}
          title="BEBAS = semua bisa diubah · WARNA SAJA = posisi/ukuran/rotasi/hapus dikunci, material tetap bisa diganti · TOTAL = terkunci semua"
        >
          {kunciLabel} ⟳
        </button>
      </div>
      <div className="row">
        <span className="rl">tumpukan</span>
        <span className="rv">{p.tumpukan}</span>
        <button
          className="sbtn wide"
          disabled={frozen}
          onClick={p.onRaise}
          title="NAIKKAN: objek ini digambar di ATAS objek sebelumnya (jadi overlay terhadapnya)"
        >
          ▲ NAIKKAN
        </button>
        <button
          className="sbtn wide"
          disabled={frozen}
          onClick={p.onLower}
          title="TURUNKAN: objek ini digambar di BAWAH objek berikutnya (underlay terhadapnya)"
        >
          ▼ TURUNKAN
        </button>
      </div>
      <div className="row">
        <button className="sbtn wide" onClick={p.onDuplicate}>DUPLIKAT</button>
        <button className="sbtn wide danger" disabled={frozen} onClick={p.onDelete}>HAPUS</button>
      </div>
      <div className="phint">
        {kunci === 'warna'
          ? 'terkunci: hanya material yang bisa diubah'
          : kunci === 'semua'
            ? 'terkunci total — ubah baris KUNCI untuk membuka'
            : p.dirty
              ? 'ada perubahan belum disimpan — ketuk SIMPAN'
              : 'perubahan langsung terlihat · ketuk SIMPAN untuk menyimpan sekarang'}
      </div>
      </div>
      <div className="pfoot">
        <button
          className={tersimpan ? 'sbtn save ok' : p.dirty ? 'sbtn save dirty' : 'sbtn save'}
          onClick={simpan}
          title="simpan perubahan objek ini sekarang: browser + file scene.json (tidak mengunci scene)"
        >
          {tersimpan ? 'TERSIMPAN ✓' : p.dirty ? '💾 SIMPAN PERUBAHAN ●' : '💾 SIMPAN PERUBAHAN'}
        </button>
      </div>
    </div>
  )
}
