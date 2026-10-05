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
- De UI kent geen provider. De analyse loopt via de persisted workflow (`runAnalysis` op de opgeslagen invoer) en wordt
  opgeslagen als `analysis`-revision (zie Persistence cut-over).
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
  (welke bestaande BC Online-blokken) → **Block Content** (uitgeschreven inhoud per blok, zie hieronder) → later
  Training Review/Editor, opslag en versies, preview, Accreditation Readiness → later **BC Online Adapter** (export
  als concepttraining). Elke laag doet
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
- **Blocker `approval_integrity_required_before_export`: principieel opgelost (stap 11C).** De UI-workflow stuurt geen
  goedgekeurde artifacts of approval-flags meer terug; de server laadt Blueprint, Block Plan en inhoud zelf uit Postgres
  en goedkeuringen zijn workflow events op exact één revision en content_hash. De oude client-authoritative Server
  Actions bestaan niet meer. De flow-functies (`runBlockPlanFlow`, `runBlockRegenerationFlow`, …) accepteren nog
  artifacts als argument, maar zijn geen Server Actions; de persisted workflow voedt ze uit de database. Een toekomstige
  export moet ook uitsluitend uit opgeslagen, goedgekeurde revisions lezen.
- Er is nog geen BC Online-adapter, API, MCP of export.

### Persistence: Certum Training Record V1 (stap 11B, fundering)

Ontwerp en regels: `docs/persistence/training-record-v1.md`. Uitgangspunt: **goedgekeurde output wordt een
server-owned snapshot**; een goedgekeurd onderdeel dat inhoudelijk verandert, verliest zijn approval.

- **Database:** Supabase Postgres, Frankfurt (`eu-central-1`), via één server-only `DATABASE_URL` (`.env.local`).
  Client: `postgres` (postgres.js, `prepare: false` voor de transaction pooler). Plain SQL, geen ORM.
- **Schema:** `migrations/001_certum_training_record.sql` (in Git; nooit alleen via het Supabase-dashboard). Toepassen
  met `npm run db:migrate` (registratie en checksum in `schema_migrations`).
- **Vier tabellen:** `training` (UUID + unieke code `TR-nnnn`, `data_policy`), `training_input` (apart, gericht te
  verwijderen; alleen preflight-metadata), `artifact_revision` (immutable snapshots: analysis, blueprint, block_plan,
  start_content, end_content, block_content) en `workflow_event` (append-only: `direction_selected` met
  `trainingDirectionId`, `approved`, `needs_revision`, `revoked`; `actor_id` leeg tot er auth is).
- **Regels:** revisions en events kunnen niet worden gewijzigd of verwijderd (triggers; de repository heeft geen
  update-functie). Current = hoogste `revision_no`, transactioneel toegekend. `content_hash` = SHA-256 over canonieke
  JSON. `based_on_revision_ids` wordt server-side gevalideerd. `isRevisionApproved`: current, laatste besluit
  `approved` op exact die hash, en alle upstream revisions current en geaccepteerd; een nieuwe Blueprint maakt het
  Block Plan stale, een nieuw Block Plan de blokinhoud.
- **Content Package** wordt niet opgeslagen maar samengesteld uit de current revisions (`composeStoredContentPackage`).
- **Code:** `src/services/storage/` (`training-record.ts` is de enige plek met SQL voor trainingen; `index.ts` is
  server-only met `getDb()`). Tests draaien tegen PGlite (PostgreSQL in WASM) met dezelfde migratie;
  `npm run test:db` is een opt-in test tegen Supabase.
- **Governance:** persistence geeft geen toestemming voor echte casuïstiek; `saveTrainingInput` herhaalt preflight en
  synthetic_only-attestatie.
- **Nog niet:** geen auth, geen RLS, geen publieke deployment. Volgorde: persistence → Training Review/Editor → auth
  → hosted Certum Studio.

### Persistence cut-over V1 (stap 11C)

De Studio gebruikt de database als waarheid; React-state is alleen een weergave van de laatste server-snapshot.

- **Instroom:** `/trainings/new` is alleen de invoer. `startTrainingAction` maakt `training` + `training_input` in één
  transactie (na preflight en synthetic_only-attestatie) en voert direct de analyse uit; daarna gaat de gebruiker naar
  `/trainings/[id]`. Verversen of later heropenen toont exact dezelfde stand.
