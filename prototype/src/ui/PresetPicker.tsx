import { PRESETS, PRESETS_PIXEL, type Preset, type PresetPixel } from '../scene/presets'

interface Props {
  onPick: (p: Preset) => void
  onPickPixel: (p: PresetPixel) => void
  onBlank: () => void
  onClose: () => void
}

/**
 * PEMILIH OBJEK — dibuka dari tombol **+ TAMBAH**.
 *
 * Dua versi untuk setiap objek (opsi C "campuran", permintaan user 2026-10-29):
 *   • VERSI PIXEL — sprite potongan langsung dari gambar referensi (PERSIS
 *     referensi). Satu objek utuh.
 *   • VERSI EDIT  — susunan bagian parametrik; bisa dicicil diubah per bagian.
 * Keduanya memakai ukuran dunia yang sama, jadi bisa saling menggantikan.
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
          <b>VERSI PIXEL</b> = gambar hasil potongan dari referensi (paling mirip,
          satu objek utuh). <b>VERSI EDIT</b> = susunan bagian yang bisa diubah
          satu per satu. Bisa ditukar kapan saja dari panel editor objek.
        </div>
        <div className="plist">
          <button className="pitem" onClick={p.onBlank}>
            <span className="pname">BALOK KOSONG</span>
            <span className="pket">balok 2 × 1 × 1 untuk dibuat sendiri</span>
            <span className="psize">2.0 × 1.0</span>
          </button>
          <div className="pgroup">VERSI PIXEL — persis referensi</div>
          {PRESETS_PIXEL.map(x => (
            <button key={`px-${x.id}`} className="pitem" onClick={() => p.onPickPixel(x)}>
              <span className="pname">{x.nama}</span>
              <span className="pket">{x.ket}</span>
              <span className="psize">{x.lebar.toFixed(1)} × {x.dalam.toFixed(1)}</span>
            </button>
          ))}
          <div className="pgroup">VERSI EDIT — parametrik per bagian</div>
          {PRESETS.map(x => (
            <button key={`ed-${x.id}`} className="pitem" onClick={() => p.onPick(x)}>
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
