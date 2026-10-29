# Isometric-launcher

## Dokumen

| Berkas | Isi |
|---|---|
| `docs/00-PRODUCT-PRD.md` | PRD produk |
| `docs/01-KONVENSI-RUANG.md` | konvensi ruang & sumbu |
| `docs/02-ARSITEKTUR-3D.md` | keputusan arsitektur 3D |
| `docs/03-SCENE-SCHEMA.md` | skema `scene.json` + seluruh perilaku editor |
| `docs/04-KONTRAK-RENDERER.md` | **kontrak renderer (normatif)** — web ⇄ APK |
| `docs/04-palet.json` | tabel warna beku untuk APK |

## Uji

```bash
cd prototype
npx tsc --noEmit
npx vite build
node tests/run-kontrak.mjs     # skema + katalog + urutan gambar
node tests/export-palet.mjs    # regenerasi docs/04-palet.json
```