- **Server Actions** (`src/app/trainings/workflow/actions.ts`) nemen alleen ids en keuzes aan: `runAnalysisAction(trainingId)`,
  `selectDirectionAction(trainingId, analysisRevisionId, directionId)`, `generateBlueprintAction(trainingId)`,
  `decideRevisionAction(trainingId, revisionId, "approved" | "needs_revision")`, `generateBlockPlanAction(trainingId)`,
  `generateContentAction(trainingId)`, `regenerateBlockAction(trainingId, plannedBlockId, expectedRevisionId)`.
- **Logica:** `src/app/trainings/workflow/persisted-workflow.ts` laadt de upstream uit Postgres, voert de bestaande
  poorten uit (`runGatedAnalysis`, `runBlueprintFlowV21`, `runBlockPlanFlow`, `runBlockRegenerationFlow`) en slaat op
  vóór succes. Iedere blokinhoud wordt direct opgeslagen; `generateContent` hervat waar hij stopte. Geen automatische
  retry.
- **Concurrency:** besluiten zijn idempotent (hetzelfde besluit twee keer voegt niets toe); nieuwe revisions gebruiken
  `expectedCurrentRevisionId` (dubbele of verouderde acties → `stale_revision`); een besluit op een niet-current revision
  wordt geweigerd. De richting ligt vast zodra er een Blueprint op de analyse is gebaseerd.
- **Resume-state:** `loadTrainingWorkspace` (`services/storage/workspace.ts`) leidt de `stage` af uit revisions en
  events (`intake_complete` … `training_ready`); niets wordt dubbel opgeslagen. `/` en `/trainings` tonen echte
  records via `listTrainingSummaries` (code, titel, status, voortgang, laatst gewijzigd).
- **Prestatie (stap 11D): Training Record Snapshot.** `loadTrainingRecordSnapshot(s)` laadt training, laatste invoer,
  alle revisions en alle events met vier bulkqueries (gelijktijdig), ongeacht het aantal blokken of trainingen. De
  approval-, staleness-, richting-, pakket- en resume-regels zijn pure functies over die snapshot
  (`services/storage/snapshot.ts`, `deriveWorkspace`); de regels zelf zijn ongewijzigd en een test vergelijkt ze per
  revision met de repository. Writes blijven DB-authoritative: ze vergrendelen de training (`update … returning`,
  tevens `updated_at`) en laden hun eigen snapshot binnen de transactie. `generateContent` werkt na iedere write de
  lokale snapshot bij in plaats van alles opnieuw te laden. Query-tellingen staan in tests (`snapshot.test.ts`) zodat
  N+1 zichtbaar terugkomt. Gemeten tegen Supabase Frankfurt: heropenen 4 queries (~0,18 s), blokbesluit 8 queries
  (~0,63 s), mock-contentgeneratie 48 queries (~4,9 s), trainingenlijst 5 queries (~0,3 s).

### Training Review & Editor V1 (stap 12A)

De opleiderswerkplek op `/trainings/[id]` (stap Content): de training in volgorde (Vaste Start, blokken per
Certum-fase, Vast Einde), per onderdeel bekijken, handmatig bewerken, goedkeuren, laten aanpassen of opnieuw genereren.

- **Bewerken = nieuwe immutable revision.** `saveBlockEdit` / `saveFrameEdit` (`app/trainings/workflow/editing.ts`,
  Server Actions `saveBlockEditAction`, `saveFrameEditAction`): revision +1, concept, herkomst `manual-edit`
  (`model_version`). De vorige revision en haar besluiten blijven historie; een goedkeuring gaat niet mee. Geen
  autosave. `expectedRevisionId` is verplicht (`stale_revision`, geen last-write-wins); opslaan zonder wijziging maakt
  geen revision.
- **Mens en AI volgen dezelfde regels.** De bewerkbare velden zijn precies de velden die een provider genereert:
  `editableContentSchema(target)` (`services/block-content/design.ts`, strict). Trusted en niet bewerkbaar: bloktype,
  fase, volgorde, routebeleid, plannedBlockId, AI Feedback-context, bron van Conditionele logica, `minimumWords`
  (V1: `null`), werkvorm, bijdrage aan leerdoel, toetsfunctie, sourceNeedRefs. Bewerkbaar naast de inhoud: geschatte
  minuten (1–120 of leeg). Daarna compose, het volledige contractschema en `checkBlockContentInvariants`. Geen
  tekstpolitie.
