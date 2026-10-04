# Persistence proof: Supabase PostgreSQL (2026-10-04)

Echte infrastructuurproof van de Certum Training Record V1 (Step 11B) tegen de Supabase development database. Bevat
bewust geen hostnames, gebruikers, wachtwoorden of andere connection details.

| | |
| --- | --- |
| Datum | 2026-10-04 |
| Database | Supabase PostgreSQL 17 |
| Regio | Frankfurt, EU (`eu-central-1`) |
| Verbinding | Server-side `DATABASE_URL` via de Supabase Session pooler (IPv4); de publishable key is niet gebruikt |
| Migratieversie | `001_certum_training_record.sql` |
| Client | `postgres` (postgres.js), `prepare: false` |

## Resultaten

| Controle | Resultaat |
| --- | --- |
| Connection (`select 1`) | PASS |
| Migratie, eerste run | PASS (`applied`) |
| Migratie, tweede run (idempotent) | PASS (`already_applied`) |
| Schema-introspectie | PASS: `schema_migrations`, `training`, `training_input`, `artifact_revision`, `workflow_event`; alle foreign keys, de unieke revisieconstraint, check constraints, indexen en beide append-only triggers aanwezig |
| Persistence reload (schrijven → client sluiten → nieuwe client → herladen) | PASS: trainingcode, input-hash, gekozen richting en Blueprint-payload gelijk; geen client state nodig |
| Hash integrity | PASS: opgeslagen en herberekende `content_hash` gelijk aan de oorspronkelijke |
| Approval na reconnect | PASS: Blueprint server-side approved |
| Append-only revision | PASS: `UPDATE artifact_revision` geweigerd door de database |
| Append-only event | PASS: `UPDATE workflow_event` geweigerd door de database |
| Revisienummering | PASS: revision 2 current, revision 1 intact (payload en hash) |
| Approval-overerving / staleness | PASS: revision 2 niet approved (`no_decision`), revision 1 niet meer geldig (`not_current`) |

## Bevinding tijdens de proof (opgelost)

De eerste echte run werd door de database geweigerd (`training_input_acknowledgements_check`). postgres.js
serialiseert een parameter van type `jsonb` zelf met `JSON.stringify`; de repository gaf al JSON-tekst mee, waardoor
JSON dubbel gecodeerd (als JSON-string) zou zijn opgeslagen. PGlite gedraagt zich anders, dus de lokale tests zagen dit
niet. De check constraints hielden het tegen; er is niets ongeldigs opgeslagen (de transactie werd teruggedraaid).

Oplossing: JSON- en array-parameters gaan als tekst mee en worden in SQL omgezet (`$n::text::jsonb`,
`$n::text::uuid[]`), driver-neutraal. Een regressietest controleert de opgeslagen JSON-typen.

## Achtergebleven development-records

`npm run test:db` voert alleen deze ene gecontroleerde keten uit (de volledige suite draait op PGlite). Revisions en
events zijn append-only en blijven staan.

| Code | Titel | Inhoud |
| --- | --- | --- |
| `TR-0001` | `[development proof] persistence smoke` | Alleen het trainingsrecord (afgebroken run, vóór de fix) |
| `TR-0002` | `[development proof] persistence smoke` | Alleen het trainingsrecord (diagnoserun, vóór de fix) |
| `TR-0003` | `[development proof] persistence smoke` | 1 input (synthetische fixture CA-006), 3 artifact revisions (analysis, Blueprint v1, Blueprint v2), 2 workflow events (`direction_selected`, `approved`) |

Totaal: 3 trainingen, 1 training_input, 3 artifact_revisions, 2 workflow_events. Uitsluitend synthetische data.
Iedere volgende `npm run test:db` voegt één prooftraining toe.

## Step 11C: resume-proof (persistence cut-over)

`npx vitest run --config vitest.db.config.mts src/app/trainings/workflow/persisted-workflow.supabase.test.ts`: de
persisted workflow met MOCK-providers (0 Claude-aanroepen) tegen dezelfde database. Keten: nieuwe training →
analyse → richting → Blueprint → goedkeuren → Block Plan → goedkeuren → Training Content (alle blokken; Bron
deterministisch) → één blok goedkeuren → client sluiten → nieuwe verbinding → training heropenen.

| Controle | Resultaat |
| --- | --- |
| Zelfde training en code | PASS |
| Zelfde gekozen richting | PASS |
| Blueprint- en Block Plan-goedkeuring intact | PASS |
| Content revisions intact (zelfde revision-ids per blok) | PASS |
| Reviewstatus intact (1 goedgekeurd) | PASS |
| Juiste resume-state (`content_review`) | PASS |
| Content Package reconstrueert identiek | PASS |

