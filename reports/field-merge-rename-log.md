# Field Merge / Rename Log

## Taxonomy consolidation

- `themes` → merged into `knowledgeAreas` (record display)
- `knowledgeAreas` retained as primary broad classification level
- `concepts` retained as idea-level classification
- `tags` retained as retrieval-level terms
- Duplicate terms across `knowledgeAreas`, `concepts`, and `tags` now deduplicated by precedence:
  1. Knowledge areas
  2. Concepts
  3. Tags

## Provenance display naming

- `source_institution` displayed as **Source metadata**
- `ared_editorial` displayed as **Added by ARED**
- `community` displayed as **Community contributed**
- `machine_suggested` displayed as **Machine suggested**
- `imported_dataset` displayed as **Source metadata** (pipeline import context)

## Community contribution labels

- `note` replaced by explicit contribution types:
  - Local knowledge
  - Correction
  - Alternative name
  - Oral history
  - Family history
  - Translation
  - Context
  - Disputed interpretation
  - Additional source
  - General response
