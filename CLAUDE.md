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

## Certum Training Agent

Verwerkt drie soorten input: een **onderwerp**, een **praktijkvraag** of een **geanonimiseerde praktijkcasus**.

Vaste flow: **Input → Certum Analyse → menselijke keuze/goedkeuring → Training**

### Kernregels (niet onderhandelbaar)

- **Een input wordt nooit rechtstreeks een training.** Iedere training doorloopt eerst Certum Analyse en daarna
  de menselijke selectie en goedkeuring van een trainingsrichting.
- **Privacyblokkades worden nooit omzeild, niet door AI en niet door de UI.** Een analyse met
  `privacyAssessment.level === "blokkeren"` (of met de beoordeling `ongeschikt`) kan niet door naar de volgende fase.
  De regel staat op één plek: `getProceedBlocker()` in `modules/training-agent/analysis-rules.ts`. De UI gebruikt
  die regel. Elke toekomstige server-side stap ("training opbouwen") moet dezelfde check opnieuw uitvoeren en
  mag niet vertrouwen op wat de client stuurt.

### Analysecontract

- **Eén runtime-schema**: `InputAnalysisSchema` (Zod) in `src/modules/training-agent/analysis-schema.ts`. Daaruit volgen
  de TypeScript-types (`types.ts`), de structured output van de provider en de validatie. Definieer de vorm van een
  analyse nergens anders.
- **Vorm en betekenis zijn gescheiden.** Het schema bewaakt de vorm. `checkAnalysisInvariants()` bewaakt de
  businessregels, zoals unieke richting-id's en een omschrijving bij elke privacybevinding. Elke provider roept
  die check aan voordat een analyse de app in gaat.
- Engine: `TrainingAnalysisService` in `src/services/analysis/`. Er zijn twee implementaties: `MockTrainingAnalysisService`
  en `ClaudeTrainingAnalysisService`. Welke wordt gebruikt, volgt uit `CERTUM_ANALYSIS_PROVIDER` (zie `config.ts`).
  Bij een fout valt Claude nooit automatisch terug op de mock.
- Model, effort en limieten staan alleen in `CLAUDE_ANALYSIS_DEFAULTS` (`src/services/analysis/config.ts`). De effort
  staat voorlopig op `medium`; of `high` aantoonbaar betere analyses geeft, wordt later met een vaste evalset getest.
- Structured output loopt via de stabiele SDK-route: `client.messages.parse()` met `zodOutputFormat`.
- **Geen model-fallback.** Weigert Claude een analyse, dan wordt dat een `refusal`-fout via de gewone foutafhandeling;
  er is geen automatische overstap naar een ander model. Zo staat vast welk model elke analyse maakte. Een fallback
  (bijv. `fallbacks: "default"`) kan later bewust worden toegevoegd, nadat kwaliteit, privacy en providerbeleid
  zijn geëvalueerd.
- Prompt: `src/knowledge/prompts/training-analysis.ts`, provider-onafhankelijk en met een versienummer. Verhoog
  `TRAINING_ANALYSIS_PROMPT_VERSION` bij elke inhoudelijke wijziging.
- De UI roept alleen de Server Action `analyzeInput` aan (`src/app/trainings/new/actions.ts`). De UI kent geen
  provider. Code als `if (provider === "claude")` hoort nergens buiten `services/` te staan.
- De analyse wordt niet opgeslagen: die leeft alleen in de state van de pagina.
- `rationale` is een korte uitleg voor de gebruiker, geen opgeslagen interne redenering van een model.
- Mock-scenario's testen: `#ongeschikt` in de tekst geeft een ongeschikte input; `#blokkeren` in een casus geeft een
  privacyblokkade.

### Privacy in logs (niet onderhandelbaar)

- Log **nooit** de inputtekst, prompts of providerresponses: niet naar de console, niet naar analytics en niet naar
  bestanden. Casussen kunnen herleidbare gegevens bevatten.
- Alleen technische metadata mag gelogd worden: provider, model, effort, promptversie, soort input, lengte, duur,
  uitkomst, fouttype, privacyniveau en oordeel. Model en effort staan erbij, zodat bij evaluaties altijd te zien is
  met welke configuratie een analyse is gemaakt. Zie `withAnalysisLogging` in `src/services/analysis/logging.ts`.
- `logging.serverFunctions: false` in `next.config.ts` moet blijven staan. Zonder die instelling logt Next.js in dev de
  argumenten van Server Functions, en dat zijn de casusteksten.
