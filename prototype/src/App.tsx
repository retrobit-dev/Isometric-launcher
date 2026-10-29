import { useEffect, useRef, useState } from 'react'
import {
  CAM, IH, IW,
  fitToScene, putarKamera, setCenter, setYaw, setZoom, unpx, yawBersih, yawValue, zoomValue, zoneName,
} from './iso/space'
import { drawScene } from './iso/room'
import { bboxOf, sortedObjects } from './iso/box'
import { FLOOR_DEFAULT, FLOOR_KEYS, MATERIAL_KEYS, WALL_STYLE_KEYS } from './iso/palette'
import PresetPicker from './ui/PresetPicker'
import { muatAset, ukuranAset } from './scene/aset'
import { PRESETS as PRESETS_EDIT, PRESETS_PIXEL, buatPixel, buatPreset, presetPixelOf, type Preset, type PresetPixel } from './scene/presets'
import { LATAR_TAG, gabungLatar, geserTumpukan, hapusLatarImage, latarImageUrl, loadCandidates, loadDraft, loadLocked, loadSceneFile, normalisasiScene, objekBiasa, objekLatar, saveDraftGuarded, saveLatarImage, saveLocked, saveSceneFile, storageWorks, validateScene } from './scene/store'
import { type JenisAnim, type Scene, type SceneObject } from './scene/types'
import EditPanel from './ui/EditPanel'
import ObjectList from './ui/ObjectList'
import Confirm, { type ConfirmReq } from './ui/Confirm'

const DEV_RES_W = 2560
const BEZEL = 16


