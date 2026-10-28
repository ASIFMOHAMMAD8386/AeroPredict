# Dataset generation source

`generate_dataset.mjs` preserves the original seeded data-generation equation and airport order.
Run from the project root: `node src/data/generate_dataset.mjs`.
It writes to `dataset/regenerated/` and does not overwrite the submitted CSVs.
The spreadsheet-only preview step and old workspace paths have been removed.
`original_generator_reference.mjs` is the unchanged historical source for provenance;
it uses old workspace paths and an authoring dependency, so use the portable script to run it.
These are fictional educational records, not flight-provider or airline observations.
