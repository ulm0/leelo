# Favicon

El favicon de Leelo está diseñado para coincidir exactamente con el componente de la aplicación:

```html
<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">L</div>
```

## Características

- **Fondo**: Cuadrado púrpura con esquinas redondeadas (`#8D41F9`)
- **Texto**: "L" en blanco, negrita, centrada
- **Tamaño**: 32x32 píxeles
- **Formato**: SVG, PNG, ICO

## Generación

Para generar todos los favicons:

```bash
npm run generate-favicons
```

Esto creará:
- `favicon.svg` - Versión vectorial
- `favicon.png` - Versión PNG
- `favicon.ico` - Versión ICO
- Iconos PWA en múltiples tamaños
- `apple-touch-icon.png` para iOS
- `manifest.webmanifest` actualizado

## Archivos generados

- `public/favicon.svg` - Favicon principal
- `public/favicon.png` - Versión PNG
- `public/favicon.ico` - Versión ICO
- `public/icon-*.png` - Iconos PWA
- `public/apple-touch-icon.png` - Icono para iOS
- `public/mask-icon.svg` - Icono para Safari
- `public/manifest.webmanifest` - Manifest PWA 
