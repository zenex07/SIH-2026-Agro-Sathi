AgroSaarthi – Farmer Intelligence Platform
AgroSaarthi is an offline‑aware, multilingual farmer workspace designed to help smallholder farmers manage crop observations, market context, and farm‑to‑market readiness.
It brings together farm records, field photos, mandi signals, and harvest planning into one secure, farmer‑owned workspace.

🔗 Live Demo: AgroSaarthi App

✨ Key Features
Farmer‑first workspace – Manage multiple plots with private map pins, crop records, and irrigation details.

Crop diagnosis – Upload or capture leaf photos; receive cautious, evidence‑based advisory with escalation to experts.

Market intelligence – Latest mandi signals from CEDA, transparent seven‑day price baselines, and yield‑window planning.

Harvest briefs – Record expected harvest date, quantity, and notes; discover nearby mandi, buyers, storage, and transport.

Voice & multilingual support – English, Hindi, Marathi, and Hinglish transcription; offline cache for low‑connectivity use.

Privacy by design – Exact farm coordinates remain private; advisory framed with uncertainty and source visibility.

🛠️ Technical Architecture
Frontend: React 19, Vite/esbuild, responsive farmer‑centric UI

Backend: Express/tRPC server, OAuth authentication, Zod validation

Persistence: MySQL/TiDB‑compatible database, secure object storage

AI & Intelligence Services:

Gemini‑powered Saarthi contextual companion

Image triage for visible disease signals

CEDA market trend baseline

Speech‑to‑text transcription

External Integrations: CEDA Agri Market Data, Google Maps/Places proxy

📂 Data Model & Privacy
Entity	Purpose	Privacy Boundary
User	OAuth identity & role context	Session‑scoped
Farm	Crop, area, irrigation, private map pin	Owner‑scoped
Diagnosis	Photo reference, visible signs, confidence	Owner‑scoped
Harvest Intent	Expected date, quantity, notes	Owner‑scoped
Preferences	Language, theme, cached advisory	Browser‑local


🔒 Privacy Rule: Saarthi companion receives only minimal context (farm, crop, market source/date, diagnosis status). No full screen capture or unnecessary coordinates are shared.

🚜 Farmer Workflows
Today: Quick farm overview and next action

Diagnose: Capture or upload crop photos for advisory

Market: Read latest mandi signals with source/date

Field Intelligence: Seven‑day price baseline, harvest‑window, offline guidance

My Farms: Create/edit multiple farm records

Settings: Language/theme preferences, secure sign‑out

Saarthi Companion: Contextual AI assistant available across screens

🔧 Local Development
bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# After schema changes
pnpm drizzle-kit generate
pnpm db:push

# Quality gates
pnpm check
pnpm test
pnpm build
Environment Variables
Variable	Purpose
DATABASE_URL	MySQL/TiDB persistence
OAuth_*	Secure sign‑in/session flow
BUILT_IN_FORGE_API_URL / BUILT_IN_FORGE_API_KEY	Storage & transcription
GEMINI_API_KEY	Saarthi contextual companion (server‑side only)
Frontend Forge/Maps	Google Maps/Places proxy


✅ Quality Assurance
Type safety: TypeScript validation passes

Unit tests: OAuth logout, crop‑companion fallback, CEDA normalization, audio parsing, Gemini credential validation

Production build: Verified with Vite/esbuild

Responsive review: Mobile farmer entry/home experience tested

📅 Roadmap
Field Pilot: Signed‑in farmer tests on low‑bandwidth devices

Agronomy Hardening: Validate disease‑signal prompts with experts

Market Expansion: Connect official state/mandi sources

Verified Commerce: Consent‑based buyer, transporter, storage directories

Offline Resilience: Service‑worker backed offline pack

📖 References
CEDA Agri Market Data (agmarknet.ceda.ashoka.edu.in in Bing)

data.gov.in – Daily mandi prices (data.gov.in in Bing)

Google Maps Platform (developers.google.com in Bing)

Gemini API Docs

📝 License
This project is developed under the Smart India Hackathon 2026 initiative.
All farmer data remains private, owner‑scoped, and secure.
