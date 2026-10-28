import { useRef, useState } from 'react'
import { MATERIALS, UNKNOWN_STYLE, floorMat, wallColors } from '../iso/palette'
import type { SceneObject } from '../scene/types'

interface Props {
  objects: SceneObject[]
  selectedId: string | null
  locked: boolean
  onSelect: (id: string) => void
  onFocus: (id: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}

// warna kecil di kiri tiap baris supaya objek mudah dikenali sekilas
function colorOf(o: SceneObject): string {
  if (o.role === 'lantai') return floorMat(o.style).tones[0]
  if (o.role === 'dinding') return wallColors(o.style, o.side === 'kanan' ? 'kanan' : 'kiri').face
  if (typeof o.style === 'string') return (MATERIALS[o.style] ?? UNKNOWN_STYLE).top
  return o.style.top
}

// penanda peran & sisi: balok = B, lantai = L, dinding = DK (kiri) / DT (kanan)
function roleTag(o: SceneObject): string {
  if (o.role === 'lantai') return 'L'
  if (o.role === 'dinding') return o.side === 'kanan' ? 'DT' : 'DK'
  return 'B'
}

const LAYER_TAG: Record<string, string> = { underlay: 'U', main: 'M', overlay: 'O' }

/**
 * DAFTAR OBJEK — semua objek yang sudah dibuat, dalam satu panel yang bisa
 * digeser. Ketuk baris = pilih objek (sama seperti mengetuk di kanvas), tombol
 * ◎ = bidik kamera ke objek itu, 🗑 = hapus (butuh 2 ketukan agar aman).
 */
export default function ObjectList(p: Props) {
  const [pos, setPos] = useState({ x: Math.max(10, window.innerWidth - 236), y: 10 })
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const dragRef = useRef<{ dx: number; dy: number } | null>(null)

  const onHeadDown = (ev: React.PointerEvent) => {
    dragRef.current = { dx: ev.clientX - pos.x, dy: ev.clientY - pos.y }
    ;(ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId)
  }
  const onHeadMove = (ev: React.PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    setPos({
      x: Math.max(0, Math.min(window.innerWidth - 120, ev.clientX - d.dx)),
      y: Math.max(0, Math.min(window.innerHeight - 40, ev.clientY - d.dy)),
    })
  }
  const onHeadUp = () => { dragRef.current = null }

  return (
    <div className="objlist" style={{ left: pos.x, top: pos.y }}>
      <div
        className="phead grab"
        onPointerDown={onHeadDown}
        onPointerMove={onHeadMove}
        onPointerUp={onHeadUp}
        onPointerCancel={onHeadUp}
        title="seret untuk memindahkan daftar"
      >
        <span className="pgrip">⠿</span>
        <span className="ptitle">DAFTAR OBJEK ({p.objects.length})</span>
        <button className="sbtn" onClick={p.onClose} title="tutup daftar">✕</button>
      </div>

      {p.locked && <div className="olhint">terkunci — buka kunci untuk mengedit</div>}

      {p.objects.length === 0 && (
        <div className="olhint">belum ada objek. pakai + LANTAI / + DINDING / + TAMBAH</div>
      )}

      <div className="ollist">
        {p.objects.map(o => {
          const sel = o.id === p.selectedId
          return (
            <div
              key={o.id}
              className={sel ? 'olrow on' : 'olrow'}
              onClick={() => p.onSelect(o.id)}
              title={`${o.id} · e ${o.pos.e} w ${o.pos.w} z ${o.pos.z} · ${o.size.e}×${o.size.w}×${o.size.z}`}
            >
              <span className="olsw" style={{ background: colorOf(o) }} />
              <span className="olname">{o.label || o.id}</span>
              <span className="oltag">{roleTag(o)}</span>
              <span className="oltag">{LAYER_TAG[o.layer ?? 'main'] ?? 'M'}</span>
              <span className="olpos">{o.pos.e},{o.pos.w}</span>
              <button
                className="olbtn"
                title="bidik kamera ke objek ini"
                onClick={ev => { ev.stopPropagation(); p.onFocus(o.id) }}
              >◎</button>
              <button
                className={confirmDel === o.id ? 'olbtn del' : 'olbtn'}
                title={confirmDel === o.id ? 'ketuk lagi untuk menghapus' : 'hapus objek'}
                onClick={ev => {
                  ev.stopPropagation()
                  if (confirmDel === o.id) { p.onDelete(o.id); setConfirmDel(null) }
                  else {
                    setConfirmDel(o.id)
                    setTimeout(() => setConfirmDel(c => (c === o.id ? null : c)), 2500)
                  }
                }}
              >{confirmDel === o.id ? '!' : '🗑'}</button>
            </div>
          )
        })}
      </div>

      <div className="olfoot">
        ketuk baris = pilih · ◎ = bidik · 🗑 dua kali = hapus
      </div>
    </div>
  )
}