- **Start en Einde:** bewerkbaar zijn de uitleg (Start) en de afsluitende tekst en samenvatting (Einde); titel,
  leerdoel en vervolgaanbeveling (`null`) blijven trusted. Start en Einde hebben een eigen goedkeuring. Een
  blokbewerking raakt ze niet.
- **Readiness** (`deriveReview` in `services/storage/workspace.ts`, op basis van de readiness van het Content
  Package): `incomplete` (bron, asset, technische beperking of ontbrekend blok), `in_review`, `approved` (alle blokken
  én Start en Einde goedgekeurd → stage `training_ready`, "Training gereed"). Geen export of accreditatie.
- **UI:** `components/studio/review/` (`ReviewWorkspace`, `BlockFields` met veldspecificaties per bloktype in
  `block-fields.ts`; geen JSON). Niet-gegenereerde blokken tonen een kaart "Bron nodig / Asset nodig / Technische
  beperking" zonder editor. Kleine read-only historie (`revisionHistoryAction`); geen diff of herstel.
- **Prestatie:** een handmatige opslag ≤ 12 queries; heropenen blijft 4 (tests).

### Source Workspace V1 (stap 13A)

Maakt `needs_source` oplosbaar: sourceNeed → bron van de opleider → menselijke validatie → Bron-inhoud uitsluitend
uit gevalideerde bronnen.

- **Contract `certum-source/v1`** (`modules/sources/schema.ts`, Certum-eigendom; geen SKJ- of BC Online-model):
  `sourceNeedRefs` (1–3 bestaande SN-ids), titel, soort (webpage, article, guideline, book, document, other),
  optioneel auteur, organisatie/uitgever, datum (JJJJ[-MM[-DD]]) en http(s)-URL, en verplicht `relevantContent`: de
  passage of gecontroleerde notitie waarop Certum mag steunen. Een URL alleen is nooit genoeg; er wordt niets van
  internet gehaald. Geen APA-generatie.
- **Opslag:** een bron is een immutable `artifact_revision` met `artifact_type = 'source'`, key `src-n`, `based_on` =
  de current goedgekeurde Blueprint (migratie `002_certum_sources.sql`). Versie, hash, aanmaakmoment en herkomst
  (`manual-edit`) zet de server. De opslag weigert onbekende of dubbele sourceNeeds (geen nieuwe sourceNeeds).
- **Candidate vs gevalideerd:** validatie is een `approved`-event op exact één bronversie, alleen met de expliciete
  bevestiging "Ik heb deze bron gecontroleerd en wil deze gebruiken voor deze training." (`SOURCE_VALIDATION_STATEMENT`).
  Geen AI-validatie en geen automatisch betrouwbaarheidslabel. Corrigeren (`editSource`) maakt een nieuwe versie die
  opnieuw gevalideerd moet worden. Code: `app/trainings/workflow/sources.ts`; Server Actions `addSourceAction`,
  `editSourceAction`, `validateSourceAction`.
- **Dekking** (`sourcesView` in `services/storage/workspace.ts`, afgeleid, niet opgeslagen): een sourceNeed is gedekt
  als minstens één current, gevalideerde bron eraan gekoppeld is. Een candidate dekt nooit.
- **Bron-generatie:** `generateAndStoreBlock` geeft alleen de current gevalideerde bronnen die bij de sourceNeeds van
  het Bron-blok horen door (`resolveBlockTarget(..., validatedSources)`, veld `validatedSources` in de generation input).
  Nooit candidates, andere bronnen, ruwe invoer of algemene AI-kennis. `generated` mag alleen als alle vereiste
  sourceNeeds gedekt zijn; anders, of als de bron onvoldoende is, blijft het blok `needs_source`. Prompt
  `training-block-content/v1.2` = v1.1 plus de sectie "Bron-inhoud alleen uit gevalideerde bronnen"; alleen bij een
  Bron-blok met bronnen komt er een `<gevalideerde_bronnen>`-blok bij. Mock-marker `#onvoldoende` simuleert een
  onvoldoende bron.
- **Provenance:** een Bron-blokrevision heeft `based_on` = [Blueprint, Block Plan, ...gebruikte bronrevisions]. De UI
  toont "Gebaseerd op N gevalideerde bronnen: …". Een handmatige bewerking behoudt dezelfde bronversies.
