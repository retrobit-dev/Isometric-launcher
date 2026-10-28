import { useEffect, useState } from 'react'
import { FLOOR_DEFAULT, FLOOR_KEYS, MATERIAL_KEYS } from '../iso/palette'
import type { SceneObject } from '../scene/types'

interface Props {
  obj: SceneObject
  onChange: (patch: Partial<SceneObject>) => void
  onMove: (de: number, dw: number) => void
  onResize: (de: number, dw: number, dz: number) => void
  onCycleStyle: () => void
  onCycleLayer: () => void
  onDuplicate: () => void
  onDelete: () => void
  onClose: () => void
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
      <button className="sbtn" onClick={() => commit(String(p.value - 0.1))}>−</button>
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
      <button className="sbtn" onClick={() => commit(String(p.value + 0.1))}>+</button>
    </div>
  )
}

export default function EditPanel(p: Props) {
  const o = p.obj
  const isFloor = o.role === 'lantai'
  const styleName = typeof o.style === 'string' ? o.style : 'custom'
  const keys = isFloor ? FLOOR_KEYS : MATERIAL_KEYS
  const matIdx = keys.indexOf(styleName)
  return (
    <div className="panel">
      <div className="phead">
        <input
          className="pinput"
          value={o.label}
          onChange={ev => p.onChange({ label: ev.target.value })}
          aria-label="label objek"
        />
        <button className="sbtn" onClick={p.onClose}>✕</button>
      </div>
      <div className="pgrid">
        <NumField
          label="posisi e" value={o.pos.e} min={-99}
          onChange={v => p.onChange({ pos: { ...o.pos, e: v } })}
        />
        <NumField
          label="posisi w" value={o.pos.w} min={-99}
          onChange={v => p.onChange({ pos: { ...o.pos, w: v } })}
        />
        <NumField
          label="posisi z" value={o.pos.z} min={0}
          onChange={v => p.onChange({ pos: { ...o.pos, z: v } })}
        />
        <NumField
          label="panjang" value={o.size.e} min={0.1}
          onChange={v => p.onChange({ size: { ...o.size, e: v } })}
        />
        <NumField
          label="lebar" value={o.size.w} min={0.1}
          onChange={v => p.onChange({ size: { ...o.size, w: v } })}
        />
        <NumField
          label="tinggi" value={o.size.z} min={0.1}
          onChange={v => p.onChange({ size: { ...o.size, z: v } })}
        />
      </div>
      <div className="row">
        <span className="rl">{isFloor ? 'pola' : 'material'}</span>
        <button className="sbtn wide" onClick={p.onCycleStyle}>
          {styleName}{matIdx >= 0 ? ` (${matIdx + 1}/${keys.length})` : ''} ⟳
        </button>
      </div>
      <div className="row">
        <span className="rl">peran</span>
        <button
          className={o.role === 'lantai' ? 'sbtn wide on' : 'sbtn wide'}
          onClick={() => p.onChange(
            o.role === 'lantai'
              ? { role: undefined }
              : {
                  role: 'lantai',
                  // jadikan lantai -> turunkan ke dasar + palet lantai (kayu selang-seling)
                  pos: { ...o.pos, z: 0 },
                  style: FLOOR_KEYS.includes(typeof o.style === 'string' ? o.style : '')
                    ? o.style
                    : FLOOR_DEFAULT,
                },
          )}
          title="lantai = digambar sebagai ubin datar seluas objek ini"
        >
          {o.role === 'lantai' ? 'LANTAI ✓ (balik ke balok)' : 'JADIKAN LANTAI'}
        </button>
      </div>
      <div className="row">
        <span className="rl">layer</span>
        <button className="sbtn wide" onClick={p.onCycleLayer}>
          {(o.layer ?? 'main').toUpperCase()} ⟳
        </button>
      </div>
      <div className="row">
        <button className="sbtn wide" onClick={p.onDuplicate}>DUPLIKAT</button>
        <button className="sbtn wide danger" onClick={p.onDelete}>HAPUS</button>
      </div>
      <div className="phint">angka bisa diketik · Enter = terapkan · kelipatan 0.1</div>
    </div>
  )
}
