import { useEffect, useRef, useState } from 'react'
import { OPASITAS_MIN, UKURAN_MIN } from '../scene/types'
import NumField from './NumField'

/**
 * KARTU FOLDER — dibuat SEMIRIP mungkin dengan panel editor objek
 * (permintaan user 2026-10-29: "bisakah fiturnya disamakan dengan editor
 * objek?"). Isinya:
 *
 *   POSISI  e / w / z   angka bisa diketik, tombol − / + kelipatan 0,1
 *   UKURAN  panjang / lebar / tinggi (e / w / z) — mengubah SELURUH isi folder
 *           sebagai satu kesatuan (diskalakan dari sudut minimum folder)
 *   ROTASI  ⟲ 15° / 15° ⟳ — kelipatan 15 derajat (permintaan user)
 *
 * Kartu ini BUKAN modal berlatar gelap: ia panel melayang seperti editor objek,
 * bisa DIGESER dan tembus pandang, supaya objek di belakangnya tetap terlihat
 * (permintaan user: "saya tidak bisa melihat perubahannya karena tertutup
 * jendela editor").
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
  /** transparansi seluruh isi folder (0.05..1) */
  opasitas: number
  onOpasitas: (nilai: number) => void
  /** putar seluruh isi folder 15° (arah −1 = kiri, +1 = kanan) */
  onPutar: (arah: 1 | -1) => void
  /** salin SELURUH isi folder menjadi folder baru */
  onDuplikat: () => void
  /** hapus SELURUH isi folder (App meminta konfirmasi dulu) */
  onHapus: () => void
  onClose: () => void
}

export default function PosisiFolder(p: Props) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ dx: number; dy: number } | null>(null)
  // mulai di sisi KANAN layar supaya ruangan di tengah tidak tertutup
  const [pos, setPos] = useState(() => ({
    x: Math.max(4, window.innerWidth - 288),
    y: 10,
  }))

  /** jaga kartu tetap utuh di dalam layar */
  const clampPos = (x: number, y: number) => {
    const el = boxRef.current
    const bw = el?.offsetWidth ?? 272
    const bh = el?.offsetHeight ?? 320
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

  // ESC menutup kartu (angka yang sedang diketik ikut tersimpan karena blur)
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return
      const aktif = document.activeElement
      if (aktif instanceof HTMLElement && aktif.closest('.panel') === boxRef.current) {
        aktif.blur()
        return
      }
      p.onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [p])

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

  const tutup = () => {
    const aktif = document.activeElement
    if (aktif instanceof HTMLElement && aktif.closest('.panel') === boxRef.current) aktif.blur()
    p.onClose()
  }

  return (
    <div
      ref={boxRef}
      className="panel foldercard"
      style={{ left: pos.x, top: pos.y }}
      role="dialog"
      aria-label={`folder ${p.nama}`}
    >
      <div
        className="phead grab"
        onPointerDown={onHeadDown}
        onPointerMove={onHeadMove}
        onPointerUp={onHeadUp}
        onPointerCancel={onHeadUp}
        title="seret untuk memindahkan kartu folder"
      >
        <span className="pgrip" aria-hidden>⠿</span>
        <span style={{ flex: 1 }}>{`FOLDER · ${p.nama}`}</span>
        <button className="sbtn" onClick={tutup} aria-label="tutup kartu folder">✕</button>
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
          <span className="rl">transparansi</span>
          <NumField
            label="opasitas"
            value={p.opasitas}
            min={OPASITAS_MIN}
            desimal={2}
            onChange={v => p.onOpasitas(Math.min(1, v))}
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

        <div className="row">
          <button className="sbtn wide" onClick={p.onDuplikat} title="salin SELURUH isi folder menjadi folder baru">
            DUPLIKAT
          </button>
          <button className="sbtn wide danger" onClick={p.onHapus} title="hapus SELURUH isi folder (diminta konfirmasi)">
            HAPUS
          </button>
        </div>

        <div className="phint">
          posisi & ukuran = kotak pembatas folder; semua bagian ikut sebagai satu
          kesatuan. angka bisa diketik, tombol − / + melangkah 0,1.
        </div>
      </div>
    </div>
  )
}
