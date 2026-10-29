import { useEffect, useRef } from 'react'
import { UKURAN_MIN } from '../scene/types'
import NumField from './NumField'

/**
 * KARTU FOLDER — dibuat SEMIRIP mungkin dengan panel editor objek
 * (permintaan user 2026-10-29: "atau bisakah fiturnya disamakan dengan editor
 * objek?"). Isinya:
 *
 *   POSISI  e / w / z   angka bisa diketik, tombol − / + kelipatan 0,1
 *   UKURAN  panjang / lebar / tinggi (e / w / z) — mengubah SELURUH isi folder
 *           sebagai satu kesatuan (diskalakan dari sudut minimum folder)
 *   ROTASI  ⟲ 15° / 15° ⟳ — kelipatan 15 derajat (permintaan user)
 *
 * Arti angka posisi = KOORDINAT SUDUT MINIMUM kotak pembatas folder (sama
 * seperti `pos` pada satu objek). Arti angka ukuran = UKURAN kotak pembatas
 * folder, bukan ukuran satu bagian.
 */

interface Props {
  nama: string
  /** sudut minimum folder (koordinat tujuan yang sedang berlaku) */
  nilai: { e: number; w: number; z: number }
  /** ukuran kotak pembatas folder */
  ukuran: { e: number; w: number; z: number }
  /** jumlah anggota yang terkunci (tidak ikut berubah) */
  terkunci: number
  anggota: number
  onSet: (sumbu: 'e' | 'w' | 'z', nilai: number) => void
  onSetUkuran: (sumbu: 'e' | 'w' | 'z', nilai: number) => void
  /** putar seluruh isi folder 15° (arah −1 = kiri, +1 = kanan) */
  onPutar: (arah: 1 | -1) => void
  onClose: () => void
}

export default function PosisiFolder(p: Props) {
  const box = useRef<HTMLDivElement | null>(null)
  // pastikan angka yang sedang diketik ikut tersimpan saat panel ditutup
  const tutup = () => {
    const aktif = document.activeElement
    if (aktif instanceof HTMLElement && aktif.closest('.mcard') === box.current) aktif.blur()
    p.onClose()
  }

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') tutup() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="modal" onClick={tutup}>
      <div className="mcard geser" ref={box} onClick={ev => ev.stopPropagation()}>
        <div className="mhead">
          <span>FOLDER · {p.nama}</span>
          <button className="sbtn" onClick={tutup}>✕</button>
        </div>
        <div className="pbody">
          <div className="phint">
            {p.anggota} bagian{p.terkunci > 0 ? ` · ${p.terkunci} terkunci tidak ikut` : ''}
          </div>

          <div className="pgrid">
            <NumField
              label="posisi e" value={p.nilai.e} min={-99}
              onChange={v => p.onSet('e', v)}
            />
            <NumField
              label="posisi w" value={p.nilai.w} min={-99}
              onChange={v => p.onSet('w', v)}
            />
            <NumField
              label="posisi z" value={p.nilai.z} min={0}
              onChange={v => p.onSet('z', v)}
            />
            <NumField
              label="panjang" value={p.ukuran.e} min={UKURAN_MIN}
              onChange={v => p.onSetUkuran('e', v)}
            />
            <NumField
              label="lebar" value={p.ukuran.w} min={UKURAN_MIN}
              onChange={v => p.onSetUkuran('w', v)}
            />
            <NumField
              label="tinggi" value={p.ukuran.z} min={UKURAN_MIN}
              onChange={v => p.onSetUkuran('z', v)}
            />
          </div>

          <div className="row">
            <span className="rl">rotasi</span>
            <button
              className="sbtn wide"
              onClick={() => p.onPutar(-1)}
              title="putar SELURUH isi folder 15° ke kiri mengelilingi poros tengah folder"
            >
              ⟲ 15°
            </button>
            <button
              className="sbtn wide"
              onClick={() => p.onPutar(1)}
              title="putar SELURUH isi folder 15° ke kanan mengelilingi poros tengah folder"
            >
              15° ⟳
            </button>
          </div>

          <div className="phint">
            posisi & ukuran = kotak pembatas folder, semua bagian ikut sebagai
            satu kesatuan. Angka boleh diketik; tombol − / + melangkah 0,1.
          </div>
        </div>
      </div>
    </div>
  )
}
