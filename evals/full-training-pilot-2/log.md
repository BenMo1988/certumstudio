# Full Training Pilot 2 (Simulation Production Proof): werklog

Training **TR-0018** (`e4726c9f-03b1-4bf3-8350-d57efb3cd625`), Supabase dev. Providers Analysis, Blueprint, Block Plan
en Block Content op Claude (`claude-opus-5-5`, `medium`, `maxRetries: 0`, ook `CERTUM_ANALYSIS_MAX_RETRIES=0`). Usage
per call via de fetch-probe buiten de productcode (alleen model, tokens, stop_reason, status, duur), apart van Pilot 1.
Codebasis: `1d48fce` (na 15A en 15B); geen prompt-, schema- of productcodewijzigingen tijdens de pilot.

## Stappen

| # | Stap | Beslissing / actie | Calls | Resultaat |
| --- | --- | --- | --- | --- |
| 0 | Lokale Privacy Preflight (geen netwerk) | Vóór de eerste call gecontroleerd | 0 | `safe`, 0 bevindingen, 1 282 tekens |
| 1 | Intake ([frozen input](input.md), casus) + Analysis | Attestatie synthetic_only via de UI | 1 (Analysis) | `ready`, 3 richtingen, alle `open_choice`; 11 segmenten; 0 epistemische markeringen |

Call 1: 7 920 input- en 3 583 outputtokens, 36,2 s, `end_turn`, HTTP 200.

**STOP voor de menselijke richtingkeuze.** Geen Blueprint- of downstreamcalls vóór het besluit van Bureau Certum.
Export: [record/01-analysis.json](record/01-analysis.json).

## Richtingkeuze (Bureau Certum, 2026-10-05)

**Gekozen: richting 2, `uitleg-en-samenwerking`, "Terughoudendheid uitleggen en samenwerking werkbaar houden".**
Reden (Mohamed): test precies wat Pilot 2 moet bewijzen: handelen in een spannend gesprek met echte tegendruk, zonder
één juiste formulering. Richting 1 riskeert opnieuw vooral een schriftelijke afweging; richting 3 draait vooral om het
ontbrekende protocol (bron-/scopegedrag is al bewezen). Geen werkvorm vooraf voorgeschreven.

| # | Stap | Beslissing / actie | Calls | Resultaat |
| --- | --- | --- | --- | --- |
| 2 | Richting vastleggen + Blueprint | Via de UI ("Gebruik deze trainingsrichting"); geen regeneratie | 1 (Blueprint) | Blueprint revision 1, `multiple_defensible_actions`, `gesprek_voeren`, 2 sourceNeeds; niet goedgekeurd |

Call 2: 9 111 input- en 3 322 outputtokens, 32,3 s, `end_turn`, HTTP 200.

**STOP voor de menselijke Blueprint-review.** Niets goedgekeurd, geen scopes gekozen, geen Block Plan.
Export: [record/02-blueprint.json](record/02-blueprint.json).

## Blueprint-review (Bureau Certum, 2026-10-05)

**Besluit: APPROVE.** Scopes door de opleider: SN1 → `professional`, SN2 → `professional`. Er is geen
organisatiegebonden sourceNeed in deze Blueprint; er is er geen kunstmatig toegevoegd.

- Reviewnotitie **`pressure_persistence_not_explicit`**: de Blueprint vestigt duidelijk professionele druk en een
  interactief gesprek, maar "de professionele grens vasthouden terwijl de druk aanhoudt" staat niet expliciet in de
  succescriteria. Geen blocker; observeren of Block Plan en simulatie dit operationaliseren.
- WATCH `persona_fact_drift`: het verzonnen geslacht van de zorgcoördinator ("haar"). Niet bewerkt, niet geregenereerd.

| # | Stap | Beslissing / actie | Calls | Resultaat |
| --- | --- | --- | --- | --- |
| 3 | Scope Review | SN1 en SN2 → professional via de UI; "Classificatie opslaan" | 0 | Blueprint revision 2 (`manual-edit`); server-side gecontroleerd: alleen `scope` toegevoegd, rest identiek, `based_on` gelijk |
| 4 | Goedkeuring revision 2 + Block Plan | "Blueprint goedkeuren" (start in de Studio de Block Plan-generatie); geen regeneratie | 1 (Block Plan) | 8 blokken, 2 capability gaps; Actie = Chat simulatie; niet goedgekeurd |

