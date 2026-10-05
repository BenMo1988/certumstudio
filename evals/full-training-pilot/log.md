# Full Training Pilot 1: werklog

Lopend logboek van operatorbeslissingen en calls. Training **TR-0014** (`0ff3cc98-453a-46fc-ac1e-8a5dd0e37a32`),
Supabase dev. Providers: Analysis, Blueprint, Block Plan en Block Content op Claude (`claude-opus-5-5`, `medium`,
`maxRetries: 0`, ook `CERTUM_ANALYSIS_MAX_RETRIES=0`). Usage per call via een fetch-probe buiten de productcode
(alleen model, tokens, stop_reason, status, duur).

## Stappen

| # | Stap | Beslissing / actie (operator) | Calls | Resultaat |
| --- | --- | --- | --- | --- |
| 1 | Intake (casus, [frozen input](input.md)) | Attestatie synthetic_only; preflight `safe` | 1 (Analysis) | `ready`, 3 richtingen, alle `open_choice` |
| 2 | Richting | **Gekozen:** "Omgaan met het geheimhoudingsverzoek van de jongere" (`vertrouwelijkheid-jongere`). Kern van het dilemma (vertrouwen ↔ zorg om veiligheid); meest waardevol en verkoopbaar. Richting 1 (telefoontje moeder) is smaller, richting 3 abstracter. | 1 (Blueprint) | Blueprint, `multiple_defensible_actions`, 3 sourceNeeds |
| 3 | Blueprint-review | **Goedgekeurd.** Sterk, trouw aan casus en richting; route-neutrale feedback; echte transfer. Aandachtspunt: SN3 (organisatiewerkwijze) is geen publieke kennisbehoefte maar een vraag aan de eigen organisatie. Geen regeneratie. | 1 (Block Plan) | Block Plan, 9 blokken, 1 capability gap (AI Feedback-context, partial workaround) |
| 4 | Block Plan-review | **Goedgekeurd met notities.** Coherent; gap eerlijk benoemd; SN3 bewust open in Bron. Aandachtspunt: Actie bestaat alleen uit open vragen (geen Chat simulatie met het meisje). Niet geregenereerd: regeneratie is niet stuurbaar en het plan is didactisch verantwoord. | 0 | – |
| 5 | Training Content maken | Gestart | 5 (frame, blok-1, -2, -3, -4 ✗) | blok-4 `invalid-output` (`structured_output`); stop met melding in de UI |
| 6 | "Ontbrekende blokken genereren" | Technische herstart na fout (geen inhoudelijke regeneratie) | 4 (blok-4 ✓, -5, -7, -8 ✗) | blok-8 `invalid-output` (`structured_output`) |
| 7 | "Ontbrekende blokken genereren" | Technische herstart na fout | 2 (blok-8 ✓, -9) | Alle genereerbare blokken klaar; blok-6 (Bron) `needs_source` zonder call |

Stand na stap 7: **14 calls**, 177 692 input- en 26 929 outputtokens, 312 s providerduur; 2 mislukte calls
(beide `certum.bco.open-vraag`, `structured_output`, `stop_reason: end_turn`).

## Eerste observaties (nog geen eindreview)

- Blok-1 introduceert zelf namen met achternaam ("Lotte", "Ingrid de Wit"); Start, blok-2 en blok-7 spreken van
  "het meisje" (inconsistent; WATCH `persona_fact_drift`).
- Vraagdichtheid: blok-2 en blok-4 stapelen vier à vijf deelvragen (WATCH `reflection_question_density`).
- Totale geschatte duur zonder Bron: 70 minuten (Start/Einde zonder eigen schatting).
- Transfer (blok-7) is sterk: de situatie verschuift wezenlijk (jongen drong aan op afspreken bij hem thuis,
  meisje heeft het zelf beëindigd, berichten gaan door).

## Pauze vóór bronnen

Volgens instructie 4 gestopt vóór de bronselectie: echte bronnen vragen actuele webresearch.

