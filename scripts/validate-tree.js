#!/usr/bin/env node
// Validates src/data/tree.js: every outgoing edge resolves to a real node and
// every node is reachable from the entry. Exits non-zero on failure for CI.

import { TREE, START_NODE_ID } from "../src/data/tree.js";

const EXIT_OK = 0;
const EXIT_BROKEN_WIRING = 1;
const EXIT_TREE_NOT_FOUND = 2;

const ENTRY_NODE_CANDIDATES = [START_NODE_ID, "start_choice"];

function nodeKind(node) {
  if (node.choice) return "choice";
  if (node.info) return "info";
  if (node.result) return "result";
  return "question";
}

function outgoingEdges(node) {
  switch (nodeKind(node)) {
    case "choice": {
      const edges = (node.choices || [])
        .filter((c) => c.target)
        .map((c) => ({ label: c.label, target: c.target }));
      if (node.helpLink && node.helpLink.target) {
        edges.push({ label: "helpLink", target: node.helpLink.target });
      }
      return edges;
    }
    case "info":
    case "result":
      return (node.actions || [])
        .filter((a) => a.target)
        .map((a) => ({ label: a.label, target: a.target }));
    case "question":
      return [
        { label: "yes", target: node.yes },
        { label: "no", target: node.no },
      ].filter((e) => e.target);
    default:
      return [];
  }
}

function checkWiring(tree, ids) {
  let ok = true;
  for (const [id, node] of Object.entries(tree)) {
    for (const edge of outgoingEdges(node)) {
      if (!ids.has(edge.target)) {
        console.error(`Broken edge: ${id} -> ${edge.label} -> ${edge.target}`);
        ok = false;
      }
    }
  }
  return ok;
}

function reachableFrom(tree, entryId) {
  const seen = new Set();
  (function walk(id) {
    if (!id || seen.has(id)) return;
    if (!tree[id]) return;
    seen.add(id);
    for (const edge of outgoingEdges(tree[id])) walk(edge.target);
  })(entryId);
  return seen;
}

function pickEntry(ids) {
  for (const candidate of ENTRY_NODE_CANDIDATES) {
    if (ids.has(candidate)) return candidate;
  }
  return null;
}

function summarize(tree) {
  const counts = { question: 0, choice: 0, info: 0, result: 0 };
  for (const node of Object.values(tree)) counts[nodeKind(node)]++;
  return counts;
}

function main() {
  if (!TREE || typeof TREE !== "object") {
    console.error("TREE not found in src/data/tree.js");
    process.exit(EXIT_TREE_NOT_FOUND);
  }

  const ids = new Set(Object.keys(TREE));
  let ok = checkWiring(TREE, ids);

  const entryId = pickEntry(ids);
  if (!entryId) {
    console.error(`No entry node found. Expected one of: ${ENTRY_NODE_CANDIDATES.join(", ")}`);
    ok = false;
  }

  const reachable = entryId ? reachableFrom(TREE, entryId) : new Set();
  for (const id of ids) {
    if (!reachable.has(id)) {
      console.error(`Unreachable: ${id}`);
      ok = false;
    }
  }

  const counts = summarize(TREE);
  console.log(
    "Questions:",
    counts.question,
    "| Choice:",
    counts.choice,
    "| Info:",
    counts.info,
    "| Results:",
    counts.result,
    "| Reachable:",
    reachable.size,
    "/",
    ids.size,
    "| Entry:",
    entryId,
    "| Wiring OK:",
    ok
  );

  process.exit(ok ? EXIT_OK : EXIT_BROKEN_WIRING);
}

main();
