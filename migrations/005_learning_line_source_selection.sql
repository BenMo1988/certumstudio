-- Bronvoorstel per module (Gate Compression V1): welke bestaande, eerder door een mens gevalideerde bibliotheekpassages
-- bij welke sourceNeed passen. Alleen ids, geen tekst; opgeslagen samen met het voorlopige plan van dezelfde
-- Blueprint-revision. Raakt alleen de leerlijntabellen; bestaande rijen krijgen een lege selectie.

alter table learning_line_module_plan
  add column source_selection jsonb not null default '{}'::jsonb check (jsonb_typeof(source_selection) = 'object');
