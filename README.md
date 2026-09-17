# Mission World Church

Astro produces the static website. Three.js renders the Blender-authored hero. The main project is this MWC folder.

## Develop

Install Node 22.12 or newer, then run `npm ci` and `npm run dev`. Use `npm run build` for the production output in `dist/`.

- `src/pages/index.astro`: content and accessible HTML.
- `src/styles/global.css`: layout, mobile spacing, and visual styles.
- `src/scripts/hero.js`: rotation, front-facing curved lettering, and particle dispersion.
- `src/scripts/motion.js`: native scroll progression, photo hover particles, and pause controls.
- `assets/blender/mission-world-hero.blend`: editable cross, flat ring, bold lettering masters, and geographic particle preview.
- `public/assets/`: only the exported assets needed by visitors.

## Blender asset pipeline

Run Blender in background mode with `--factory-startup --python scripts/build_hero_assets.py`. It generates the native scene, a preview, the shared GLB, glyph spacing metadata, and the binary geographic point layout. The cross source and typeface are preserved alongside the native file. The globe has 3,717 points; the browser animates their spread on the GPU without recalculating geography.

## Rendering

The first visible hero is the complete 3D assembly. Its meshes and particle data preload together. Curved letters share twelve prebuilt glyph geometries and remain upright. Reduced-motion and pause controls stop ambient animation. Hidden/offscreen scenes stop drawing; smaller devices start at a lower pixel density, with a further one-way adjustment for sustained slow frames. Mobile scrolling stays native, with the particle tail drawn across the transition into the next section.

`npm run build` bundles only the required Three.js modules and generates static HTML. No React runtime, server rendering process, or globe/font geometry generation is required on a visitor's phone. Real-device frame rates still depend on hardware and browser capabilities.

## Hosting

The existing owner-private Site is bound through `.openai/hosting.json`. Its static output directory is `dist`. Original church links continue to point to the official website.
