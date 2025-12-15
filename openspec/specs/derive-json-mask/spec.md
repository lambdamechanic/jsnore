# derive-json-mask Specification

## Purpose
Define the requirements for the library API that derives a single `json-mask` projection string from one JSON document, enabling “slimming” by excluding fields that are constant across wildcard-expanded paths.
## Requirements
### Requirement: Derive a json-mask projection from a single JSON document
The library SHALL provide an API that derives a `json-mask` projection string from a single JSON document.

#### Scenario: Derive a mask from a document
- **GIVEN** a JSON document value in memory
- **WHEN** the caller requests a derived mask with default options
- **THEN** the library returns a deterministic `json-mask` projection string that is a single valid `json-mask` expression

### Requirement: Detect constants via wildcard-expanded paths
The library SHALL evaluate generalized paths that include one or more wildcard segments (`*`) and mark them as constant when all matching values are deeply equal and the number of matches meets the configured minimum hit threshold.

#### Scenario: Mark a wildcard path constant with sufficient hits
- **GIVEN** a document where `items/*/type` exists in at least `minHits` locations
- **AND** every `items/*/type` value is deeply equal
- **WHEN** deriving the mask
- **THEN** `items/*/type` is excluded from the resulting projection

### Requirement: Support multiple wildcards with no configured maximum
The library SHALL support generalized paths with multiple wildcard segments and SHALL be capable of producing a path where every segment is a wildcard when warranted by the input.

#### Scenario: Fully wildcarded path in degenerate data
- **GIVEN** a document where the same value repeats across many distinct concrete paths
- **WHEN** deriving the mask
- **THEN** the library may treat a fully wildcarded generalized path as constant (subject to `minHits` and deep equality)

### Requirement: Handle array indices without specialization
The library SHALL treat array indices as wildcardable path segments and SHALL wildcard numeric index segments (no specialization by index).

#### Scenario: Avoid index-specific masks
- **GIVEN** a document with an array field `items` containing multiple objects
- **WHEN** deriving the mask with index wildcarding enabled
- **THEN** the returned mask uses `items/*/...` rather than index-specific paths like `items/0/...`

### Requirement: Allow constant detection for container values
The library SHALL allow constant detection for container values (objects and arrays), not only leaf values.

#### Scenario: Remove a constant object subtree
- **GIVEN** a document where `items/*/metadata` exists for at least `minHits` instances
- **AND** every `items/*/metadata` value is deeply equal as a JSON object
- **WHEN** deriving the mask
- **THEN** `items/*/metadata` is excluded from the resulting projection

### Requirement: Treat missing as distinct from present
The library SHALL treat missing as distinct from any present JSON value when evaluating generalized paths.

#### Scenario: Missing vs present prevents constancy
- **GIVEN** a generalized path where some instances yield a JSON value and others yield missing
- **WHEN** deriving the mask
- **THEN** that generalized path is not treated as constant

### Requirement: Deterministic output
The library SHALL produce deterministic output for the same input document and options.

#### Scenario: Stable mask string
- **GIVEN** the same JSON document and options across runs
- **WHEN** deriving the mask multiple times
- **THEN** the returned mask string is identical

### Requirement: Enforce 100% test coverage via Vitest
The project SHALL enforce 100% test coverage for the library as measured by Vitest coverage thresholds.

#### Scenario: Coverage gate
- **GIVEN** a change that reduces test coverage below 100%
- **WHEN** tests are run in CI with coverage enabled
- **THEN** the test run fails due to coverage thresholds

### Requirement: Prefer property tests for core behavior
The project SHALL prefer property tests (via `minitsis` + `minitsis-node`) for validating the core library behavior and invariants, using classic unit tests only when a property-based approach is not reasonable.

#### Scenario: Core invariants validated via properties
- **GIVEN** core invariants such as determinism, index wildcarding, and missing-vs-present semantics
- **WHEN** tests are written for these behaviors
- **THEN** the tests are primarily expressed as property tests rather than example-only unit tests

### Requirement: Prefer parenthesis grouping when possible
The library SHALL produce a single `json-mask` expression string and SHOULD use `json-mask` sub-selection parentheses grouping when it can do so without changing semantics.

#### Scenario: Group sibling selections
- **GIVEN** a document where `items/*/id` and `items/*/name` are selected by the derived mask
- **WHEN** the mask is emitted
- **THEN** the emitted mask may use grouping like `items/*(id,name)` rather than separate siblings

### Requirement: Escape key segments per json-mask rules
The library SHALL escape key segments according to `json-mask` rules so that keys containing reserved characters are represented correctly in the resulting mask.

#### Scenario: Select a key containing a slash
- **GIVEN** a document containing a key with `/` in its name
- **WHEN** deriving the mask
- **THEN** the derived mask escapes the key segment in a way that `json-mask` interprets as the original key name
