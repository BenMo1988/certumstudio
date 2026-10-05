# Live Participant Preview Pilot (Step 17B): TR-0018, gestopt op privacyblokkade

Eerste live runtimeproef van Participant Preview V1 (`47c3c66`). Mohamed doorliep TR-0018 zelf als deelnemer, met
Claude live alleen voor de preview-runtime. Datum: 2026-10-05.

Hoofdvraag: voelt TR-0018 als een professionele simulatie wanneer Mohamed hem als deelnemer ervaart, met Claude live?

> Synthetische data. Deze map bevat geen deelnemerstekst, chatberichten, AI-antwoorden of feedbacktekst, en geen secrets.
> `usage.jsonl` komt uit de fetch-probe buiten de productcode en bevat alleen model, tokens, stop_reason, status en duur.

## Opzet

- **Provider:** alleen `CERTUM_PREVIEW_PROVIDER=claude`. Analyse, Blueprint, Block Plan en Block Content stonden
  expliciet op `mock` via de procesomgeving. `.env.local` zet `CERTUM_ANALYSIS_PROVIDER=claude`, maar de procesomgeving
  heeft voorrang; dat is vóór de start gecontroleerd met de env-loader van Next.
- **Instellingen:** `claude-opus-5-5`, chat op effort `low`, feedback op `medium`, `maxRetries: 0`, geen fallbackmodel.
- **Rolverdeling:** Mohamed was de deelnemer. Claude Code voerde niets in en las alleen metadata.
- **Code:** tijdens de pilot zijn geen prompts, schema's, persona's of goedgekeurde inhoud gewijzigd.

## Pilotevidence

| Previewstap | Blok | Type | Uitkomst |
| --- | --- | --- | --- |
| 1 Start | — | Start | doorlopen |
| 2 Context | blok-1 | Tekst | doorlopen |
| 3 Actie-chat | blok-2 | Chat simulatie | 2 deelnemersbeurten, 2 Claude-calls, afgerond |
| 4 Reflectie | blok-3 | Open vraag | beantwoord (alleen preview-state) |
| 5 Feedback | blok-4 | AI Feedback | 1 Claude-call, context: 1 antwoord (blok-3) |
| 6 Bron | blok-5 | Tekst | doorlopen |
| **7 Transfer-chat** | **blok-6** | **Chat simulatie** | **gestopt: privacyblokkade bij de eerste deelnemersbeurt** |
| 8–10 | blok-7, blok-8, Einde | — | niet bereikt |

**De blokkade:**
- **Status:** de Preview Privacy Preflight gaf `review_required` met de categorie `possible_person_name`. De preview
  laat alleen `safe` door, dus het antwoord was `privacy_blocked`.
- **Oorsprong van de naam:** de term was de synthetische naam "Noor". Die komt uit de goedgekeurde training zelf:
  - in blok-6 staat hij 1× in `firstMessage`, 6× in `scenarioContext` en 7× in `personaInstructions`;
  - in geen ander blok, niet in Start of Einde en niet in de oorspronkelijke invoer. Block Content heeft de naam
    geïntroduceerd.
- **Provider:** voor deze beurt is de provider niet aangeroepen. De serverlog toont twee korte requests (44 ms en
  37 ms) zonder `certum.preview_runtime`-regel en zonder probe-regel. Dat past bij geweigerde beurten. De runtime logt
  een privacyweigering niet als metadata, dus de reden is uit de log alleen af te leiden.
- **Gedrag van de gebruiker:** er is niet geprobeerd de tekst aan te passen of de blokkade te omzeilen. De pilot is
  direct gestopt.

### Usage (alleen calls die werkelijk plaatsvonden)

| # | Soort | Blok | Effort | Input | Output | stop_reason | Duur (provider) |
| --- | --- | --- | --- | ---: | ---: | --- | ---: |
| 1 | chat | blok-2 | low | 2.550 | 242 | end_turn | 5,5 s |
| 2 | chat | blok-2 | low | 2.973 | 325 | end_turn | 5,5 s |
| 3 | feedback | blok-4 | medium | 2.062 | 1.500 | **max_tokens** | 17,9 s |

- **Calls:** 3 live calls (2 chat, 1 feedback), allemaal HTTP 200.
- **Tokens:** 7.585 input en 2.067 output.
- **Fouten en herhalingen:** geen providerfouten, geen retries.
- **Wijzigingen:** geen productwijzigingen tijdens de pilot.

**Bevinding `preview_feedback_max_tokens` (WATCH, niet opgelost):** de feedbackcall bereikte de outputlimiet
(`feedbackMaxTokens: 1500`, `stop_reason: max_tokens`). De runtime accepteert dat als `success`, dus de getoonde
feedback was waarschijnlijk afgekapt. Dat de feedback afgekapt was, staat niet vast: de feedbacktekst is bewust niet
ingezien.

## Pilotstatus (voorlopig)

| Onderdeel | Oordeel | Toelichting |
| --- | --- | --- |
| Runtime conversation (Actie-chat) | **YES_WITH_NOTES** | De zorgcoördinator reageerde inhoudelijk, de druk bleef bestaan, er kwam een concrete vervolgvraag en het gesprek stortte niet in na één nette reactie. |
| Transfer | **NOT_COMPLETED** | Privacyblokkade vóór de eerste deelnemersbeurt. |
| Feedback experience (Feedback 1) | **YES_WITH_NOTES** | Sloot aan op het reflectieantwoord, benoemde expliciet dat het gesprek zelf niet zichtbaar was en claimde geen verboden chatcontext. Zie ook `preview_feedback_max_tokens`. |
| Whole training experience | **INCOMPLETE** | |
| Flight-simulator promise | **NOT_YET_PROVEN** | Niet omdat de simulatie inhoudelijk faalde, maar omdat de volledige runtimeflow niet voltooid kon worden. |