## Besluit bronnen (Bureau Certum, 2026-10-05)

- **SN1 en SN2:** Claude Code doet webresearch en stelt exacte passages voor ([sources-proposal.md](sources-proposal.md));
  de menselijke operator controleert, voert in en valideert. Claude Code valideert niets. 0 Claude API-calls.
- **SN3: optie B.** Geen vervangende generieke meldcodebron. SN3 blijft bewust uncovered: de vraag is
  organisatiespecifiek en de synthetische pilot heeft geen werkelijk organisatieprotocol.
- **Productbevinding `organisation_specific_source_need`:** Certum kan nog niet uitdrukken dat een kennisbehoefte
  organisatiegebonden is en in een generieke training niet centraal ingevuld hoeft te worden. Gevolg in V1: het
  Bron-blok vereist dekking van alle sourceNeeds (SN1–SN3) en blijft daardoor `needs_source`; Training gereed is
  niet bereikbaar. Geen fout van de bronengine; geen workaround.

## Broninvoer en validatie (2026-10-05)

| Ronde | Wat er in `relevantContent` stond | Gevalideerd? |
| --- | --- | --- |
| 1 (operator) | Alleen de URL (src-1: URL niet in het URL-veld, titel "Beroepscode-2021") | ja, alle vier |
| 2 (operator, "Corrigeren") | Alleen de titel | ja, alle vier |
| 3 (Claude Code via "Corrigeren", optie B) | De afgesproken passages, exact gelijk aan [sources-proposal.md](sources-proposal.md): src-1 v4 (4 098 tekens), src-2 v3 (1 350), src-3 v4 (967, alleen signalen), src-4 v3 (1 304) | **nee**: "Nog controleren", wacht op menselijke validatie |

Na ronde 3: SN1, SN2 en SN3 tijdelijk niet gedekt (nieuwe versies zijn nog niet gevalideerd), Bron `needs_source`,
0 nieuwe Claude-calls. Een leeg veld werd terecht geweigerd (`too_small@relevantContent`).

**UX-bevindingen (geen gebruikersfout, niet gerepareerd tijdens de pilot):**

- **`source_validation_visibility`** (zwaarst): de validator kan een bron goedkeuren zonder dat de daadwerkelijke
  `relevantContent` prominent wordt getoond (de inhoud staat ingeklapt onder "Relevante inhoud"). Twee rondes
  validatie van inhoudsloze bronnen door een operator die wist wat er moest staan.
- **`url_only_relevant_content`** (WATCH): een URL (of een titel) als tekst wordt technisch geaccepteerd als
  `relevantContent`.

## Review, edits en goedkeuring (2026-10-05, providers mock, 0 calls)

| # | Stap | Beslissing / actie (operator) | Calls | Resultaat |
| --- | --- | --- | --- | --- |
| 8 | Bronstatus | Gecontroleerd: SN1 ✓ (src-1 v4, src-2 v3), SN2 ✓ (src-3 v4, src-4 v3), SN3 open, Bron `needs_source`, readiness `incomplete` | 0 | ok |
| 9 | Inhoudelijke review | Alle onderdelen in trainingsvolgorde beoordeeld (zie [report.md](report.md)) | 0 | 4 × EDIT, overige OK, Bron BLOCKER (product) |
| 10 | Handmatige edits | blok-1, blok-2, blok-4, blok-8 via de bestaande editor (v1 → v2, handmatig) | 0 | nieuwe revisions opnieuw bekeken |
| 11 | Goedkeuring | blok-1 t/m 5, 7 t/m 9, Vaste Start, Vast Einde goedgekeurd; Bron niet (bestaat niet) | 0 | 10 van 11 onderdelen goedgekeurd; "1 bron ontbreekt" |

Eindstand: readiness `incomplete`, stage `content_review`, **PRODUCT_BLOCKER: `organisation_specific_source_need`**.
Totaal 14 Claude-calls (2 mislukt), 0 inhoudelijke regenerations, 4 handmatige edits.
