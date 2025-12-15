# derive-json-mask (delta)

## MODIFIED Requirements
### Requirement: Treat missing as distinct from present
The library SHALL treat missing as distinct from any present JSON value when evaluating generalized paths, unless configured to ignore missing.

#### Scenario: Missing vs present prevents constancy by default
- **GIVEN** a generalized path where some instances yield a JSON value and others yield missing
- **WHEN** deriving the mask with default options
- **THEN** that generalized path is not treated as constant

## ADDED Requirements
### Requirement: Allow configuring missing semantics
The library SHALL allow callers to configure how missing values affect constancy evaluation.

#### Scenario: Ignore missing for constancy
- **GIVEN** a generalized path where some instances yield missing
- **AND** all present instance values are deeply equal
- **AND** the number of present (non-missing) hits meets `minHits`
- **WHEN** deriving the mask with missing semantics set to `ignore`
- **THEN** that generalized path is treated as constant

#### Scenario: Ignore missing does not treat all-missing as constant
- **GIVEN** a generalized path where every instance yields missing
- **WHEN** deriving the mask with missing semantics set to `ignore`
- **THEN** that generalized path is not treated as constant

