# services

Koppelingen met de buitenwereld, elk achter een eigen interface. Modules en UI praten alleen met deze interfaces, nooit
rechtstreeks met een SDK of database. Services draaien alleen server-side (`import "server-only"`).

| Map | Contract | Implementaties |
| --- | --- | --- |
| `analysis/` | `TrainingAnalysisService`: Certum Analyse | `MockTrainingAnalysisService`, `ClaudeTrainingAnalysisService` |

## analysis/

- `config.ts`: provider-keuze (`CERTUM_ANALYSIS_PROVIDER`) en de Claude-instellingen (model, effort, limieten).
- `factory.ts`: maakt de gekozen implementatie aan, met metadata-logging eromheen. Valt nooit stil terug op de mock.
- `errors.ts`: `AnalysisError` met een provider-onafhankelijk `kind`.
- `logging.ts`: logt alleen metadata, nooit inhoud.
- `claude/`: Anthropic SDK, structured output via `InputAnalysisSchema`.
- `mock/`: vaste, fictieve analyses.

Later komen hier ook `storage/` (database/opslag) en `lms/` (de externe leeromgeving van Bureau Certum).