De twaalf productvragen zijn niet gesteld, omdat de sessie niet voltooid is.

**Blocker:** `preview_privacy_context_false_positive`, severity **RUNTIME_BLOCKER**. Participant Preview kan niet
onderscheiden tussen een synthetische naam uit de goedgekeurde training en een mogelijk nieuw of echt persoonsgegeven
dat de deelnemer zelf invoert.

## Diagnose (zonder gedragswijziging)

### Huidige preflightarchitectuur in de preview

- **Wat wordt gecontroleerd:** `previewChatTurn` roept `runPrivacyPreflight(message)` aan op uitsluitend het nieuwe
  deelnemersbericht (`preflightCategories([message])` in `app/trainings/preview/preview-runtime.ts`). `previewFeedback`
  controleert alleen de open antwoorden die als context meegaan.
  - Eerdere beurten worden niet opnieuw gecontroleerd; die zijn bij hun eigen beurt al gecontroleerd.
  - Persona-teksten en de goedgekeurde inhoud worden niet gecontroleerd.
- **Geen context:** `runPrivacyPreflight(text)` is een pure functie op één tekst. Er is geen parameter voor context,
  allowlist of trainingskennis, dus de preflight weet niets van de entiteiten in het scenario.
- **Waar `possible_person_name` vandaan komt:** `detectPersonName` (`modules/privacy/detectors.ts`) vindt drie
  vormen:
  1. aanspreekvorm + naam ("mevrouw Jansen");
  2. initialen + achternaam;
  3. een hoofdletterwoord midden in een zin dat niet op de korte lijst `NOT_A_NAME` staat. "Noor" midden in een zin
     valt onder deze vorm.
  - De severity is `review_required` (`CATEGORY_INFO`), dus geen harde blokkade.
- **Strenger dan de intake:**
  - Bij de intake mag de gebruiker iedere `review_required`-bevinding per stuk bevestigen (`evaluatePreflightGate`,
    met hash-binding).
  - De preview laat alleen `safe` door en kent geen bevestiging per bevinding. Daardoor blokkeert iedere
    `review_required`-bevinding, ook een naam uit het scenario. Dat was een bewuste V1-keuze (strenger), maar die is
    hier de directe oorzaak.
- **Wat de server al weet:** op het moment van de check heeft de server de synthetic-only-bevestiging (`syntheticAttested`).
  Na de preflight laadt hij ook het goedgekeurde pakket, maar dat wordt nu niet gebruikt voor de privacycheck. De
  volgorde is: bevestiging → preflight → laden van de goedgekeurde stand.
- **Kan de server de scenario-entiteiten betrouwbaar bepalen?**
  - **Gedeeltelijk.** Er is geen gestructureerde entiteitenlijst: namen staan alleen in vrije tekst (`scenarioContext`,
    `firstMessage`, `personaInstructions`, `text`, …).
  - **Wel betrouwbaar** is dat de server deterministisch dezelfde detector kan draaien over de velden van de current
    goedgekeurde revisions die de deelnemer te zien krijgt. De probe op TR-0018 toont dat dit werkt: in blok-6
    vindt de detector "Noor" 1/1 keer in `firstMessage` en 5/6 keer in `scenarioContext` (eenmaal aan het zinsbegin,
    dus niet gedetecteerd).
  - **Bijvangst:** dezelfde detector markeert ook hoofdletterwoorden die geen naam zijn (blok-1 `text`: 4, blok-5
    `text`: 3, blok-6 `personaName`: 1). De Actie-chat had dus om dezelfde reden kunnen blokkeren als de deelnemer
    zo'n term uit de Context had overgenomen.
- **Bevestiging en naamfout zijn los van elkaar.** De synthetic-only-attestatie is technisch beschikbaar, maar zegt
  niets over welke naam synthetisch is. Ze vervangt de preflight niet en mag dat ook niet doen.

### Root cause

De preview-preflight controleert de tekst van de deelnemer contextloos en laat alleen `safe` door. Een naamachtig
woord dat de goedgekeurde synthetische training zelf aan de deelnemer toont, wordt daardoor behandeld als een
mogelijk nieuw persoonsgegeven. Er is geen server-side weg om te herkennen dat het woord exact uit de goedgekeurde
inhoud komt, en geen weg om een `review_required`-bevinding bewust te bevestigen.

### Veiligheidsrisico's als scenario-entiteiten worden toegestaan

1. **Samenvallende echte naam:** een deelnemer bedoelt met "Noor" een echte cliënt. Dat is technisch nooit te
   onderscheiden van de scenarionaam. Het risico is begrensd, omdat de provider dezelfde naam al uit de goedgekeurde
   inhoud kent; de naam voegt dan geen nieuwe identificator toe. Een echte achternaam erbij ("Noor Bakker") blijft wel
   een nieuw gegeven.
2. **Gedeeltelijke match als lek:** als "Noor" is toegestaan, mag "Noor Bakker" (één samengevoegde span) of
   "Noor + straat + huisnummer" niet meeliften. Toestaan mag alleen op exact dezelfde span. Harde categorieën
   (`blocked`) worden nooit toegestaan.
3. **Vervalsing door de client:** als de client entiteiten, persona-beurten of een allowlist zou kunnen aanleveren,
   kan iemand elke naam "goedkeuren". In de huidige API zijn de persona-beurten in `history` door de client
   aangeleverd. Die mogen daarom nooit als bron voor toegestane entiteiten dienen, ook niet als de persona live een
   naam heeft geïntroduceerd.
4. **Te brede bron:** worden entiteiten afgeleid uit alle teksten, dus ook verborgen `personaInstructions` en
   `instructions`, dan krijgt de deelnemer vrijstelling voor namen die de deelnemer nooit heeft gezien. Dat is klein maar
   onnodig. Neem alleen velden die de deelnemer werkelijk te zien krijgt.
