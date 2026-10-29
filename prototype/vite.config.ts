import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

/**
 * PENYIMPANAN SCENE DI SISI SERVER (khusus dev/preview)
 * ---------------------------------------------------------------------------
 * Kenapa perlu: localStorage di preview ini TIDAK bisa diandalkan.
 *   • localStorage terikat pada ORIGIN; host preview (`{port}-{sandbox}.e2b.app`)
 *     berubah ketika sandbox/port berganti -> data lama jadi tak terjangkau.
 *   • Preview dirender di dalam iframe; sebagian browser memblokir atau
 *     mempartisi storage pihak ketiga, sehingga setItem() melempar error.
 *   • Mode privat / "hapus data saat keluar" menghapus storage tiap restart.
 * Akibatnya objek "hilang" setiap browser ditutup, walau sudah disimpan.
 *
 * Solusi: simpan salinan scene ke file di workspace lewat endpoint:
 *   GET  /api/scene  -> { savedAt, scene } | 204
 *   POST /api/scene  -> simpan body JSON ke .isola-scene.json
 * File ini bertahan melewati restart browser DAN restart sandbox.
 */
function sceneStore(): Plugin {
  const FILE = path.resolve(__dirname, '.isola-scene.json')
  // SALINAN KEDUA (perbaikan 2026-10-29): file utama + cadangan ditulis
  // bersamaan. Keduanya TIDAK di-gitignore, jadi ikut snapshot workspace dan
  // ikut commit - scene selamat walau sandbox restart atau repo di-clone ulang.
  const CADANGAN = path.resolve(__dirname, 'scene-cadangan.json')

  const readBody = (req: any): Promise<string> =>
    new Promise((resolve, reject) => {
      let data = ''
      req.on('data', (c: Buffer) => {
        data += c.toString()
        if (data.length > 4_000_000) reject(new Error('terlalu besar'))
      })
      req.on('end', () => resolve(data))
      req.on('error', reject)
    })

  return {
    name: 'isola-scene-store',
    configureServer(server) {
      server.middlewares.use('/api/scene', async (req, res) => {
        try {
          if (req.method === 'GET') {
            // urutan pemulihan: file utama -> salinan cadangan
            const sumber = [FILE, CADANGAN].find(f => fs.existsSync(f))
            if (!sumber) {
              res.statusCode = 204
              res.end()
              return
            }
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Cache-Control', 'no-store')
            res.end(fs.readFileSync(sumber, 'utf8'))
            return
          }
          if (req.method === 'POST') {
            const body = await readBody(req)
            const parsed = JSON.parse(body) // validasi: harus JSON sah
            // PENGAMAN: scene KOSONG tidak boleh menimpa file yang masih berisi
            // objek (kecuali diminta eksplisit ?allowEmpty=1). Inilah yang
            // membuat objek tidak bisa "hilang" gara-gara draf browser kosong.
            const baru = Array.isArray(parsed?.scene?.objects) ? parsed.scene.objects.length : -1
            let lama = 0
            if (fs.existsSync(FILE)) {
              try {
                const old = JSON.parse(fs.readFileSync(FILE, 'utf8'))
                lama = Array.isArray(old?.scene?.objects) ? old.scene.objects.length : 0
              } catch { lama = 0 }
            }
            const allowEmpty = String(req.url ?? '').includes('allowEmpty=1')
            if (baru === 0 && lama > 0 && !allowEmpty) {
              res.statusCode = 409
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: false, kept: lama, reason: 'scene kosong ditolak' }))
              return
            }
            fs.writeFileSync(FILE, body, 'utf8')
            // salinan kedua: jaring pengaman kalau file utama rusak/terhapus
            try { fs.writeFileSync(CADANGAN, body, 'utf8') } catch { /* abaikan */ }
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end('{"ok":true}')
            return
          }
          res.statusCode = 405
          res.end('{"ok":false}')
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ ok: false, error: String(e) }))
        }
      })
    },
  }
}

