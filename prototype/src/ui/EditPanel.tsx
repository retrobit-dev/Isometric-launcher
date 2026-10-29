import { useEffect, useRef, useState } from 'react'
import { UKURAN_MIN } from '../scene/types'
import { FLOOR_DEFAULT, FLOOR_KEYS, MATERIAL_KEYS, WALL_STYLE_KEYS, floorMat } from '../iso/palette'
import type { SceneObject } from '../scene/types'

interface Props {
  obj: SceneObject
  onChange: (patch: Partial<SceneObject>) => void
  onMove: (de: number, dw: number) => void
  onResize: (de: number, dw: number, dz: number) => void
  onCycleStyle: () => void
  /** ganti jenis animasi: MATI -> naik-turun -> ayun -> denyut -> kedip -> putar */
  onCycleAnim: () => void
  /** ganti laju animasi (0.25 / 0.5 / 1 / 1.5 / 2) */
  onCycleAnimLaju: () => void
  onCycleKunci: () => void
  /** naikkan ke atas objek sebelumnya (overlay) / turunkan ke bawah objek berikutnya */
  onRaise: () => void
  onLower: () => void
  /** posisi tumpukan objek ini, mis. "3 / 6" */
  tumpukan: string
  onRotate: (arah: 1 | -1) => void
  onDuplicate: () => void
  onDelete: () => void
  onClose: () => void
  onSave: () => void
  dirty: boolean
}

// ATURAN 32 PIKsel DIHAPUS (2026-10-29): nilai objek bebas sampai 3 desimal
const snap = (v: number) => Math.round(v * 1000) / 1000

/**
 * Field angka yang bisa DIKETIK langsung (permintaan user 2026-10-28:
 * "untuk editor objek bisakah angka diisi manual?") sekaligus tetap punya
 * tombol − / + untuk penyesuaian 0.1.
 *
 * Nilai diketik disimpan sebagai teks lokal supaya mengetik "1." atau "-"
 * tidak langsung dipaksa; commit terjadi saat Enter, blur, atau tombol ±.
 */
/**
 * Tombol − / + yang bisa DITAHAN (permintaan user 2026-10-29: "buat tombol +
 * dan − bisa ditahan agar tidak perlu klik satu-satu berulang").
 * Ketuk = satu langkah 0.1. Tahan > 320 ms = berulang otomatis tiap 70 ms.
 * Memakai pointer capture supaya tetap berhenti walau jari bergeser keluar.
 */
function HoldBtn(p: {
  dir: 1 | -1
  onStep: (dir: 1 | -1) => void
  disabled?: boolean
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
      aria-label={p.dir > 0 ? 'tambah 0.1 (tahan untuk berulang)' : 'kurangi 0.1 (tahan untuk berulang)'}
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
      {p.dir > 0 ? '+' : '−'}
    </button>
  )
}

function NumField(p: {
  label: string
  value: number
  min: number
  onChange: (v: number) => void
  disabled?: boolean
  /** langkah tombol ± (bawaan 0.1) */
  step?: number
  /** jumlah desimal yang ditampilkan (bawaan 3 = presisi 0,001) */
  desimal?: number
  /** true = HANYA kolom ketik, tanpa tombol − / + (dipakai untuk posisi E/W/Z) */
  tanpaTombol?: boolean
}) {
  const langkah = p.step ?? 0.1
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

  /** satu langkah untuk tombol tahan (posisi 0.001, ukuran 0.001) */
  const step = (dir: 1 | -1) => {
    const diketik = parseFloat(text.replace(',', '.'))
    const dasar = focused && Number.isFinite(diketik) ? snap(diketik) : nilaiRef.current
    const v = Math.max(p.min, snap(dasar + dir * langkah))
    nilaiRef.current = v
    p.onChange(v)
    setText(v.toFixed(desimal))
  }

  const commit = (raw?: string) => {
    const src = raw ?? text
    const n = parseFloat(src.replace(',', '.'))
    const v = Number.isFinite(n) ? snap(n) : p.value
    const clamped = Math.max(p.min, v)
    p.onChange(clamped)
    setText(clamped.toFixed(desimal))
  }

  return (
    <div className="row">
      <span className="rl">{p.label}</span>
      {!p.tanpaTombol && <HoldBtn dir={-1} disabled={p.disabled} onStep={step} />}
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
      {!p.tanpaTombol && <HoldBtn dir={1} disabled={p.disabled} onStep={step} />}
    </div>
  )
}