5. **Stale bron:** entiteiten mogen alleen komen uit de current goedgekeurde revisions, dezelfde bron als de runtime.
   Een eerdere revision of een niet-goedgekeurde bewerking telt niet.

## Oplossingsrichtingen (ontwerp, niet gebouwd)

Voor alle opties geldt:
- de server leidt de toegestane entiteiten af uit de current goedgekeurde, voor de deelnemer zichtbare inhoud;
- de client levert nooit entiteiten;
- `blocked`-categorieën blijven altijd blokkeren;
- in logs alleen aantallen, nooit waarden.

### Optie A: Approved synthetic entity context

De preflight blijft streng. De server bouwt per training een set "goedgekeurde scenario-entiteiten" en geeft die mee
aan een contextbewuste variant van de check.

| Criterium | Beoordeling |
| --- | --- |
| Privacyveiligheid | Hoog, mits exact op span wordt gematcht. Nieuwe namen blijven blokkeren. |
| False negatives | Alleen een echte naam die exact gelijk is aan een scenarionaam (zie risico 1). |
| False positives | Sterk lager. Blijven bestaan bij verbuigingen ("Noors") of een naam die de persona live introduceerde. |
| Complexiteit | Laag tot middel: één pure functie plus het afleiden van de set uit het pakket. |
| Server-authority | Volledig; de set komt uit de snapshot die al geladen wordt. |
| Misbruik | Geen clientparameter, dus niet te vervalsen. |
| Logging | Een extra aantal (`approvedEntityMatches`), geen waarden. |

A zegt *wat* vertrouwd is, maar niet *hoe* er gematcht wordt. Zonder een precieze matchregel wordt A in de praktijk
een losse allowlist.

### Optie B: Normaliseren vóór de privacycheck

Exact bekende entiteiten worden in een kopie vervangen door een rol (`Noor → [synthetic_young_person]`). Daarna draait
de preflight op de kopie, en het origineel gaat alleen naar de provider als de check slaagt.

| Criterium | Beoordeling |
| --- | --- |
| Privacyveiligheid | Middel. Vervangen verandert de context waarop de detectoren steunen: zinsbegin, samengevoegde namen ("Noor Bakker" wordt "[rol] Bakker", waarna "Bakker" misschien niet meer als naam wordt herkend) en aanspreekvormen. |
| False negatives | Hoger dan A/C, door de veranderde context. |
| False positives | Vergelijkbaar met A. |
| Complexiteit | Middel tot hoog: een rollabel per entiteit vraagt een rolmapping die niet in het contract staat (de naam staat alleen in vrije tekst). |
| Server-authority | Volledig. |
| Misbruik | Geen clientparameter, maar het verschil tussen gecontroleerde en verstuurde tekst is een nieuw risico. |
| Logging | Neutraal. |

### Optie C: Tweefasencheck

1. Draai de bestaande, ongewijzigde preflight op de originele tekst.
2. Bekijk per bevinding met severity `review_required` en categorie `possible_person_name` (eventueel later ook
   `institution_name`) of de exacte span-tekst voorkomt in de server-side set van goedgekeurde scenario-entiteiten.
   - Alleen zulke bevindingen worden vrijgesteld.
   - Alle andere bevindingen blijven blokkerend: onbekende namen, langere spans en alle `blocked`-categorieën.

| Criterium | Beoordeling |
| --- | --- |
| Privacyveiligheid | Hoog: de detectie zelf verandert niet en de vrijstelling is per bevinding controleerbaar. |
| False negatives | Alleen risico 1. "Noor Bakker" blijft één span en blijft blokkeren. |
| False positives | Laag; verbuigingen en live door de persona geïntroduceerde namen blijven blokkeren (bewust). |
| Complexiteit | Laag: een post-filter op bestaande bevindingen. `runPrivacyPreflight` en de detectoren blijven gelijk. |
| Server-authority | Volledig. |
| Misbruik | Geen clientinvoer in de beslissing. |
| Logging | `certum.preview_privacy` met status, aantallen per categorie, `approvedEntityMatches` en de beslissing (zoals `certum.preflight`). Dat lost ook het gat op dat een preview-weigering nu niet gelogd wordt. |

### (Ter vergelijking) Optie D: bevestiging per bevinding, zoals bij de intake

De trainer bevestigt een `review_required`-bevinding, gebonden aan de hash van exact deze tekst. Dit sluit aan op
bestaand beleid, maar onderbreekt het gesprek bij iedere naam en verschuift de verantwoordelijkheid naar de
deelnemer. Dat past niet bij een simulatie, en later bij echte deelnemers nog minder. Niet aanbevolen als primaire
oplossing.

### Benodigde tests (A+C)

- Een naam uit de goedgekeurde, zichtbare inhoud wordt vrijgesteld. Een onbekende naam blijft blokkeren, en zo ook
  "naam + achternaam" waarvan alleen de voornaam goedgekeurd is.
- `blocked`-categorieën worden nooit vrijgesteld, ook niet als ze letterlijk in de inhoud staan.
- Een naam die alleen in `personaInstructions` of `instructions` staat (niet zichtbaar) wordt niet vrijgesteld.
- Een door de client aangeleverde persona-beurt of extra parameter met een naam heeft geen effect.
- Een naam uit een niet-goedgekeurde of stale revision wordt niet vrijgesteld (na bewerken is de preview `not_ready`).
- Hetzelfde geldt voor de open antwoorden bij AI Feedback.
- De logging bevat aantallen, nooit de naam of de tekst.
- De query-telling blijft 4: de set wordt afgeleid uit dezelfde snapshot.

## Aanbeveling

