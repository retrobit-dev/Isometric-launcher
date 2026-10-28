import { useEffect, useRef, useState } from 'react'
import {
  CAM, IH, IW,
  setCenter, setZoom, unpx, zoomValue, zoneName,
} from './iso/space'
import { drawScene } from './iso/room'
import { bboxOf, sortedObjects } from './iso/box'
import { FLOOR_DEFAULT, FLOOR_KEYS, MATERIAL_KEYS, WALL_STYLE_KEYS } from './iso/palette'
import { loadCandidates, loadDraft, loadLocked, loadSceneFile, saveDraftGuarded, saveLocked, saveSceneFile, storageWorks, validateScene } from './scene/store'
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
  // preview SELALU dibuka dalam mode LIHAT (permintaan user 2026-10-28);
  // mode EDIT hanya aktif setelah user mengetuk tombol MODE.
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
  // status penyimpanan: 'browser' (localStorage jalan) atau 'file' (cadangan
  // di server dev) — ditampilkan di chip supaya user tahu data aman atau tidak
  const [simpan, setSimpan] = useState<'browser' | 'file'>('browser')
  const [panelDirty, setPanelDirty] = useState(false) // perubahan panel editor belum disimpan eksplisit
  const [dimuat, setDimuat] = useState(false)
  // KLIK OBJEK = HANYA INFO (permintaan user 2026-10-28: "objek dipilih dari
  // tombol objek, klik objek hanya memberi informasi nama objek").
  // Klik di kanvas tidak lagi memilih / menggeser objek apa pun.
  const [info, setInfo] = useState<{ id: string; sx: number; sy: number } | null>(null)

  // ---- RIWAYAT UNDO / REDO (permintaan user 2026-10-28) -------------------
  // Setiap perubahan scene dicatat. Perubahan beruntun (mis. mengetik angka
  // atau tombol +/- ditekan cepat) digabung jadi SATU langkah memakai jeda
  // 350 ms, supaya undo tidak perlu ditekan puluhan kali.
  const pastRef = useRef<Scene[]>([])
  const futureRef = useRef<Scene[]>([])
  const prevSceneRef = useRef<Scene | null>(null)
  const pendingBaseRef = useRef<Scene | null>(null)
  const histTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipHistRef = useRef(false)
  const [histVer, setHistVer] = useState(0)   // pemicu render tombol
  // jumlah objek yang dipulihkan dari file server saat aplikasi dibuka
  const [dipulihkan, setDipulihkan] = useState<number | null>(null)

  const sceneRef = useRef(scene); sceneRef.current = scene
  const modeRef = useRef(mode); modeRef.current = mode
  const lockedRef = useRef(locked); lockedRef.current = locked
  const selRef = useRef(selectedId); selRef.current = selectedId
  // ketukan di kanvas: hanya untuk menampilkan INFO objek (tidak memilih,
  // tidak menggeser). Geser objek dilakukan dari panel editor (angka e/w).
  const tapRef = useRef<{ id: string | null; sx: number; sy: number } | null>(null)
  const panRef = useRef<{ ce: number; cw: number; ge: number; gw: number; moved: boolean } | null>(null)
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchRef = useRef<{ d0: number; q0: number } | null>(null)

  // catat riwayat setiap kali scene berubah (kecuali perubahan hasil undo/redo)
  useEffect(() => {
    const prev = prevSceneRef.current
    prevSceneRef.current = scene
    if (prev === null || prev === scene) return
    if (skipHistRef.current) { skipHistRef.current = false; return }
    if (pendingBaseRef.current === null) pendingBaseRef.current = prev
    if (histTimerRef.current) clearTimeout(histTimerRef.current)
    histTimerRef.current = setTimeout(() => {
      const base = pendingBaseRef.current
      pendingBaseRef.current = null
      if (!base) return
      pastRef.current.push(base)
      if (pastRef.current.length > 80) pastRef.current.shift()
      futureRef.current = []
      setHistVer(v => v + 1)
    }, 350)
  }, [scene])

  /** simpan perubahan yang masih tertunda sebelum undo/redo */
  const flushHist = () => {
    if (histTimerRef.current) { clearTimeout(histTimerRef.current); histTimerRef.current = null }
    const base = pendingBaseRef.current
    pendingBaseRef.current = null
    if (base) {
      pastRef.current.push(base)
      if (pastRef.current.length > 80) pastRef.current.shift()
    }
  }

  const doUndo = () => {
    flushHist()
    const target = pastRef.current.pop()
    if (!target) return
    futureRef.current.push(sceneRef.current)
    skipHistRef.current = true
    setScene(target)
    setSelectedId(null)
    setHistVer(v => v + 1)
  }

  const doRedo = () => {
    flushHist()
    const target = futureRef.current.pop()
    if (!target) return
    pastRef.current.push(sceneRef.current)
    skipHistRef.current = true
    setScene(target)
    setSelectedId(null)
    setHistVer(v => v + 1)
  }

  // REFRESH: kembalikan kamera ke acuan x1 di (0,0) — zoom & pusat
  const refreshKamera = () => {
    setZoom(1)
    setCenter(0, 0)
    forceZoomLabel(v => v + 1)
  }

  // autosave: localStorage (cepat) + file server (tahan restart browser)
  useEffect(() => {
    saveDraftGuarded(scene)
    setSimpan(storageWorks() ? 'browser' : 'file')
    const t = setTimeout(() => { void saveSceneFile(scene) }, 600)
    return () => clearTimeout(t)
  }, [scene])

  // SAAT DIBUKA: kalau draf browser kosong/tidak ada, ambil dari file server.
  // Ini yang membuat objek tidak lagi hilang setelah browser ditutup.
  useEffect(() => {
    let batal = false
    void (async () => {
      const dariFile = await loadSceneFile()
      if (batal) return
      const lokal = sceneRef.current
      // pakai file hanya bila isinya lebih lengkap (jangan menimpa kerja lokal)
      if (dariFile && dariFile.objects.length > lokal.objects.length) {
        setUndo({ scene: lokal, label: 'scene sebelum dimuat dari file' })
        setLocked(false)
        setScene(dariFile)
        setDipulihkan(dariFile.objects.length)
      }
      setDimuat(true)
    })()
    return () => { batal = true }
    // hanya sekali saat aplikasi dibuka
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ganti objek terpilih = mulai hitungan "belum disimpan" dari nol
  useEffect(() => { setPanelDirty(false) }, [selectedId])

  // info objek hilang sendiri setelah 4 detik
  useEffect(() => {
    if (!info) return
    const t = setTimeout(() => setInfo(null), 4000)
    return () => clearTimeout(t)
  }, [info])

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

  const patchObject = (id: string, patch: Partial<SceneObject>) => {
    setScene(s => ({ ...s, objects: s.objects.map(o => (o.id === id ? { ...o, ...patch } : o)) }))
    setPanelDirty(true) // ada perubahan di panel editor objek yang belum disimpan eksplisit
  }

  // SIMPAN di panel editor objek: tulis draf ke browser + file SEKARANG (tanpa menunggu
  // autosave 600 ms) dan catat satu langkah riwayat. Tidak mengunci scene.
  const simpanPanel = () => {
    const s = sceneRef.current
    flushHist()
    saveDraftGuarded(s)
    setSimpan(storageWorks() ? 'browser' : 'file')
    void saveSceneFile(s)
    setPanelDirty(false)
  }

  const toInternal = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = ev.currentTarget.getBoundingClientRect()
    return {
      sx: ((ev.clientX - rect.left) * IW) / rect.width,
      sy: ((ev.clientY - rect.top) * IH) / rect.height,
    }
  }

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
    // jari kedua turun = mulai pinch-zoom, batalkan pan
    if (pointersRef.current.size === 2) {
      const [p1, p2] = [...pointersRef.current.values()]
      pinchRef.current = {
        d0: Math.hypot(p1.x - p2.x, p1.y - p2.y),
        q0: CAM.Q,
      }
      tapRef.current = null
      panRef.current = null
      ev.currentTarget.setPointerCapture(ev.pointerId)
      return
    }

    const { sx, sy } = toInternal(ev)
    const g = unpx(sx, sy)
    // catat objek di bawah jari: kalau ternyata hanya KETUKAN (tidak diseret),
    // info objek ditampilkan saat jari dilepas. Klik TIDAK memilih objek.
    const hit = hitTest(sx, sy)
    tapRef.current = { id: hit ? hit.id : null, sx, sy }

    // seret di mana pun (termasuk di atas objek) = pan kamera
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
      tapRef.current = null
      panRef.current = null
      return // selesai pinch bukan ketukan
    }

    // KETUKAN (bukan seret): tampilkan info objek, JANGAN memilih/menggeser
    const tap = tapRef.current
    const panned = panRef.current?.moved === true
    if (tap && !panned) {
      setInfo(tap.id ? { id: tap.id, sx: tap.sx, sy: tap.sy } : null)
    }
    tapRef.current = null
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
        pos: { ...src.pos, e: snap(src.pos.e + 1), w: snap(src.pos.w + 1) },
        // salinan berdiri sendiri: lepas dari grup & dari kunci objek asal
        grup: undefined,
        kunci: undefined,
        // permintaan user 2026-10-28: hasil duplikat SELALU layer overlay
        // supaya langsung terlihat di atas objek lain
        layer: 'overlay',
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

  // SUB-FOLDER: pindahkan objek bercetang menjadi grup BARU di dalam folder `induk`.
  // Karena selalu membuat grup baru, tidak mungkin terjadi siklus (folder
  // menjadi induk dirinya sendiri).
  const addSubGroup = (induk: string) => {
    if (multi.length === 0) return
    const gid = `grup-${Date.now().toString(36).slice(-4)}`
    const namaInduk = sceneRef.current.objects.find(o => o.grup === induk)?.grupNama ?? induk
    const n = sceneRef.current.objects.filter(o => o.grupInduk === induk).length + 1
    setScene(s => ({
      ...s,
      objects: s.objects.map(o =>
        multi.includes(o.id)
          ? { ...o, grup: gid, grupNama: `${namaInduk} / SUB ${n}`, grupInduk: induk }
          : o),
    }))
    setMulti([])
    setShowList(true)
  }

  // keluarkan folder ini dari induknya (jadi folder tingkat atas)
  const detachGroup = (gid: string) => {
    setScene(s => ({
      ...s,
      objects: s.objects.map(o => (o.grup === gid ? { ...o, grupInduk: undefined } : o)),
    }))
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

  void histVer // tombol UNDO/REDO memakai histVer sebagai pemicu render
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
            {dipulihkan !== null && (
              <div className="orestore">
                <span>scene dipulihkan dari file ({dipulihkan} objek)</span>
                <button className="sbtn" onClick={() => setDipulihkan(null)}>OK</button>
              </div>
            )}
            {info && (() => {
              const o = scene.objects.find(x => x.id === info.id)
              if (!o) return null
              const peran = o.role === 'lantai'
                ? 'lantai'
                : o.role === 'dinding'
                  ? `dinding ${o.side ?? 'kiri'}`
                  : 'balok'
              return (
                <div
                  className="oinfo"
                  style={{
                    left: `${(info.sx / IW) * 100}%`,
                    top: `${(info.sy / IH) * 100}%`,
                  }}
                >
                  <b>{o.label || o.id}</b>
                  <span>{peran} · {o.size.e}×{o.size.w}×{o.size.z}</span>
                  <span>e {o.pos.e} · w {o.pos.w} · z {o.pos.z}</span>
                  <em>pilih objek lewat tombol OBJEK</em>
                </div>
              )
            })()}
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
                <span className={simpan === 'browser' ? 'on' : ''}>
                  {dimuat
                    ? simpan === 'browser' ? 'simpan: browser + file' : 'simpan: file saja (browser diblokir)'
                    : 'memuat…'}
                </span>
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
            <button
              className={showList ? 'tbtn on' : 'tbtn'}
              onClick={() => setShowList(v => !v)}
              title="daftar semua objek yang sudah dibuat — ketuk untuk memilih"
            >
              OBJEK {scene.objects.length}
            </button>
          </>
        )}
        <button
          className="tbtn"
          disabled={pastRef.current.length === 0 && pendingBaseRef.current === null}
          onClick={doUndo}
          title="batalkan perubahan terakhir (URUNGKAN / undo)"
        >
          ↶ UNDO
        </button>
        <button
          className="tbtn"
          disabled={futureRef.current.length === 0}
          onClick={doRedo}
          title="ulangi perubahan yang dibatalkan (redo)"
        >
          ↷ REDO
        </button>
        <button
          className="tbtn"
          onClick={refreshKamera}
          title="kembalikan kamera ke zoom x1 di titik (0,0)"
        >
          ⟳ REFRESH
        </button>
        <button className="tbtn" onClick={() => { setImportText(exportJSON()); setModal('export') }}>EXPORT</button>
        <button className="tbtn" onClick={() => { setImportText(''); setModal('import') }}>IMPORT</button>
        {!locked && <button className="tbtn on" onClick={lockScene}>💾 SIMPAN & KUNCI</button>}
      </div>

      {editable && selected && (
        <EditPanel
          obj={selected}
          dirty={panelDirty}
          onSave={simpanPanel}
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
          onAddSub={gid => addSubGroup(gid)}
          onDetachGroup={gid => detachGroup(gid)}
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