/**
 * GAMBAR LATAR (background kanvas) — permintaan user 2026-10-29
 * ---------------------------------------------------------------------------
 * User membuat gambar ruangan sendiri (Paint / aplikasi lain) lalu memasangnya
 * sebagai LAPISAN LATAR kanvas. Gambar TIDAK disimpan di dalam scene.json:
 * base64 sebuah PNG 2560x1600 bisa 4-6 MB dan akan membengkakkan file scene,
 * localStorage, serta payload APK. Jadi gambarnya disimpan sebagai berkas
 * terpisah di workspace, dan scene hanya menyimpan penanda versi (token).
 *   GET    /api/latar      -> byte gambar (204 bila belum ada)
 *   POST   /api/latar      -> { dataUrl } -> simpan, balas { ok, token }
 *   DELETE /api/latar      -> hapus gambar
 * Saat APK dibuat nanti, berkas ini menjadi aset bawaan (assets/latar.png).
 */
function latarStore(): Plugin {
  const DIR = __dirname
  const INFO = path.resolve(DIR, '.isola-latar.json')
  const MAKS = 16 * 1024 * 1024 // 16 MB base64 (~12 MB gambar)

  const bacaBiner = (req: any): Promise<Buffer> =>
    new Promise((resolve, reject) => {
      const potongan: Buffer[] = []
      let total = 0
      req.on('data', (c: Buffer) => {
        total += c.length
        if (total > MAKS) { reject(new Error('gambar terlalu besar')); req.destroy(); return }
        potongan.push(c)
      })
      req.on('end', () => resolve(Buffer.concat(potongan)))
      req.on('error', reject)
    })

  const infoSekarang = (): { file: string; mime: string; token: string } | null => {
    try {
      if (!fs.existsSync(INFO)) return null
      const j = JSON.parse(fs.readFileSync(INFO, 'utf8'))
      const file = path.resolve(DIR, String(j.file))
      if (!fs.existsSync(file)) return null
      return { file, mime: String(j.mime || 'image/png'), token: String(j.token || '') }
    } catch { return null }
  }

  return {
    name: 'isola-latar-store',
    configureServer(server) {
      server.middlewares.use('/api/latar', async (req, res) => {
        try {
          if (req.method === 'GET') {
            const info = infoSekarang()
            if (!info) { res.statusCode = 204; res.end(); return }
            res.setHeader('Content-Type', info.mime)
            res.setHeader('Cache-Control', 'no-store')
            res.end(fs.readFileSync(info.file))
            return
          }
          if (req.method === 'DELETE') {
            const info = infoSekarang()
            if (info && fs.existsSync(info.file)) fs.unlinkSync(info.file)
            if (fs.existsSync(INFO)) fs.unlinkSync(INFO)
            res.statusCode = 200
            res.end('{"ok":true}')
            return
          }
          if (req.method === 'POST') {
            const body = (await bacaBiner(req)).toString('utf8')
            const j = JSON.parse(body)
            const url = String(j?.dataUrl ?? '')
            const m = /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(url)
            if (!m) {
              res.statusCode = 400
              res.end('{"ok":false,"error":"dataUrl tidak sah"}')
              return
            }
            const mime = m[1].toLowerCase()
            const ext = mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png'
            const buf = Buffer.from(m[2].replace(/\s/g, ''), 'base64')
            if (buf.length < 64) {
              res.statusCode = 400
              res.end('{"ok":false,"error":"gambar kosong"}')
              return
            }
            const nama = `.isola-latar.${ext}`
            // hapus gambar lama dengan ekstensi lain supaya tidak menumpuk
            for (const e of ['png', 'jpg', 'webp']) {
              const f = path.resolve(DIR, `.isola-latar.${e}`)
              if (e !== ext && fs.existsSync(f)) fs.unlinkSync(f)
            }
            fs.writeFileSync(path.resolve(DIR, nama), buf)
            const token = `latar-${Date.now().toString(36)}`
            fs.writeFileSync(INFO, JSON.stringify({ file: nama, mime, token, savedAt: new Date().toISOString(), bytes: buf.length }), 'utf8')
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, token, bytes: buf.length, mime }))
            return
          }
          res.statusCode = 405
          res.end('{"ok":false}')
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ ok: false, error: String(e) }))
        }
      })
    },
  }
}

// Preview diakses lewat host proxy sandbox, jadi:
// - bind ke semua interface (0.0.0.0)
// - izinkan semua host header
export default defineConfig({
  plugins: [react(), sceneStore(), latarStore()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
})
