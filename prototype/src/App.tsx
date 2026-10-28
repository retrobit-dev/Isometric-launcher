import { useEffect, useRef, useState } from 'react'
import {
  ROOM, CAM, IH, IW,
  setCenter, setZoom, unpx, zoomValue, zoneName,
} from './iso/space'
import { drawScene } from './iso/room'
import { bboxOf, sortedObjects } from './iso/box'
import { FLOOR_DEFAULT, FLOOR_KEYS, MATERIAL_KEYS, WALL_DEFAULT, WALL_STYLE_KEYS } from './iso/palette'
import { loadCandidates, loadDraft, loadLocked, saveDraftGuarded, saveLocked, validateScene } from './scene/store'
import { type Scene, type SceneObject } from './scene/types'
import EditPanel from './ui/EditPanel'
import ObjectList from './ui/ObjectList'
import Confirm, { type ConfirmReq } from './ui/Confirm'

const DEV_RES_W = 2560
const BEZEL = 16


const snap = (v: number) => Math.round(v * 10) / 10 // kelipatan 0.1 (permintaan user)

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scene, setScene] = useState<Scene>(() => loadDraft())
  const [locked, setLocked] = useState<boolean>(() => loadLocked() !== null)
  const [mode, setMode] = useState<'lihat' | 'edit'>('lihat')
  const [, forceZoomLabel] = useState(0) // refresh chip KOORDINAT saat pinch zoom
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [modal, setModal] = useState<'export' | 'import' | null>(null)
  const [showList, setShowList] = useState(false)
  const [multi, setMulti] = useState<string[]>([]) // centang di DAFTAR OBJEK
  const [importText, setImportText] = useState('')
  // dialog konfirmasi untuk aksi merusak (hapus objek / import menimpa scene)
  const [confirm, setConfirm] = useState<ConfirmReq | null>(null)
  // URUNGKAN: simpan scene sesaat sebelum dihapus, bisa dipasang kembali
  const [undo, setUndo] = useState<{ scene: Scene; label: string } | null>(null)
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight })
  const [hover, setHover] = useState<{ e: number; w: number } | null>(null)

  const sceneRef = useRef(scene); sceneRef.current = scene
  const modeRef = useRef(mode); modeRef.current = mode
  const lockedRef = useRef(locked); lockedRef.current = locked
  const selRef = useRef(selectedId); selRef.current = selectedId
  // drag satu objek = drag seluruh anggota grupnya (jarak relatif tetap)
  const dragRef = useRef<{
    id: string
    members: { id: string; e0: number; w0: number }[]
    ge: number
    gw: number
    moved: boolean
  } | null>(null)
  const panRef = useRef<{ ce: number; cw: number; ge: number; gw: number; moved: boolean } | null>(null)
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchRef = useRef<{ d0: number; q0: number } | null>(null)

  useEffect(() => { saveDraftGuarded(scene) }, [scene])

  // toast URUNGKAN hilang sendiri setelah 8 detik
  useEffect(() => {
    if (!undo) return
    const t = setTimeout(() => setUndo(null), 8000)
    return () => clearTimeout(t)
  }, [undo])

  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // pinch trackpad desktop = ctrl+wheel; listener non-passive agar bisa preventDefault
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const onWheel = (ev: WheelEvent) => {
      if (!ev.ctrlKey) return
      ev.preventDefault()
      setZoom(CAM.Q * (1 - ev.deltaY * 0.012))
      forceZoomLabel(v => v + 1)
    }
    cv.addEventListener('wheel', onWheel, { passive: false })
    return () => cv.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    let raf = 0
    const loop = () => {
      drawScene(ctx, {
        grid: false,
        edit: modeRef.current === 'edit' && !lockedRef.current,
        objects: sceneRef.current.objects,
        selectedId: selRef.current,
        highlightIds: (() => {
          const sel = sceneRef.current.objects.find(o => o.id === selRef.current)
          return sel?.grup
            ? sceneRef.current.objects.filter(x => x.grup === sel.grup).map(x => x.id)
            : []
        })(),
      })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const patchObject = (id: string, patch: Partial<SceneObject>) =>
    setScene(s => ({ ...s, objects: s.objects.map(o => (o.id === id ? { ...o, ...patch } : o)) }))

  const toInternal = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = ev.currentTarget.getBoundingClientRect()
    return {
      sx: ((ev.clientX - rect.left) * IW) / rect.width,
      sy: ((ev.clientY - rect.top) * IH) / rect.height,
    }
  }

  // id semua anggota grup dari objek ini (objek tanpa grup -> dirinya saja)
  const grupOf = (o: SceneObject): string[] =>
    o.grup ? sceneRef.current.objects.filter(x => x.grup === o.grup).map(x => x.id) : [o.id]

  // objek terkunci: 'warna' & 'semua' sama-sama tidak boleh digeser/diubah
  // bentuknya; 'semua' juga tidak boleh ganti warna.
  const frozen = (o: SceneObject) => o.kunci === 'warna' || o.kunci === 'semua'

  const hitTest = (sx: number, sy: number): SceneObject | null => {
    // objek lantai (role 'lantai') dicek TERAKHIR supaya tidak menelan klik
    // objek yang berdiri di atasnya
    const sorted = sortedObjects(sceneRef.current.objects)
    const solid = sorted.filter(o => o.role !== 'lantai')
    const floors = sorted.filter(o => o.role === 'lantai')
    for (const list of [solid, floors]) {
      for (let i = list.length - 1; i >= 0; i--) {
        const b = bboxOf(list[i])
        if (sx >= b.x0 && sx <= b.x1 && sy >= b.y0 && sy <= b.y1) return list[i]
      }
    }
    return null
  }

  const onDown = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })
    // jari kedua turun = mulai pinch-zoom, batalkan drag/pan
    if (pointersRef.current.size === 2) {
      const [p1, p2] = [...pointersRef.current.values()]
      pinchRef.current = {
        d0: Math.hypot(p1.x - p2.x, p1.y - p2.y),
        q0: CAM.Q,
      }
      dragRef.current = null
      panRef.current = null
      ev.currentTarget.setPointerCapture(ev.pointerId)
      return
    }
    const { sx, sy } = toInternal(ev)
    const g = unpx(sx, sy)
    if (modeRef.current === 'edit' && !lockedRef.current) {
      const hit = hitTest(sx, sy)
      if (hit) {
        setSelectedId(hit.id)
        // objek terkunci hanya bisa dipilih, tidak bisa digeser. Grup yang
        // salah satu anggotanya terkunci juga tidak digeser sama sekali, supaya
        // susunan grup tidak pecah (geser sebagian = posisi relatif berubah).
        const ids = grupOf(hit)
        const members = ids
          .map(id => sceneRef.current.objects.find(o => o.id === id))
          .filter((o): o is SceneObject => !!o)
        if (!frozen(hit) && !members.some(frozen)) {
          dragRef.current = {
            id: hit.id,
            members: members.map(o => ({ id: o.id, e0: o.pos.e, w0: o.pos.w })),
            ge: g.e,
            gw: g.w,
            moved: false,
          }
        }
        ev.currentTarget.setPointerCapture(ev.pointerId)
        return
      }
    }
    // seret area kosong / mode lihat = pan kamera
    panRef.current = { ce: CAM.CE, cw: CAM.CW, ge: g.e, gw: g.w, moved: false }
    ev.currentTarget.setPointerCapture(ev.pointerId)
  }

  const onMove = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const pts = pointersRef.current
    if (pts.has(ev.pointerId)) pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })

    // pinch in/out = satu-satunya kendali zoom (tombol ZOOM sudah dihapus;
    // TENGAH hanya mengembalikan kamera ke acuan x1 (0,0))
    const pinch = pinchRef.current
    if (pinch && pts.size >= 2) {
      const [p1, p2] = [...pts.values()]
      const d = Math.hypot(p1.x - p2.x, p1.y - p2.y)
      if (pinch.d0 > 0 && d > 0) {
        setZoom(pinch.q0 * (d / pinch.d0))
        forceZoomLabel(v => v + 1)
      }
      return
    }

    const { sx, sy } = toInternal(ev)
    const g = unpx(sx, sy)
    setHover({ e: snap(g.e), w: snap(g.w) })

    const d = dragRef.current
    if (d) {
      const de = g.e - d.ge
      const dw = g.w - d.gw
      // satu set patch untuk semua anggota supaya mereka bergerak serempak
      let changed = false
      const objects = sceneRef.current.objects.map(o => {
        const m = d.members.find(x => x.id === o.id)
        if (!m) return o
        // tanpa aturan ruangan: posisi objek bebas (tidak dikurung ke 20x19)
        const ne = snap(m.e0 + de)
        const nw = snap(m.w0 + dw)
        if (ne === o.pos.e && nw === o.pos.w) return o
        changed = true
        return { ...o, pos: { ...o.pos, e: ne, w: nw } }
      })
      if (changed) {
        d.moved = true
        setScene(sc => ({ ...sc, objects }))
      }
      return
    }

    const p = panRef.current
    if (p) {
      const de = g.e - p.ge
      const dw = g.w - p.gw
      if (Math.abs(de) + Math.abs(dw) > 0.15) p.moved = true
      if (p.moved) setCenter(p.ce - de, p.cw - dw)
    }
  }

  const onUp = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const wasPinch = pinchRef.current !== null
    pointersRef.current.delete(ev.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null
    if (wasPinch) {
      dragRef.current = null
      panRef.current = null
      return // selesai pinch bukan ketukan: jangan batal-pilih
    }
    if (dragRef.current && !dragRef.current.moved) {
      /* ketukan tanpa geser = pilih (sudah saat onDown) */
    }
    if (panRef.current && !panRef.current.moved && modeRef.current === 'edit' && !lockedRef.current) {
      setSelectedId(null) // ketuk lantai kosong = batal pilih
    }
    dragRef.current = null
    panRef.current = null
  }

  // --- aksi editor (docs/03 §4) ---
  const addObject = () => {
    const n = sceneRef.current.objects.length + 1
    const id = `objek-${n}-${Date.now().toString(36).slice(-3)}`
    const obj: SceneObject = {
      id, label: `Objek ${n}`,
      pos: { e: 6, w: 6, z: 0 }, size: { e: 2, w: 1, z: 1 },
      style: 'wood', app: null, layer: 'main',
    }
    setScene(s => ({ ...s, objects: [...s.objects, obj] }))
    setSelectedId(id)
  }

  // + DINDING: buat 2 dinding (kiri/DB & kanan/DT) mengikuti tepi belakang
  // lantai yang ada. Tidak ada lantai -> pakai batas ruangan (0,0).
  const addWalls = () => {
    const floor = sceneRef.current.objects.find(o => o.role === 'lantai')
    const e0 = floor ? floor.pos.e : 0
    const w0 = floor ? floor.pos.w : 0
    const se = floor ? floor.size.e : ROOM.E
    const sw = floor ? floor.size.w : ROOM.W
    const z0 = floor ? floor.pos.z : 0
    const H = ROOM.WALL_Z
    const stamp = Date.now().toString(36).slice(-4)

    const wallKiri: SceneObject = {
      id: `dinding-kiri-${stamp}`,
      label: 'Dinding Kiri (DB)',
      pos: { e: e0, w: w0, z: z0 },
      size: { e: 0.2, w: sw, z: H },
      style: WALL_DEFAULT,
      app: null,
      layer: 'main',
      role: 'dinding',
      side: 'kiri',
      refleksi: false,
    }
    const wallKanan: SceneObject = {
      id: `dinding-kanan-${stamp}`,
      label: 'Dinding Kanan (DT)',
      pos: { e: e0, w: w0, z: z0 },
      size: { e: se, w: 0.2, z: H },
      style: WALL_DEFAULT,
      app: null,
      layer: 'main',
      role: 'dinding',
      side: 'kanan',
      refleksi: false,
    }
    setScene(s => ({ ...s, objects: [...s.objects, wallKiri, wallKanan] }))
    setSelectedId(wallKiri.id)
  }

  const duplicateObject = (id: string) => {
    const src = sceneRef.current.objects.find(o => o.id === id)
    if (!src) return
    const nid = `${id}-salinan-${Date.now().toString(36).slice(-3)}`
    setScene(s => ({
      ...s,
      objects: [...s.objects, {
        ...src, id: nid, label: `${src.label} (salinan)`,
        pos: { ...src.pos, e: snap(src.pos.e + 1), w: snap(src.pos.w + 1) },
        // salinan berdiri sendiri: lepas dari grup & dari kunci objek asal
        grup: undefined,
        kunci: undefined,
      }],
    }))
    setSelectedId(nid)
  }

  // GABUNG GRUP: semua objek bercetang mendapat id grup yang sama, sehingga
  // menyeret salah satunya menggeser semuanya (jarak relatif tetap).
  const groupSelected = () => {
    if (multi.length < 2) return
    const gid = `grup-${Date.now().toString(36).slice(-4)}`
    // nama folder bawaan: FOLDER 1, FOLDER 2, ... (bisa di-rename di daftar)
    const n = new Set(sceneRef.current.objects.map(o => o.grup).filter(Boolean)).size + 1
    setScene(s => ({
      ...s,
      objects: s.objects.map(o =>
        multi.includes(o.id) ? { ...o, grup: gid, grupNama: `FOLDER ${n}` } : o),
    }))
    setMulti([])
  }

  // LEPAS GRUP: buang `grup` dari objek bercetang (kembali mandiri)
  const ungroupSelected = () => {
    if (multi.length === 0) return
    setScene(s => ({
      ...s,
      objects: s.objects.map(o => (multi.includes(o.id) ? { ...o, grup: undefined } : o)),
    }))
    setMulti([])
  }

  // ganti nama folder grup (semua anggota ikut, karena nama disimpan di objek)
  const renameGroup = (gid: string, nama: string) => {
    const clean = nama.trim()
    if (!clean) return
    setScene(s => ({
      ...s,
      objects: s.objects.map(o => (o.grup === gid ? { ...o, grupNama: clean } : o)),
    }))
  }

  // kunci per objek: bebas -> warna -> semua -> bebas
  const cycleKunci = (id: string) => {
    const o = sceneRef.current.objects.find(x => x.id === id)
    if (!o) return
    const next = o.kunci === undefined ? 'warna' : o.kunci === 'warna' ? 'semua' : undefined
    patchObject(id, { kunci: next })
  }

  // PULIHKAN: pasang kembali scene dari cadangan/riwayat (objek yang hilang)
  const restoreScene = (sc: Scene) => {
    setScene({ ...sc, meta: { locked: Boolean(sc.meta?.locked), savedAt: sc.meta?.savedAt ?? null } })
    setLocked(false)
    setSelectedId(null)
  }

  // TANYA DULU sebelum menghapus (permintaan user: jangan ada data hilang
  // tanpa peringatan). Dialog menyebut nama objek, peran, dan apakah dia
  // anggota grup / objek terakhir.
  const requestDelete = (id: string) => {
    const o = sceneRef.current.objects.find(x => x.id === id)
    if (!o) return
    const grupN = o.grup ? sceneRef.current.objects.filter(x => x.grup === o.grup).length : 0
    const terakhir = sceneRef.current.objects.length === 1
    const lines = [
      `Hapus "${o.label || o.id}"?`,
      `peran: ${o.role === 'lantai' ? 'lantai' : o.role === 'dinding' ? 'dinding ' + (o.side ?? 'kiri') : 'balok'} · layer ${o.layer ?? 'main'} · posisi e${o.pos.e} w${o.pos.w} z${o.pos.z}`,
    ]
    if (grupN > 0) lines.push(`objek ini anggota grup berisi ${grupN} objek — objek lain TIDAK ikut terhapus`)
    if (terakhir) lines.push('INI OBJEK TERAKHIR — scene akan menjadi kosong')
    setConfirm({
      title: 'KONFIRMASI HAPUS OBJEK',
      lines,
      confirmLabel: 'YA, HAPUS',
      danger: true,
      onConfirm: () => {
        const before = sceneRef.current
        setUndo({ scene: before, label: o.label || o.id })
        setScene(sc => ({ ...sc, objects: sc.objects.filter(x => x.id !== id) }))
        setSelectedId(null)
        setConfirm(null)
      },
    })
  }

  // tombol URUNGKAN pada toast: pasang kembali scene sebelum penghapusan
  const undoDelete = () => {
    if (!undo) return
    setScene(undo.scene)
    setUndo(null)
  }

  // SIMPAN & KUNCI: scene terkunci = satu-satunya yang sah diterapkan ke aplikasi
  const lockScene = () => {
    const stamped: Scene = { ...scene, meta: { locked: true, savedAt: new Date().toISOString() } }
    setScene(stamped)
    saveLocked(stamped)
    setLocked(true)
    setMode('lihat')
    setSelectedId(null)
  }

  const unlockScene = () => {
    setLocked(false)
    setMode('edit')
  }

  const exportJSON = () => JSON.stringify(scene, null, 2)

  // SALIN JSON: satu ketuk ke clipboard (permintaan user)
  const [copied, setCopied] = useState(false)
  const copyJSON = async () => {
    const text = exportJSON()
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // fallback untuk browser/konteks tanpa izin clipboard
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch { /* abaikan */ }
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const downloadScene = () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = locked ? 'scene-terkunci.json' : 'scene-draf.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const applyImport = () => {
    let parsed: Scene | null = null
    try {
      parsed = validateScene(JSON.parse(importText))
    } catch {
      parsed = null
    }
    if (!parsed) return
    const now = sceneRef.current.objects.length
    const next = parsed.objects.length
    const terjadwal = () => {
      setUndo({ scene: sceneRef.current, label: 'scene sebelum import' })
      setScene(parsed as Scene)
      setLocked(Boolean(parsed.meta?.locked))
      setSelectedId(null)
      setModal(null)
      setConfirm(null)
    }
    // scene sekarang berisi objek -> import akan MENGGANTI semuanya, jadi tanya
    if (now > 0) {
      setConfirm({
        title: 'KONFIRMASI IMPORT',
        lines: [
          `Import akan MENGGANTI seluruh scene: ${now} objek → ${next} objek.`,
          next < now ? `PERHATIAN: ${now - next} objek akan hilang dari layar` : 'jumlah objek bertambah',
          'tombol URUNGKAN muncul ±8 detik setelah import',
        ],
        confirmLabel: 'YA, GANTI SCENE',
        danger: next < now,
        onConfirm: terjadwal,
      })
      return
    }
    terjadwal()
  }

  // --- bingkai tablet ---
  // ROTASI selalu AUTO: orientasi perangkat mengikuti bentuk jendela
  const rotated = vp.h > vp.w
  const availW = rotated ? vp.h : vp.w
  const availH = rotated ? vp.w : vp.h
  // ruang cadangan untuk toolbar saja (keterangan di bawah tablet sudah dihapus)
  const RESERVED = 68
  const screenW = Math.max(
    240,
    Math.floor(Math.min((availW * 0.94) - BEZEL * 2, ((availH - RESERVED) - BEZEL * 2) * 1.6)),
  )
  const screenH = Math.round(screenW / 1.6)
  const frameW = screenW + BEZEL * 2
  const frameH = screenH + BEZEL * 2
  const previewScale = screenW / DEV_RES_W

  const selected = scene.objects.find(o => o.id === selectedId) ?? null
  const editable = mode === 'edit' && !locked
  const savedAt = scene.meta?.savedAt
    ? new Date(scene.meta.savedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="stage">
      <div
        className="tablet-slot"
        style={{ width: rotated ? frameH : frameW, height: rotated ? frameW : frameH }}
      >
        <div
          className="tablet"
          style={{ width: frameW, height: frameH, transform: rotated ? 'rotate(90deg)' : undefined }}
        >
          <div className="cam" />
          <div className="screen" style={{ inset: BEZEL }}>
            <canvas
              ref={canvasRef}
              width={IW}
              height={IH}
              className="scene"
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerLeave={ev => { setHover(null); onUp(ev) }}
            />
            <div className="glare" />
            {(
              <div className="chip">
                <span>
                  {hover ? `(e=${hover.e}, w=${hover.w}) · ${zoneName(hover.e, hover.w)}` : `${scene.objects.length} objek`}
                </span>
                {(() => {
                  const fl = scene.objects.filter(o => o.role === 'lantai')
                  return (
                    <span className={fl.length ? 'on' : ''}>
                      {fl.length
                        ? `lantai ${fl.length}: ${fl.map(f => (typeof f.style === 'string' ? f.style.replace('lantai-', '') : '?')).join(',')}`
                        : 'lantai: tidak ada'}
                    </span>
                  )
                })()}
                <span className={locked ? 'on' : ''}>{locked ? `terkunci ${savedAt ?? ''}` : 'draf'}</span>
                <span>{`kamera ×${zoomValue()} (${CAM.CE.toFixed(1)}, ${CAM.CW.toFixed(1)})`}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="toolbar">
        {locked ? (
          <button className="tbtn on" onClick={unlockScene}>🔒 TERKUNCI — BUKA UNTUK EDIT</button>
        ) : (
          <>
            <button
              className={mode === 'edit' ? 'tbtn on' : 'tbtn'}
              onClick={() => { setMode(m => (m === 'edit' ? 'lihat' : 'edit')); setSelectedId(null) }}
            >
              MODE: {mode.toUpperCase()}
            </button>
            {mode === 'edit' && <button className="tbtn" onClick={addObject}>+ TAMBAH</button>}
            {mode === 'edit' && (
              <button className="tbtn" onClick={addWalls} title="buat 2 dinding (kiri & kanan) mengikuti tepi belakang lantai">
                + DINDING
              </button>
            )}
            <button
              className={showList ? 'tbtn on' : 'tbtn'}
              onClick={() => setShowList(v => !v)}
              title="daftar semua objek yang sudah dibuat — ketuk untuk memilih"
            >
              OBJEK {scene.objects.length}
            </button>
          </>
        )}
        <button className="tbtn" onClick={() => { setImportText(exportJSON()); setModal('export') }}>EXPORT</button>
        <button className="tbtn" onClick={() => { setImportText(''); setModal('import') }}>IMPORT</button>
        {!locked && <button className="tbtn on" onClick={lockScene}>💾 SIMPAN & KUNCI</button>}
      </div>

      {editable && selected && (
        <EditPanel
          obj={selected}
          onChange={patch => patchObject(selected.id, patch)}
          onMove={(de, dw) => patchObject(selected.id, {
            pos: {
              ...selected.pos,
              e: Math.round((selected.pos.e + de) * 10) / 10,
              w: Math.round((selected.pos.w + dw) * 10) / 10,
            },
          })}
          onResize={(de, dw, dz) => patchObject(selected.id, {
            size: {
              e: Math.max(0.1, Math.round((selected.size.e + de) * 10) / 10),
              w: Math.max(0.1, Math.round((selected.size.w + dw) * 10) / 10),
              z: Math.max(0.1, Math.round((selected.size.z + dz) * 10) / 10),
            },
          })}
          onCycleStyle={() => {
            // lantai  -> palet lantai (kayu selang-seling / ubin)
            // dinding -> palet dinding + semua material balok
            // balok   -> material balok
            const keys = selected.role === 'lantai'
              ? FLOOR_KEYS
              : selected.role === 'dinding'
                ? WALL_STYLE_KEYS
                : MATERIAL_KEYS
            const cur = typeof selected.style === 'string' ? selected.style : ''
            const i = keys.indexOf(cur)
            patchObject(selected.id, { style: keys[(i + 1) % keys.length] })
          }}
          onRotate={() => {
            const cur = selected.rot ?? 0
            patchObject(selected.id, { rot: (((cur + 1) % 4) as 0 | 1 | 2 | 3) })
          }}
          onCycleKunci={() => cycleKunci(selected.id)}
          onCycleLayer={() => {
            const order = ['underlay', 'main', 'overlay'] as const
            const cur = selected.layer ?? 'main'
            patchObject(selected.id, { layer: order[(order.indexOf(cur) + 1) % order.length] })
          }}
          onDuplicate={() => duplicateObject(selected.id)}
          onDelete={() => requestDelete(selected.id)}
          onClose={() => setSelectedId(null)}
        />
      )}

      {showList && (
        <ObjectList
          objects={scene.objects}
          selectedId={selectedId}
          locked={locked}
          onSelect={id => setSelectedId(id)}
          onFocus={id => {
            const o = scene.objects.find(x => x.id === id)
            if (!o) return
            setCenter(o.pos.e + o.size.e / 2, o.pos.w + o.size.w / 2)
            setSelectedId(id)
          }}
          onDelete={id => requestDelete(id)}
          multi={multi}
          onToggle={id =>
            setMulti(m => (m.includes(id) ? m.filter(x => x !== id) : [...m, id]))
          }
          onClearMulti={() => setMulti([])}
          onGroup={groupSelected}
          onRenameGroup={(gid, nama) => renameGroup(gid, nama)}
          onUngroup={ungroupSelected}
          onCycleKunci={id => cycleKunci(id)}
          onRestore={sc => restoreScene(sc)}
          onClose={() => setShowList(false)}
        />
      )}

      {confirm && <Confirm {...confirm} onCancel={() => setConfirm(null)} />}

      {undo && (
        <div className="toast">
          <span>“{undo.label}” dihapus/diganti</span>
          <button className="sbtn" onClick={undoDelete}>URUNGKAN</button>
          <button className="sbtn" onClick={() => setUndo(null)}>✕</button>
        </div>
      )}

      {modal && (
        <div className="modal">
          <div className="mcard">
            <div className="mhead">
              <span>
                {modal === 'export'
                  ? locked ? 'EXPORT scene TERKUNCI ✔' : 'EXPORT scene DRAF — aplikasi akan menolak'
                  : 'IMPORT scene.json'}
              </span>
              <button className="sbtn" onClick={() => setModal(null)}>✕</button>
            </div>
            <textarea
              className="mtext"
              value={importText}
              readOnly={modal === 'export'}
              onChange={ev => setImportText(ev.target.value)}
              spellCheck={false}
            />
            <div className="mfoot">
              {modal === 'export' && (
                <button className="sbtn wide" onClick={copyJSON}>
                  {copied ? 'TERSALIN ✓' : 'SALIN JSON'}
                </button>
              )}
              {modal === 'export' && <button className="sbtn wide" onClick={downloadScene}>UNDUH FILE</button>}
              {modal === 'import' && <button className="sbtn wide" onClick={applyImport}>TERAPKAN</button>}
              <button className="sbtn wide" onClick={() => setModal(null)}>TUTUP</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
