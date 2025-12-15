# json-anonymize-cli (delta)

## ADDED Requirements
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

### Requirement: Output anonymized JSON
The CLI SHALL output an anonymized JSON document by applying the anonymization rules from the library.

#### Scenario: Print anonymized JSON
- **GIVEN** a valid input JSON document
- **WHEN** the CLI is executed
- **THEN** it prints anonymized JSON to stdout

### Requirement: Preserve JSON validity
The CLI output SHALL be valid JSON.

#### Scenario: Output is parseable
- **GIVEN** any valid input JSON
- **WHEN** the CLI outputs anonymized JSON
- **THEN** the output can be parsed as JSON

