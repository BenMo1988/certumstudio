@AGENTS.md

# Certum Studio

## Harde projectregel: uitsluitend synthetische casuïstiek

Totdat Bureau Certum expliciet een governance- en privacybesluit heeft genomen over de verwerking van echte
casuïstiek door externe providers, werkt Certum Studio **uitsluitend met volledig synthetische testcasuïstiek**.

**Privacy Preflight beperkt technisch risico, maar geeft geen toestemming om echte casuïstiek te verwerken. In de
huidige ontwikkelfase geldt `synthetic_only`.**

- De policy staat op één centrale plek: `ACTIVE_DATA_POLICY` in `src/modules/governance/data-policy.ts`. Dit is een
  **tijdelijke governance-policy**, geen permanente functionele eis van Certum Studio. Wijzig hem alleen bewust, na
  een expliciet besluit van Bureau Certum.
- Onder `synthetic_only` moet de gebruiker bij **iedere** invoer (onderwerp, praktijkvraag én casus) bevestigen:
  "Ik bevestig dat deze invoer uitsluitend fictieve/synthetische testdata bevat en geen gegevens uit een echte casus
  bevat." De bevestiging is gebonden aan exact deze tekst.
- **De server dwingt dit af.** `runGatedAnalysis` beoordeelt de policy bij iedere aanroep opnieuw.
  `evaluateDataPolicy` krijgt bewust geen inputsoort mee, zodat een andere soort kiezen de regel niet kan omzeilen.
  Een vinkje in de UI alleen is onvoldoende.

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

Verwerkt drie soorten input: een **onderwerp**, een **praktijkvraag** of een **praktijkcasus**. Onder de huidige
policy `synthetic_only` is alle input fictief of synthetisch.

Vaste flow:
**Input → lokale Privacy Preflight → data-policy → Certum Analyse → menselijke keuze → (later) Training Generation**

### Kernregels (niet onderhandelbaar)

- **Een input wordt nooit rechtstreeks een training.** Iedere training doorloopt eerst Certum Analyse en daarna
  de menselijke selectie en goedkeuring van een trainingsrichting.
- **Alleen `ready` mag door.** `getProceedBlockerV2()` (`modules/training-agent/v2/rules.ts`) is de centrale poort:
  alleen `outcome === "ready"` met een werkelijk bestaande, gekozen richting, na een geslaagde preflight en een
  geldige synthetic-only-attestatie. `blocked`, `unsuitable` en `needs_adjustment` stoppen altijd. Elke toekomstige
  server-side stap ("training opbouwen") moet deze regel opnieuw toepassen en mag niet op de client vertrouwen.
- **Privacyblokkades worden nooit omzeild, niet door AI en niet door de UI.**
- **De Analyse beschrijft wat er professioneel gebeurt.** Welke theorie, methodiek, richtlijn of wetgeving erbij
  hoort, bepaalt later de Bron-fase.

### Analysis Direction V2.1 (actief)

Kleine opvolger van V2: `analysis-contract/v2.1` (`modules/training-agent/v2-1/`) en prompt `training-analysis/v2.1`.
V2 blijft ongewijzigd en reproduceerbaar (tag `analysis-v2-baseline`), maar is niet meer aangesloten.

- **Enige wijziging:** iedere `ready.trainingDirections[]` heeft `routePolicy`: `open_choice` (meerdere
  handelingsroutes verdedigbaar; beoordeling op afweging, aansluiting op de situatie, onderbouwing, proportionaliteit,
  consequenties en uitvoering) of `prescribed_action` (één handelingslijn normatief of inhoudelijk leidend). Zelfde
  waarden en betekenis als het routebeleid in Blueprint Contract V2. Een ontwerpclassificatie, geen bronfeit.
- **Schema:** afgeleid van V2 met `.extend()`; blocked, unsuitable en needs_adjustment zijn exact de V2-schema's.
  `checkOutcomeInvariantsV21` controleert het V2.1-schema en draait daarna exact de V2-invarianten.
- **Prompt:** exact de v2-tekst plus één ingevoegde sectie over routebeleid en de samenhang focus ↔ routePolicy ↔
  leerdoel (bij `open_choice` een route-neutraal leerdoel). Het voorbeeld is bewust domeinneutraal.
