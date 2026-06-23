# pagecraft-frontend

React + Vite editor. Tiptap bound to the shared schema; live paged.js preview.
Depends on the shared model via the `model/` git submodule.

```bash
git submodule add <pagecraft-model repo url> model   # one-time
cp .env.example .env
npm install
npm run dev          # :5173, /api proxied to the backend (:4000)
```

## Components (all initialized; bodies stubbed where deferred)

| Component | Role |
|-----------|------|
| `Editor` | Tiptap on the shared schema → emits Tiptap JSON |
| `Preview` | live paged.js pagination of the current section (🚧 paged.js wiring) |
| `Toolbar` | constrained overrides: align / span / break-before / palette (🚧) |
| `ChapterNav` | section navigator, cover/toc stubs (🚧) |
| `ExportButton` | enqueue export job via backend |

`serialize` + `themeCss` come from `@pagecraft/model` — the exact code the
backend uses for the PDF, so the preview can't drift from the render.
