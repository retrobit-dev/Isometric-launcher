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
| `docs/04-palet-retro.json` | 32 warna **Endesga** + tangga nada + matriks Bayer (beku) |
| `docs/05-TEMA-DIORAMA-HANGAT.md` | aturan gaya diorama |
| `docs/07-PALET-REFERENSI.md` | sejarah palet 342 warna (dibatalkan ronde 38) |
| `docs/08-PALET-RETRO-DITHER.md` | **palet & dithering yang berlaku** (retro pixel-art) |

## Uji

```bash
cd prototype
npx tsc --noEmit
npx vite build
node tests/run-kontrak.mjs     # skema + katalog + urutan gambar
node tests/run-palet.mjs       # palet Endesga 32 + tangga nada + matriks Bayer
node tests/run-retro.mjs       # dithering wajib, tanpa campur warna/rgba
node tests/run-paritas.mjs     # langit & palet identik dengan render_scene.py
node ../tools/gen_palet.mjs    # regenerasi docs/04-palet*.json
```

Seluruh uji (16 suite): `kontrak tema animasi aset orbit ukuran palet rotasi
folder latar langit cuaca gaya pulihkan paritas retro`.