- **Geen taallinter:** de semantische samenhang wordt via prompt en evals beoordeeld, niet met regexes.
- **Actieve prompt: `training-analysis/v2.1.1`** (contract blijft `analysis-contract/v2.1`): de v2.1-tekst plus één
  alinea "Bepaal eerst suitability". `prescribed_action` maakt een eenvoudige procedurele input zonder betekenisvolle
  spanning, beoordeling, keuze of uitvoeringsvraag niet geschikt; die blijft `unsuitable`.
- `CERTUM_ANALYSIS_MAX_RETRIES=0` (optioneel, voor evalruns) zet de SDK-transportretries uit; zonder variabele geldt
  `CLAUDE_ANALYSIS_DEFAULTS.maxRetries`.
- Logging: `certum.analysis` heeft bij V2.1 alleen de aantallen `openChoiceDirections` en `prescribedActionDirections`.
- De Blueprint leest `routePolicy` (nog) niet; de Blueprint-flow accepteert een V2.1- of V2-analyse.

### Analysecontract V2 (baseline, niet meer aangesloten)

- **Contract:** `analysis-contract/v2`, een discriminated union op `outcome`. Zie `src/modules/training-agent/v2/`.
  - `blocked`: alleen het provider-vangnet ná een geslaagde lokale preflight. Het resultaat bevat alleen een reden,
    soorten gegevens en een vervolgstap, nooit waarden.
  - `unsuitable`: geen dilemma of keuzemoment. Geen leerdoel, doelgroep of richtingen.
  - `needs_adjustment`: potentie, maar te breed. Alleen afbakeningen en beslisrelevante vragen, géén richtingen.
    De gebruiker past de input aan en doorloopt opnieuw preflight en analyse.
  - `ready`: een concreet keuzemoment. Alleen deze uitkomst levert 1–3 trainingsrichtingen.
- **Eén runtime-schema:** de Zod-schema's in `v2/schema.ts` zijn de bron voor types, structured output en
  validatie.
  - De provider krijgt `{ result: AnalysisOutcome }`, een object als root.
  - De API dwingt de veldsets per variant af (`anyOf` + `additionalProperties: false`).
  - De SDK geeft `literal`/`enum` en maxima alleen als beschrijving door; Zod controleert ze na ontvangst.
- **Vorm en betekenis zijn gescheiden.** `checkOutcomeInvariants()` controleert onder meer:
  - unieke id's;
  - dat elke `sourceRef` bestaat in de werkelijk aangeleverde segmenten, zonder dubbelingen;
  - geen lege teksten;
  - dat een provider-`blocked` geen direct herkenbare waarde herhaalt.
- **Grounding:** `segmentInput()` (`source-segments/v1`) splitst de input server-side in segmenten S1, S2, … (alinea's +
  `Intl.Segmenter`, met een kleine afkortingenlijst). Elke trainingsrichting verwijst via `sourceRefs` naar minimaal
  één bestaand segment. Segmenten en refs worden nooit gelogd.
- **Ontbrekende informatie:** alleen `decisionRelevantGaps` (max. 3), elk met `affects` (geschiktheid, dilemma,
  leerdoel, doelgroep, richtingkeuze) en `howItChangesTheDecision`.
- **Keuzelijsten:** maximaal 3 items voor gaps, afbakeningen, richtingen, abstraction notes en sourceCandidates.
- **`abstractionNotes`:** kenmerken die bij trainingsontwikkeling algemener moeten. Geen privacygate; blokkeert niets.
- **`sourceCandidates`:** interne kandidaten voor de latere Bron-fase. **Niet zichtbaar in de UI** en nooit als
  gevalideerde bron of feit gepresenteerd.
- **Epistemische discipline:** `src/knowledge/controlled-terms.ts` (`controlled-terms/v1`, niet uitputtend).
  - Een gecontroleerd begrip (wet, meldcode, zorgplicht, beroepscode, kindbescherming, methodiek, diagnose,
    wilsbekwaamheid, vakterm) mag in gebruikersgerichte velden alleen staan als het letterlijk in de input staat.
  - `findEpistemicFlags()` markeert overtredingen.
  - **Zacht in het product:** zichtbaar gemarkeerd ("Niet uit je invoer") en als aantal gelogd, maar de analyse wordt
    niet ongeldig.
  - **Hard in de evals:** een treffer is daar een kwaliteitsbevinding.
