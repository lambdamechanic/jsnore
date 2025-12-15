export type JsonMaskSegment =
  | { type: "key"; key: string }
  | { type: "index" }
  | { type: "wildcard" };

export function escapeJsonMaskKey(key: string): string {
  if (key === "*") return "\\*";

  let escaped = "";
  for (const char of key) {
    if (char === "\\" || char === "," || char === "/" || char === "(" || char === ")") {
      escaped += `\\${char}`;
    } else {
      escaped += char;
    }
  }
  return escaped;
}

export function renderJsonMaskSegment(segment: JsonMaskSegment): string {
  if (segment.type === "wildcard") return "*";
  if (segment.type === "index") return "*";
  return escapeJsonMaskKey(segment.key);
}

export function joinJsonMaskPath(segments: JsonMaskSegment[]): string {
  return segments.map(renderJsonMaskSegment).join("/");
}
