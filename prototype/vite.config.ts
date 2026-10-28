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
            if (!fs.existsSync(FILE)) {
              res.statusCode = 204
              res.end()
              return
            }
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Cache-Control', 'no-store')
            res.end(fs.readFileSync(FILE, 'utf8'))
            return
          }
          if (req.method === 'POST') {
            const body = await readBody(req)
            JSON.parse(body) // validasi: harus JSON sah
            fs.writeFileSync(FILE, body, 'utf8')
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

// Preview diakses lewat host proxy sandbox, jadi:
// - bind ke semua interface (0.0.0.0)
// - izinkan semua host header
export default defineConfig({
  plugins: [react(), sceneStore()],
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
