import { MATERIALS, MATERIAL_KEYS, ROOM_PALETTE_SWATCHES, WALL_KEYS, WALL_MATERIALS } from '../iso/palette'

// Panel palet warna: semua warna ruangan & material objek yang tersedia,
// diekstrak dari referensi malam-biru. Dipakai untuk memilih style objek
// dan acuan konsisten saat menambahkan palet baru nanti.
export default function PalettePanel(props: { onClose: () => void }) {
  return (
    <div className="palpanel">
      <div className="phead">
        <span className="ptitle">PALET MALAM-BIRU</span>
        <button className="sbtn" onClick={props.onClose}>✕</button>
      </div>
      <div className="palgroup">RUANGAN</div>
      <div className="palgrid">
        {ROOM_PALETTE_SWATCHES.map(s => (
          <div className="palrow" key={s.name} title={s.hex}>
            <span className="sw" style={{ background: s.hex }} />
            <span className="pn">{s.name}</span>
          </div>
        ))}
      </div>
      <div className="palgroup">DINDING ({WALL_KEYS.length})</div>
      <div className="palgrid">
        {WALL_KEYS.map(k => (
          <div className="palrow" key={k} title={`${k}: muka kiri ${WALL_MATERIALS[k].kiri}, muka kanan ${WALL_MATERIALS[k].kanan}`}>
            <span className="sw tri" style={{ background: `linear-gradient(90deg, ${WALL_MATERIALS[k].kiri} 50%, ${WALL_MATERIALS[k].kanan} 50%)` }} />
            <span className="pn">{k}</span>
          </div>
        ))}
      </div>
      <div className="palgroup">MATERIAL OBJEK ({MATERIAL_KEYS.length})</div>
      <div className="palgrid">
        {MATERIAL_KEYS.map(k => (
          <div className="palrow" key={k} title={`${k}: ${MATERIALS[k].top} / ${MATERIALS[k].left} / ${MATERIALS[k].right}`}>
            <span className="sw tri" style={{ background: `linear-gradient(90deg, ${MATERIALS[k].top} 33%, ${MATERIALS[k].left} 33% 66%, ${MATERIALS[k].right} 66%)` }} />
            <span className="pn">{k}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
