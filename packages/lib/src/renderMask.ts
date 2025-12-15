import { renderJsonMaskSegment, type JsonMaskSegment } from "./segments.js";
import type { MaskTree, MaskTreeNode } from "./maskTree.js";
import { buildMaskTree } from "./maskTree.js";

function sortNodes(nodes: Iterable<MaskTreeNode>): MaskTreeNode[] {
  const list = Array.from(nodes);
  list.sort((a, b) => {
    const aKey =
      a.segment.type === "key" ? a.segment.key : a.segment.type === "index" ? "\u0000" : "\u0001";
    const bKey =
      b.segment.type === "key" ? b.segment.key : b.segment.type === "index" ? "\u0000" : "\u0001";
    return aKey.localeCompare(bKey);
  });
  return list;
}

function renderProps(nodes: Iterable<MaskTreeNode>): string {
  return sortNodes(nodes).map(renderNode).join(",");
}

function renderNode(node: MaskTreeNode): string {
  if (node.segment.type === "index") {
    throw new Error("Index nodes must be rendered by their parent key");
  }

  const segmentText = renderJsonMaskSegment(node.segment);
  if (node.children.size === 0) return segmentText;

  const childList = sortNodes(node.children.values());

  if (node.segment.type === "key") {
    const indexChildren = childList.filter((child) => child.segment.type === "index");
    const nonIndexChildren = childList.filter((child) => child.segment.type !== "index");

    if (indexChildren.length === 1) {
      const indexNode = indexChildren[0];
      const inside = renderProps(indexNode.children.values());
      if (nonIndexChildren.length === 0) return `${segmentText}(${inside})`;

      const rest = renderProps(nonIndexChildren);
      return `${segmentText}(${inside},${rest})`;
    }

    if (childList.length === 1) {
      return `${segmentText}/${renderNode(childList[0])}`;
    }

    return `${segmentText}(${renderProps(childList)})`;
  }

  // wildcard (object wildcard)
  if (childList.length === 1) {
    return `${segmentText}/${renderNode(childList[0])}`;
  }
  return `${segmentText}(${renderProps(childList)})`;
}

export function renderJsonMask(tree: MaskTree): string {
  const roots = sortNodes(tree.children.values());
  return roots.map(renderNode).join(",");
}

export function renderJsonMaskFromPaths(paths: JsonMaskSegment[][]): string {
  const tree = buildMaskTree(paths);
  return renderJsonMask(tree);
}