**A+C:**
- **Bron (A):** de server leidt per training een set goedgekeurde scenario-entiteiten af door de bestaande detector
  te draaien over de voor de deelnemer zichtbare velden van de current goedgekeurde revisions (Start, Einde en per
  blok `title`, `text`, `question`, `scenarioContext`, `firstMessage`, `personaName`). Nooit uit de client of
  `history`.
- **Mechanisme (C):** daarna een tweefasencheck die alleen `possible_person_name`-bevindingen vrijstelt, met een exacte
  span-match.

Daarbij:
- de preflight zelf en de detectoren blijven ongewijzigd;
- er komt geen hardgecodeerde allowlist;
- de vrijstelling hangt aan dezelfde snapshot als de runtime.

Optie B wordt afgeraden, omdat normaliseren de detectiecontext verandert. Optie D past niet bij een simulatie.

Voor de vervolgstap (alleen na akkoord):
- Leg eerst in een kleine test met de TR-0018-fixture vast dat de Transfer-chat met de scenarionaam doorgaat en een
  nieuwe naam blijft blokkeren.
- Hervat daarna de live pilot vanaf het begin, één volledige sessie.
- Neem `preview_feedback_max_tokens` daarbij mee als aparte, bewuste beslissing (limiet of `stop_reason`-afhandeling).
  Die hoort niet bij deze fix.

## Besluit en fix (na de diagnose)

Mohamed koos A+C, strakker dan voorgesteld, en liet `preview_feedback_max_tokens` vóór de hervatting meteen meenemen.

- **Privacy:**
  - De bestaande preflight blijft leidend en ongewijzigd.
  - Alleen `review_required`/`possible_person_name` kan worden vrijgesteld, en alleen als exact die span voorkomt in
    de inhoud die de deelnemer tot en met de huidige stap van de current goedgekeurde training kon zien.
  - `blocked` blijft altijd geblokkeerd. Er is geen fuzzy matching en geen allowlist van de client. "Noor Bakker"
    matcht niet met "Noor", en één andere bevinding blokkeert het hele bericht.
  - Restrisico, geaccepteerd voor Trainer Preview V1: een echte "Noor" is niet te onderscheiden van de synthetische
    "Noor". Voor een publiek deelnemersproduct opnieuw beoordelen.
  - Code: `modules/preview/privacy.ts`. Logging: `certum.preview_privacy` met alleen `findings`, `trustedExempted`,
    `remainingCategories` en `outcome`.
- **Feedback:**
  - De limiet is niet verhoogd. `participant-feedback/v1.1` vraagt om compacte feedback van ongeveer 350–500 woorden.
  - De technische limiet van 1500 tokens blijft als headroom.
  - `max_tokens` wordt nooit meer als compleet antwoord behandeld, in chat noch feedback. De runtimelaag beslist op
    de stop reason: `output_truncated`, geen gedeeltelijke tekst, geen automatische retry. Gelogd worden alleen
    `stopReason`, tokens, promptversie en uitkomst.
- **Tests:**
  - TR-0018-fixture (`test/fixtures/tr-0018-package.json`): "Noor" is vertrouwd in blok-6, maar nog niet in blok-2.
  - Exactheid en blokkades: "Noor Bakker", "Noor + Sanne", e-mail en datum blijven geblokkeerd. Verborgen
    persona-instructies leveren geen vertrouwde namen.
  - Vervalsing: een vervalste persona-beurt of een allowlist-parameter van de client heeft geen effect.
  - Afgekapte output: `max_tokens` wordt `output_truncated`.
  - DB-integratie (PGlite, mocks) met door de opleider bewerkte en goedgekeurde blokken:
    - een naam uit de huidige zichtbare stap mag door;
    - een naam uit een eerdere, al zichtbare stap mag in een latere stap door (bijv. in de feedback na de chat);
    - een naam die uitsluitend in een toekomstige, nog niet zichtbare stap staat, mag niet door;
    - een naam die alleen in verborgen persona-instructies staat, mag niet door;
    - niet-goedgekeurde inhoud geeft `not_ready` zonder call.

## Step 17C: hardening en browserbewijs (mocks, TR-0018)

Code: `6e486c4` plus de 17C-aanscherping (zie git log). 0 Claude-calls (usage probe leeg).
Bewijs: `hardening-proof-17c.json`, met alleen structuur en `certum.preview_*`-metadata.

| # | Bewijs | Resultaat |
| --- | --- | --- |
| 1 | De Transfer-chat (blok-6) toont Noor | ja |
| 2–3 | Deelnemer gebruikt exact "Noor" | toegestaan: `findings: 1`, `trustedExempted: 1`, `outcome: allowed`; mock-persona antwoordt |
| 4 | "Noor" plus een onbekende naam | geblokkeerd: `trustedExempted: 1`, `remainingCategories: [possible_person_name]`; geen call |
| 5 | Feedback 1 (blok-4), normale mockrespons | getoond: `stopReason: end_turn`, `participant-feedback/v1.1` |
| 6 | Feedback 2 (blok-8), mockrespons met `max_tokens` | niet getoond; melding "Het antwoord kon niet volledig worden gegenereerd…"; `errorKind: output_truncated`; "Verder" blijft dicht (de trainer kan zelf opnieuw proberen) |
| 7 | Serverlog | contentvrij: geen namen, antwoorden of markers |

- **Prestatie:** een runtime-call blijft 4 queries (test). De vertrouwde set wordt in het geheugen afgeleid uit
  dezelfde snapshot (`buildPreview` + detector), zonder extra query.
- **Duur in de dev-server (mock):** server actions van ongeveer 0,2–0,25 s inclusief de Supabase-roundtrip.

## Step 17D: volledige live sessie, gestopt op feedbacktruncatie

