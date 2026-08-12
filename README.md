# MoodNahiHai

MoodNahiHai is a Vite/React music player with a Flask backend that resolves playlist metadata, audio streams, and lyrics at request time.

## Local development

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend:

```bash
cd backend
./venv/bin/python app.py
```

The frontend now calls relative `/api/*` endpoints in both local and deployed environments. For local development, keep the Flask server running so those routes are available.
Vite proxies `/api/*` requests to `http://127.0.0.1:5001` during `npm run dev`.

## Vercel deployment

This repo is configured for a single Vercel project:

- static frontend output comes from `frontend/dist`
- Python serverless handling comes from file-based functions in `api/`
- frontend and backend share the same origin in production

### GitHub auto-deploy flow

1. Push this repo to GitHub.
2. In Vercel, choose `Add New Project` and import the repository.
3. Keep the project root at the repository root.
4. Let Vercel use the checked-in `vercel.json`.
5. Deploy.

### Important project settings

- Framework preset: let Vercel auto-detect, or use `Other`
- Build command: provided by `vercel.json`
- Output directory: provided by `vercel.json`
- Python dependencies: installed from the root `requirements.txt`, which forwards to `backend/requirements.txt`

## Known limitations

- `/api/song` is the riskiest endpoint on Vercel because it depends on `yt-dlp` and external media resolution during a serverless request.
- `/api/lyrics` and `/api/playlist` also depend on live upstream responses from YouTube Music.
- Some deployed requests may be slower than local development, and occasional function failures are possible under serverless limits.
- This setup does not add caching, persistence, auth, or background jobs.
