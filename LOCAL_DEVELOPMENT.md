# Running AgroSaarthi Locally

AgroSaarthi keeps its **authentication screen and protected workspace** in the normal application flow. The project is designed to run with the same secure service configuration used by its managed environment.

## Start the app

Install dependencies, then run the development server:

```bash
pnpm install
pnpm dev
```

The application expects the environment variables supplied by the full-stack template. The important integration groups are listed below.

| Capability | Required configuration | Local behaviour without configuration |
|---|---|---|
| Sign-in and account records | `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL`, `OAUTH_SERVER_URL`, `JWT_SECRET`, `DATABASE_URL` | The sign-in screen remains available, but a protected account cannot be created or restored. |
| Farm records and diagnosis history | `DATABASE_URL` | The visual workspace loads only after sign-in; persistent farm data is unavailable without a database. |
| Crop-photo storage | `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` | Photo selection stays visible, but secure server-side storage needs the configured service. |
| Crop review and Saarthi companion | `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` | The assistant and photo review return careful connection-aware fallback guidance instead of fabricated results. |
| CEDA market signal | Outbound access to `https://agmarknet.ceda.ashoka.edu.in/` | The price card remains honest and displays its unavailable-data state if the source cannot be reached. |

The **language** and **theme** preferences use browser storage (`agrosaarthi-language` and `theme`) so they work locally without additional setup. English, Hindi, and Marathi can be changed inside **Settings**, and the selected theme is preserved across browser reloads.

> Do not commit a `.env` file or copy production credentials into source control. Use the platform’s secret-management interface or a secure local environment file that remains untracked.