Een nieuwe, volledige live sessie vanaf Start op codebasis `0d2d46c`. Datum: 2026-10-05.
- **Opzet:** alleen `CERTUM_PREVIEW_PROVIDER=claude`; de generatieproviders stonden expliciet op mock (vooraf
  gecontroleerd). De usage probe stond op 0 (`usage-17d.jsonl`). Mohamed was de deelnemer.
- **Stopmoment:** bij Feedback 1 (blok-4) verscheen de melding `output_truncated`. De pilot is gestopt volgens het
  afgesproken stopcriterium.

### Metadata (geen inhoud)

| # | Soort | Blok | Prompt | Model / effort / max_tokens | Input | Output | stop_reason | Runtime-uitkomst | Duur |
| --- | --- | --- | --- | --- | ---: | ---: | --- | --- | ---: |
| 1 | chat | blok-2 | `participant-chat/v1` | opus-5-5 / low / 600 | 2.535 | 233 | end_turn | success | 6,9 s |
| 2 | chat | blok-2 | `participant-chat/v1` | opus-5-5 / low / 600 | 3.069 | 288 | end_turn | success | 5,9 s |
| 3 | feedback | blok-4 | `participant-feedback/v1.1` | opus-5-5 / medium / 1500 | 2.449 | **1.500** | **max_tokens** | `output_truncated` | 16,2 s |
| 4 | feedback | blok-4 | `participant-feedback/v1.1` | opus-5-5 / medium / 1500 | 2.449 | **1.500** | **max_tokens** | `output_truncated` | 16,3 s |

- **Calls:** 4 live calls (2 chat, 2 feedback), allemaal HTTP 200.
- **Tokens:** 10.502 input, 3.521 output. Geschatte kosten tegen $4 / $20 per MTok: ongeveer $0,11.
- **Twee feedbackcalls:** er vonden twee feedbackcalls plaats, en beide eindigden onafhankelijk op `max_tokens`.
  - Dit was geen automatische retry: `maxRetries: 0` en de code bevat geen retry.
  - Call 4 was een tweede, aparte server action. De serverlog toont vier POST-requests; call 4 startte ongeveer 5 s
    nadat call 3 klaar was, met identieke input.
  - Preciezer dan "een tweede server action" is call 4 met de beschikbare metadata niet toe te schrijven. Een bevestigde
    dubbele klik is het niet.
  - In deze versie bleef "Feedback ophalen" na de melding direct klikbaar; Step 17E maakt een nieuwe poging een
    expliciete, aparte actie.
- **Privacy:** 4 besluiten (2 chat, 2 feedback), allemaal `safe`, met 0 bevindingen, 0 vrijstellingen en
  0 blokkades.

### Pilotstatus (voorlopig, door Mohamed vastgesteld)

| Onderdeel | Oordeel |
| --- | --- |
| Truncation handling | **PASS**: afgekapte output wordt niet meer als feedback getoond |
| Feedback runtime reliability | **RUNTIME_BLOCKER** `preview_feedback_truncation` |
| Runtime conversation (Actie-chat) | YES_WITH_NOTES |
| Feedback experience | NOT_COMPLETED |
| Transfer | NOT_STARTED |
| Whole training experience | INCOMPLETE |
| Flight-simulator promise | NOT_YET_PROVEN |

### Diagnose `preview_feedback_truncation` (zonder gedragswijziging)

1. **Exact 1500/1500?** Ja, bij beide feedbackcalls.
2. **stop_reason:** `max_tokens`, bij beide.
3. **Input:** 2.449 tokens, bij beide identiek.
4. **Effort:** `medium` (`CLAUDE_PREVIEW_DEFAULTS.effort`, gelogd als `effort: medium`).
5. **max_tokens in de request:** 1500 (`feedbackMaxTokens`, doorgegeven in `claude-preview-runtime.ts:32`). De probe
   legt de requestbody niet vast; dat `output_tokens` exact op 1500 uitkomt, bevestigt het plafond.
6. **Actieve prompt:** `participant-feedback/v1.1`. De runtime logt die versie en de Claude-runtime gebruikt
   `PARTICIPANT_FEEDBACK_V1_1_SYSTEM`, zoals in de code geïnspecteerd.
7. **Verbruikt reasoning het budget?** Uit de vastgelegde metadata is dat **niet** vast te stellen. `usage` geeft één
   `output_tokens`-totaal, en de probe legt geen bloktypes of zichtbare tekstlengte vast. Wel gedocumenteerd
   (Claude API-documentatie, modelnotities):
   - op `claude-opus-5-5` staat thinking altijd aan; uitschakelen geeft een 400 en `effort` is de enige knop;
   - de ruwe thinking-tekst wordt standaard niet getoond, maar telt wel mee;
   - `max_tokens` is één hard plafond voor thinking én zichtbare tekst samen.

   Onze requests zetten geen `thinking`, dus adaptive thinking draaide gegarandeerd. Hoeveel van de 1500 tokens dat
   was, is niet gemeten.
8. **Omvang van de context:** `contextItems: 1` (het antwoord op blok-3). Tekenlengtes worden niet gelogd. De
   2.449 inputtokens omvatten de systeemprompt, de feedbackinstructies, de vraag en het antwoord samen.
9. **Aparte instelling voor zichtbare output of reasoning?** Nee. Er is geen apart plafond voor zichtbare tekst en op
   dit model geen thinking-budget (`budget_tokens` geeft een 400). Alleen `max_tokens` (totaal) en `effort` bestaan.

**Onderscheid per laag:**
- **Runtime-outputlimiet:** werkt correct; `max_tokens` wordt `output_truncated`.
- **Provider-tokenbudget:** 1500 is een totaalplafond voor thinking plus tekst. Het is bij het ontwerp van 17A
  gedimensioneerd alsof het alleen zichtbare tekst betrof. Dat is een ontwerpfout in Certum, niet in de provider.
