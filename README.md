# Nana's 19th Birthday Site 🎉

## Folder structure
```
nana-birthday-site/
├── api/
│   └── rsvp.js          ← serverless API (reads/writes RSVPs)
├── public/
│   ├── index.html        ← main birthday site
│   └── admin.html        ← hidden guest list dashboard
├── vercel.json           ← routing config
├── package.json
└── README.md
```

## Deploy to Vercel (step by step)

### 1. Push to GitHub
- Go to github.com → New repository → name it `nana-birthday`
- Upload this entire folder (drag & drop all files keeping the folder structure)
- Commit

### 2. Deploy on Vercel
- Go to vercel.com → Add New → Project
- Import your GitHub repo
- Click Deploy — Vercel auto-detects everything

### 3. Add Vercel KV (free database for RSVPs)
- In your Vercel dashboard → go to your project → Storage tab
- Click "Create Database" → choose KV (Key-Value)
- Name it `nana-rsvps` → Create
- Click "Connect to Project" — this auto-adds the KV env vars

### 4. Set your admin password
- In Vercel → Project → Settings → Environment Variables
- Add: ADMIN_SECRET = your-chosen-password (e.g. nana2026!)
- Redeploy for it to take effect

### 5. Access your admin dashboard
- Visit: https://your-site.vercel.app/admin
- Enter the password you set as ADMIN_SECRET
- See all RSVPs in real time from any device

## Default password
The site currently uses ADMIN_SECRET from your Vercel env vars.
Never share your /admin URL publicly.
