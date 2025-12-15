# anonymize-json (delta)

## ADDED Requirements
### Requirement: Anonymize string keys and string values
The library SHALL provide an API that anonymizes a JSON value by replacing all object keys that are strings and all JSON string values with anonymized strings of the same length.

#### Scenario: Replace string keys and values
- **GIVEN** a JSON value containing nested objects and arrays
- **AND** the value contains object keys and string values
- **WHEN** anonymization is performed
- **THEN** every string key and string value is replaced with an anonymized string of the same length

### Requirement: Preserve non-string primitives
The library SHALL preserve non-string primitives: numbers, booleans, and null SHALL remain unchanged.

#### Scenario: Numbers unchanged
- **GIVEN** a JSON value containing numeric fields
- **WHEN** anonymization is performed
- **THEN** numeric values are unchanged

### Requirement: Cache conversions within a run
The library SHALL cache string conversions during a single anonymization run such that if a source string is converted once, its anonymized value is reused for all further conversions in that run.

#### Scenario: Stable mapping within one run
- **GIVEN** a JSON value where the same source string appears multiple times (as keys and/or values)
- **WHEN** anonymization is performed
- **THEN** every occurrence is replaced with the same anonymized string

### Requirement: Seed generation from real randomness
The library SHALL seed its pseudorandom generator using a real source of randomness provided by the runtime (`crypto`).

#### Scenario: Random seed initialization
- **GIVEN** the tool is executed
- **WHEN** anonymization begins
- **THEN** a cryptographically strong randomness source is used to initialize the PRNG state

### Requirement: Dates treated as plain strings
The library SHALL treat date-like strings as plain strings and SHALL NOT attempt to parse or normalize dates.

#### Scenario: Date strings are anonymized like any other string
- **GIVEN** a JSON value containing ISO8601-like strings
- **WHEN** anonymization is performed
- **THEN** those strings are anonymized as strings without date parsing