- **Stale:** een gecorrigeerde (of niet meer gevalideerde) bron maakt via de gewone approvalrecursie alleen de
  Bron-inhoud die erop steunt stale ("Bron gewijzigd"); andere blokken blijven geldig. Opnieuw valideren en genereren
  herstelt dat.
- **Readiness:** `review.sourceNeedsOpen` en `review.staleBlocks`. CTA: "1 bron ontbreekt" → "Alle benodigde bronnen
  aanwezig · Bron-blok nog genereren"; het Bron-blok moet daarna nog gemaakt en goedgekeurd worden.
- **UI:** `components/studio/review/SourceWorkspace.tsx`: paneel "Bronnen" met de dekking per sourceNeed, beheer met
  formulier (titel, soort, auteur, organisatie, datum, URL, relevante inhoud, sourceNeed-checkboxes), "Nog
  controleren"/"Gevalideerd", corrigeren en valideren. Op een `needs_source`-kaart: "Bron toevoegen" (sourceNeeds
  voorgeselecteerd) of, als gedekt, "Bron-blok genereren".
- **Privacy:** broninhoud, titels en URL's komen nooit in logs (test). Heropenen blijft 4 queries.
- **Buiten scope:** zoeken op internet, scraping, uploads (PDF/Word), centrale bronbibliotheek, media, APA, SKJ.

### Pilot-driven Product Corrections V1 (stap 15A)

Correcties uit de Full Training Pilot TR-0014 (`evals/full-training-pilot/`). 0 AI-aanroepen.

- **Human Block Plan Override.** De opleider corrigeert vóór (of na) goedkeuring per gepland blok het bloktype
  (alleen planbare catalogusblokken), `purpose`, `whyThisBlock` en `configurationIntent`, zonder het plan opnieuw te
  genereren (`saveBlockPlanBlockEdit` in `app/trainings/workflow/editing.ts`, Server Action
  `saveBlockPlanBlockEditAction`; contract `PlannedBlockEditSchema` + `applyPlannedBlockEdit` in
  `modules/block-plan/compose.ts`, strict). Trusted: id, volgorde, Certum-fase, titel, leerdoel, routebeleid, capability
  gaps. Altijd een nieuwe Block Plan-revision (`manual-edit`, n → n+1, `expectedRevisionId` verplicht); de oude
  goedkeuring geldt niet voor de nieuwe; inhoud op de oude revision telt niet meer als current. De server valideert het
  volledige plan opnieuw (Zod + `checkBlockPlanInvariants`: catalogus, fasen, open-choice-regels, geen bron-URL). UI:
  "Bewerken" per blok in `BlockPlanReview` (geen JSON). Geen toevoegen, verwijderen of herordenen in V1.
- **Organisatiegebonden sourceNeeds.** `SourceNeedV2.scope?: "professional" | "organisation_specific"`
  (`sourceNeedScope`: zonder scope = `professional`, nooit afgeleid uit tekst). De Claude-provider kan de scope nog niet
  zetten (`BlueprintV2DesignSchema` laat hem weg); classificatie volgt later met eigen prompt en evals. Alleen
  professionele Bron-refs blokkeren (`blockingSourceNeedsFor`); organisatiegebonden refs zonder organisatiebron blijven
  zichtbaar (`organisation_source`-requirement, `review.organisationSpecificOpen`, label "Organisatiespecifiek") maar
  houden een generieke training niet op `incomplete`. Gegenereerde Bron-inhoud mag alleen naar gedekte sourceNeeds
  verwijzen (invariant `bronverwijzing-zonder-bron`); de mock verwijst hoogstens neutraal naar de eigen werkwijze.
  Heeft een Bron-blok alleen organisatiegebonden refs, dan moeten die gedekt zijn (zonder kennis geen Bron-inhoud).
  Mock-marker `#organisatie` voegt een organisatiegebonden SN2 toe.
- **Zichtbare bronvalidatie.** Een niet-gevalideerde bron toont titel, URL en de volledige `relevantContent` prominent,
  met de verklaring direct eronder. Deterministisch, ook in de opslaglaag (`relevantContentIssue`): relevante inhoud die
  exact de titel is, exact de URL of uitsluitend een http(s)-URL kan niet worden gevalideerd (`source_content_invalid`).
  Een bron wordt alleen via `validateSource` goedgekeurd (`sourceValidation: true`), nooit via een generiek besluit.
  Geen kwaliteitsscore en geen minimumlengte.
