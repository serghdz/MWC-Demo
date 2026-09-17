# Mission World Church concept

A standalone homepage concept using the church's custom Blender cross, a geographic particle globe, scroll-driven particle text and photo reveals, and pointer/focus photo effects.

The site is in `dist/`. Serve that directory over HTTP. No framework build is required. The real church website is unchanged; existing church links open its connection, prayer and giving pages.

`hero.js` contains the Three.js scene; `motion.js` controls scroll reveals and photo interactions; `style.css` defines responsive layouts. A short native sticky interval starts the globe's particle dissolve before the hero scrolls away, without intercepting touch, wheel, or keyboard input. Scrolling back reverses the dissolve. The Pause motion button and operating-system reduced-motion setting disable ambient movement and skip this interval. Text remains normal accessible HTML.

The 3D modules, model, geography, and typeface are preloaded together. The first emblem shown during normal loading is the complete animated scene, with no static placeholder or crossfade. A static emblem is reserved for WebGL failure or disabled JavaScript. The orbiting name uses enlarged beveled 3D letters in a separate, unrotated scene group: only position and scale change, so every letter stays upright and faces forward throughout its orbit. Blue and green photo-hover particles stay within a soft cursor-following area.

The GLB was exported from the saved Blender model after sphere resizing and front-face alignment. Its metallic finish uses an environment-lit silver shader with fine procedural roughness. It is not an AI-generated replacement mesh.

Assets: church copy and photos from https://mymissionworld.org/ and its Ministries and Values pages; land outlines from Natural Earth (public domain); Three.js 0.160.1 (MIT license included). Fonts use Google Fonts. The site contains no analytics or data collection.

To integrate with WordPress, retain the scoped hero layout and module assets, load the import map before the hero module, and attach reveal attributes and photo classes to existing content. Review the theme's typography, spacing and script policies in staging before replacing the live homepage.
