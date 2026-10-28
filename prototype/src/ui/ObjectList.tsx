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
  /** id objek yang dicentang (untuk digabung jadi grup) */
  multi: string[]
  onToggle: (id: string) => void
  onClearMulti: () => void
  onGroup: () => void
  onUngroup: () => void
  onCycleKunci: (id: string) => void
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
const KUNCI_TAG: Record<string, string> = { warna: '🔒w', semua: '🔒' }

/**
 * DAFTAR OBJEK — semua objek yang sudah dibuat.
 *  • ketuk baris        = pilih objek (sama seperti mengetuk di kanvas)
 *  • ketuk kotak centang = tandai beberapa objek, lalu GABUNG GRUP
 *  • ◎  = bidik kamera ke objek
 *  • 🗑  = hapus (butuh 2 ketukan agar tidak salah hapus)
 *  • 🔒 = ubah status kunci objek (bebas -> warna saja -> total)
 */
export default function ObjectList(p: Props) {
  const [pos, setPos] = useState({ x: Math.max(10, window.innerWidth - 262), y: 10 })
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

  const nGrup = p.multi.length
  const grupCount = new Set(p.objects.map(o => o.grup).filter(Boolean)).size

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
        <span className="ptitle">OBJEK ({p.objects.length})</span>
        <button className="sbtn" onClick={p.onClose} title="tutup daftar">✕</button>
      </div>

      {/* aksi grup: muncul saat ada objek dicentang */}
      <div className="olact">
        <button className="sbtn" onClick={p.onClearMulti} title="kosongkan centang">
          ☐ {nGrup}
        </button>
        <button
          className="sbtn wide"
          disabled={nGrup < 2}
          onClick={p.onGroup}
          title="gabungkan objek bercetang jadi satu grup (seret satu = semua ikut)"
        >
          GABUNG{nGrup >= 2 ? ` ${nGrup}` : ''}
        </button>
        <button
          className="sbtn wide"
          disabled={nGrup === 0}
          onClick={p.onUngroup}
          title="lepas objek bercetang dari grupnya"
        >
          LEPAS
        </button>
      </div>
      {grupCount > 0 && <div className="olhint">{grupCount} grup aktif</div>}

      {p.locked && <div className="olhint">scene terkunci — buka kunci untuk mengedit</div>}

      {p.objects.length === 0 && (
        <div className="olhint">belum ada objek. pakai + LANTAI / + DINDING / + TAMBAH</div>
      )}

      <div className="ollist">
        {p.objects.map(o => {
          const sel = o.id === p.selectedId
          const checked = p.multi.includes(o.id)
          const frozen = o.kunci === 'warna' || o.kunci === 'semua'
          return (
            <div
              key={o.id}
              className={sel ? 'olrow on' : 'olrow'}
              onClick={() => p.onSelect(o.id)}
              title={`${o.id} · e ${o.pos.e} w ${o.pos.w} z ${o.pos.z} · ${o.size.e}×${o.size.w}×${o.size.z}`}
            >
              <div className="olline">
                <button
                  className={checked ? 'olchk on' : 'olchk'}
                  onClick={ev => { ev.stopPropagation(); p.onToggle(o.id) }}
                  title="centang untuk digabung jadi grup"
                >
                  {checked ? '☑' : '☐'}
                </button>
                <span className="olsw" style={{ background: colorOf(o) }} />
                <span className="olname">{o.label || o.id}</span>
                <button
                  className="olbtn"
                  title="bidik kamera ke objek ini"
                  onClick={ev => { ev.stopPropagation(); p.onFocus(o.id) }}
                >◎</button>
                <button
                  className={o.kunci ? 'olbtn lock on' : 'olbtn lock'}
                  title="status kunci: bebas → warna saja → total"
                  onClick={ev => { ev.stopPropagation(); p.onCycleKunci(o.id) }}
                >{KUNCI_TAG[o.kunci ?? ''] ?? '🔓'}</button>
                <button
                  className={confirmDel === o.id ? 'olbtn del' : 'olbtn'}
                  disabled={frozen}
                  title={frozen ? 'objek terkunci' : confirmDel === o.id ? 'ketuk lagi untuk menghapus' : 'hapus objek'}
                  onClick={ev => {
                    ev.stopPropagation()
                    if (frozen) return
                    if (confirmDel === o.id) { p.onDelete(o.id); setConfirmDel(null) }
                    else {
                      setConfirmDel(o.id)
                      setTimeout(() => setConfirmDel(c => (c === o.id ? null : c)), 2500)
                    }
                  }}
                >{confirmDel === o.id ? '!' : '🗑'}</button>
              </div>
              <div className="olmeta">
                <span className="oltag">{roleTag(o)}</span>
                <span className="oltag">{LAYER_TAG[o.layer ?? 'main'] ?? 'M'}</span>
                {o.grup && <span className="oltag grup">{o.grup.replace('grup-', 'G')}</span>}
                <span className="olpos">e{o.pos.e} w{o.pos.w}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="olfoot">ketuk = pilih · ☐ = centang · ◎ = bidik · 🔒 = kunci</div>
    </div>
  )
}