- **Reasoning/effort:** bij `medium` denkt het model adaptief. De omvang daarvan is onbekend, het bestaan staat vast.
- **Promptgehoorzaamheid:** onbekend. Zichtbare tekst van 350–500 Nederlandse woorden is grofweg 600–1.000 tokens
  (een schatting, niet gemeten), dus zelfs bij volledige gehoorzaamheid past tekst plus thinking mogelijk niet in
  1500. Dat de zichtbare tekst te lang was, is niet aangetoond.

**Bewezen** is dat het totaalplafond twee keer werd bereikt, met de v1.1-prompt actief en effort `medium`. **Niet
bewezen** is hoe de 1500 tokens verdeeld waren over thinking en tekst.

### Oplossingsrichtingen (ontwerp, niet gebouwd)

| | A. Feedback-effort `medium` → `low` | B. Technische headroom (bijv. 4000) + v1.1-budget behouden | C. Strenger outputcontract (sterkte, aanscherping, vraag) |
| --- | --- | --- | --- |
| Kwaliteit | Waarschijnlijk goed (de documentatie noemt `low`/`medium` sterk op dit model), maar ongemeten voor feedback | Ongewijzigd ten opzichte van wat v1.1 bedoelt | Compacter; risico op schraler of schematischer |
| Truncatierisico | Lager, niet weg: thinking blijft aan en deelt het plafond | Laag: ruimte voor thinking plus 350–500 woorden | Laag effect: raakt alleen de zichtbare tekst, niet thinking |
| Latency | Lager | Gelijk (het model stopt als het klaar is) | Iets lager |
| Kosten | Lager | Alleen werkelijk verbruikte tokens; een hoger plafond kost niets extra tenzij het gebruikt wordt | Iets lager |
| Voorspelbaarheid | Middel | Hoog voor truncatie; lengte blijft aan de prompt | Middel |
| Complexiteit | Eén configwaarde | Eén configwaarde | Nieuwe promptversie (v1.2) en evals |

**Aanbeveling: B.**
- Het gedocumenteerde mechanisme is dat `max_tokens` thinking plus tekst afdekt, en 1500 was alleen op tekst
  gedimensioneerd. B corrigeert precies die rekenfout, zonder de feedbackkwaliteit (effort) of de didactiek (prompt)
  te veranderen.
- Neem daarbij één observability-aanvulling op, alleen metadata: de lengte van de zichtbare tekst (tekens of woorden)
  en of er een thinking-blok was. Dan bewijst de volgende run of v1.1 wordt gehoorzaamd en hoeveel thinking kost.
- A pas daarna, en alleen als latency of kosten uit die metadata een reden geven. C alleen als de zichtbare tekst
  aantoonbaar te lang blijkt.

**Aandachtspunten:**
- **Chat:** de chat (600, effort `low`) deelt hetzelfde mechanisme. Gemeten: 233 en 288 tokens, dus er is nu
  ruimte, maar de headroom is krap. Het voorstel is de chat in dezelfde wijziging ruimer te zetten.
- **Retry-knop:** dat "Feedback ophalen" na `output_truncated` direct opnieuw klikbaar was, maakte een tweede betaalde
  call mogelijk. Dit is opgepakt in Step 17E.

## Step 17E: correctie van het runtime-tokenbudget

Besluit van Mohamed: optie B, plus twee kleine hardeningpunten. Didactiek, prompts en effort blijven ongewijzigd.

- **Headroom:**
  - feedback `max_tokens` 1500 → **4000**;
  - chat `max_tokens` 600 → **1200**.

  Dit is technische headroom voor de altijd actieve thinking plus zichtbare tekst, geen gewenste lengte. Ongewijzigd
  blijven: `claude-opus-5-5`, chat `low` / feedback `medium`, `participant-chat/v1`, `participant-feedback/v1.1`,
  `maxRetries: 0` en geen fallback. `max_tokens` blijft `output_truncated`.
- **Metadata** (`certum.preview_runtime`, per providerrespons): `stopReason`, `inputTokens`, `outputTokens`,
  `maxTokens`, `effort`, `promptVersion`, `visibleChars`, `visibleWords`, `contentBlockTypes` en `thinkingBlockPresent`.
  - Er komt geen aantal thinking-tokens, omdat de API dat niet apart geeft; het wordt ook niet afgeleid.
  - Er wordt geen tekst gelogd.
- **Expliciete betaalde retry:**
  - Na `output_truncated` toont het feedbackblok "De feedback kon niet volledig worden gegenereerd.", met een aparte
    actie "Feedback opnieuw genereren" en de tekst "Dit start een nieuwe AI-aanroep."
  - Er is geen automatische retry en "Verder" blijft dicht tot er complete feedback is.
  - Eén UI-actie start hooguit één call tegelijk (single flight; ook een dubbele klik binnen één render).
  - **Chat:** de eerste versie van 17E vereiste na een afgekapt chatantwoord een nieuw bericht. Dat veranderde het
    gesprek inhoudelijk en is in de slotcorrectie hieronder hersteld.
- **Browserbewijs (mocks, TR-0018, 0 Claude-calls):** `hardening-proof-17e.json`.
  - De gewone chat en de gewone feedback werken.
  - Afgekapte feedback toont de expliciete stand, zonder "Feedback ophalen".
  - Na 3 s volgt geen automatische call.
  - Een dubbele klik op "Feedback opnieuw genereren" start precies 1 nieuwe call.
  - De logs bevatten alleen aantallen en bloktypes, geen inhoud.

### Step 17E: slotcorrectie voor afgekapte chatantwoorden

Na een afgekapt chatantwoord moest de deelnemer een nieuw bericht schrijven. Dat veranderde het gesprek. Een technische
mislukking mag de deelnemer nooit dwingen tot een andere beurt.