- **Trainingstitel.** Canoniek is de titel van de goedgekeurde Blueprint: `appendWorkflowEvent` zet hem in het
  trainingsrecord bij iedere Blueprint-goedkeuring; downstream generatie wijzigt hem nooit.
- **Actuele unresolved refs.** `composeContentFromSnapshot` geeft de actuele brondekking mee (`sourceCoverageOf`);
  een `source`-requirement noemt alleen nog open professionele sourceNeeds. Opgeslagen revisions blijven ongewijzigd.
- **Diagnose open-vraag-fouten (geen wijziging):** zie `evals/full-training-pilot/diagnosis-open-question.md`
  (vermoedelijk `question` > 600 tekens, alleen client-side gecontroleerd).

### SourceNeed Scope Review (stap 15B)

AI formuleert de kennisbehoefte; de opleider bepaalt de scope. Geen AI-classificatie, geen wijziging van de
Blueprint-prompt.

- In de Blueprint-review kiest de opleider per sourceNeed "Professionele / algemene kennis" of "Organisatiespecifieke
  kennis", zonder voorselectie, met een korte consequentie na de keuze. "Classificatie opslaan"
  (`saveSourceNeedScopes` in `app/trainings/workflow/editing.ts`, Server Action `saveSourceNeedScopesAction`) maakt
  een nieuwe Blueprint-revision (`manual-edit`, n → n+1) waarin alleen de scopes veranderen; de server reconstrueert
  het Blueprint uit de current revision. Iedere sourceNeed moet een scope krijgen; vraag, ids, aantal, leerdoel en
  ambiguïteit zijn niet bewerkbaar. Een eerdere goedkeuring gaat niet mee; een Block Plan op de oude revision wordt
  volgens de bestaande regels stale.
- **Geen stille default:** de opslaglaag weigert de goedkeuring van een Blueprint V2 zolang een sourceNeed geen scope
  heeft (`scope_review_required`, melding "Classificeer eerst alle kennisbehoeften"). Legacy Blueprints zonder scope
  blijven leesbaar en een bestaande goedkeuring blijft geldig (scope = professional).
- Tests en de SG-harness classificeren expliciet (`approveBlueprint` in `test/workflow-helpers.ts`, `classified` in
  `test/block-content-fixtures.ts`). De mock formuleert bij marker `#organisatie` drie kennisbehoeften zonder scope;
  SN3 gaat inhoudelijk over de eigen organisatie. TR-0014-regressie: `test/fixtures/tr-0014.json`.

### Block Content en Training Content Package (stap 10A)

- **Na beide menselijke goedkeuringen** (Blueprint én Block Plan) maakt Certum de inhoud per gepland blok. Server-side
  poort in `src/app/trainings/new/content-flow.ts` (`runBlockRegenerationFlow`, per blok): beide
  goedkeuringen, een geldige Blueprint V2 met consistent routebeleid (V1 → `incompatible_blueprint`: geen
  sourceNeed-ids) en een geldig Block Plan dat bij die Blueprint hoort. Pas daarna wordt de provider aangemaakt.
- **Granulariteit:** `BlockContentService.generate(request)` is precies één `plannedBlockId` → één `BlockContentResult`;
  `generateFrame` maakt Vaste Start/Vast Einde. De persisted workflow (`generateContent`) genereert alle blokken één
  voor één in planvolgorde, slaat ieder blok direct op en stopt bij de eerste fout (rest blijft `not_generated`). De
  vroegere pakketflow in één request (`runTrainingContentFlow`, `generateTrainingContentPackage`) is verwijderd.
- **Claude alleen als het resultaat werkelijk `generated` kan zijn** (kostenvermenigvuldigende laag: één aanroep per
  blok). `generateBlockContent`: eerst `resolveBlockTarget`; kan het blok niet gegenereerd worden, dan maakt
  `resolveDeterministicResult` (`modules/block-content/deterministic.ts`) server-side `needs_source`, `needs_asset` of
  `blocked_by_capability` uit trusted Blueprint-, plan- en catalogusinformatie: **0 providercreaties, 0 aanroepen**. De
  provider wordt lazy en hooguit één keer per flow aangemaakt; een provider weigert een deterministisch doelblok
  (`config`-fout). Spy-tests in `content-flow.test.ts` bewaken dit.
- **Start en Einde één keer per training.** `generateFrame` draait alleen bij het maken van het pakket; een
  regeneratie van een blok raakt Start en Einde nooit. Alleen de afgeleide totaalduur van Start volgt de blokschattingen.
