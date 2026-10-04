-- Certum Source V1 (Step 13A): bronnen als immutable revisions in het Training Record.
--
-- Een bron is een artifact van de training met dezelfde levenscyclus als de andere artifacts: versies (immutable,
-- content_hash), een menselijk besluit op exact één versie (validatie = workflow_event `approved`) en afhankelijkheden
-- via based_on_revision_ids (een gegenereerd Bron-blok verwijst naar de gebruikte bronversies). Migratie 001 blijft
-- ongewijzigd; deze migratie verruimt alleen de twee check constraints.

alter table artifact_revision drop constraint artifact_revision_artifact_type_check;
alter table artifact_revision add constraint artifact_revision_artifact_type_check check (artifact_type in
  ('analysis', 'blueprint', 'block_plan', 'start_content', 'end_content', 'block_content', 'source'));

-- source: een stabiele key per bron (src-1, src-2, …) over alle versies heen.
alter table artifact_revision drop constraint artifact_revision_key_check;
alter table artifact_revision add constraint artifact_revision_key_check check (
  (artifact_type = 'block_content' and artifact_key ~ '^blok-[1-9][0-9]*$')
  or (artifact_type = 'source' and artifact_key ~ '^src-[1-9][0-9]*$')
  or (artifact_type not in ('block_content', 'source') and artifact_key = 'main')
);