- **Gedrag:**
  - Na `output_truncated` blijft het verstuurde bericht A één keer zichtbaar als openstaande beurt. Er wordt geen
    gedeeltelijk antwoord getoond.
  - De chat toont "Het antwoord kon niet volledig worden gegenereerd.", met de actie "Antwoord opnieuw genereren" en de
    tekst "Dit start een nieuwe AI-aanroep voor dezelfde gespreksbeurt."
  - Zolang de beurt openstaat, is er geen invoerveld; een nieuw bericht B kan dus niet per ongeluk meegaan.
  - Er is geen automatische retry. Een dubbele klik start hooguit één call.
- **Semantiek** (`chatRequestFor` / `applyChatResult` in `components/studio/preview/preview-state.ts`):
  - de retry stuurt exact dezelfde geschiedenis van vóór de call plus hetzelfde bericht A;
  - het resultaat is nooit "geschiedenis + A + A" en nooit "geschiedenis + A + B";
  - pas bij succes wordt het paar A → antwoord vastgelegd;
  - andere weigeringen, zoals privacy, laten het gesprek ongewijzigd en maken geen retry-stand;
  - de server is ongewijzigd: elke poging gaat opnieuw door attestatie, privacycheck en de goedgekeurde stand.
- **Mock:** de marker `#afkappen-eenmaal` kapt de eerste poging voor exact die beurt af; een nieuwe poging slaagt.
- **Tests:** pure tests voor de chatstand, plus DB-tests:
  - een identieke retry-aanvraag bevat A één keer in de providergeschiedenis;
  - de retry wordt gelogd als `error`/`max_tokens` gevolgd door `success`/`end_turn`;
  - een retry omzeilt de privacycheck niet;
  - de logs blijven contentvrij.
- **Browserbewijs (mocks, TR-0018, 0 Claude-calls):** `hardening-proof-17e-chat.json`.
  1. De deelnemer verstuurt één bericht.
  2. De mock geeft `max_tokens`.
  3. Het bericht staat één keer in beeld.
  4. De expliciete retry-actie verschijnt.
  5. De retry slaagt; een dubbele klik gaf precies 1 nieuwe call.
  6. Het gesprek bevat één deelnemersbeurt en één AI-antwoord.
  7. Er volgde geen automatische tweede call.

## Step 17F: laatste volledige live sessie, van Start tot Einde

Een nieuwe sessie op codebasis `ffac2c5`. Datum: 2026-10-05. Mohamed was de deelnemer; Claude Code voerde niets in en
las alleen metadata.
- **Opzet:** alleen `CERTUM_PREVIEW_PROVIDER=claude`; de generatieproviders stonden op mock (vooraf gecontroleerd).
  De usage probe stond op 0 (`usage-17f.jsonl`).
- **Instellingen:** chat `claude-opus-5-5` / `low` / `max_tokens` 1200 / `participant-chat/v1`; feedback
  `claude-opus-5-5` / `medium` / `max_tokens` 4000 / `participant-feedback/v1.1`; `maxRetries: 0`, geen fallback.
- **Uitkomst:** de sessie is afgerond van Start tot Einde, zonder harde stopconditie.

### Metadata (geen inhoud)

| # | Soort | Blok | Input | Output | stop_reason | Zichtbaar (woorden / tekens) | Thinking-blok | Duur |
| --- | --- | --- | ---: | ---: | --- | --- | --- | ---: |
| 1 | chat | blok-2 (Actie) | 2.540 | 257 | end_turn | 84 / 444 | ja | 5,9 s |
| 2 | feedback | blok-4 | 2.454 | 1.607 | end_turn | 475 / 2.791 | ja | 18,0 s |
| 3 | chat | blok-6 (Transfer) | 2.291 | 183 | end_turn | 50 / 239 | ja | 4,5 s |
| 4 | chat | blok-6 | 2.635 | 249 | end_turn | 66 / 328 | ja | 12,1 s |
| 5 | chat | blok-6 | 3.040 | 165 | end_turn | 44 / 229 | ja | 3,6 s |
| 6 | feedback | blok-8 | 3.175 | 1.592 | end_turn | 462 / 2.719 | ja | 18,3 s |

- **Calls:** 6 live calls (4 chat, 2 feedback), allemaal HTTP 200.
- **Tokens:** 16.135 input, 4.053 output. Geschatte kosten: ongeveer $0,15.
- **Retries en fouten:** 0 technische retries, 0 `output_truncated` en 0 fouten. De serverlog toont precies 6 server
  actions.
- **Privacy:** 6 besluiten, allemaal toegestaan.
  - Actie: 0 bevindingen.
  - Transfer: 6 bevindingen `possible_person_name`, alle 6 vrijgesteld via de goedgekeurde zichtbare context.
  - 0 blokkades.
- **Tokenbudget bevestigd:**
  - beide feedbackcalls gebruikten in totaal meer dan het oude plafond van 1500 tokens (1607 en 1592) en eindigden op
    `end_turn`;
  - de zichtbare feedback bleef binnen het v1.1-budget (475 en 462 woorden);
  - iedere respons had een thinking-blok. Het aantal thinking-tokens geeft de API niet apart; dat is niet afgeleid.

### Productvragen (antwoorden van Mohamed, letterlijk)

1. **Voelde je daadwerkelijk druk in het eerste gesprek?** Ja. Niet overdreven of toneelmatig, maar wel voldoende. De
   zorgcoördinator nam geen genoegen met alleen “ik mag dit niet delen” en vroeg concreet door: hoe moet school dan
   handelen, hangt het verzuim met thuis samen, wat kan ik wél doen? Daardoor moest ik mijn positie echt verder
   uitwerken.