- **Downstream-only input** (`buildBlockContentGenerationInput`): goedgekeurde Blueprint (zonder `sourceRefs` en
  `selectedDirectionId`), goedgekeurd Block Plan, doelblok, catalogusdefinitie, eerder goedgekeurde blokinhoud en de
  trusted context. Nooit de casus, de analyse, niet-gekozen richtingen of bronsegmenten.
- **Contracten:** `block-content/v1` (per blok) en `training-content-package/v1` (Certum-eigen, geen BC
  Online-payload). Code in `src/modules/block-content/`.
  - Inhoud is een discriminated union op `catalogBlockId`, met alleen de velden uit de catalogus.
  - Media (Beeld, Video, Audio, Document) hebben geen inhoudstype.
  - Statussen: `generated | needs_source | needs_asset | blocked_by_capability`. Nooit stil verzonnen inhoud.
- **Structurele regels** (`resolveBlockTarget`, `checkBlockContentInvariants`; geen vrije-tekstheuristieken):
  - Media → alleen `needs_asset` (met trusted assettype; nooit een URL of asset).
  - Bron-fase → alleen `needs_source` (er is nog geen gevalideerde bron; nooit kenniscontent).
  - AI Feedback krijgt aantoonbaar alleen antwoorden op eerdere **vraagblokken** (catalogusveld "Vraag": Meerkeuze,
    Open vraag, Poll). Eerdere invoerblokken zonder dat veld (Productie, Chat simulatie, Informatie opvragen, Toets)
    staan trusted in `unavailableContext` en als `ai_context` bij de unresolved requirements. Zonder eerder vraagblok
    kan AI Feedback (en Conditionele logica) alleen `blocked_by_capability` zijn.
  - Chat simulatie bij `open_choice`: geen sleutelwoorddoel (`goal: null`).
  - Conditionele logica verwijst naar een eerder vraagblok; het is tekstweergave, geen branching.
  - sourceNeedRefs alleen bestaande SN-ids; nergens een URL.
- **Trusted (server-side, `composeBlockContent`):** versie, `plannedBlockId`, `sequence`, `certumPhase`,
  `catalogBlockId` (ook in de inhoud), `routePolicy` (uit de Blueprint), werkvorm (catalogus), `reviewStatus: draft`,
  assettype en AI Feedback-context. Start: titel en leerdoel uit de Blueprint, duur afgeleid (som van de blokken, of
  `null`). Einde: `followUpRecommendation: null`.
- **Accreditatiemetadata per blok** (registeronafhankelijk, geen SKJ): fase, werkvorm, bijdrage aan het leerdoel,
  `assessmentRole` (`none | formative | summative | transfer`), `estimatedMinutes` (geheel getal 1–120 of `null`),
  `sourceNeedRefs`.
- **Review:** per blok `draft | approved | needs_revision`; alleen `generated` kan worden goedgekeurd. Readiness van
  het pakket: `incomplete | in_review | approved`. Sinds stap 11C opgeslagen: reviewstatus = workflow events op de
  current block revision.
