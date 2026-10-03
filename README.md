# FeederBox · Simulador

Simulador 3D interactivo del ciclo completo de un dispensador automático de alimento para caballo (alimento, suplemento, líquido, pesado, compuerta y comedero), con una maqueta de la app del celular, horarios RTC y simulación de atasco con reversa.

**Abrir:** `https://pedro-mendoza1992.github.io/feederbox-simulator/`

- Es una página estática (`index.html`). Usa Three.js r128, incluido en `vendor/`, así que también funciona abriéndola desde el disco.
- Los tiempos, caudales y partículas son ilustrativos, no mediciones.
- Fuentes en `src/`. Para regenerar la página: `python3 src/build.py`.

## Publicar con GitHub Pages
Settings → Pages → Deploy from a branch → `main` → carpeta `/ (root)` → Save.

Three.js se distribuye bajo licencia MIT (`vendor/three.LICENSE.txt`).