// ATURAN 32 PIKsel DIHAPUS (permintaan user 2026-10-29: "hapus aturan 32 piksel
// pada objek"): dulu semua posisi/ukuran dipaksa kelipatan 0.1 tile (= 3.2 px)
// karena 1 tile = 32 px. Sekarang bebas sampai 1/1000 tile (~0.02 px) supaya
// objek bisa diletakkan & diukur persis seperti referensi.
const snap = (v: number) => Math.round(v * 1000) / 1000

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
  const [showPreset, setShowPreset] = useState(false) // pemilih objek (+ TAMBAH)
  const [geserGrup, setGeserGrup] = useState<{ gid: string; nama: string } | null>(null)
  const [dimuat, setDimuat] = useState(false)
  // GAMBAR LATAR (background kanvas) — permintaan user 2026-10-29.
  // `gambarLatar` untuk memicu render ulang tombol; `latarRef` dibaca loop
  // gambar (rAF) supaya tidak perlu restart animation frame.
  const [gambarLatar, setGambarLatar] = useState<HTMLImageElement | null>(null)
  const [pesanLatar, setPesanLatar] = useState<string | null>(null)
  const latarRef = useRef<HTMLImageElement | null>(null)
  const fileLatarRef = useRef<HTMLInputElement>(null)
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
    setScene(gabungLatar(target, sceneRef.current)) // LATAR tidak ikut dibatalkan
    setSelectedId(null)
    setHistVer(v => v + 1)
  }

  const doRedo = () => {
    flushHist()
    const target = futureRef.current.pop()
    if (!target) return
    pastRef.current.push(sceneRef.current)
    skipHistRef.current = true
    setScene(gabungLatar(target, sceneRef.current)) // LATAR tidak ikut dibatalkan
    setSelectedId(null)
    setHistVer(v => v + 1)
  }

  // REFRESH: bingkai ulang diorama (seluruh ruangan masuk layar, di tengah)
  const refreshKamera = () => {
    setYaw(0) // kembali ke sudut acuan (grid 2:1 murni)
    fitToScene(sceneRef.current.objects)
    forceZoomLabel(v => v + 1)
  }

  // ORBIT KAMERA 15° (permintaan user 2026-10-29): putar seluruh diorama.
  // Objek tetap sejajar grid; di 0/90/180/270 tampilannya tetap tajam 2:1.
  const orbit = (langkah: number) => {
    putarKamera(langkah)
    forceZoomLabel(v => v + 1)
  }

  // pesan gambar latar hilang sendiri setelah 4 detik
  useEffect(() => {
    if (!pesanLatar) return
    const t = setTimeout(() => setPesanLatar(null), 4000)
    return () => clearTimeout(t)
  }, [pesanLatar])

  // GAMBAR LATAR: muat berkasnya setiap kali token versi berubah
  useEffect(() => {
    const token = scene.meta?.latarGambar
    if (!token) {
      latarRef.current = null
      setGambarLatar(null)
      return
    }
    const img = new Image()
    img.onload = () => { latarRef.current = img; setGambarLatar(img) }
    img.onerror = () => { latarRef.current = null; setGambarLatar(null) }
    img.src = latarImageUrl(token)
  }, [scene.meta?.latarGambar])

  // autosave: localStorage (cepat) + file server (tahan restart browser)
  // PENTING (perbaikan 2026-10-29): autosave baru jalan SETELAH boot selesai,
  // dan tiap simpan diberi cap waktu `meta.updatedAt`. Sebelum ini, tab lama
  // yang baru dibuka langsung menimpa file dengan scene usang dari localStorage
  // — akibatnya objek yang sudah dihapus (mis. 27 JENDELA lama) muncul kembali
  // dan menghapus pekerjaan terbaru.
  useEffect(() => {
    if (!dimuat) return
    const stamped: Scene = {
      ...scene,
      meta: {
        ...(scene.meta ?? { locked: false, savedAt: null }),
        updatedAt: new Date().toISOString(),
      },
    }
    saveDraftGuarded(stamped)
    setSimpan(storageWorks() ? 'browser' : 'file')
    const t = setTimeout(() => { void saveSceneFile(stamped) }, 600)
    return () => clearTimeout(t)
  }, [scene, dimuat])

  // SAAT DIBUKA: kalau draf browser kosong/tidak ada, ambil dari file server.
  // Ini yang membuat objek tidak lagi hilang setelah browser ditutup.
  useEffect(() => {
    let batal = false
    void (async () => {
      const dariFile = await loadSceneFile()
      if (batal) return
      const lokal = sceneRef.current
      // Pilih yang LEBIH BARU (cap waktu), bukan sekadar yang lebih banyak
      // objeknya: menghapus objek adalah perubahan yang sah dan harus menang.
      // Bila salah satu belum punya cap waktu (file lama), pakai jumlah objek.
      const capLokal = Date.parse(String(lokal.meta?.updatedAt ?? '')) || 0
      const capFile = Date.parse(String(dariFile?.meta?.updatedAt ?? '')) || 0
      const fileLebihBaru = (capFile > 0 || capLokal > 0)
        ? capFile > capLokal
        : (dariFile?.objects.length ?? 0) > lokal.objects.length
      if (dariFile && dariFile.objects.length > 0 && fileLebihBaru) {
        setUndo({ scene: lokal, label: 'scene sebelum dimuat dari file' })
        setLocked(false)
        const sc = gabungLatar(dariFile, lokal)
        // tidak ada salinan TERKUNCI -> scene ini draf, jangan bawa meta.locked lama
        setScene(loadLocked()
          ? sc
          : { ...sc, meta: { ...(sc.meta ?? { locked: false, savedAt: null }), locked: false } })
        setDipulihkan(dariFile.objects.length)
        // KOMPOSISI: seluruh diorama masuk bingkai (tema gambar referensi)
        fitToScene(sc.objects)
        forceZoomLabel(v => v + 1)
      }
      setDimuat(true)
    })()
    return () => { batal = true }
    // hanya sekali saat aplikasi dibuka
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ASET SPRITE (versi pixel): dimuat sekali saat aplikasi dibuka
  const [asetVer, setAsetVer] = useState(0)
  useEffect(() => {
    muatAset().then(() => setAsetVer(v => v + 1))
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
        latarGambar: latarRef.current,
        latarMode: sceneRef.current.meta?.latarMode ?? 'isi',
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
  const urutanTeratas = () =>
    sceneRef.current.objects.reduce((m, o) => Math.max(m, o.urutan ?? -1), -1) + 1

  // NAIKKAN / TURUNKAN: logikanya ada di scene/store.ts (geserTumpukan)
  const geser = (id: string, arah: 1 | -1) => {
    setScene(s => geserTumpukan(s, id, arah))
    setPanelDirty(true)
  }

  // ---- GAMBAR LATAR: pasang / ganti mode / hapus -------------------------
  const pasangGambarLatar = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const berkas = ev.target.files?.[0]
    ev.target.value = '' // supaya berkas yang sama bisa dipilih lagi
    if (!berkas) return
    if (!berkas.type.startsWith('image/')) { setPesanLatar('berkas ini bukan gambar'); return }
    if (berkas.size > 8 * 1024 * 1024) { setPesanLatar('gambar maksimal 8 MB'); return }
    const dataUrl = await new Promise<string>(res => {
      const r = new FileReader()
      r.onload = () => res(String(r.result ?? ''))
      r.onerror = () => res('')
      r.readAsDataURL(berkas)
    })
    if (!dataUrl) { setPesanLatar('gagal membaca gambar'); return }
    setPesanLatar('memasang gambar latar…')
    const token = await saveLatarImage(dataUrl)
    if (!token) { setPesanLatar('gagal menyimpan gambar latar'); return }
    setScene(s => ({
      ...s,
      meta: { ...(s.meta ?? { locked: false, savedAt: null }), latarGambar: token },
    }))
    setPesanLatar('gambar latar dipasang')
  }

  const gantiModeLatar = () => {
    setScene(s => ({
      ...s,
      meta: {
        ...(s.meta ?? { locked: false, savedAt: null }),
        latarMode: (s.meta?.latarMode ?? 'isi') === 'isi' ? 'muat' : 'isi',
      },
    }))
  }

  const hapusGambarLatar = async () => {
    await hapusLatarImage()
    setScene(s => ({
      ...s,
      meta: { ...(s.meta ?? { locked: false, savedAt: null }), latarGambar: null },
    }))
    setPesanLatar('gambar latar dihapus')
  }

  const addObject = () => {
    const n = sceneRef.current.objects.length + 1
    const id = `objek-${n}-${Date.now().toString(36).slice(-3)}`
    const obj: SceneObject = {
      id, label: `Objek ${n}`,
      pos: { e: 6, w: 6, z: 0 }, size: { e: 2, w: 1, z: 1 },
      style: 'wood', app: null, layer: 'main',
      // permintaan user 2026-10-29: objek baru otomatis di ATAS objek lain
      urutan: urutanTeratas(),
    }
    setScene(s => ({ ...s, objects: [...s.objects, obj] }))
    setSelectedId(id)
  }

  // TAMBAH PRESET: satu objek katalog = satu folder berisi beberapa balok
  const tambahPreset = (preset: Preset) => {
    const gid = `grup-${Date.now().toString(36).slice(-4)}`
    const idAwal = `${preset.id}-${Date.now().toString(36).slice(-3)}`
    const snap2 = (v: number) => Math.round(v * 1000) / 1000
    // objek dinding (jendela, papan gabus) otomatis menempel ke dinding latar
    // yang sesuai supaya tidak perlu digeser manual
    const dinding = sceneRef.current.objects.find(o =>
      o.role === 'dinding' && o.latar === true
      && o.side === (preset.pasang === 'dinding-kiri' ? 'kiri' : 'kanan'))
    let e = snap2(Math.max(0, CAM.CE - preset.lebar / 2))
    let w = snap2(Math.max(0, CAM.CW - preset.dalam / 2))
    if (dinding && preset.pasang === 'dinding-kanan') w = snap2(dinding.pos.w + dinding.size.w + 0.02)
    if (dinding && preset.pasang === 'dinding-kiri') e = snap2(dinding.pos.e + dinding.size.e + 0.02)
    const parts = buatPreset({
      preset, e, w, z: 0,
      grup: gid, nama: preset.nama,
      urutanAwal: urutanTeratas(), idAwal,
    })
    setScene(s => ({ ...s, objects: [...s.objects, ...parts] }))
    setSelectedId(parts[0]?.id ?? null)
    setShowPreset(false)
  }

  // TAMBAH VERSI PIXEL: satu objek berisi sprite potongan referensi
  const tambahPixel = (preset: PresetPixel) => {
    const gid = `grup-${Date.now().toString(36).slice(-4)}`
    const idAwal = `px-${preset.id}-${Date.now().toString(36).slice(-3)}`
    const snap2 = (v: number) => Math.round(v * 1000) / 1000
    const dinding = sceneRef.current.objects.find(o =>
      o.role === 'dinding' && o.latar === true
      && o.side === (preset.pasang === 'dinding-kiri' ? 'kiri' : 'kanan'))
    let e = snap2(Math.max(0, CAM.CE - preset.lebar / 2))
    let w = snap2(Math.max(0, CAM.CW - preset.dalam / 2))
    if (dinding && preset.pasang === 'dinding-kanan') w = snap2(dinding.pos.w + dinding.size.w + 0.02)
    if (dinding && preset.pasang === 'dinding-kiri') e = snap2(dinding.pos.e + dinding.size.e + 0.02)
    const parts = buatPixel({
      preset, e, w,
      grup: gid, nama: preset.nama,
      urutanAwal: urutanTeratas(), idAwal,
    })
    setScene(s2 => ({ ...s2, objects: [...s2.objects, ...parts] }))
    setSelectedId(parts[0]?.id ?? null)
    setShowPreset(false)
  }

  /**
   * GANTI VERSI: PIXEL <-> EDIT untuk satu folder objek (opsi C).
   * Titik tumpu dipertahankan: versi baru ditaruh di sudut kiri-belakang
   * pembungkus versi lama, jadi objek tidak melompat saat ditukar.
   */
  const gantiVersi = (id: string) => {
    const objek = sceneRef.current.objects
    const o = objek.find(x => x.id === id)
    if (!o) return
    const idPreset = o.preset
    if (!idPreset) {
      setPesanLatar('objek ini dibuat manual — tidak punya pasangan versi')
      return
    }
    const grup = o.grup ? objek.filter(x => x.grup === o.grup) : [o]
    const e0 = Math.min(...grup.map(x => x.pos.e))
    const w0 = Math.min(...grup.map(x => x.pos.w))
    const nama = (o.grupNama ?? o.label).replace(/^pixel: /, '')
    const lain = objek.filter(x => !grup.includes(x))

    if (o.sprite) {
      // PIXEL -> EDIT: bangun ulang preset parametrik
      const preset = PRESETS_EDIT.find(x => x.id === idPreset)
      if (!preset) { setPesanLatar('versi edit untuk objek ini belum ada'); return }
      const parts = buatPreset({
        preset, e: e0, w: w0, z: Math.max(0, o.pos.z - (presetPixelOf(idPreset)?.zAwal ?? 0)),
        grup: o.grup ?? o.id, nama: preset.nama,
        urutanAwal: o.urutan ?? 0, idAwal: `${idPreset}-ed`,
      })
      setScene(s2 => ({ ...s2, objects: [...lain, ...parts] }))
      setSelectedId(parts[0]?.id ?? null)
      setPesanLatar(`dibuka sebagai VERSI EDIT — ${parts.length} bagian bisa diubah`)
    } else {
      // EDIT -> PIXEL: ringkas satu folder menjadi satu sprite
      const preset = presetPixelOf(idPreset)
      if (!preset) { setPesanLatar('versi pixel untuk objek ini belum ada'); return }
      const parts = buatPixel({
        preset, e: e0, w: w0, z: o.pos.z,
        grup: o.grup ?? o.id, nama: preset.nama,
        urutanAwal: o.urutan ?? 0, idAwal: `px-${idPreset}`,
      })
      setScene(s2 => ({ ...s2, objects: [...lain, ...parts] }))
      setSelectedId(parts[0]?.id ?? null)
      setPesanLatar('diringkas ke VERSI PIXEL — persis referensi')
    }
  }

  // ANIMASI: siklus jenis & laju (permintaan user 2026-10-29)
  const URUT_ANIM: (JenisAnim | 'mati')[] = ['mati', 'naik-turun', 'ayun', 'denyut', 'kedip', 'putar']
  const ubahObjek = (id: string, fn: (o: SceneObject) => SceneObject) => {
    setScene(s => ({ ...s, objects: s.objects.map(o => (o.id === id ? fn(o) : o)) }))
    setPanelDirty(true)
  }
  const cycleAnim = (id: string) => {
    ubahObjek(id, o => {
      const kini = o.anim?.jenis ?? 'mati'
      const next = URUT_ANIM[(URUT_ANIM.indexOf(kini) + 1) % URUT_ANIM.length]
      if (next === 'mati') return { ...o, anim: undefined }
      return {
        ...o,
        anim: {
          jenis: next,
          laju: o.anim?.laju ?? 0.5,
          besar: o.anim?.besar ?? 1,
          fase: o.anim?.fase ?? 0,
        },
      }
    })
  }
  const cycleAnimLaju = (id: string) => {
    ubahObjek(id, o => {
      if (!o.anim) return o
      const urut = [0.25, 0.5, 1, 1.5, 2]
      const i = urut.indexOf(o.anim.laju ?? 0.5)
      const laju = urut[(i + 1) % urut.length]
      return { ...o, anim: { ...o.anim, laju } }
    })
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
        // duplikat selalu di ATAS objek lain (permintaan user 2026-10-29:
        // tumpukan diatur lewat `urutan`, bukan lagi memaksa layer overlay
        // yang akan mengunci salinan di paling atas selamanya)
        layer: 'main',
        urutan: urutanTeratas(),
      }],
    }))
    setSelectedId(nid)
  }

  // JADIKAN LATAR: objek bercetang dipindahkan ke lapisan background kanvas
  // (permintaan user 2026-10-29). Objek latar hilang dari DAFTAR OBJEK dan
  // tidak bisa diubah/dihapus sampai latar dibuka lagi.
  const jadikanLatar = () => {
    if (multi.length === 0) return
    const ids = new Set(multi)
    setScene(s => ({
      ...s,
      objects: s.objects.map(o => ids.has(o.id)
        ? { ...o, latar: true, grup: undefined, grupNama: undefined, grupInduk: undefined }
        : o),
      meta: { ...(s.meta ?? { locked: false, savedAt: null }), latarMigrasi: LATAR_TAG },
    }))
    setMulti([])
    setSelectedId(null)
  }

  // BUKA LATAR: semua objek latar kembali menjadi objek biasa (bisa diedit lagi)
  const bukaLatar = () => {
    setScene(s => ({
      ...s,
      objects: s.objects.map(o => (o.latar ? { ...o, latar: undefined } : o)),
      meta: { ...(s.meta ?? { locked: false, savedAt: null }), latarMigrasi: LATAR_TAG },
    }))
  }

  // GESER FOLDER: semua anggota grup (termasuk sub-folder) digeser bersama.
  // Permintaan user 2026-10-29 — memindahkan seluruh isi folder tanpa
  // menyentuh satu per satu.
  const geserFolder = (gid: string, de: number, dw: number, ikutSub: boolean) => {
    // kumpulkan gid + semua turunannya
    const semua: string[] = [gid]
    if (ikutSub) {
      let tambah = true
      while (tambah) {
        tambah = false
        for (const o of sceneRef.current.objects) {
          if (o.grupInduk && semua.includes(o.grupInduk) && o.grup && !semua.includes(o.grup)) {
            semua.push(o.grup)
            tambah = true
          }
        }
      }
    }
    setScene(sc => ({
      ...sc,
      objects: sc.objects.map(o => {
        if (!o.grup || !semua.includes(o.grup) || o.latar) return o
        if (o.kunci === 'semua' || o.kunci === 'warna') return o // objek terkunci tidak ikut
        return {
          ...o,
          pos: {
            ...o.pos,
            e: Math.round((o.pos.e + de) * 1000) / 1000,
            w: Math.round((o.pos.w + dw) * 1000) / 1000,
          },
        }
      }),
    }))
    setPanelDirty(true)
  }

  // HAPUS FOLDER: semua anggota grup (dan sub-folder) dihapus setelah konfirmasi
  const hapusFolder = (gid: string) => {
    const nama = sceneRef.current.objects.find(o => o.grup === gid)?.grupNama ?? 'folder'
    const kelompok = new Set<string>([gid])
    let tambah = true
    while (tambah) {
      tambah = false
      for (const o of sceneRef.current.objects) {
        if (o.grupInduk && kelompok.has(o.grupInduk) && o.grup && !kelompok.has(o.grup)) {
          kelompok.add(o.grup)
          tambah = true
        }
      }
    }
    const anggota = sceneRef.current.objects.filter(o => o.grup && kelompok.has(o.grup) && !o.latar)
    if (anggota.length === 0) return
    setConfirm({
      title: `KONFIRMASI HAPUS FOLDER`,
      lines: [
        `Hapus folder "${nama}" beserta ${anggota.length} objek di dalamnya?`,
        'termasuk objek di sub-folder',
        'tombol URUNGKAN muncul ±8 detik setelah dihapus',
      ],
      confirmLabel: `YA, HAPUS ${anggota.length} OBJEK`,
      danger: true,
      onConfirm: () => {
        const before = sceneRef.current
        setUndo({ scene: before, label: `folder ${nama}` })
        const ids = new Set(anggota.map(o => o.id))
        setScene(sc => ({ ...sc, objects: sc.objects.filter(o => !ids.has(o.id)) }))
        setSelectedId(null)
        setMulti([])
        setConfirm(null)
      },
    })
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
    // LATAR tidak ikut diganti oleh PULIHKAN
    setScene(gabungLatar(sc, sceneRef.current))
    setLocked(false)
    setSelectedId(null)
  }

  // TANYA DULU sebelum menghapus (permintaan user: jangan ada data hilang
  // tanpa peringatan). Dialog menyebut nama objek, peran, dan apakah dia
  // anggota grup / objek terakhir.
  const requestDelete = (id: string) => {
    const o = sceneRef.current.objects.find(x => x.id === id)
    if (!o) return
    if (o.latar) return // LATAR dilindungi: buka dulu lewat tombol BUKA LATAR
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
    // scene kembali menjadi DRAF: meta.locked dimatikan supaya EXPORT/APK
    // tidak mengira scene ini masih terkunci
    setScene(s => ({ ...s, meta: { ...(s.meta ?? { locked: false, savedAt: null }), locked: false } }))
    setLocked(false)
    setMode('edit')
  }

  // EXPORT/SALIN JSON juga dinormalisasi (kontrak renderer docs/04)
  const exportJSON = () => JSON.stringify(normalisasiScene(scene), null, 2)

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
      // LATAR tidak ikut diganti oleh IMPORT
      setScene(gabungLatar(parsed as Scene, sceneRef.current))
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
          'LATAR (background) tidak ikut terhapus — tetap dipertahankan',
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

  // posisi tumpukan objek (mis. "3 / 6") untuk ditampilkan di panel editor
  const tumpukanDari = (id: string): string => {
    const o = scene.objects.find(x => x.id === id)
    if (!o) return '-'
    const satu = scene.objects
      .filter(x => x.latar !== true && (x.layer ?? 'main') === (o.layer ?? 'main'))
      .sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0))
    const i = satu.findIndex(x => x.id === id)
    return `${i + 1} / ${satu.length}`
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
          <input
            ref={fileLatarRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={ev => void pasangGambarLatar(ev)}
          />
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
            {pesanLatar && (
              <div className="dipulihkan" style={{ top: 52 }}>
                <span>{pesanLatar}</span>
                <button className="sbtn" onClick={() => setPesanLatar(null)}>OK</button>
              </div>
            )}
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
                  <span>{peran}{o.latar ? ' · LATAR' : ''} · {o.size.e}×{o.size.w}×{o.size.z}</span>
                  <span>e {o.pos.e} · w {o.pos.w} · z {o.pos.z}</span>
                  <em>pilih objek lewat tombol OBJEK</em>
                </div>
              )
            })()}
            {(
              <div className="chip">
                <span>
                  {hover
                    ? `(e=${hover.e}, w=${hover.w}) · ${zoneName(hover.e, hover.w)}`
                    : `${objekBiasa(scene).length} perabot${objekLatar(scene).length ? ` · ${objekLatar(scene).length} latar` : ''}`}
                </span>
                <span className={locked ? 'on' : ''}>{locked ? `terkunci ${savedAt ?? ''}` : 'draf'}</span>
                <span className={simpan === 'browser' ? 'on' : ''}>
                  {dimuat
                    ? simpan === 'browser' ? 'simpan: browser + file' : 'simpan: file saja (browser diblokir)'
                    : 'memuat…'}
                </span>
                <span>{`kamera ×${zoomValue()} (${CAM.CE.toFixed(1)}, ${CAM.CW.toFixed(1)}) · ${yawValue()}°`}</span>
                {!yawBersih() && (
                  <span className="warn" title="pada sudut selain 0/90/180/270, ubin tidak lagi 2:1 (nat jadi bertangga). Tombol REFRESH mengembalikan ke 0°.">
                    orbit {yawValue()}° — grid bukan 2:1
                  </span>
                )}
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
            {mode === 'edit' && (
              <button className="tbtn" onClick={() => setShowPreset(true)} title="tambah objek: pilih dari katalog atau balok kosong">
                + TAMBAH
              </button>
            )}
            {mode === 'edit' && (
              <button
                className="tbtn"
                onClick={() => fileLatarRef.current?.click()}
                title="pasang gambar ruangan (hasil Paint) sebagai latar/background kanvas"
              >
                {gambarLatar ? '🖼 GANTI LATAR' : '🖼 LATAR'}
              </button>
            )}
            {mode === 'edit' && gambarLatar && (
              <button
                className="tbtn"
                onClick={gantiModeLatar}
                title="ISI = gambar memenuhi kanvas (terpotong) · MUAT = gambar utuh"
              >
                LATAR: {(scene.meta?.latarMode ?? 'isi').toUpperCase()}
              </button>
            )}
            {mode === 'edit' && gambarLatar && (
              <button className="tbtn" onClick={() => void hapusGambarLatar()} title="hapus gambar latar">
                ✕ LATAR
              </button>
            )}
            <button
              className={showList ? 'tbtn on' : 'tbtn'}
              onClick={() => setShowList(v => !v)}
              title="daftar semua objek yang sudah dibuat — ketuk untuk memilih"
            >
              OBJEK {objekBiasa(scene).length}{objekLatar(scene).length > 0 ? ` (+${objekLatar(scene).length} latar)` : ''}
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
          onClick={() => orbit(-1)}
          title="putar kamera 15° ke kiri (mengelilingi diorama)"
        >
          ⟲ 15°
        </button>
        <button
          className="tbtn"
          onClick={() => orbit(1)}
          title="putar kamera 15° ke kanan (mengelilingi diorama)"
        >
          15° ⟳
        </button>
        <button
          className="tbtn"
          onClick={() => orbit(6)}
          title="putar kamera 90° (tetap grid isometrik 2:1 yang tajam)"
        >
          90° ⟳
        </button>
        <button
          className="tbtn"
          onClick={refreshKamera}
          title="kembalikan kamera ke sudut acuan (0°) dan bingkai seluruh diorama"
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
              e: Math.round((selected.pos.e + de) * 1000) / 1000,
              w: Math.round((selected.pos.w + dw) * 1000) / 1000,
            },
          })}
          onResize={(de, dw, dz) => patchObject(selected.id, {
            size: {
              e: Math.max(0.01, Math.round((selected.size.e + de) * 1000) / 1000),
              w: Math.max(0.01, Math.round((selected.size.w + dw) * 1000) / 1000),
              z: Math.max(0.01, Math.round((selected.size.z + dz) * 1000) / 1000),
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
          onCycleAnim={() => cycleAnim(selected.id)}
          onCycleAnimLaju={() => cycleAnimLaju(selected.id)}
          onGantiVersi={() => gantiVersi(selected.id)}
          onRaise={() => geser(selected.id, 1)}
          onLower={() => geser(selected.id, -1)}
          tumpukan={tumpukanDari(selected.id)}
          onDuplicate={() => duplicateObject(selected.id)}
          onDelete={() => requestDelete(selected.id)}
          onClose={() => setSelectedId(null)}
        />
      )}

      {showList && (
        <ObjectList
          objects={objekBiasa(scene)}
          latarCount={objekLatar(scene).length}
          onSetLatar={jadikanLatar}
          onBukaLatar={bukaLatar}
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
          onRaise={id => geser(id, 1)}
          onLower={id => geser(id, -1)}
          onMoveGroup={gid => {
            const nama = scene.objects.find(o => o.grup === gid)?.grupNama ?? 'folder'
            setGeserGrup({ gid, nama })
          }}
          onDeleteGroup={gid => hapusFolder(gid)}
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

      {geserGrup && (
        <div className="modal" onClick={() => setGeserGrup(null)}>
          <div className="mcard geser" onClick={ev => ev.stopPropagation()}>
            <div className="mhead">
              <span>GESER FOLDER · {geserGrup.nama}</span>
              <button className="sbtn" onClick={() => setGeserGrup(null)}>✕</button>
            </div>
            <div className="phint">
              semua objek dalam folder (termasuk sub-folder) ikut bergeser; objek
              yang dikunci tidak ikut
            </div>
            {(
              [
                ['e', 'sumbu e (kanan-bawah)', -1, -0.1, 0.1, 1],
                ['w', 'sumbu w (kiri-bawah)', -1, -0.1, 0.1, 1],
              ] as const
            ).map(([sumbu, ket, m1, m01, p01, p1]) => (
              <div className="row" key={sumbu}>
                <span className="rl">{sumbu}</span>
                <button className="sbtn wide" onClick={() => geserFolder(geserGrup.gid, ...(sumbu === 'e' ? [m1, 0] : [0, m1]) as [number, number], true)}>−1</button>
                <button className="sbtn wide" onClick={() => geserFolder(geserGrup.gid, ...(sumbu === 'e' ? [m01, 0] : [0, m01]) as [number, number], true)}>−0.1</button>
                <button className="sbtn wide" onClick={() => geserFolder(geserGrup.gid, ...(sumbu === 'e' ? [p01, 0] : [0, p01]) as [number, number], true)}>+0.1</button>
                <button className="sbtn wide" onClick={() => geserFolder(geserGrup.gid, ...(sumbu === 'e' ? [p1, 0] : [0, p1]) as [number, number], true)}>+1</button>
              </div>
            ))}
            <div className="phint">untuk menggeser sub-folder saja, pakai ✥ pada baris sub-folder itu</div>
          </div>
        </div>
      )}

      {showPreset && (
        <PresetPicker
          onPick={pr => tambahPreset(pr)}
          onPickPixel={pr => tambahPixel(pr)}
          onBlank={() => { addObject(); setShowPreset(false) }}
          onClose={() => setShowPreset(false)}
        />
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
