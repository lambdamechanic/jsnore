export function greet(name: string): string {
  return `hello ${name}`;
}

export {
  escapeJsonMaskKey,
  joinJsonMaskPath,
  renderJsonMaskSegment,
  type JsonMaskSegment
} from "./segments.js";

export type { EnumeratedNode, EnumeratedNodeKind } from "./enumerate.js";
export { enumerateNodes } from "./enumerate.js";
export { MISSING, isMissing, missingAwareEqual, type Missing } from "./missing.js";
export { generateWildcardCandidates } from "./candidates.js";
export {
  evaluateConstancy,
  gatherInstanceValues,
  isPathConstant,
  type ConstancyResult
} from "./constancy.js";
export { buildMaskTree, createMaskTree, addPathToMaskTree, type MaskTree } from "./maskTree.js";
export { renderJsonMask, renderJsonMaskFromPaths } from "./renderMask.js";
export { deriveMask, type DeriveMaskOptions } from "./deriveMask.js";
export { anonymizeJson, createAnonymizer, type AnonymizeOptions, type Anonymizer } from "./anonymize.js";
