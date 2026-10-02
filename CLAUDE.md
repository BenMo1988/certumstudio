@AGENTS.md

# Certum Studio

## Wat het is

Certum Studio is de **interne cockpit van Bureau Certum** voor het ontwikkelen van professionele
trainingen en praktijksimulaties met behulp van AI. De gebruiker is de beheerder (Mohamed).

Het is **niet**:

- de publieke website van Bureau Certum;
- het LMS / de leeromgeving voor cursisten;
- onderdeel van het BC Online-project. Certum Studio staat volledig los daarvan: geen gedeelde code, config of dependencies.

## Doel

Vanuit één eenvoudige omgeving kan de beheerder:

1. een nieuwe training starten;
2. een praktijkcasus invoeren;
3. een bestaande training openen;
4. (later) de **Certum Training Agent** gebruiken om input om te zetten in een complete praktijksimulatie.

## Methodiek

Elke training volgt de kernmethodiek van Bureau Certum, in deze volgorde:

**Context → Actie → Reflectie → Feedback → Bron → Toets**

Bron van waarheid in code: `src/knowledge/methodology.ts`. Definieer de stappen nergens anders opnieuw.

## Certum Training Agent (toekomst)

Verwerkt drie soorten input: een **onderwerp**, een **praktijkvraag** of een **geanonimiseerde praktijkcasus**.
Werkwijze: eerst de input analyseren en het **professionele dilemma** en het **leerdoel** bepalen, en pas
daarna de training opbouwen. Types staan in `src/modules/training-agent/types.ts`.

## Werkwijze

- **Stap voor stap.** Bouw alleen wat de huidige stap vraagt. Geen over-engineering.
- **Geen multi-agentarchitectuur.** Eén agent, eenvoudig gehouden.
- Is iets architectonisch onduidelijk? **Meld het eerst** en kies niet zelf een complexe oplossing.
- Weinig dependencies. Voeg een package alleen toe als het duidelijk iets oplevert, en benoem het.
- **Commit op logische momenten**: na elke afgeronde, werkende stap (lint en build groen). Gebruik Conventional Commits
  (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`). Push alleen na akkoord.
- Casussen zijn altijd geanonimiseerd. Sla geen herleidbare persoonsgegevens op.

## Techniek

- Next.js (App Router), TypeScript (strict), Tailwind CSS v4, `src/`-structuur, npm.
- Let op: dit is Next.js 16. Raadpleeg `node_modules/next/dist/docs/` voordat je framework-API's gebruikt (zie AGENTS.md).
- Importeer via de alias `@/` (verwijst naar `src/`).

## Architectuur

```
src/
  app/                 Routes en pagina's (alleen routing en compositie, geen domeinlogica)
  components/
    studio/            UI-componenten van de studio-interface
  modules/             Domein, per onderdeel
    trainings/         Trainingsprojecten
    cases/             Praktijkcasussen
    training-agent/    Certum Training Agent (nu alleen types)
  knowledge/           Certum-kennis en methodiek
  services/            Externe koppelingen (AI-provider, opslag, LMS), elk achter een interface
```

Regels:

- **Scheid UI, domein en externe koppelingen.** Componenten en pagina's roepen modules aan. Modules gebruiken
  services via een interface. Een pagina of component praat nooit rechtstreeks met een AI-SDK of database.
- AI-provider (bijv. Anthropic), database, externe leeromgeving, API's en MCP-tools komen later in `services/`.
  Zo blijft de provider of opslag te vervangen zonder de UI aan te passen.
- API-sleutels en secrets alleen server-side (`.env.local`, nooit committen, nooit in client components).
- Domeintaal is Nederlands (training, casus, praktijkvraag, leerdoel). Code-identifiers mogen Engels zijn, zoals nu.

## Visuele richting

Professioneel, rustig en premium: een **werktool**, geen typisch AI-dashboard.

- Veel witruimte, sterke typografie, overzichtelijk en efficiënt.
- **Petrolblauw** is het enige accent (tokens `petrol-*` in `src/app/globals.css`). Verder neutrale grijzen.
- Geen gradients, glow-effecten of futuristische franje.
- Gebruik de tokens (`ink`, `muted`, `line`, `surface`, `canvas`, `petrol-*`), geen losse hexwaarden in componenten.

## Status

Stap 1, de technische fundering, is klaar. Er is nog geen AI-agent, database, authenticatie of externe koppeling.

## Commando's

- `npm run dev`: lokaal starten (http://localhost:3000)
- `npm run build`: productiebuild
- `npm run lint`: ESLint
