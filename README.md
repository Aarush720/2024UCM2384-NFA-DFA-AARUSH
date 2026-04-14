<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/a09544ec-3cec-4b59-8263-3ad16354ad60

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy On Vercel

This project is configured for Vercel with [vercel.json](vercel.json):

- Framework: `vite`
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: `dist`

### Steps

1. Push this repo to GitHub.
2. In Vercel, click **New Project** and import the repository.
3. In Project Settings > Environment Variables, add:
   - `GEMINI_API_KEY` (same value you use locally)
4. Deploy.

No app behavior or UI changes are required for deployment.
