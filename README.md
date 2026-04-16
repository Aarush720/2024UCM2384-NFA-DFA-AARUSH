# Aurelia - NFA to DFA Visualizer

Interactive educational visualizer for NFA to DFA subset construction, with guided step insight and live word tracing.

## Prerequisites

- Node.js 20+

## Local Development

1. Install dependencies:
   `npm ci`
2. Start dev server:
   `npm run dev`
3. Open:
   `http://localhost:3000`

## Quality Checks

- Typecheck: `npm run typecheck`
- Production build: `npm run build`

## Deploy to Vercel

This repo already includes [vercel.json](vercel.json) configured for Vite.

### Steps

1. Push repository to GitHub.
2. In Vercel, create a new project and import the repo.
3. Keep default settings from `vercel.json`:
   - Install command: `npm ci`
   - Build command: `npm run build`
   - Output directory: `dist`
4. Deploy.

No runtime secrets are required for the current app.
