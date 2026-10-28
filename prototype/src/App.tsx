import { useEffect, useRef, useState } from 'react'
import {
  CAM, DEFAULT_Q, IH, IW, ROOM,
  resetView, setCenter, setZoom, unpx, zoomValue, zoneName,
} from './iso/space'
import { drawScene } from './iso/room'
import { bboxOf, sortedObjects } from './iso/box'
import { MATERIAL_KEYS } from './iso/palette'
import { seedScene } from './scene/seed'
import { loadDraft, loadLocked, saveDraft, saveLocked, validateScene } from './scene/store'
import { type Scene, type SceneObject } from './scene/types'
import EditPanel from './ui/EditPanel'
import PalettePanel from './ui/PalettePanel'

const DEVICE = {
  name: 'HUAWEI MatePad Mini',
  res: '2560 × 1600',
  inch: '8.8″',
  hz: '120 Hz',
  os: 'HarmonyOS 4.x',
}
const DEV_RES_W = 2560
const BEZEL = 16

type Rot = 'auto' | 'tegak' | 'putar'
const ROT_NEXT: Record<Rot, Rot> = { auto: 'tegak', tegak: 'putar', putar: 'auto' }

const snap = (v: number) => Math.round(v * 10) / 10 // kelipatan 0.1 (permintaan user)
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scene, setScene] = useState<Scene>(() => loadDraft())
  const [locked, setLocked] = useState<boolean>(() => loadLocked() !== null)
  const [mode, setMode] = useState<'lihat' | 'edit'>('lihat')
  const [grid, setGrid] = useState(false)
  const [dev, setDev] = useState(true)
  const [rot, setRot] = useState<Rot>('auto')
  const [, forceZoomLabel] = useState(0) // refresh label tombol ZOOM saat pinch
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [modal, setModal] = useState<'export' | 'import' | null>(null)
  const [showPalette, setShowPalette] = useState(false)
  const [refleksi, setRefleksi] = useState(true)
  const [importText, setImportText] = useState('')
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight })
  const [hover, setHover] = useState<{ e: number; w: number } | null>(null)

  const sceneRef = useRef(scene); sceneRef.current = scene
  const modeRef = useRef(mode); modeRef.current = mode
  const lockedRef = useRef(locked); lockedRef.current = locked
  const selRef = useRef(selectedId); selRef.current = selectedId
  const gridRef = useRef(grid); gridRef.current = grid
  const refleksiRef = useRef(refleksi); refleksiRef.current = refleksi
  const dragRef = useRef<{ id: string; e0: number; w0: number; ge: number; gw: number; moved: boolean } | null>(null)
  const panRef = useRef<{ ce: number; cw: number; ge: number; gw: number; moved: boolean } | null>(null)
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchRef = useRef<{ d0: number; q0: number } | null>(null)

  useEffect(() => { saveDraft(scene) }, [scene])

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
        grid: gridRef.current,
        edit: modeRef.current === 'edit' && !lockedRef.current,
        objects: sceneRef.current.objects,
        selectedId: selRef.current,
        refleksi: refleksiRef.current,
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

  const hitTest = (sx: number, sy: number): SceneObject | null => {
    const sorted = sortedObjects(sceneRef.current.objects)
    for (let i = sorted.length - 1; i >= 0; i--) {
      const b = bboxOf(sorted[i])
      if (sx >= b.x0 && sx <= b.x1 && sy >= b.y0 && sy <= b.y1) return sorted[i]
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
        dragRef.current = { id: hit.id, e0: hit.pos.e, w0: hit.pos.w, ge: g.e, gw: g.w, moved: false }
        setSelectedId(hit.id)
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

    // pinch in/out = zoom out/in (satu-satunya kendali zoom selain tombol reset)
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
      const obj = sceneRef.current.objects.find(o => o.id === d.id)
      if (!obj) return
      const ne = clamp(snap(d.e0 + (g.e - d.ge)), 0, ROOM.E - obj.size.e)
      const nw = clamp(snap(d.w0 + (g.w - d.gw)), 0, ROOM.W - obj.size.w)
      if (ne !== obj.pos.e || nw !== obj.pos.w) {
        d.moved = true
        patchObject(d.id, { pos: { ...obj.pos, e: ne, w: nw } })
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

  const duplicateObject = (id: string) => {
    const src = sceneRef.current.objects.find(o => o.id === id)
    if (!src) return
    const nid = `${id}-salinan-${Date.now().toString(36).slice(-3)}`
    setScene(s => ({
      ...s,
      objects: [...s.objects, {
        ...src, id: nid, label: `${src.label} (salinan)`,
        pos: { ...src.pos, e: clamp(src.pos.e + 1, 0, ROOM.E - src.size.e), w: clamp(src.pos.w + 1, 0, ROOM.W - src.size.w) },
      }],
    }))
    setSelectedId(nid)
  }

  const deleteObject = (id: string) => {
    setScene(s => ({ ...s, objects: s.objects.filter(o => o.id !== id) }))
    setSelectedId(null)
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

  const downloadScene = () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = locked ? 'scene-terkunci.json' : 'scene-draf.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const applyImport = () => {
    const parsed = validateScene(JSON.parse(importText))
    if (!parsed) return
    setScene(parsed)
    setLocked(Boolean(parsed.meta?.locked))
    setSelectedId(null)
    setModal(null)
  }

  const resetScene = () => {
    // reset = kembali ke seed balok8 (bukan ruangan kosong)
    setScene(seedScene())
    setSelectedId(null)
    resetView()
  }

  // --- bingkai tablet ---
  const rotated = rot === 'putar' || (rot === 'auto' && vp.h > vp.w)
  const availW = rotated ? vp.h : vp.w
  const availH = rotated ? vp.w : vp.h
  // ruang cadangan untuk caption + toolbar agar tidak menimpa bingkai
  const RESERVED = 108
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
            {dev && (
              <div className="chip">
                <span>
                  {hover ? `(e=${hover.e}, w=${hover.w}) · ${zoneName(hover.e, hover.w)}` : `${scene.objects.length} objek`}
                </span>
                <span>zoom ×{zoomValue()}</span>
                <span className={locked ? 'on' : ''}>{locked ? `terkunci ${savedAt ?? ''}` : 'draf'}</span>
                <span>ruang: terkunci</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="caption">
        <span>{DEVICE.name} · {DEVICE.res} · {DEVICE.inch} · {DEVICE.hz} · {DEVICE.os}</span>
        <span>
          {editable
            ? 'mode edit: seret objek = pindah · seret lantai = geser kamera · pinch = zoom · ketuk objek = panel'
            : locked
              ? 'layar terkunci: inilah versi yang diterapkan ke aplikasi'
              : 'mode lihat: seret lantai = geser kamera · pinch = zoom'}
        </span>
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
          </>
        )}
        <button
          className="tbtn"
          title="zoom dikendalikan pinch in/out; ketuk untuk reset ke default"
          onClick={() => { setZoom(DEFAULT_Q); forceZoomLabel(v => v + 1) }}
        >
          ZOOM ×{zoomValue()}
        </button>
        <button className="tbtn" onClick={resetView}>TENGAH</button>
        <button className={grid ? 'tbtn on' : 'tbtn'} onClick={() => setGrid(v => !v)}>GRID</button>
        <button className={showPalette ? 'tbtn on' : 'tbtn'} onClick={() => setShowPalette(v => !v)}>PALET</button>
        <button className={refleksi ? 'tbtn on' : 'tbtn'} onClick={() => setRefleksi(v => !v)} title="pantulan objek di lantai kayu">REFLEKSI</button>
        <button className={dev ? 'tbtn on' : 'tbtn'} onClick={() => setDev(v => !v)}>KOORDINAT</button>
        <button className="tbtn" onClick={() => setRot(r => ROT_NEXT[r])}>ROTASI: {rot.toUpperCase()}</button>
        <button className="tbtn" onClick={() => { setImportText(exportJSON()); setModal('export') }}>EXPORT</button>
        <button className="tbtn" onClick={() => { setImportText(''); setModal('import') }}>IMPORT</button>
        {!locked && <button className="tbtn on" onClick={lockScene}>💾 SIMPAN & KUNCI</button>}
        <button className="tbtn" onClick={resetScene}>RESET</button>
      </div>

      {editable && selected && (
        <EditPanel
          obj={selected}
          onChange={patch => patchObject(selected.id, patch)}
          onMove={(de, dw) => patchObject(selected.id, {
            pos: {
              ...selected.pos,
              e: clamp(selected.pos.e + de, 0, ROOM.E - selected.size.e),
              w: clamp(selected.pos.w + dw, 0, ROOM.W - selected.size.w),
            },
          })}
          onResize={(de, dw, dz) => patchObject(selected.id, {
            size: {
              e: clamp(Math.round((selected.size.e + de) * 10) / 10, 0.1, 40),
              w: clamp(Math.round((selected.size.w + dw) * 10) / 10, 0.1, 40),
              z: clamp(Math.round((selected.size.z + dz) * 10) / 10, 0.1, 12),
            },
          })}
          onCycleStyle={() => {
            const cur = typeof selected.style === 'string' ? selected.style : ''
            const i = MATERIAL_KEYS.indexOf(cur)
            patchObject(selected.id, { style: MATERIAL_KEYS[(i + 1) % MATERIAL_KEYS.length] })
          }}
          onCycleLayer={() => {
            const order = ['underlay', 'main', 'overlay'] as const
            const cur = selected.layer ?? 'main'
            patchObject(selected.id, { layer: order[(order.indexOf(cur) + 1) % order.length] })
          }}
          onDuplicate={() => duplicateObject(selected.id)}
          onDelete={() => deleteObject(selected.id)}
          onClose={() => setSelectedId(null)}
        />
      )}

      {showPalette && <PalettePanel onClose={() => setShowPalette(false)} />}

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