Call 3: 10 255 input- en 5 028 outputtokens, 45,4 s, `end_turn`, HTTP 200.

**STOP voor de menselijke Block Plan-review.** Geen override, geen inhoud, geen bronnen.
Exports: [record/03-blueprint-scoped.json](record/03-blueprint-scoped.json), [record/04-block-plan.json](record/04-block-plan.json).

## Block Plan-review (Bureau Certum, 2026-10-05)

**Besluit: APPROVE AS IS, geen Block Plan Override.** De Block Plan-agent koos zelf een Chat simulatie voor het
kernmoment in Actie en een tweede Chat simulatie voor transfer, behoudt `open_choice`, vraagt een reagerende
gesprekspartner, realistische druk en een vervolgreactie. De pressure-persistence-configuratie is bewust niet vooraf
aangescherpt. Blijven WATCH: `pressure_persistence_not_explicit`, `reflection_question_density`,
`persona_fact_drift`; capability gap `ai_feedback_text_context_gap`.

| # | Stap | Beslissing / actie | Calls | Resultaat |
| --- | --- | --- | --- | --- |
| 5 | Block Plan goedkeuren | Via de UI | 0 | Block Plan revision 1 goedgekeurd |
| 6 | Training Content maken | Eén keer, normale flow; geen bronnen | 8 (Start/Einde, blok-1, -2, -3, -4, -6, -7, -8 ✗) | blok-8 (Toets · AI Feedback) `invalid-output` (`structured_output`); Bron (blok-5) `needs_source` zonder call |
| 7 | "Ontbrekende blokken genereren" | Technische herstart na fout (geen inhoudelijke regeneratie) | 1 (blok-8 ✓) | Alle genereerbare blokken klaar; geen bewerkingen, geen goedkeuringen |

Contentgeneratie: 9 calls, 126 419 input- en 14 454 outputtokens, 165,9 s; 1 mislukte call (blok-8, 13 991 / 1 893
tokens, 21,1 s). De geslaagde tweede poging van blok-8 heeft `instructions` van 2 882/3 000 tekens (96 %); de mislukte
poging produceerde meer output. Dat ondersteunt de diagnose `open_question_structured_output_failure` (lengte alleen
client-side gecontroleerd), nu ook bij AI Feedback.

Pilot 2 cumulatief: 12 calls, 153 705 input- en 26 387 outputtokens, 279,7 s; 1 mislukte call, 1 technische herstart,
0 inhoudelijke regeneraties.

**STOP vóór redactie en goedkeuring van inhoud.** Export: [record/05-content.json](record/05-content.json).

## Inhoudelijke review (Bureau Certum, 2026-10-05)

**Voorlopig oordeel vóór menselijke redactie: SIMULATION_CONTENT = PASS_WITH_NOTES.** Het gegenereerde materiaal
haalde dit oordeel zonder enige handmatige wijziging. De Action-chat is een gesprek waarin de zorgcoördinator
reageert, druk zet en pas geleidelijk meebeweegt. Nog niet runtime-bewezen: de persona is configuratie; spelen kan pas
met Participant Preview.

Daarna vijf gerichte trainer-edits voor publicatiekwaliteit (geen regeneratie, geen wijziging van de leerarchitectuur;
alle via de bestaande editor; providers mock; 0 calls):

| # | Blok | Versie voor | Wijziging | Reden | Versie na |
| --- | --- | --- | --- | --- | --- |
| 1 | blok-1 Context (Tekst) | v1 (gegenereerd) | "Daan" → "de jongere", "Ilse de Vries" → "de zorgcoördinator"; voornaamwoorden voor de jongere neutraal; casusfeiten gelijk | Verzonnen namen en inconsistentie met de chat (persona_fact_drift) | v2 (handmatig) |
| 1+2 | blok-2 Actie (Chat simulatie) | v1 | Personanaam "Ingrid Verhoeven" → "Zorgcoördinator"; geen naam of onnodige voornaamwoorden in persona-instructies en context; toegevoegd: na een heldere eerste uitleg normaal gesproken minstens één geloofwaardige vervolgvraag of tegenpositie, redelijk en niet vijandig, geen vaste formulering, responsief. `goal: null`, geen sleutelwoorden, open keuze intact | Continuïteit; `pressure_persistence_not_explicit` (publicatiekant) | v2 (handmatig) |
| 3 | blok-3 Reflectie (Open vraag) | v1 | Vraag van 534 naar 276 tekens: wat gedeeld en hoe reageerde de zorgcoördinator, welke belangen het zwaarst, wat volgende keer hetzelfde of anders | Vraagdichtheid (5 opdrachten, 89 % van de limiet); eigen weergave blijft voor de feedback | v2 (handmatig) |
| 4 | blok-6 Toets (Chat simulatie) | v1 | Leeftijd Noor 16 → 15 (context en persona-instructies); rest van de transfer gelijk (andere partner, gang, relationele druk, vervolgdruk, andere jongere) | Geen leeftijdsgebonden juridische variabele toevoegen; transfer van de vaardigheid testen | v2 (handmatig) |
| 5 | blok-7 Toets (Open vraag) | v1 | Vraag van 384 naar 236 tekens: wat hetzelfde of anders, hoe reageerde de mentor en waarom; welke afweging hergebruikt en wat vroeg deze situatie anders | Vraagdichtheid; genoeg eigen weergave voor de feedback | v2 (handmatig) |

