# ColorErase Studio

A modern, client-side React web app for removing a chosen color from images and exporting the result as PNG with transparency.

## Features

- **Upload** PNG/JPG images (drag & drop or click)
- **Eyedropper** — click anywhere on the image to pick a color
- **Color preview** — selected color shown with HEX and RGB
- **Remove color** — make all pixels matching the selected color (with tolerance) transparent
- **Tolerance slider** (0–100) — real-time preview; uses RGB distance for matching
- **Download** — export the edited image as PNG (with transparency)
- **Reset** — clear removal and reset to the original image
- **UI** — pastel theme, glassmorphism, Framer Motion animations, toasts, particle background

## Tech stack

- React 18 (Vite)
- Tailwind CSS
- Framer Motion
- Lucide React
- HTML5 Canvas API (no backend)

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Build

```bash
npm run build
npm run preview
```

## Project structure

- `src/components/` — ImageUploader, CanvasEditor, ColorPreviewPanel, ControlsPanel, Toast, ParticleBackground
- `src/utils/colorUtils.js` — HEX/RGB conversion and tolerance-based color matching (RGB distance)
- `src/hooks/useToast.js` — toast notifications
