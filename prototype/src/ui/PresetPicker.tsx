import { PRESETS, type Preset } from '../scene/presets'

interface Props {
  onPick: (p: Preset) => void
  onBlank: () => void
  onClose: () => void
}

/**
 * PEMILIH OBJEK — dibuka dari tombol **+ TAMBAH**.
 * Daftar preset diambil dari scene/presets.ts (semua komposisi balok dari
 * referensi user 2026-10-29). Setiap preset dibuat sebagai satu folder grup.
 */
export default function PresetPicker(p: Props) {
  return (
    <div className="modal" onClick={p.onClose}>
      <div className="mcard preset" onClick={ev => ev.stopPropagation()}>
        <div className="mhead">
          <span>PILIH OBJEK</span>
          <button className="sbtn" onClick={p.onClose}>✕</button>
        </div>
        <div className="phint">
          semua objek dibuat sebagai SATU folder berisi beberapa balok — bisa dipindah & diatur
          sebagai satu kesatuan, dan tetap bisa dicicil per bagian
        </div>
        <div className="plist">
          <button className="pitem" onClick={p.onBlank}>
            <span className="pname">BALOK KOSONG</span>
            <span className="pket">balok 2 × 1 × 1 untuk dibuat sendiri</span>
            <span className="psize">2.0 × 1.0</span>
          </button>
          {PRESETS.map(x => (
            <button key={x.id} className="pitem" onClick={() => p.onPick(x)}>
              <span className="pname">{x.nama}</span>
              <span className="pket">{x.ket}</span>
              <span className="psize">{x.lebar.toFixed(1)} × {x.dalam.toFixed(1)}</span>
            </button>
          ))}
        </div>
        <div className="phint">
          objek baru otomatis berada paling atas (overlay) dan tidak termasuk LATAR
        </div>
      </div>
    </div>
  )
}