- **Prompt:** `src/knowledge/prompts/training-analysis-v2.ts` (`training-analysis/v2`). Verhoog de versie bij elke
  inhoudelijke wijziging.
- **Engine:** `TrainingAnalysisServiceV2` (`MockTrainingAnalysisServiceV2`, `ClaudeTrainingAnalysisServiceV2`), gekozen
  via `CERTUM_ANALYSIS_PROVIDER`. Geen automatische terugval naar de mock en geen model-fallback.
  - Mock-scenario's: `#blokkeren`, `#ongeschikt`, `#afbakenen` en `#kader` sturen de uitkomst.
  - Zonder marker geldt per inputsoort: onderwerp → `needs_adjustment`; praktijkvraag → `ready`; casus → `ready` bij
    een keuzemoment-woord, anders `unsuitable`.
- Model, effort en limieten staan alleen in `CLAUDE_ANALYSIS_DEFAULTS` (`src/services/analysis/config.ts`). De effort
  staat voorlopig op `medium`. Structured output loopt via `client.messages.parse()` met `zodOutputFormat`.
- **Geen model-fallback.** Een refusal wordt een providerneutrale `refusal`-fout. Een fallback kan later bewust
  worden toegevoegd, nadat kwaliteit, privacy en providerbeleid zijn geëvalueerd.
- De UI roept alleen de Server Action `analyzeInput` aan. De UI kent geen provider. De analyse wordt niet opgeslagen.
- `rationale` is een korte uitleg voor de gebruiker, geen opgeslagen interne redenering.

### Analysecontract V1 (historisch, niet meer aangesloten)

`training-analysis/v1` met `InputAnalysisSchema` (`analysis-schema.ts`), de v1-prompt (`training-analysis.ts`) en de
v1-services staat ongewijzigd in de code en is vastgezet met de git-tag `analysis-v1-baseline`. Het dient als
referentie voor de baseline-evals. Wijzig deze bestanden niet.

### Privacy Preflight (niet onderhandelbaar)

Vóór iedere externe AI-aanroep voert Certum lokaal de Privacy Preflight uit (`src/modules/privacy/`,
`privacy-preflight/v1`). Pure, deterministische TypeScript, zonder netwerk en zonder AI.

- **Uitkomst:** `blocked`, `review_required` of `safe`.
  - `blocked` (e-mail, telefoon, postcode, straat + huisnummer, BSN, IBAN, gelabeld ID, geboortedatum, social-media-
    profiel) kan nooit worden bevestigd of weggeklikt; alleen de tekst aanpassen helpt.
  - `review_required` (volledige datum zonder geboortecontext, URL, mogelijke persoonsnaam, mogelijke instelling)
    vraagt per bevinding een bevestiging of een tekstwijziging.
- **`safe` is geen anonimiteitsgarantie.** Het betekent alleen "geen direct herkenbare identificatoren gevonden".
  Namen en combinaties van kenmerken zijn niet betrouwbaar automatisch te herkennen. Presenteer `safe` nooit als
  "bevat geen persoonsgegevens".
- **Attestatie:** naast de preflight geldt de data-policy (zie "Harde projectregel"). De preflight vervangt de
  attestatie niet, en de attestatie vervangt de preflight niet.
- **Binding aan de tekst:** bevestigingen en attestatie zijn via een SHA-256-hash gebonden aan exact dezelfde
  (getrimde) tekst. Elke wijziging maakt ze ongeldig.
- **Bekende ontwikkelbeperking, Web Crypto:** de hash in de browser gebruikt Web Crypto, en dat werkt alleen in een
  secure context. `localhost` werkt. Productie moet via HTTPS draaien. Een lokaal netwerkadres via gewone HTTP kan de
  hashing in de browser verhinderen; de analyse is dan niet te starten. De server-side privacygate blijft altijd
  bindend.
- **De server beslist.** De browser voert de preflight alleen uit voor directe feedback.
  `runGatedAnalysis` (`src/app/trainings/new/gated-analysis.ts`) voert hem altijd opnieuw uit en maakt de
  analyse-service pas aan als `evaluatePreflightGate` én `evaluateDataPolicy` toestemming geven.
- Er wordt nooit iets automatisch verwijderd, geanonimiseerd of vervangen.
- **Preflight-miss:** blokkeert de provider na een geslaagde preflight alsnog, dan wordt dat gelogd als
  `certum.preflight_miss` met `preflightMiss: true` (alleen metadata).
