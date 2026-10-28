import { useEffect, useRef, useState } from 'react'
import { IH, IW, ROOM, unpx, zoneName } from './iso/space'
import { drawShell } from './iso/room'

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [grid, setGrid] = useState(false)
  const [hover, setHover] = useState<{ e: number; w: number } | null>(null)
  const gridRef = useRef(grid)
  gridRef.current = grid

  // toggle grid dengan tombol G
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'g' || ev.key === 'G') setGrid(v => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // loop render (nanti jadi rumah untuk animasi)
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

  return (
    <div className="stage">
      <canvas
        ref={canvasRef}
        width={IW}
        height={IH}
        className="scene"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      />
      <div className="hud">
        <span>
          {hover
            ? `(e=${hover.e}, w=${hover.w}) · zona ${zoneName(hover.e, hover.w)}`
            : `ruangan ${ROOM.E}×${ROOM.W} tile · dinding ${ROOM.WALL_Z}z`}
        </span>
        <span className={grid ? 'on' : ''}>[G] grid {grid ? 'AKTIF' : 'off'}</span>
      </div>
    </div>
  )
}