- **Provider:** `CERTUM_BLOCK_CONTENT_PROVIDER` (standaard `mock`, los van de andere providers, geen terugval).
  `CLAUDE_BLOCK_CONTENT_DEFAULTS`: `claude-opus-5-5`, `medium`, `maxRetries: 0`.
  - Actieve prompt `training-block-content/v1.1` (`src/knowledge/prompts/training-block-content-v1-1.ts`): de v1-kern
    plus korte aanwijzingen per bloktype. v1 (`training-block-content-v1.ts`) blijft ongewijzigd voor de
    reproduceerbare V1-baseline. v1.1 voegt drie semantische regels toe uit de baseline-review (bewaakt via prompt,
    eval en human review; **geen** regex, woordenlijst of tekstvalidator):
    - deelnemergerichte inhoud claimt geen onbewezen downstream-gebruik van output (bijv. "je melding wordt later
      gebruikt bij de feedback"), tenzij de catalogus dat aantoonbaar ondersteunt;
    - geen verzonnen kwantitatieve deelnemereisen (woorden, zinnen, tijdslimiet, aantallen);
    - Chat `scenarioContext` ontvanger-neutraal (de catalogus bewijst niet of BC Online het aan de deelnemer, de
      persona of beide geeft).
  - `Productie.minimumWords` is in V1 trusted `null`: het zit niet in het ontwerpschema van Claude en `compose` zet het
    server-side, tot er een expliciete trusted bron voor bestaat.
  - Het ontwerpschema wordt per doelblok gebouwd (`services/block-content/design.ts`): alleen toegestane statussen en
    de velden van dat bloktype.
  - Mock en Claude delen dezelfde weg: ontwerp → compose → Zod → invarianten (`finalize.ts`).
  - Inhoudsvrije diagnose: `BlockContentValidationError`.
- **Logging:** `certum.block_content_generation` (provider, model, effort, promptVersion, contentContractVersion,
  target, plannedBlockId, catalogBlockId, certumPhase, duur, uitkomst, resultStatus, estimatedMinutes, errorKind,
  validationStage, violationCodes) en `certum.block_content` (flow, aantallen). Nooit inhoud.

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
                       StatusBadge, TrainingList, NewTrainingIntake, TrainingWorkflow, review/ (opleiderswerkplek),
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
    block-content/     Block Content V1 en Training Content Package: contract, trusted compose, invarianten, review
    sources/           Certum Source V1: brongegevens en dekking per sourceNeed
  knowledge/           Certum-kennis en methodiek; platform/ bevat de BC Online-blokcatalogus
  services/            Externe koppelingen, elk achter een interface, alleen server-side
    analysis/          TrainingAnalysisService(V2): mock + Claude; v1 historisch naast v2
    blueprint/         TrainingBlueprintService V1 en v2/ (mock + Claude), BlockPlanService-contract en mock
    block-plan/        Block Plan-provider: Claude, config, diagnose, logging, factory
    block-content/     Block Content: mock + Claude, ontwerpschema per blok, orchestrator, logging, factory
    storage/           Certum Training Record: Postgres-repository (plain SQL), migratierunner, hashing
```

Regels:

- **Scheid UI, domein en externe koppelingen.** Componenten en pagina's roepen modules aan. Modules gebruiken
  services via een interface. Een pagina of component praat nooit rechtstreeks met een AI-SDK of database.
- **Data via de storage-laag.** Pagina's halen trainingen op via `services/storage` (`loadTrainingWorkspace`,
  `listTrainingSummaries`), nooit met losse SQL. Er is geen voorbeelddata meer.
- **Methodiek nooit hardcoden.** Namen, volgorde en beschrijvingen van de stappen komen altijd uit `METHODOLOGY_STEPS`.
- **Geen tijdelijke opslag.** Geen localStorage of JSON-bestanden: de enige opslag is Postgres via `services/storage`.
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
- Stap 9A, Claude-provider voor het BC Online Block Plan: klaar; BLP-baseline beoordeeld (3× PASS_WITH_NOTES), gesloten.
- Stap 10A/10B, Block Content V1/V1.1 en Training Content Package: klaar en gesloten (BC-001 t/m BC-007 beoordeeld;
  WATCH: `persona_fact_drift`, `reflection_question_density`). Verdere wijzigingen vragen nieuw bewijs uit trainingsgebruik.
- Stap 11A (ontwerp) en 11B (persistence-fundering, Supabase): klaar en bewezen tegen Supabase.
- Stap 11C, persistence cut-over V1: de Studio onthoudt en hervat trainingen (bewezen tegen Supabase).
- Stap 11D, persistence performance V1: Training Record Snapshot; alle V1-doelen gehaald.
- Stap 12A, Training Review & Editor V1: handmatig bewerken als nieuwe revision, review per blok, Start/Einde, readiness.
- Stap 15B, SourceNeed Scope Review: de opleider classificeert iedere kennisbehoefte vóór goedkeuring (mock bewezen).
- Stap 15A, Pilot-driven Product Corrections V1: Block Plan Override, organisatiegebonden sourceNeeds, zichtbare
  bronvalidatie, titelsynchronisatie en actuele unresolved refs (mock bewezen).
- Stap 13A, Source Workspace V1: bronnen toevoegen en valideren, dekking per sourceNeed, Bron-inhoud alleen uit
  gevalideerde bronnen, provenance en stale-afhankelijkheid (mock bewezen; migratie 002 op Supabase dev).

Routes:
- `/`: dashboard.
- `/trainings`: opgeslagen trainingen met code, titel, status en voortgang.
- `/trainings/new`: kies een soort input en voer de tekst in; na indienen bestaat de training in de database.
- `/trainings/[id]`: de hervatbare workflow van één training: analyse en richting, Blueprint, Block Plan en Training
  Content als opleiderswerkplek (per blok bekijken, bewerken als nieuwe versie, goedkeuren, laten aanpassen, opnieuw
  genereren; Vaste Start en Vast Einde bewerken en goedkeuren).

Er is één centrale instroom voor het maken van trainingen: `/trainings/new`. `?input=casus` (of `onderwerp`, of
`praktijkvraag`) selecteert vooraf een soort; de dashboardactie "Casus invoeren" gebruikt dat. Er komt geen aparte
casusflow naast deze instroom.

Gebruik voor trainingen altijd `/trainings/...` (meervoud). Goedkeuren maakt nog niets aan in BC Online.

## Evals

Er zijn zeven evalsets, elk met een eigen README:
- `evals/training-analysis/` (CA-001 t/m CA-008): de inhoud van de analyse door een AI-provider.
- `evals/privacy-preflight/` (PP-001 t/m PP-003): de lokale Privacy Preflight, zonder externe AI.
- `evals/training-blueprint/` (BP-001 t/m BP-003): Blueprint en Block Plan; V1-baseline beoordeeld, V2-verwachtingen vastgelegd.
- `evals/bc-online-block-plan/` (BLP-001 t/m BLP-003): Block Plan uit een goedgekeurde Blueprint; baseline beoordeeld.
- `evals/training-block-content/` (BC-001 t/m BC-007): Block Content per blok; baseline, bevestiging v1.1 en review; gesloten.
- `evals/source-grounding/` (SG-001, SG-002): Bron-inhoud alleen uit gevalideerde bronnen (v1.2); gesloten
  (WATCH: `bron_content_didactic_density`, `assessment_role_consistency`).
- `evals/full-training-pilot/` (TR-0014): eerste volledige training met echte Claude-output, als product beoordeeld
  (YES_AFTER_EDIT; PRODUCT_BLOCKER `organisation_specific_source_need`; zie `report.md`).

Kwaliteitsbasis voor Certum Analyse staat in `evals/training-analysis/`. Er staat alleen
synthetische data in en het is geen productiecode. Elke run wordt vastgelegd met promptVersion, model en effort.
Doe na een wijziging in prompt, model of effort de relevante evals opnieuw en leg de runs vast, voordat de wijziging
als verbetering geldt. Er is nog geen geautomatiseerde scorer of runner.

## Toekomstige mogelijkheden (nog niet bouwen)

- **Casusbibliotheek**: een aparte feature om geanonimiseerde casussen te bewaren, te doorzoeken en te hergebruiken
  als basis voor trainingen. Die komt los van de instroom op `/trainings/new`. Het type `PracticeCase` in
  `modules/cases` staat hiervoor al klaar.

De Studio gebruikt een database (Supabase Postgres, Frankfurt), maar heeft nog geen authenticatie en geen koppeling
met BC Online. Niet publiek deployen vóór er auth is.

## Commando's

- `npm run dev`: lokaal starten (http://localhost:3000; staat BC Online daar al, dan wijkt Next uit naar 3001)
- `npm run build`: productiebuild
- `npm run lint`: ESLint
- `npm test`: unit tests (Vitest). Die doen nooit echte API-aanroepen.
- `npm run db:migrate`: SQL-migraties toepassen op `DATABASE_URL`
- `npm run test:db`: opt-in integratietest tegen `DATABASE_URL` (schrijft synthetische testdata)

## Configuratie (`.env.local`, nooit committen)

Zie `.env.example`.

```
CERTUM_ANALYSIS_PROVIDER=mock      # standaard, geen sleutel nodig
CERTUM_ANALYSIS_PROVIDER=claude    # echte Certum Analyse via Claude
CERTUM_BLUEPRINT_PROVIDER=mock     # standaard; claude = echte Blueprint Generation (betaald)
CERTUM_BLOCK_PLAN_PROVIDER=mock    # standaard; claude = echt Block Plan (betaald)
CERTUM_BLOCK_CONTENT_PROVIDER=mock # standaard; claude = echte Block Content, één aanroep per blok (betaald)
ANTHROPIC_API_KEY=sk-ant-...       # alleen nodig bij claude
DATABASE_URL=postgres://...        # Supabase Postgres (Frankfurt); alleen server-side, nooit loggen
```

Herstart `npm run dev` na elke wijziging in `.env.local`.
