import { useEffect, useRef, useState } from 'react'
import { MATERIALS, UNKNOWN_STYLE, floorMat, wallColors } from '../iso/palette'
import { loadCandidates } from '../scene/store'
import type { Scene, SceneObject } from '../scene/types'

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
  onRenameGroup: (gid: string, nama: string) => void
  /** buat sub-folder di dalam folder `gid` dari objek yang dicentang */
  onAddSub: (gid: string) => void
  /** keluarkan folder dari induknya (jadi folder tingkat atas) */
  onDetachGroup: (gid: string) => void
  onCycleKunci: (id: string) => void
  /** pasang kembali scene dari cadangan/riwayat (objek yang hilang) */
  onRestore: (scene: Scene) => void
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
 *  • objek bergrup ditampilkan sebagai FOLDER; ketuk folder = buka/tutup isinya
 *  • nama folder bisa di-rename lewat tombol ✎
 *  • ketuk baris objek = pilih objek
 *  • ☐ = centang (lalu GABUNG / LEPAS) · ◎ = bidik kamera · 🔒 = kunci · 🗑 = hapus
 */
export default function ObjectList(p: Props) {
  const [pos, setPos] = useState({ x: Math.max(10, window.innerWidth - 262), y: 10 })
  const [openFolders, setOpenFolders] = useState<string[]>([])
  const [editing, setEditing] = useState<string | null>(null)   // gid yang sedang di-rename
  const [showRescue, setShowRescue] = useState(false)
  const [rescue, setRescue] = useState<{ label: string; n: number; scene: any }[]>([])
  const [draft, setDraft] = useState('')
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

  // ---- susun daftar: objek bergrup jadi satu folder, sisanya baris biasa ----
  // ---- POHON FOLDER (folder boleh bersarang) ------------------------------
  // grup = kumpulan objek dengan `grup` sama; nama & induknya disimpan di
  // setiap anggota (grupNama / grupInduk) sehingga tidak ada struktur terpisah.
  const itemsOf = (gid: string) => p.objects.filter(o => o.grup === gid)
  const gids: string[] = []
  for (const o of p.objects) if (o.grup && !gids.includes(o.grup)) gids.push(o.grup)

  const namaOf = (gid: string) =>
    itemsOf(gid).find(x => x.grupNama)?.grupNama ?? gid.replace('grup-', 'FOLDER ')
  const indukOf = (gid: string): string | undefined => {
    const ind = itemsOf(gid).find(x => x.grupInduk)?.grupInduk
    // induk yang tidak ada lagi -> diperlakukan sebagai folder tingkat atas
    return ind && gids.includes(ind) ? ind : undefined
  }
  const anakOf = (induk: string | undefined) => gids.filter(g => indukOf(g) === induk)

  // objek lepas (tidak masuk grup) tetap tampil sebagai baris biasa
  const lepas = p.objects.filter(o => !o.grup)

  // scene kosong = kemungkinan objek hilang -> langsung tawarkan pemulihan
  useEffect(() => {
    if (p.objects.length > 0) return
    const c = loadCandidates()
    if (c.length > 0) { setRescue(c); setShowRescue(true) }
    // hanya saat panel pertama dibuka
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openRescue = () => {
    setRescue(loadCandidates())
    setShowRescue(v => !v)
  }

  const toggleFolder = (gid: string) =>
    setOpenFolders(f => (f.includes(gid) ? f.filter(x => x !== gid) : [...f, gid]))

  const nGrup = p.multi.length
  const grupCount = gids.length

  // ---- satu baris objek ----
  const objRow = (o: SceneObject, inFolder: boolean) => {
    const sel = o.id === p.selectedId
    const checked = p.multi.includes(o.id)
    const frozen = o.kunci === 'warna' || o.kunci === 'semua'
    return (
      <div
        key={o.id}
        className={(sel ? 'olrow on' : 'olrow') + (inFolder ? ' infolder' : '')}
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
            className="olbtn del"
            disabled={frozen}
            title={frozen ? 'objek terkunci' : 'hapus objek (akan diminta konfirmasi)'}
            onClick={ev => { ev.stopPropagation(); if (!frozen) p.onDelete(o.id) }}
          >🗑</button>
        </div>
        <div className="olmeta">
          <span className="oltag">{roleTag(o)}</span>
          <span className="oltag">{LAYER_TAG[o.layer ?? 'main'] ?? 'M'}</span>
          <span className="olpos">e{o.pos.e} w{o.pos.w}</span>
        </div>
      </div>
    )
  }

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
          title="gabungkan objek bercetang jadi satu folder/grup (seret satu = semua ikut)"
        >
          GABUNG{nGrup >= 2 ? ` ${nGrup}` : ''}
        </button>
        <button
          className="sbtn wide"
          disabled={nGrup === 0}
          onClick={p.onUngroup}
          title="keluarkan objek bercetang dari folder/grup"
        >
          LEPAS
        </button>
        <button
          className={showRescue ? 'sbtn on' : 'sbtn'}
          onClick={openRescue}
          title="pulihkan objek yang hilang dari cadangan/riwayat"
        >
          ⟲
        </button>
      </div>
      {grupCount > 0 && <div className="olhint">{grupCount} folder ({gids.filter(g => indukOf(g)).length} sub-folder)</div>}

      {showRescue && (
        <div className="olrescue">
          <div className="olhint">PULIHKAN — ketuk untuk memasang kembali</div>
          {rescue.length === 0 && (
            <div className="olhint">belum ada cadangan. cadangan dibuat otomatis saat ada objek.</div>
          )}
          {rescue.map((c, i) => (
            <button
              key={i}
              className="sbtn wide"
              onClick={() => { p.onRestore(c.scene); setShowRescue(false) }}
              title={c.label}
            >
              {c.n} objek · {c.label}
            </button>
          ))}
        </div>
      )}

      {p.locked && <div className="olhint">scene terkunci — buka kunci untuk mengedit</div>}

      {p.objects.length === 0 && (
        <button className="sbtn wide danger" onClick={openRescue} title="cari objek di cadangan & riwayat">
          OBJEK 0 — CARI CADANGAN ⟲
        </button>
      )}

      <div className="ollist">
        {renderLevel(undefined, 0)}
        {lepas.map(o => objRow(o, false))}
      </div>

      <div className="olfoot">folder bersarang · ＋SUB di dalam folder · ☐ centang · 🔒 kunci</div>
    </div>
  )

  // ---- satu folder + isinya (rekursif: sub-folder di atas, lalu objeknya) --
  function renderLevel(induk: string | undefined, depth: number): React.ReactNode {
    if (depth > 5) return null   // pengaman: kedalaman maksimal 5 tingkat
    return anakOf(induk).map(e => {
          const gid = e
          const items = itemsOf(gid)
          const nama = namaOf(gid)
          const open = openFolders.includes(gid)
          const nSel = items.filter(o => p.multi.includes(o.id)).length
          const anak = anakOf(gid)
          return (
            <div key={gid} className="olfolderwrap" style={{ marginLeft: depth * 8 }}>
              <div
                className="olrow folder"
                onClick={() => (editing === gid ? undefined : toggleFolder(gid))}
                title="ketuk untuk buka/tutup folder"
              >
                <div className="olline">
                  <span className="olchev">{open ? '▾' : '▸'}</span>
                  <span className="olicon">{anak.length > 0 ? '🗂' : '📁'}</span>
                  {editing === gid ? (
                    <input
                      className="olrename"
                      autoFocus
                      value={draft}
                      onClick={ev => ev.stopPropagation()}
                      onChange={ev => setDraft(ev.target.value)}
                      onBlur={() => { p.onRenameGroup(gid, draft); setEditing(null) }}
                      onKeyDown={ev => {
                        if (ev.key === 'Enter') { p.onRenameGroup(gid, draft); setEditing(null) }
                        if (ev.key === 'Escape') setEditing(null)
                      }}
                    />
                  ) : (
                    <span className="olname">{anak.length > 0 ? nama.split(' / ').pop() : nama}</span>
                  )}
                  <span className="olcount">{items.length + anak.length}</span>
                  <button
                    className="olbtn"
                    title="ganti nama folder"
                    onClick={ev => {
                      ev.stopPropagation()
                      setEditing(gid)
                      setDraft(nama)
                      if (!open) toggleFolder(gid)
                    }}
                  >✎</button>
                  <button
                    className="olbtn sub"
                    disabled={p.multi.length === 0}
                    title={
                      p.multi.length === 0
                        ? 'centang dulu objek yang mau dimasukkan ke sub-folder'
                        : `jadikan ${p.multi.length} objek bercetang sebagai SUB-FOLDER di dalam folder ini`
                    }
                    onClick={ev => { ev.stopPropagation(); if (p.multi.length > 0) p.onAddSub(gid) }}
                  >＋</button>
                  {induk !== undefined && (
                    <button
                      className="olbtn"
                      title="keluarkan folder ini dari induknya (jadi folder tingkat atas)"
                      onClick={ev => { ev.stopPropagation(); p.onDetachGroup(gid) }}
                    >⇧</button>
                  )}
                </div>
                <div className="olmeta">
                  <span className="oltag grup">{anak.length > 0 ? 'FOLDER' : 'GRUP'}</span>
                  {anak.length > 0 && <span className="oltag">{anak.length} sub</span>}
                  {nSel > 0 && <span className="oltag">{nSel} dicentang</span>}
                  <span className="olpos">
                    {items.filter(o => o.kunci).length > 0
                      ? `${items.filter(o => o.kunci).length} terkunci`
                      : 'bebas'}
                  </span>
                </div>
              </div>
              {open && (
                <div className="olfolderbody">
                  {renderLevel(gid, depth + 1)}
                  {items.map(o => objRow(o, true))}
                </div>
              )}
            </div>
          )
        })
  }
}