Doorlooptijden van deze run (ms, Supabase via de Session pooler): start en analyse 2.860, richting 1.310, Blueprint
2.162, Blueprint goedkeuren 1.976, Block Plan 3.378, Block Plan goedkeuren 4.741, Training Content 40.364, blok
goedkeuren 11.016, heropenen 9.455. De lange tijden komen van veel kleine queries per stap (recursieve approvalcontrole
per revision en per blok); zie CLAUDE.md, "Bekend aandachtspunt (prestatie)".

### Achtergebleven development-records (Step 11C)

| Code | Herkomst | Inhoud |
| --- | --- | --- |
| `TR-0004` | Persisted browserflow (mock) | 1 input, 14 revisions (incl. een geregenereerd blok), 5 events |
| `TR-0005` | Eerste resume-proof, afgebroken door de testtime-out van 60 s (vóór de blokgoedkeuring) | 1 input, 13 revisions, 3 events |
| `TR-0006` | Resume-proof, geslaagd | 1 input, 13 revisions, 4 events |

Uitsluitend synthetische invoer (een fictieve praktijkvraag). Niet verwijderd: ze documenteren de proof.

## Step 11D: persistence performance

`CERTUM_PERF_RUNS=3 npx vitest run --config vitest.db.config.mts src/services/storage/persistence-performance.supabase.test.ts`:
per run één `[development performance]`-training (synthetische praktijkvraag, mock-providers, 0 Claude-aanroepen).
Gemeten met een inhoudsvrije queryteller (`instrumented-db.ts`: aantallen, DB-tijd, statische querytekst; nooit
parameters of inhoud). Zelfde machine, zelfde Supabase-database (Frankfurt, Session pooler; ~87 ms per round-trip).

### Vóór (baseline, 1 run, `TR-0007`)

| Actie | Queries | DB-tijd | Totaal |
| --- | --- | --- | --- |
| Heropenen (3×) | 88 | ~7,65 s | 7,65 / 7,67 / 7,65 s |
| Blokgoedkeuring (3 opeenvolgende blokken) | 124 / 139 / 154 | 10,9–13,4 s | 11,0 / 12,3 / 13,5 s |
| Mock-contentgeneratie | 448 | 39,3 s | 40,2 s |
| Trainingenlijst (7 trainingen) | 432 | 37,7 s | 37,8 s |

Oorzaak: N+1. De approvalregel liep recursief per revision met losse queries (`getCurrentArtifactRevision`,
`getArtifactRevision`, `listWorkflowEvents`), voor iedere upstream revision en ieder blok opnieuw; de lijst deed dat per
training. Bij een blokbesluit groeide het aantal queries met het aantal eerder goedgekeurde blokken.

### Ná (3 runs: `TR-0008`, `TR-0009`, `TR-0010`)

| Actie | Queries | Run 1 (cold-ish) | Run 2 | Run 3 | Representatief |
| --- | --- | --- | --- | --- | --- |
| Heropenen | 4 | 169 / 178 / 176 ms | 189 / 177 / 170 ms | 174 / 175 / 175 ms | ~0,18 s |
| Blokgoedkeuring | 8 (constant) | 632 / 656 / 686 ms | 594 / 606 / 619 ms | 614 / 653 / 645 ms | ~0,63 s |
| Mock-contentgeneratie | 48 | 4.962 ms | 4.904 ms | 4.932 ms | ~4,9 s |
| Trainingenlijst | 5 | 322 ms (8 trainingen) | 284 ms (9) | 357 ms (10) | ~0,3 s |

DB-tijd is opgeteld per query; omdat de snapshotqueries gelijktijdig lopen, kan die som hoger zijn dan de totale tijd.
Alle V1-doelen gehaald (heropenen < 2 s, blokbesluit < 2 s, contentgeneratie < 8 s). Resterend bij contentgeneratie:
per opgeslagen artifact een vaste write van vier round-trips (vergrendelen, revisions, events, insert).

### Achtergebleven development-records (Step 11D)

| Code | Herkomst |
| --- | --- |
| `TR-0007` | Performance-baseline (vóór optimalisatie) |
| `TR-0008`, `TR-0009`, `TR-0010` | Performance-proof (ná optimalisatie), 3 runs |
| `TR-0011` | Persisted browserflow (mock) ná optimalisatie |

Uitsluitend synthetische invoer; niet verwijderd.