export default function EditPanel(p: Props) {
  const o = p.obj
  const isFloor = o.role === 'lantai'
  const styleName = typeof o.style === 'string' ? o.style : 'custom'
  const keys = isFloor ? FLOOR_KEYS : o.role === 'dinding' ? WALL_STYLE_KEYS : MATERIAL_KEYS
  const matIdx = keys.indexOf(styleName)
  const sudut = o.rotasi ?? 0
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
          label="posisi e" value={o.pos.e} min={-99} step={0.001} desimal={3} tanpaTombol
          onChange={v => p.onChange({ pos: { ...o.pos, e: v } })}
          disabled={frozen}
        />
        <NumField
          label="posisi w" value={o.pos.w} min={-99} step={0.001} desimal={3} tanpaTombol
          onChange={v => p.onChange({ pos: { ...o.pos, w: v } })}
          disabled={frozen}
        />
        <NumField
          label="posisi z" value={o.pos.z} min={0} step={0.001} desimal={3} tanpaTombol
          onChange={v => p.onChange({ pos: { ...o.pos, z: v } })}
          disabled={frozen}
        />
        <NumField
          label="panjang" value={o.size.e} min={UKURAN_MIN} step={0.001} desimal={3}
          onChange={v => p.onChange({ size: { ...o.size, e: v } })}
          disabled={frozen}
        />
        <NumField
          label="lebar" value={o.size.w} min={UKURAN_MIN} step={0.001} desimal={3}
          onChange={v => p.onChange({ size: { ...o.size, w: v } })}
          disabled={frozen}
        />
        <NumField
          label="tinggi" value={o.size.z} min={UKURAN_MIN} step={0.001} desimal={3}
          onChange={v => p.onChange({ size: { ...o.size, z: v } })}
          disabled={frozen}
        />
      </div>
      <div className="row">
        <span className="rl">rotasi</span>
        <button
          className="sbtn"
          disabled={frozen}
          onClick={() => p.onRotate(-1)}
          title="putar OBJEK INI 30° ke kiri pada poros vertikalnya (bukan kamera)"
        >
          ⟲ 30°
        </button>
        <button
          className={sudut === 0 ? 'sbtn rotdeg on' : 'sbtn rotdeg'}
          disabled={frozen}
          onClick={() => p.onChange({ rotasi: 0 })}
          title="kembalikan rotasi objek ke 0° (ketuk angka untuk reset)"
        >
          {sudut}°
        </button>
        <button
          className="sbtn"
          disabled={frozen}
          onClick={() => p.onRotate(1)}
          title="putar OBJEK INI 30° ke kanan pada poros vertikalnya (bukan kamera)"
        >
          30° ⟳
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
        <span className="rl">animasi</span>
        <button
          className={o.anim ? 'sbtn wide on' : 'sbtn wide'}
          disabled={frozen}
          onClick={p.onCycleAnim}
          title="gerak tampilan objek ini. Data posisi/ukuran TIDAK berubah, jadi hit-test, grup, kunci, dan file scene tetap sama"
        >
          {o.anim ? o.anim.jenis.toUpperCase() : 'MATI'} ⟳
        </button>
      </div>
      {o.anim && (
        <div className="row">
          <span className="rl">laju</span>
          <span className="rv">{(o.anim.laju ?? 0.5).toFixed(2)}×</span>
          <button
            className="sbtn wide"
            disabled={frozen}
            onClick={p.onCycleAnimLaju}
            title="kecepatan gerak: makin besar makin cepat"
          >
            {(o.anim.laju ?? 0.5) >= 1 ? 'CEPAT' : 'LAMBAT'} ⟳
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
              : 'perubahan langsung terlihat · ketuk SIMPAN untuk menyimpan sekarang · tahan − / + untuk berulang'}
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
