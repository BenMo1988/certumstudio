# Privacy Preflight Evals

Kwaliteitsbasis voor de **lokale Privacy Preflight**: de deterministische controle die Certum Studio uitvoert
vóórdat een tekst naar een externe AI-provider mag (`src/modules/privacy/`).

> Dit is geen productiecode. Deze map bevat uitsluitend synthetische testdata. Deze evals roepen **geen** externe
> AI aan; de preflight draait volledig lokaal.

## Wat "safe" betekent

**`safe` betekent niet anoniem.** Het betekent uitsluitend dat Privacy Preflight V1 geen direct herkenbare
identificatoren heeft gevonden. Namen, indirecte kenmerken en combinaties van kenmerken worden niet betrouwbaar
automatisch herkend.

## Waarom deze evals los staan

De Training Analysis-evals (`evals/training-analysis/`) beoordelen de inhoud van een analyse door een AI-provider.
Deze evals beoordelen iets anders: of de lokale privacypoort het juiste doet vóór er iets extern wordt verstuurd.
Ze hebben een eigen versie (`privacy-preflight/v1`) en kosten niets om te draaien.

## Waar we op beoordelen

| Criterium | Vraag |
| --- | --- |
| Status | Geeft de preflight de juiste status (`safe`, `review_required`, `blocked`)? |
| Categorieën | Worden de juiste categorieën gevonden, en geen valse treffers? |
| Ernst | Leiden zwakke signalen (namen, instellingen, losse datums) alleen tot review, nooit tot `blocked`? |
| Gate | Geeft de server-gate pas doorgang na geldige bevestigingen en de vereiste attestatie? |
| Binding | Vervallen bevestigingen na een tekstwijziging? |
| Geen schijnveiligheid | Presenteert het systeem `safe` nooit als anonimiteitsgarantie? |

## Traceerbaarheid en privacy van de runs

- Iedere run vermeldt `preflightVersion` (`PRIVACY_PREFLIGHT_VERSION` in `src/modules/privacy/types.ts`).
- Een run legt alleen categorieën en aantallen vast, **nooit de gevonden waarden**.

## Structuur

```
evals/privacy-preflight/
  README.md
  cases/
    PP-001-indirecte-herleidbaarheid/
      case.md        input + verwachtingen (verandert niet per run)
      runs/          één bestand per uitgevoerde run
```

## Statussen

| Status | Betekenis |
| --- | --- |
| `PASS` | Voldoet aan alle verwachtingen. |
| `FAIL` | Wijkt af van een verwachting. |
| `NOT_RUN` | Input en verwachtingen zijn vastgelegd; er is nog geen run uitgevoerd. |

## Overzicht

| Eval | Inputsoort | Wat wordt getest | Laatste run | Status |
| --- | --- | --- | --- | --- |
| [PP-001](cases/PP-001-indirecte-herleidbaarheid/case.md) | casus | Indirecte herleidbaarheid; geen schijngarantie | – | `NOT_RUN` |
| [PP-002](cases/PP-002-false-positive-datum/case.md) | praktijkvraag | Geen harde blokkade op cijfers en datums | – | `NOT_RUN` |
| [PP-003](cases/PP-003-mogelijke-persoonsnaam/case.md) | casus | Mogelijke voornaam alleen als review-signaal | – | `NOT_RUN` |

De PP-cases zijn eerder vastgelegd als CA-009 t/m CA-011 (commit `fce1bb2`), vóór de implementatie van de preflight.
