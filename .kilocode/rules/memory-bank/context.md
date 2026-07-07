# Active Context: Next.js Starter Template

## Current State

**Template Status**: ✅ Ready for development

The template is a clean Next.js 16 starter with TypeScript and Tailwind CSS 4. It's ready for AI-assisted expansion to build any type of application.

## Current State

**Status**: ✅ Converted to a standalone Android app

The Next.js 16 web app was wrapped into a native Android app using Capacitor 6. The web app is exported statically (`output: "export"`) into `out/` and loaded by a native Android WebView shell. A GitHub Action builds a signed release APK.

## Recently Completed

- [x] Base Next.js 16 setup with App Router
- [x] TypeScript configuration with strict mode
- [x] Tailwind CSS 4 integration
- [x] ESLint configuration
- [x] Memory bank documentation
- [x] Recipe system for common features
- [x] Configured Next.js for static export (`output: "export"`, `images.unoptimized`)
- [x] Added Capacitor 6 (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`)
- [x] Generated native Android project via `npx cap add android`
- [x] Built a standalone offline Notes app UI (localStorage persistence)
- [x] Added release APK signing config (env-var driven) in `android/app/build.gradle`
- [x] Created GitHub Action `.github/workflows/build-apk.yml` (builds signed release APK, uploads artifact)

## Current Structure

| File/Directory | Purpose | Status |
|----------------|---------|--------|
| `src/app/page.tsx` | Standalone Notes app (client) | ✅ Active |
| `src/app/layout.tsx` | Root layout (system fonts) | ✅ Active |
| `src/app/globals.css` | Global styles (Tailwind 4) | ✅ Ready |
| `capacitor.config.ts` | Capacitor config (webDir: out) | ✅ Active |
| `android/` | Native Android project (committed) | ✅ Active |
| `.github/workflows/build-apk.yml` | APK build CI | ✅ Active |

## Current Focus

Android app packaging is complete. The CI builds a signed release APK on every push/PR.

## Key Notes

- Web app must stay a static export (no server routes) for Capacitor.
- `npx cap sync android` copies `out/` into `android/app/src/main/assets/public`.
- Release signing reads `KEYSTORE_FILE`/`KEYSTORE_PASSWORD`/`KEY_ALIAS`/`KEY_PASSWORD` env vars; CI generates a debug keystore if none provided.

## Quick Start Guide

### To add a new page:

Create a file at `src/app/[route]/page.tsx`:
```tsx
export default function NewPage() {
  return <div>New page content</div>;
}
```

### To add components:

Create `src/components/` directory and add components:
```tsx
// src/components/ui/Button.tsx
export function Button({ children }: { children: React.ReactNode }) {
  return <button className="px-4 py-2 bg-blue-600 text-white rounded">{children}</button>;
}
```

### To add a database:

Follow `.kilocode/recipes/add-database.md`

### To add API routes:

Create `src/app/api/[route]/route.ts`:
```tsx
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Hello" });
}
```

## Available Recipes

| Recipe | File | Use Case |
|--------|------|----------|
| Add Database | `.kilocode/recipes/add-database.md` | Data persistence with Drizzle + SQLite |

## Pending Improvements

- [ ] Add more recipes (auth, email, etc.)
- [ ] Add example components
- [ ] Add testing setup recipe

## Session History

| Date | Changes |
|------|---------|
| Initial | Template created with base setup |
| 2026-07-07 | Converted to standalone Android app via Capacitor 6; added release APK GitHub Action |
