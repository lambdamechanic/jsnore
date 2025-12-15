# json-slim-cli Specification

## Purpose
Define the requirements for the CLI that reads one JSON document and outputs either a derived `json-mask` projection or a slimmed JSON document produced by applying that derived mask.
## Requirements
### Requirement: Read a single JSON document
The CLI SHALL accept exactly one JSON document as input, from either a file path argument or stdin.

#### Scenario: Read from stdin
- **GIVEN** valid JSON on stdin
- **WHEN** the CLI is executed without an input file argument
- **THEN** the CLI reads stdin as the input JSON document

#### Scenario: Read from a positional file argument
- **GIVEN** a path to a JSON file passed as the first positional argument
- **WHEN** the CLI is executed
- **THEN** the CLI reads that file as the input JSON document

### Requirement: Output a derived mask or slimmed JSON
The CLI SHALL support outputting either the derived `json-mask` projection string or a slimmed JSON document produced by applying the derived mask.

#### Scenario: Print derived mask
- **GIVEN** a valid input JSON document
- **WHEN** the CLI is invoked with `--mask`
- **THEN** the CLI prints the derived mask string to stdout

#### Scenario: Print slimmed JSON by default
- **GIVEN** a valid input JSON document
- **WHEN** the CLI is invoked without `--mask`
- **THEN** the CLI prints the slimmed JSON document to stdout

### Requirement: Configure constant detection threshold
The CLI SHALL provide a `--min-hits` option that controls the minimum number of matches required for a wildcard path to be considered constant.

#### Scenario: Increase min-hits threshold
- **GIVEN** an input document where some wildcard path has fewer than `N` matches
- **WHEN** the CLI runs with `--min-hits N`
- **THEN** that wildcard path is not treated as constant due to insufficient hits

### Requirement: Configure wildcard generalization
The CLI SHALL derive masks that support multiple wildcard segments, including fully wildcarded paths, and SHALL always wildcard numeric array indices (no specialization by index).

#### Scenario: No index-specific output
- **GIVEN** an input document with arrays
- **WHEN** the CLI derives a mask
- **THEN** the derived mask does not include index-specific paths like `items/0/...`

### Requirement: Control JSON output formatting
When outputting slimmed JSON, the CLI SHALL allow controlling formatting.

#### Scenario: Pretty output
- **GIVEN** a valid input JSON document
- **WHEN** the CLI runs with `--pretty`
- **THEN** the CLI prints formatted JSON with indentation

#### Scenario: Compact output
- **GIVEN** a valid input JSON document
- **WHEN** the CLI runs with `--compact`
- **THEN** the CLI prints JSON without unnecessary whitespace