- Lokale NER of een lokaal model komt pas in beeld nadat een aparte synthetische Nederlandse privacy-evalset
  aantoonbaar betere detectie laat zien met een werkbaar aantal valse treffers.

### Training Blueprint en BC Online Block Plan (stap 7; Blueprint-provider stap 8A)

Certum Studio is de didactische ontwerplaag; BC Online is de uitvoeringslaag.

- **Volgorde met menselijke gates:** analyse `ready` + gekozen richting → Training Blueprint (`blueprint-contract/v1`)
  → Blueprint goedgekeurd → BC Online Block Plan (`bc-online-block-plan/v1`) → Block Plan goedgekeurd → export via een
  adapter (bestaat nog niet; `getExportBlocker` blokkeert altijd). `blocked`, `unsuitable` en `needs_adjustment`
  leveren nooit een Blueprint of Block Plan op. De server-side gates staan in `src/app/trainings/new/blueprint-flow.ts`
  en herhalen preflight, datapolicy en analyse-invarianten.
- **De Blueprint is de didactische waarheid.** Het Block Plan bepaalt nooit de inhoud: het kiest alleen bestaande
  blokken per Certum-fase.
- **Certum-fasen zijn geen BC Online-bloktypes.** Er is geen 1-op-1-mapping. Eén fase mag meerdere blokken hebben en één
  bloktype mag in meerdere fasen voorkomen. De formele Toets in BC Online is niet de Certum-fase Toets.
- **Catalogus:** `src/knowledge/platform/bc-online-block-catalog.ts` bevat alleen door Bureau Certum waargenomen blokken,
  met interne ids (`certum.bco.*`). Een `certumCatalogId` is geen bewezen BC Online-backendtype
  (`BC_ONLINE_BACKEND_TYPES_KNOWN = false`). Verzin nooit backend-ids. Niet aangetoond: branching, antwoorden van de
  deelnemer in WhatsApp/E-mail, een juist antwoord bij een Poll, API/backendtypes. Conditionele logica betekent
  conditionele tekstweergave, geen vertakking.
- **Wat niet kan, wordt een `capabilityGap`**, nooit een fictief blok. `skjPoints` is altijd `null`. Chat-sleutelwoorden
  vervangen nooit het beoordelen van professioneel redeneren.
- **Blueprint-provider (stap 8A):** `TrainingBlueprintService` met mock en Claude, gekozen via
  `CERTUM_BLUEPRINT_PROVIDER` (standaard `mock`, los van `CERTUM_ANALYSIS_PROVIDER`). Geen terugval naar mock.
  - Provider-input: `buildBlueprintGenerationInput` (`modules/training-blueprint/generation-input.ts`): gekozen richting,
    samenvatting, dilemma, doelgroep, alleen de segmenten van de richting en de beslisrelevante open vragen. Geen andere
    richtingen, sourceCandidates, abstractionNotes of rationale.
  - Prompt `training-blueprint/v1` (`knowledge/prompts/training-blueprint-v1.ts`, Certum Learning Architect). De
    contractversie is `blueprint-contract/v1`: prompt en contract hebben bewust verschillende ids.
  - Model en effort alleen in `CLAUDE_BLUEPRINT_DEFAULTS` (`services/blueprint/config.ts`). Analysis-config blijft los.
    `maxRetries: 0`: een SDK-retry (time-out, verbinding, 408/409/429/5xx) kan een onzichtbare tweede generatie zijn.
  - **Vaste velden genereert de provider niet.** Claude ontwerpt alleen `BlueprintDesignSchema`
    (`services/blueprint/design.ts`, = `TrainingBlueprintSchema.omit(...)`). `composeTrainingBlueprint` voegt
    contractversie, doelgroep, gekozen richting, leerdoel, dilemma en sourceRefs server-side toe uit de gevalideerde context.
  - Geldig pas na structured output (`messages.parse` + `zodOutputFormat(BlueprintDesignSchema)`), Zod op het ontwerp,
    samenstellen, Zod op de volledige Blueprint en `checkBlueprintInvariants`. Geen reparatie of tweede aanroep;
    ongeldig is `invalid-output`.
  - De Blueprint kiest geen BC Online-blokken; de invariant `uitvoeringsblok-gekozen` bewaakt dat voor eenduidige namen.
  - Logging: `certum.blueprint_generation` met alleen provider, model, effort, versies, inputsoort, duur, uitkomst,
    ambiguïteit en aantallen. Geen inhoud en geen richting-id.
