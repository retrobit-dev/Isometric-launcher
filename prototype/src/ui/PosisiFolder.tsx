import { useEffect, useRef, useState } from 'react'

/**
 * POSISI FOLDER (permintaan user 2026-10-29)
 * ---------------------------------------------------------------------------
 * "tambahkan juga fitur untuk memindahkan folder objek sesuai posisi z" dan
 * "untuk posisi E, W, Z jangan gunakan -1, 0, +1 tetapi angka koordinat saja".
 *
 * Jadi: TIDAK ADA tombol langkah (−1 / −0.1 / +0.1 / +1). Yang ada hanya tiga
 * kolom angka yang bisa DIKETIK: e, w, z. Nilai yang diketik = KOORDINAT
 * TUJUAN, dihitung dari sudut minimum (bbox) folder — sama seperti arti `pos`
 * pada satu objek, supaya angkanya bisa dibandingkan langsung dengan panel
 * editor objek.
 *
 * Contoh: folder jendela punya sudut minimum e 12,00 z 2,06. Mengetik z 4,00
 * menggeser SELURUH isi folder naik 1,94 sehingga dasarnya kini di z 4,00.
 */

const snap = (v: number) => Math.round(v * 1000) / 1000

/** satu kolom angka koordinat (tanpa tombol ±, murni ketik) */
function Kolom(p: {
  label: string
  nilai: number
  onSet: (v: number) => void
  disabled?: boolean
}) {
  const [teks, setTeks] = useState(p.nilai.toFixed(2))
  const [fokus, setFokus] = useState(false)

  // ikuti nilai dari luar (mis. setelah USER menggeser objek lewat jalur lain)
  useEffect(() => {
    if (!fokus) setTeks(p.nilai.toFixed(2))
  }, [p.nilai, fokus])

  const commit = (raw?: string) => {
    const n = parseFloat((raw ?? teks).replace(',', '.'))
    if (!Number.isFinite(n)) { setTeks(p.nilai.toFixed(2)); return }
    const v = snap(n)
    p.onSet(v)
    setTeks(v.toFixed(2))
  }

  return (
    <div className="row">
      <span className="rl">{p.label}</span>
      <input
        className="rinput"
        inputMode="decimal"
        value={teks}
        disabled={p.disabled}
        onFocus={ev => { setFokus(true); ev.currentTarget.select() }}
        onChange={ev => setTeks(ev.target.value)}
        onBlur={() => { setFokus(false); commit() }}
        onKeyDown={ev => {
          if (ev.key === 'Enter') { commit(); ev.currentTarget.blur() }
          if (ev.key === 'Escape') { setTeks(p.nilai.toFixed(2)); ev.currentTarget.blur() }
        }}
        aria-label={`${p.label} folder (ketik angka koordinat)`}
      />
    </div>
  )
}

interface Props {
  nama: string
  /** sudut minimum folder (koordinat tujuan yang sedang berlaku) */
  nilai: { e: number; w: number; z: number }
  /** ukuran kotak pembatas folder */
  ukuran: { e: number; w: number; z: number }
  /** jumlah anggota yang terkunci (tidak ikut bergeser) */
  terkunci: number
  onSet: (sumbu: 'e' | 'w' | 'z', nilai: number) => void
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

  return (
    <div className="modal" onClick={tutup}>
      <div className="mcard geser" ref={box} onClick={ev => ev.stopPropagation()}>
        <div className="mhead">
          <span>POSISI FOLDER · {p.nama}</span>
          <button className="sbtn" onClick={tutup}>✕</button>
        </div>
        <div className="phint">
          ketik angka KOORDINAT (bukan langkah). Nilai = sudut minimum folder;
          seluruh isi folder (termasuk sub-folder) ikut bergeser.
        </div>
        <Kolom label="e" nilai={p.nilai.e} onSet={v => p.onSet('e', v)} />
        <Kolom label="w" nilai={p.nilai.w} onSet={v => p.onSet('w', v)} />
        <Kolom label="z" nilai={p.nilai.z} onSet={v => p.onSet('z', v)} />
        <div className="phint">
          ukuran folder: {p.ukuran.e.toFixed(2)} × {p.ukuran.w.toFixed(2)} ×{' '}
          {p.ukuran.z.toFixed(2)} (e × w × z)
          {p.terkunci > 0 ? ` · ${p.terkunci} objek terkunci tidak ikut bergeser` : ''}
        </div>
      </div>
    </div>
  )
}
