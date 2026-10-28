import { useEffect, useRef, useState } from 'react'
import { IH, IW, ROOM, unpx, zoneName } from './iso/space'
import { drawShell } from './iso/room'

const DEVICE = {
  name: 'HUAWEI MatePad Mini',
  res: '2560 × 1600',
  inch: '8.8″',
  hz: '120 Hz',
  os: 'HarmonyOS 4.x',
}
const DEV_RES_W = 2560
const BEZEL = 16

// rotasi bingkai: auto (ikut orientasi viewport) / tegak / putar
type Rot = 'auto' | 'tegak' | 'putar'
const ROT_NEXT: Record<Rot, Rot> = { auto: 'tegak', tegak: 'putar', putar: 'auto' }

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [grid, setGrid] = useState(false)
  const [dev, setDev] = useState(true)
  const [rot, setRot] = useState<Rot>('auto')
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight })
  const [hover, setHover] = useState<{ e: number; w: number } | null>(null)
  const gridRef = useRef(grid)
  gridRef.current = grid

  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    let raf = 0
    const loop = () => {
      drawShell(ctx, gridRef.current)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const onMove = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = ev.currentTarget.getBoundingClientRect()
    const sx = ((ev.clientX - rect.left) * IW) / rect.width
    const sy = ((ev.clientY - rect.top) * IH) / rect.height
    const { e, w } = unpx(sx, sy)
    const inside = e >= 0 && w >= 0 && e <= ROOM.E && w <= ROOM.W
    setHover(inside ? { e: Math.round(e * 2) / 2, w: Math.round(w * 2) / 2 } : null)
  }

  // --- bingkai tablet: landscape terkunci, auto-rotate di viewport portrait ---
  const rotated = rot === 'putar' || (rot === 'auto' && vp.h > vp.w)
  const availW = rotated ? vp.h : vp.w
  const availH = rotated ? vp.w : vp.h
  const screenW = Math.max(
    280,
    Math.floor(Math.min((availW * 0.92) - BEZEL * 2, ((availH * 0.80) - BEZEL * 2) * 1.6)),
  )
  const screenH = Math.round(screenW / 1.6)
  const frameW = screenW + BEZEL * 2
  const frameH = screenH + BEZEL * 2
  const previewScale = screenW / DEV_RES_W

  return (
    <div className="stage">
      <div
        className="tablet-slot"
        style={{
          width: rotated ? frameH : frameW,
          height: rotated ? frameW : frameH,
        }}
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
              onPointerMove={onMove}
              onPointerLeave={() => setHover(null)}
            />
            <div className="glare" />
            {dev && (
              <div className="chip">
                <span>
                  {hover
                    ? `(e=${hover.e}, w=${hover.w}) · zona ${zoneName(hover.e, hover.w)}`
                    : `ruangan ${ROOM.E}×${ROOM.W} · dinding ${ROOM.WALL_Z}z`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="caption">
        <span>{DEVICE.name} · {DEVICE.res} · {DEVICE.inch} · {DEVICE.hz} · {DEVICE.os}</span>
        <span>landscape terkunci · skala preview ×{previewScale.toFixed(2)} (1 px di sini ≈ {(1 / previewScale).toFixed(1)} px perangkat)</span>
      </div>

      {/* semua kontrol berupa tombol — tanpa shortcut keyboard */}
      <div className="toolbar">
        <button
          className={grid ? 'tbtn on' : 'tbtn'}
          onClick={() => setGrid(v => !v)}
          aria-pressed={grid}
        >
          GRID {grid ? 'AKTIF' : 'MATI'}
        </button>
        <button
          className={dev ? 'tbtn on' : 'tbtn'}
          onClick={() => setDev(v => !v)}
          aria-pressed={dev}
        >
          KOORDINAT {dev ? 'AKTIF' : 'MATI'}
        </button>
        <button className="tbtn" onClick={() => setRot(r => ROT_NEXT[r])}>
          ROTASI: {rot.toUpperCase()}
        </button>
      </div>
    </div>
  )
}