- **Blueprint Contract V2 (stap 8C, actief):** `blueprint-contract/v2` (`modules/training-blueprint/v2/`) en prompt
  `training-blueprint/v2`. V1 (contract, prompt, runs) blijft ongewijzigd als baseline (tag `blueprint-v1-baseline`) en
  is niet meer aangesloten. V2 repareert alleen wat de V1-review aantoonde:
  - **Ambiguïteit bestuurt de structuur.** `decisionPoint` is `{ task, routePolicy }` en `actie` heeft `routePolicy`.
    De server leidt `routePolicy` af uit `ambiguity` (`open_choice` bij meerdere routes, anders `prescribed_action`);
    de provider genereert het niet. Feedback en Toets hebben `evaluationBasis` (vaste categorieën);
    `voorgeschreven_handeling` is bij meerdere routes ongeldig.
  - **`sourceNeeds` is de enige kenniswaarheid.** Elke sourceNeed heeft een id (`SN1`…); Bron is
    `{ learningIntent, sourceNeedRefs }` zonder eigen kennisvragen. Invarianten: bestaande, unieke refs, elke sourceNeed
    gebruikt, geen vraagteken in `learningIntent`.
  - **Aannames vullen onbekenden in en halen geen trusted context uit de situatie.** Focus vernauwt de leeropdracht,
    context blijft. Invariant `aanname-sluit-context-uit` (bewust smal); de prompt en evals dragen de rest.
  - Vaste velden (versie, doelgroep, richting, leerdoel, dilemma, sourceRefs) blijven server-side samengesteld.
- **Trusted routebeleid (actief, prompt `training-blueprint/v2.1`, contract blijft `blueprint-contract/v2`):** de
  Blueprint kiest de ambiguïteit niet meer. `ambiguityFor` (`modules/training-blueprint/v2/schema.ts`, de enige mapping)
  leidt haar af uit het `routePolicy` van de gekozen Analysis V2.1-richting: `open_choice` →
  `multiple_defensible_actions`, `prescribed_action` → `single_best_action`. Daarna leidt `composeTrainingBlueprintV2`
  het routebeleid van keuzemoment en Actie weer af. Eén doorlopende waarheid: Analysis routePolicy → ambiguity →
  decisionPoint/Actie routePolicy.
  - `BlueprintV21DesignSchema` = het V2-ontwerpschema `.omit({ ambiguity })`; `composeTrainingBlueprintV21` zet de
    trusted ambiguïteit. De provider-input bevat het routebeleid (`buildBlueprintGenerationInputV21`).
  - `runBlueprintFlowV21` accepteert alleen een Analysis V2.1-uitkomst. Een V2-analyse zonder routebeleid geeft
    `incompatible_analysis` (geen stille gok). De flow controleert ook dat de ambiguïteit uit het routebeleid volgt.
  - V1 en V2 (`runBlueprintFlow`, `runBlueprintFlowV2`) blijven als baseline-codepaden bestaan.
- **Keten met heldere verantwoordelijkheden per laag:** Training Blueprint (didactische waarheid) → **Block Plan**
  (welke bestaande BC Online-blokken) → later **Block Content** (uitgeschreven inhoud per blok: dialogen, vragen,
  feedbacktekst, documenten, broninhoud) → later **BC Online Adapter** (export als concepttraining). Elke laag doet
  alleen haar eigen werk; het Block Plan schrijft geen inhoud en ontwerpt de leerervaring niet opnieuw.