2. **Reageerde de zorgcoördinator op wat jij zei, of vooral generiek?** Duidelijk op wat ik zei. Mijn eerste reactie
   verschoof het gesprek naar doel, noodzaak en wat school zelf ziet. Haar vervolgvraag sloot daar direct op aan. Het
   voelde niet als een vooraf geschreven standaardreactie.
3. **Moest je je antwoord onderweg aanpassen?** Ja. Eerst ging mijn antwoord vooral over de grens van
   informatiedeling. Daarna moest ik preciezer worden: niet alleen geen details delen, maar ook geen causaal verband
   bevestigen én tegelijk school handelingsperspectief bieden. Dat is leren tijdens het gesprek.
4. **Had je het gevoel dat meerdere professionele routes mogelijk waren?** Ja. Ik voelde nergens dat ik één magische
   formulering moest vinden. Ik had bijvoorbeeld meer kunnen delen, strakker kunnen begrenzen, eerst meer vragen kunnen
   stellen of de jongere sterker kunnen betrekken. De simulatie corrigeerde mij niet naar één “juiste” route.
5. **Voelde de tweede simulatie wezenlijk anders?** Ja, en dit vond ik sterk. Het eerste gesprek had institutionele
   druk: samenwerking, informatiebehoefte, school moet handelen. De tweede was relationeler: een bezorgde mentor, “het
   blijft tussen ons”, persoonlijk vertrouwen, machteloosheid. Daardoor moest mijn communicatie ook anders worden.
6. **Was de reflectie nuttig of voelde die als extra schrijfwerk?** Overwegend nuttig, maar dit blijft een
   aandachtspunt. Na het gesprek had ik daadwerkelijk iets om op terug te kijken. De vraag hielp mij benoemen wat ik
   had gedaan en wat ik een volgende keer anders zou doen. Tegelijk blijft het een behoorlijk tekstueel onderdeel; dit
   moet niet verder uitdijen.
7. **Had de feedback waarde ondanks dat hij het chatgesprek zelf niet zag?** Ja, met een duidelijke beperking. De
   feedback was inhoudelijk bruikbaar en bleef eerlijk: hij zei expliciet dat hij alleen mijn eigen beschrijving
   kende. Dat vind ik veel beter dan doen alsof hij mijn gespreksvaardigheden rechtstreeks heeft gezien. Maar echte
   feedback op formulering, toon en timing kan pas als chatcontext later aantoonbaar beschikbaar wordt.
8. **Voegde de Bron op het juiste moment iets toe?** Ja. Dit werkte voor mij juist omdat de theorie pas ná handelen,
   reflectie en feedback kwam. Ik had al keuzes gemaakt en kon de beroepscode/NJi-inzichten naast mijn eigen handelen
   leggen. Daardoor voelde het niet als “eerst een hoofdstuk lezen”.
9. **Voelde de hele training als één leerervaring?** Ja. Dit is een van de sterkste uitkomsten. Context → gesprek →
   reflectie → feedback → bronnen → nieuw gesprek → reflectie → feedback voelde als één boog. De tweede simulatie
   maakte duidelijk waarom de Bron ertussen zat.
10. **Zou jij hier als professional ongeveer een uur voor vrijmaken?** Ja. Vooral omdat een aanzienlijk deel niet
    bestaat uit lezen maar uit reageren, afwegen en opnieuw toepassen. 66 minuten voelt voor deze casus verdedigbaar.
11. **Zou jij hiervoor betalen?** In de rol van de professional: ja, mits dit de kwaliteitsstandaard blijft. Zeker
    wanneer er een duidelijke professionele opbrengst, certificaat en later accreditatie aan gekoppeld is. Voor een
    verzameling open vragen zou mijn antwoord nee zijn geweest. Voor deze ervaring niet.
12. **Zou jij dit aan een collega aanraden?** Ja. Vooral met de omschrijving: “Je krijgt niet alleen theorie over
    privacy en samenwerken; je moet het gesprek daadwerkelijk voeren en daarna opnieuw toepassen in een andere
    situatie.” Dat is onderscheidend genoeg om door te vertellen.

### Eindoordeel (Mohamed)

| Onderdeel | Oordeel | Toelichting |
| --- | --- | --- |
| Runtime conversation | **YES** | De persona reageerde inhoudelijk, hield druk en dwong tot precisering. |
| Transfer | **YES** | De tweede situatie was geen kopie met andere namen; de aard van de druk veranderde en daardoor ook de benodigde communicatie. |
| Feedback experience | **YES_WITH_NOTES** | Inhoudelijk waardevol en technisch eerlijk, maar feedback op werkelijk chatgedrag ontbreekt nog. |
| Whole training experience | **YES_AFTER_EDIT** | De kern staat. Voor commerciële publicatie nog letten op formulering, compactheid en kleine repetities, maar geen fundamentele herbouw meer. |
| **Flight-simulator promise** | **PROVEN_FOR_PILOT** | Bewust *for pilot*: niet bewezen dat iedere door Certum gemaakte simulatie goed is, wel één volledige keten aantoonbaar werkend. |

Die keten: praktijkdilemma → AI-ontwerp → interactieve simulatie → echte runtime-tegendruk → reflectie → eerlijke
feedback → gevalideerde kennis → andere simulatie → transfer.

**Aandachtspunten uit de evaluatie (WATCH, niet opgelost):**
- `reflection_textual_load`: de reflectie is nuttig maar tekstueel; niet laten uitdijen.
- `feedback_without_chat_context`: feedback op formulering, toon en timing vraagt chatcontext die de catalogus nu niet
  aantoont.
- Voor publicatie: formulering, compactheid en kleine repetities.

**Besluit van Mohamed:** stoppen met fundamentele Studio-architectuur. De volgende fase is productiseren: TR-0018 als
verkoopbaar Bureau Certum-product en het commerciële systeem eromheen, daarna SKJ/accreditatie, prijs, certificering
en website/propositie.
