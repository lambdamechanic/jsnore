# jsnore

Derive a `json-mask` projection from a single JSON document to slim it by dropping fields that are constant across wildcard-expanded paths.

## CLI

Build once:

```bash
npm run build
```

### Read from stdin (default: derive + slim)

```bash
cat input.json | npm run -s cli
```

### Read from a file (default: derive + slim)

```bash
npm run -s cli -- input.json
```

### Print the derived mask (`--mask`)

```bash
npm run -s cli -- --mask --min-hits 3 input.json
```

### Apply an explicit mask (`--apply-mask`)

```bash
npm run -s cli -- --apply-mask 'items(id,name)' input.json
```

### Output formatting

```bash
npm run -s cli -- --pretty input.json
npm run -s cli -- --compact input.json
```

## Anonymizing JSON

`jsonymous` anonymizes a single JSON document by replacing **all string keys** and **all string values** with pseudorandom strings of the **same length**. Conversions are cached within a run so repeated strings map consistently. Numbers and booleans are left unchanged (date strings are treated as strings).

```bash
cat input.json | jsonymous > anonymized.json
cat input.json | jsonymous --pretty
jsonymous --compact input.json
```

## Library

```ts
import mask from "json-mask";
import { deriveMask } from "@jsnore/lib";

const doc = { items: [{ id: 1, type: "t", extra: "a" }, { id: 2, type: "t", extra: "b" }] };

const expr = deriveMask(doc, { minHits: 2 });
const slimmed = expr === "" ? {} : mask(doc, expr);
```

## Notes

- Missing vs present: if a field is present in some wildcard instances and missing in others, it is not treated as constant.
- Constant containers: if a container (object/array) value is constant, its entire subtree is dropped from the derived mask.
- Array indices: derived masks never include index-specific segments like `items/0/...` (array indices are always wildcarded).
- Escaping: keys containing `/`, `,`, `(`, `)`, `\\`, or literal `*` are escaped when rendered into a `json-mask` expression.
- Empty masks: the CLI treats an empty derived mask (`""`) as “keep nothing”, not “keep everything”.