- **Block Plan-provider (stap 9A):** `BlockPlanService.generate({ blueprint })`, mock of Claude via
  `CERTUM_BLOCK_PLAN_PROVIDER` (standaard `mock`, los van de andere providers; geen terugval naar mock). Code in
  `services/block-plan/`; prompt `training-block-plan/v1` (Certum Implementation Architect), contract blijft
  `bc-online-block-plan/v1`. `CLAUDE_BLOCK_PLAN_DEFAULTS`: `claude-opus-5-5`, `medium`, `maxRetries: 0`.
  - Input: uitsluitend de goedgekeurde Blueprint, de catalogus `bc-online-block-catalog/v1` en versies. Nooit de
    oorspronkelijke input, de analyse of bronsegmenten.
  - De provider wordt pas aangemaakt na de goedkeuring, het Blueprint-schema en de routebeleid-controle
    (`runBlockPlanFlow`).
  - Claude ontwerpt `BlockPlanDesignSchema` (afgeleid van het domeinschema). `composeBlockPlan` zet server-side: versie,
    `blueprintVersion`, titel, leerdoel, `skjPoints: null`, `status: concept`, tijdsduur `null` (pas te schatten met Block
    Content), blok-ids, volgorde en `endIntent.followUpRecommendation: null` (de Blueprint modelleert geen
    vervolgactiviteit; het Block Plan verzint er geen).
  - Inhoudsvrije diagnose bij `invalid-output` (`BlockPlanValidationError`): fase `structured_output`,
    `schema_validation` (alleen `<zod-code>@<veldpad>`) of `domain_invariant` (alleen violation codes). Gelogd als
    `validationStage` en `violationCodes`; nooit ontvangen waarden, Zod-meldingen of gegenereerde tekst.
  - Invarianten (ook voor de mock): alleen planbare catalogus-ids. Bij `multiple_defensible_actions` bevatten Actie en
    Toets, voor zover ze blokken hebben, minstens één blok met open handelen of afwegen (catalogus-capability
    `ai_rollenspel_chat`, `open_antwoord` of `schriftelijke_productie`); Meerkeuze of een formele Toets mag aanvullend,
    maar nooit de enige uitvoeringsvorm zijn. Geen bron-URL. Branching is structureel uitgesloten: geen catalogus-
    capability, geen bloktype (gesloten lijst), en wat niet kan staat in een `capabilityGap` met hooguit een `partial`
    workaround met verplichte beperking.
  - **V1-grens: geen vrije-tekstheuristieken.** Het systeem controleert in Block Plan V1 structureel welke bloktypes
    bestaan en welke capabilities aantoonbaar zijn. Het kan niet betrouwbaar met deterministische code vaststellen of
    vrije natuurlijke taal (purpose, whyThisBlock, configurationIntent) semantisch een capability overclaimt of
    eindcontent bevat. Dat wordt bewaakt via catalogus-context → prompt → eval → human approval, niet via woordenlijsten,
    regexes of negatieherkenning. Een Block Plan gaat sowieso door de human approval gate vóór verdere productie.
  - Logging: `certum.block_plan_generation` met alleen provider, model, effort, versies, duur, uitkomst en aantallen.
- **Bekende blocker `approval_integrity_required_before_export`.** In de huidige V1-fase zonder persistence controleert
  de server het Blueprint-schema, het routebeleid en de approval-flag, maar komen de goedgekeurde Blueprint en de
  goedkeuring van de client terug. Een client kan de teruggestuurde Blueprint dus inhoudelijk wijzigen. Dat is
  aanvaardbaar voor de huidige gecontroleerde ontwikkeling en evals. Vóór echte productie of export naar BC Online is
  server-side persistence of een cryptografisch of anderszins integriteitsgebonden goedkeuring vereist. Nog niet
  gebouwd (geen database, geen signing).
- Er is nog geen Block Content, BC Online-adapter, API, database, MCP of export.

### Privacy in logs (niet onderhandelbaar)

- Log **nooit** de inputtekst, prompts of providerresponses: niet naar de console, niet naar analytics en niet naar
  bestanden. Casussen kunnen herleidbare gegevens bevatten.