- Foutmeldingen voor gebruikers bevatten nooit details van de provider.

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
    studio/            Studio-interface: StudioLayout, SidebarNav, PageHeader, ActionCard, ChoiceCard,
                       StatusBadge, TrainingList, TrainingSection, ContentBlocks, NewTrainingForm,
                       Button, Icon (inline SVG, geen icon-library)
  lib/                 Kleine generieke helpers (bijv. datumopmaak)
  modules/             Domein, per onderdeel
    trainings/         Trainingsprojecten
    cases/             Praktijkcasussen
    training-agent/    Certum Training Agent (nu alleen types)
  knowledge/           Certum-kennis en methodiek
  services/            Externe koppelingen, elk achter een interface, alleen server-side
    analysis/          TrainingAnalysisService + mock (later: echte AI-provider)
```

Regels:

- **Scheid UI, domein en externe koppelingen.** Componenten en pagina's roepen modules aan. Modules gebruiken
  services via een interface. Een pagina of component praat nooit rechtstreeks met een AI-SDK of database.
- **Data via module-functies.** Pagina's halen data op via functies als `listTrainings()` (async), nooit
  rechtstreeks uit voorbeelddata. Voorbeelddata staat in `sample-data.ts` en wordt later vervangen door opslag.
- **Inhoud als blokken.** Een methodiekonderdeel bevat `blocks: ContentBlock[]`, geen losse string.
  De onderdelen krijgen later elk eigen gestructureerde inhoud (keuzeopties, bronnen, toetsvragen). Die voeg je toe als
  nieuw bloktype in `modules/trainings/types.ts`, met een weergave in `ContentBlocks`. Voeg pas een bloktype toe als
  het echt nodig is.
- **Methodiek nooit hardcoden.** Namen, volgorde en beschrijvingen van de stappen komen altijd uit `METHODOLOGY_STEPS`.
- **Geen tijdelijke opslag.** Geen localStorage, JSON-bestanden of server actions als tussenoplossing: de echte
  persistente opslag wordt later gekozen.
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

- Stap 1, de technische fundering: klaar.
- Stap 2, de eerste studio-interface: klaar.
- Stap 3, de Training Workspace: klaar.
- Stap 4, Certum Analyse: klaar.
- Stap 5, de Claude-provider voor de analyse: klaar. Lokaal kies je tussen mock en claude via `.env.local` (zie hieronder).

Routes:
- `/`: dashboard.
- `/trainings`: overzicht van trainingen.
- `/trainings/new`: kies een soort input, voer tekst in, voer de Certum Analyse uit en kies een trainingsrichting.
- `/trainings/[id]`: Training Workspace met de zes methodiekonderdelen.

Er is één centrale instroom voor het maken van trainingen: `/trainings/new`. `?input=casus` (of `onderwerp`, of
`praktijkvraag`) selecteert vooraf een soort; de dashboardactie "Casus invoeren" gebruikt dat. Er komt geen aparte
casusflow naast deze instroom.

Gebruik voor trainingen altijd `/trainings/...` (meervoud). "Gebruik deze trainingsrichting" bevestigt alleen de keuze en bouwt nog geen training. "Bewerken" in de
Workspace doet nog niets. Er wordt nergens iets opgeslagen.

## Toekomstige mogelijkheden (nog niet bouwen)

- **Casusbibliotheek**: een aparte feature om geanonimiseerde casussen te bewaren, te doorzoeken en te hergebruiken
  als basis voor trainingen. Die komt los van de instroom op `/trainings/new`. Het type `PracticeCase` in
  `modules/cases` staat hiervoor al klaar.

Er is nog geen AI-agent, database, authenticatie of externe koppeling.

## Commando's

- `npm run dev`: lokaal starten (http://localhost:3000; staat BC Online daar al, dan wijkt Next uit naar 3001)
- `npm run build`: productiebuild
- `npm run lint`: ESLint
- `npm test`: unit tests (Vitest). Die doen nooit echte API-aanroepen.

## Configuratie (`.env.local`, nooit committen)

Zie `.env.example`.

```
CERTUM_ANALYSIS_PROVIDER=mock      # standaard, geen sleutel nodig
CERTUM_ANALYSIS_PROVIDER=claude    # echte Certum Analyse via Claude
ANTHROPIC_API_KEY=sk-ant-...       # alleen nodig bij claude
```

Herstart `npm run dev` na elke wijziging in `.env.local`.
