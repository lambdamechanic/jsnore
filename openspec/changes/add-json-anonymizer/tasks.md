## 1. Proposal Tasks (spec-driven)
- [x] Validate OpenSpec change bundle: `openspec validate add-json-anonymizer --strict`

## 2. Implementation Tasks (after approval)
- [x] Add library API to anonymize a JSON value with cached mapping
- [x] Seed PRNG from `crypto` randomness and generate same-length replacement strings
- [x] Add CLI tool to read JSON from stdin/file and output anonymized JSON
- [x] Add unit + property tests (mapping stability, same-length strings, numbers unchanged)
- [x] Document usage and caveats in README