- Alleen technische metadata mag gelogd worden: provider, model, effort, promptversie, soort input, lengte, duur,
  uitkomst, fouttype, privacyniveau en oordeel. Voor de preflight (`certum.preflight`) alleen: versie, status,
  aantallen per categorie, aantal bevestigingen, attestatie ja/nee en de beslissing. Nooit waarden, posities of
  hashes. Model en effort staan erbij, zodat bij evaluaties altijd te zien is
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
    privacy/           Privacy Preflight V1 (lokaal, deterministisch) + gate-logica
    governance/        Tijdelijke data-policy (nu: synthetic_only)
    trainings/         Trainingsprojecten
    cases/             Praktijkcasussen
    training-agent/    Certum Training Agent: v1-contract (historisch), v2/ (baseline) en v2-1/ (actief)
    training-blueprint/ Training Blueprint: V1-contract (baseline), v2/ (actief), invarianten, goedkeuringsgates
    block-plan/        BC Online Block Plan V1: contract en invarianten
  knowledge/           Certum-kennis en methodiek; platform/ bevat de BC Online-blokcatalogus
  services/            Externe koppelingen, elk achter een interface, alleen server-side
    analysis/          TrainingAnalysisService(V2): mock + Claude; v1 historisch naast v2
    blueprint/         TrainingBlueprintService V1 en v2/ (mock + Claude), BlockPlanService (alleen mock)
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
- Stap 6A, de lokale Privacy Preflight V1 en `synthetic_only`: klaar.
- Stap 6B+C, Analysis Contract V2 en `training-analysis/v2`: klaar, met een V2-baseline met Claude (zie evals).
- Stap 7, Training Blueprint V1 en BC Online Block Plan V1: fundering klaar, alleen met mocks.
- Stap 8A, Claude-provider voor de Training Blueprint: klaar.
- Stap 8B, BP-baseline met `training-blueprint/v1`: klaar en beoordeeld (1 PASS, 1 PASS_WITH_NOTES, 1 FAIL).
- Stap 8C, Blueprint Contract V2 en `training-blueprint/v2`: klaar en beoordeeld (2 PASS, 1 PASS_WITH_NOTES); gesloten.
- Analysis Direction V2.1/V2.1.1 en Blueprint met trusted routebeleid: gesloten als één didactische keten.
- Stap 9A, Claude-provider voor het BC Online Block Plan: gebouwd en getest met mocks. Nog geen BLP-baseline.

Routes:
- `/`: dashboard.
- `/trainings`: overzicht van trainingen.
- `/trainings/new`: kies een soort input, voer tekst in, voer de Certum Analyse uit, kies een trainingsrichting en
  beoordeel en keur daarna de Blueprint en het Block Plan goed.
- `/trainings/[id]`: Training Workspace met de zes methodiekonderdelen.

Er is één centrale instroom voor het maken van trainingen: `/trainings/new`. `?input=casus` (of `onderwerp`, of
`praktijkvraag`) selecteert vooraf een soort; de dashboardactie "Casus invoeren" gebruikt dat. Er komt geen aparte
casusflow naast deze instroom.

Gebruik voor trainingen altijd `/trainings/...` (meervoud). "Gebruik deze trainingsrichting" maakt een Blueprint (mock); goedkeuren maakt nog niets aan in BC Online. "Bewerken" in de
Workspace doet nog niets. Er wordt nergens iets opgeslagen.

## Evals

Er zijn vier evalsets, elk met een eigen README:
- `evals/training-analysis/` (CA-001 t/m CA-008): de inhoud van de analyse door een AI-provider.
- `evals/privacy-preflight/` (PP-001 t/m PP-003): de lokale Privacy Preflight, zonder externe AI.
- `evals/training-blueprint/` (BP-001 t/m BP-003): Blueprint en Block Plan; V1-baseline beoordeeld, V2-verwachtingen vastgelegd.
- `evals/bc-online-block-plan/` (BLP-001 t/m BLP-003): Block Plan uit een goedgekeurde Blueprint; verwachtingen vastgelegd.

Kwaliteitsbasis voor Certum Analyse staat in `evals/training-analysis/`. Er staat alleen
synthetische data in en het is geen productiecode. Elke run wordt vastgelegd met promptVersion, model en effort.
Doe na een wijziging in prompt, model of effort de relevante evals opnieuw en leg de runs vast, voordat de wijziging
als verbetering geldt. Er is nog geen geautomatiseerde scorer of runner.

## Toekomstige mogelijkheden (nog niet bouwen)

- **Casusbibliotheek**: een aparte feature om geanonimiseerde casussen te bewaren, te doorzoeken en te hergebruiken
  als basis voor trainingen. Die komt los van de instroom op `/trainings/new`. Het type `PracticeCase` in
  `modules/cases` staat hiervoor al klaar.

Er is nog geen database, authenticatie of koppeling met BC Online.

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
CERTUM_BLUEPRINT_PROVIDER=mock     # standaard; claude = echte Blueprint Generation (betaald)
ANTHROPIC_API_KEY=sk-ant-...       # alleen nodig bij claude
```

Herstart `npm run dev` na elke wijziging in `.env.local`.
