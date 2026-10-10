# Shared 3D kit

- `three.module.min.js`: three.js r186 (npm `three@0.186.1`, MIT, see `LICENSE`), bundled into one minified ES module from `build/three.module.js`.
  Games import it by relative path, so the file works without `node_modules` in every build that serves these games
  (this repo's Vite build and the parent site's esbuild precompile step). Types come from the pinned `@types/three` dev dependency.
- `kit.ts` / `kit.css`: shared stage, loop, input, storage, sound and overlay helpers for the WebGL games.

Rebuild the vendored file when upgrading three.js:

```sh
npm pack three@<version> && tar xzf three-<version>.tgz
npx esbuild@0.21.5 package/build/three.module.js --bundle --minify --format=esm --target=es2020 --legal-comments=none \
  --banner:js="/** three.js r<rev> (<version>) | MIT License | Copyright 2010-2026 three.js authors | https://github.com/mrdoob/three.js */" \
  --outfile=src/shared/three/three.module.min.js
```

The current file was built with esbuild 0.21.5; the same version reproduces it byte for byte. Keep `@types/three` on the same release.
