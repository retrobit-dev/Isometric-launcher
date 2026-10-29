import { PRESETS, type Preset } from '../scene/presets'

interface Props {
  onPick: (p: Preset) => void
  onBlank: () => void
  onClose: () => void
}

/**
 * PEMILIH OBJEK — dibuka dari tombol **+ TAMBAH**.
 *
 * 2026-10-29 (ronde 17): seluruh objek hasil jiplak gambar referensi sudah
 * DIHAPUS (permintaan user: "kita buat sendiri saja"). Jadi katalog sekarang
 * kosong dan yang tersedia hanya:
 *   • BALOK KOSONG — bentuk dasar yang bisa diubah ukuran/warna/bentuknya
 *   • objek buatan sendiri, begitu didaftarkan di scene/presets.ts
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
          objek katalog referensi sudah dihapus. Mulai dari <b>BALOK KOSONG</b>,
          lalu atur ukuran, material, dan bentuknya di panel editor.
        </div>
        <div className="plist">
          <button className="pitem" onClick={p.onBlank}>
            <span className="pname">BALOK KOSONG</span>
            <span className="pket">balok 2 × 1 × 1 untuk dibuat sendiri</span>
            <span className="psize">2.0 × 1.0</span>
          </button>
          {PRESETS.length === 0 ? (
            <div className="pgroup">belum ada objek buatan sendiri</div>
          ) : (
            <>
              <div className="pgroup">objek buatan sendiri</div>
              {PRESETS.map(x => (
                <button key={x.id} className="pitem" onClick={() => p.onPick(x)}>
                  <span className="pname">{x.nama}</span>
                  <span className="pket">{x.ket}</span>
                  <span className="psize">{x.lebar.toFixed(1)} × {x.dalam.toFixed(1)}</span>
                </button>
              ))}
            </>
          )}
        </div>
        <div className="phint">
          objek baru otomatis berada paling atas (overlay) dan tidak termasuk LATAR
        </div>
      </div>
    </div>
  )
}
