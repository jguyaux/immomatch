# ImmoMatch

Application web immobilière belge qui utilise l'IA pour scorer et classer les biens en fonction des préférences personnelles de chaque utilisateur.

## Concept

1. **Questionnaire** — L'utilisateur remplit un profil de recherche : budget, zones géographiques, nombre de chambres, style de bien, score PEB, superficie, critères spécifiques (jardin, garage, proximité transports…)
2. **Scan quotidien** — Un job CRON scrape Immoweb chaque jour pour récupérer les nouvelles annonces correspondant aux zones ciblées
3. **Scoring IA** — Chaque bien est analysé et scoré par Claude (API Anthropic) selon le profil de l'utilisateur, avec une explication du score
4. **Dashboard** — L'utilisateur consulte ses matchs triés par pertinence, avec filtres et détails

## Stack technique

| Couche | Technologie |
|--------|------------|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Base de données | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Scoring IA | API Claude (Anthropic) |
| Scraping | Job CRON Node.js |

## Structure du projet

```
immomatch/
├── client/                  # Frontend React
│   ├── public/
│   └── src/
│       ├── components/      # Composants React
│       │   ├── auth/        # Login, Register
│       │   ├── questionnaire/ # Formulaire de critères
│       │   ├── dashboard/   # Vue principale
│       │   ├── properties/  # Cards et détails de biens
│       │   ├── layout/      # Header, Sidebar, Footer
│       │   └── ui/          # Composants réutilisables
│       ├── pages/           # Pages/routes
│       ├── hooks/           # Custom hooks
│       ├── services/        # Appels API
│       ├── utils/           # Helpers
│       ├── styles/          # CSS global
│       ├── context/         # React Context (auth, theme)
│       └── types/           # Types TypeScript
├── server/                  # Backend Express
│   ├── prisma/              # Schéma Prisma (optionnel, alt à Supabase client)
│   └── src/
│       ├── routes/          # Routes Express
│       ├── controllers/     # Logique des endpoints
│       ├── services/        # Logique métier (scraping, scoring)
│       ├── middleware/      # Auth, validation, error handling
│       ├── models/          # Types/interfaces DB
│       ├── jobs/            # CRON jobs (scan Immoweb)
│       ├── config/          # Configuration (env, supabase)
│       ├── utils/           # Helpers
│       └── types/           # Types partagés
└── shared/                  # Types partagés client/serveur
```

## Démarrage rapide

```bash
# 1. Cloner et installer
git clone <repo-url>
cd immomatch
npm install
npm --prefix client install
npm --prefix server install

# 2. Configurer les variables d'environnement
cp .env.example .env
# Remplir les clés Supabase et Anthropic

# 3. Lancer en développement
npm run dev
```

Le frontend tourne sur `http://localhost:5173` et le backend sur `http://localhost:3001`.

## Variables d'environnement

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_ANON_KEY` | Clé publique Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé admin Supabase (backend uniquement) |
| `ANTHROPIC_API_KEY` | Clé API Claude |
| `PORT` | Port du serveur Express (défaut: 3001) |

## Licence

Projet privé.
