# json-slim-cli (delta)

## ADDED Requirements
### Requirement: Configure missing semantics
The CLI SHALL provide a way to configure whether missing values are treated as distinct or ignored during constancy evaluation when deriving the mask.

#### Scenario: Default missing semantics is distinct
- **GIVEN** a valid input JSON document
- **WHEN** the CLI derives a mask without specifying missing semantics
- **THEN** missing vs present prevents constancy (default `distinct` semantics)

#### Scenario: Ignore missing semantics for derivation
- **GIVEN** a valid input JSON document
- **WHEN** the CLI derives a mask with missing semantics set to `ignore`
- **THEN** generalized paths may be treated as constant based only on present hits (subject to `minHits`)