Iedere nieuwe revision is server-side gecontroleerd: alleen de bedoelde velden gewijzigd, geen verzonnen namen meer in
de primaire casus, geen "16" meer in de transfer, `goal` blijft `null`, geschatte minuten ongewijzigd. Feedbackblokken
niet bewerkt (hun beperking is technisch eerlijk). Niets goedgekeurd. Export: [record/06-after-edits.json](record/06-after-edits.json).

Bronvoorstel voorbereid (niet ingevoerd, niet gevalideerd): [sources-proposal.md](sources-proposal.md).

## Bronbesluit en invoer (2026-10-05)

Bureau Certum heeft de drie passages tegen de huidige pagina's gecontroleerd: **A → SN1 + SN2, B → SN1, C → SN2**.

**Interpretatiegrens bron B:** de passage over 12–15 jaar gaat over informatie aan ouders met gezag. Bron B is geen
bewijs voor een specifieke regel over informatie delen met school. Voor derde-partij- en samenwerkingsdeling is bron A
de sterkere professionele grondslag. Dit wordt bij de Bron-generatie expliciet bewaakt.

| # | Stap | Actie | Calls | Resultaat |
| --- | --- | --- | --- | --- |
| 8 | Bronnen invoeren | A, B en C via Bronnen beheren → Bron toevoegen (Claude Code voert in, valideert niet) | 0 | src-1 (A, 3 488 tekens, SN1+SN2), src-2 (B, 1 221, SN1), src-3 (C, 1 970, SN2); alle drie "Nog controleren" |

Technisch gecontroleerd (export [record/07-sources-pending.json](record/07-sources-pending.json)): passages exact
gelijk aan [sources-proposal.md](sources-proposal.md), niet alleen titel of URL, URL in het URL-veld, datum alleen bij
A, sourceNeedRefs juist. SN1 en SN2 nog niet gedekt; Bron `needs_source`.

**STOP voor menselijke validatie door Mohamed.**

## Bron Generation Proof (2026-10-05)

Vooraf server-side gecontroleerd (export [record/08-sources-validated.json](record/08-sources-validated.json)): src-1,
src-2 en src-3 door Mohamed gevalideerd; SN1 en SN2 gedekt; Bron (blok-5) `needs_source` en klaar voor generatie
("Alle benodigde bronnen aanwezig · Bron-blok nog genereren"); sinds de vorige export alleen drie validatie-events,
geen andere wijzigingen; 12 calls.

| # | Stap | Actie | Calls | Resultaat |
| --- | --- | --- | --- | --- |
| 9 | Bron genereren | Alleen Block Content op Claude (rest mock); kaartactie "Bron-blok genereren", één keer | 1 (blok-5 ✗) | `invalid-output` in fase `structured_output`; geen nieuwe revision; blok-5 blijft v1 `needs_source` |

Call 13: 17 207 input- en **4 300 outputtokens** (ruim het hoogste van alle content-calls; vorige maximum 2 678), 43,5 s,
`end_turn`, HTTP 200. Provider direct daarna uitgezet. Geen herstart: de opdracht was één generatie.

Waarschijnlijke oorzaak (aannemelijk, niet bewezen, want de inhoud wordt bewust niet gelogd): het veld `text` van een
Tekst-blok heeft een maximum van 4 000 tekens dat alleen client-side (SDK-Zod) wordt gecontroleerd. In deze pilot is
een Tekst-blok van ±1 750 tekens ±970 outputtokens; 4 300 outputtokens wijst op een Bron-tekst van ruim boven de 4 000
tekens. De drie gevalideerde bronnen samen zijn 6 679 tekens. Derde waarneming van
`open_question_structured_output_failure` (zie [diagnose Pilot 1](../full-training-pilot/diagnosis-open-question.md)),
nu als **blokkade voor de Bron-fase**.

