# Assets requeridos en /public

Esta carpeta debe contener tres archivos binarios que **no** se incluyen en el repo (los agregas tú):

## 1. notification.mp3
Sonido corto (1–2 segundos) que suena en la pantalla de Cocina cuando llega un pedido nuevo.
- Recursos gratuitos: https://pixabay.com/sound-effects/search/notification/
- Coloca el archivo como `public/notification.mp3`

## 2. icon-192.png  (192×192 px)
Ícono PWA para Android/Chrome. Fondo emerald (#059669) recomendado.

## 3. icon-512.png  (512×512 px)
Ícono PWA grande, mismo diseño. Necesario para instalación en pantalla de inicio.

## Generador rápido
Puedes generar los íconos con https://realfavicongenerator.net partiendo de un SVG/PNG cuadrado de tu logo.

Si Vercel devuelve 404 sobre estos archivos, simplemente súbelos a `/public/` y haz redeploy.
