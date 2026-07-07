# Mix R Fusion

Salon color, inventory, formula, waste, and pricing app.

- **Stack:** React 18 + TypeScript + Vite, Tailwind, shadcn/ui, Supabase
- **Deploy:** Vercel (auto-deploys from this repo main branch)
- **Docs & decisions:** see the Obsidian vault (AI Brain Operating Manual)

## Local development

npm install
npm run dev

## Database

Migrations live in supabase/migrations/ and are applied via the Supabase
dashboard SQL editor. Edge functions deploy via supabase functions deploy.
