import { MATERIAL_KEYS } from '../iso/palette'
import type { SceneObject } from '../scene/types'

interface Props {
  obj: SceneObject
  onChange: (patch: Partial<SceneObject>) => void
  onMove: (de: number, dw: number) => void
  onResize: (de: number, dw: number, dz: number) => void
  onCycleStyle: () => void
  onDuplicate: () => void
  onDelete: () => void
  onClose: () => void
}

function Step(props: { label: string; value: string; dec: () => void; inc: () => void }) {
  return (
    <div className="row">
      <span className="rl">{props.label}</span>
      <button className="sbtn" onClick={props.dec}>−</button>
      <span className="rv">{props.value}</span>
      <button className="sbtn" onClick={props.inc}>+</button>
    </div>
  )
}

export default function EditPanel(p: Props) {
  const o = p.obj
  const styleName = typeof o.style === 'string' ? o.style : 'custom'
  const matIdx = MATERIAL_KEYS.indexOf(styleName)
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
        <Step label="e" value={o.pos.e.toFixed(1)} dec={() => p.onMove(-0.5, 0)} inc={() => p.onMove(0.5, 0)} />
        <Step label="w" value={o.pos.w.toFixed(1)} dec={() => p.onMove(0, -0.5)} inc={() => p.onMove(0, 0.5)} />
        <Step label="tinggi z" value={o.pos.z.toFixed(1)} dec={() => p.onChange({ pos: { ...o.pos, z: Math.max(0, o.pos.z - 0.5) } })} inc={() => p.onChange({ pos: { ...o.pos, z: o.pos.z + 0.5 } })} />
        <Step label="panjang" value={o.size.e.toFixed(1)} dec={() => p.onResize(-0.5, 0, 0)} inc={() => p.onResize(0.5, 0, 0)} />
        <Step label="lebar" value={o.size.w.toFixed(1)} dec={() => p.onResize(0, -0.5, 0)} inc={() => p.onResize(0, 0.5, 0)} />
        <Step label="tinggi" value={o.size.z.toFixed(1)} dec={() => p.onResize(0, 0, -0.5)} inc={() => p.onResize(0, 0, 0.5)} />
      </div>
      <div className="row">
        <span className="rl">material</span>
        <button className="sbtn wide" onClick={p.onCycleStyle}>
          {styleName}{matIdx >= 0 ? ` (${matIdx + 1}/${MATERIAL_KEYS.length})` : ''} ⟳
        </button>
      </div>
      <div className="row">
        <button className="sbtn wide" onClick={p.onDuplicate}>DUPLIKAT</button>
        <button className="sbtn wide danger" onClick={p.onDelete}>HAPUS</button>
      </div>
    </div>
  )
}