Pilot 2 cumulatief: 13 calls, 170 912 input- en 30 687 outputtokens, 323,2 s; 2 mislukte calls, 1 technische
herstart, 0 inhoudelijke regeneraties.

**STOP voor menselijk besluit.**

## Structured-output-diagnose en gecontroleerde Bron-retry (2026-10-05)

Expliciete toestemming van Bureau Certum voor één smal afgebakende observability-wijziging tijdens de pilot (optie 2:
eerst diagnose, zonder gedragswijziging). Commit `b1b6f24 feat: log content-free structured output diagnostics`:
Block Content parset met dezelfde semantiek als de SDK (JSON.parse, daarna safeParse op hetzelfde schema), maar meldt
een fout als inhoudsvrije code met de grens uit het schema (bijv. `too_big@result.content.text:max=4000`) of
`invalid_json`. Geen wijziging van prompt, schema, limieten, retry of generatie. Tests (4 nieuw, 689 totaal), lint en
build groen.

| # | Stap | Actie | Calls | Resultaat |
| --- | --- | --- | --- | --- |
| 10 | Gecontroleerde Bron-retry (technisch) | Alleen Block Content op Claude; kaartactie "Bron-blok genereren", één keer | 1 (blok-5 ✓) | `generated`, revision 2, 10 min, 3 680 tekens tekst; provenance: alle drie gevalideerde bronnen |

Call 14: 17 207 input- en 2 454 outputtokens, 26,0 s. **De retry slaagde; het probleem is daarmee niet verdwenen.** Bij
identieke input produceerde de mislukte poging 4 300 outputtokens; de geslaagde tekst gebruikt 3 680 van 4 000
tekens (92 %). De nieuwe diagnose is bij deze poging niet geraakt; de oorzaak blijft aannemelijk maar onbewezen.
Classificatie WATCH (geen blocker meer in deze pilot): `structured_output_length_budget`.

Pilot 2 cumulatief: 14 calls, 188 119 input- en 33 141 outputtokens, 349,2 s; 2 mislukte calls, 2 technische
herstarts (blok-8, Bron), 0 inhoudelijke regeneraties.

Export: [record/10-bron-generated.json](record/10-bron-generated.json). Niets goedgekeurd, niets bewerkt.
**STOP voor menselijke review van de Bron-grounding.**

## Bron-review en eindreview (Bureau Certum, 2026-10-05)

**BRON_GROUNDING = PASS_WITH_NOTES vóór menselijke redactie** (ruwe AI-Bron, revision 2). Daarna redactie voor
publicatiekwaliteit, geen reddingsactie (0 calls, providers mock):

| # | Stap | Actie | Calls | Resultaat |
| --- | --- | --- | --- | --- |
| 11 | Bron-redactie | Editor: "alleen" weg; bron C neutraal geformuleerd; geen "haar"; ingekort tot 2 624 tekens met 3 spiegelvragen; 10 → 6 min | 0 | blok-5 v3 (handmatig); alleen `text` en minuten gewijzigd; zelfde drie bronrevisions in `based_on`; niet stale |
| 12 | Bron-hercontrole | Claims grounded in A/B/C; bron B niet als schoolregel; geen absolute moet/nooit; geen organisatiebeleid of meldcode; SN1 en SN2 bediend | 0 | OK |
| 13 | Eindreview en goedkeuring | Alle current revisions beoordeeld; blok-1 t/m 8, Vaste Start en Vast Einde goedgekeurd via de UI | 0 | **Training gereed** (readiness `approved`, stage `training_ready`), 66 min |

Recordtitel automatisch gesynchroniseerd: "Terughoudendheid uitleggen onder druk in het MDO" (15A). Restpunt Vaste
Start: "Zij reageert…" (WATCH `persona_fact_drift`, niet blokkerend, niet bewerkt).

**Eindoordeel:** trainingkwaliteit **YES_AFTER_EDIT** · simulatieproductie **YES** · runtime-simulatie
**NOT_YET_PROVEN**. Zie [report.md](report.md). Eindexport: [record/12-final.json](record/12-final.json).
