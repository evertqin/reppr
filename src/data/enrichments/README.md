# Bundled enrichments

JSON files in this folder are merged into the exercise library at startup. Each file must validate against the `EnrichmentDoc` schema in `../enrichmentSchema.ts`.

Rules:
- New exercise `id` adds an exercise (must include all required fields).
- Existing `id` with empty seed fields fills them.
- Existing `id` with populated seed fields: enrichment ignored for that field.
