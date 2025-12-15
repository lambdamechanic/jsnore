# Design: add-json-slimmer

## Overview
The system derives a `json-mask` projection that keeps fields which are *not* constant across wildcard-expanded paths.

High-level flow:
1. Enumerate concrete paths in the JSON document, including container nodes (objects/arrays) and leaf values.
2. Generate generalized candidate paths by replacing one or more segments with `*` (numeric array indices are always treated as `*`).
3. For each generalized path, gather all matching concrete values (“hits”).
4. Treat missing as a distinct value: if some instances are missing and others present, the generalized path is not constant.
5. If instanceCount ≥ `minHits` and all instance values are deeply equal, treat the generalized path as *constant* (deletable).
5. Build a `json-mask` projection that includes the concrete/wildcard paths that remain after excluding deletable constant paths.
6. CLI applies the derived mask to output the slimmed JSON document, or prints the mask.

## Path Model
- Paths are sequences of segments.
- Object keys are segments.
- Array indices are numeric segments which are always generalized to `*`, so we never generate index-specialized masks.
- The `json-mask` string uses `/` between segments and supports `*` wildcard segments.

## Candidate Generation
Baseline (simple) approach:
- Enumerate all concrete paths (containers + leaves).
- For each concrete path, produce generalized forms by replacing combinations of segments with `*`.
- Deduplicate candidates.

Notes:
- Supporting multiple wildcards without a user-defined maximum makes the naive powerset approach expensive for deep paths. A first implementation can start straightforwardly and add optimizations later (e.g., trie-based merging, early conflict detection, and candidate pruning driven by observed value differences).

## Constant Detection
- Instances: the set of wildcard expansions implied by the generalized path. Each instance yields either a present JSON value or a sentinel “missing”.
- Constant condition: `instanceCount >= minHits` AND `deepEqual(all instance values)`.

## Mask Construction
The derived mask should:
- Include all non-deletable leaf paths, generalized using `*` where appropriate (e.g., `items/*/id`).
- Exclude any leaf path whose generalized form is deemed constant/deletable.
- Be deterministic: stable ordering and canonical formatting.

The mask string SHOULD be emitted as a single `json-mask` expression (a single string), and SHOULD be compressed using `json-mask` sub-selection notation (parentheses) when possible (e.g., `items/*(id,name)`).

## Container Path Semantics
When a container path (object/array) is treated as constant and excluded, that exclusion is understood to remove the entire subtree at that path.

Example:
- If `items/*/metadata` is constant, the mask will omit `metadata` under `items/*`, which implicitly drops `items/*/metadata` and all its descendants in the slimmed output.
- A descendant such as `items/*/metadata/foo` would only be included if we chose to include `metadata(foo)` under `items/*`, which would contradict the decision that `items/*/metadata` is constant (given deep equality).

## Escaping
Mask generation must escape path segments per `json-mask` rules so that keys containing reserved characters can be addressed reliably (e.g., a key containing `/` must be escaped as shown in `json-mask` examples like `app.kubernetes.io\\/name`).

## CLI vs Library
- Library: exports a function that returns the derived mask string and accepts options.
- CLI: thin wrapper around the library; supports `--mask` to print the mask or outputs slimmed JSON by applying the mask.
