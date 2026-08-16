#!/usr/bin/env node
// Exhaustive answer-deterministic walker for src/data/tree.js.
//
// What this proves
// ----------------
// 1. Every path from start_choice (enumerated by picking every choice option
//    and every Yes / No branch on every question) eventually terminates at a
//    result or info node — no dead ends, no cycles inside answer-driven
//    navigation, no "Unknown step" terminals.
// 2. Every terminal result node has the structural fields the renderer
//    requires (title + at least one of paragraphs/bullets/computed).
// 3. Every terminal info node likewise has the structural fields the
//    renderer requires (title + paragraphs).
// 4. For each top-level profile branch in start_choice we record path
//    counts and a representative trail. This is the audit log a human can
//    eyeball to confirm coverage didn't silently shrink.
// 5. Frontline-routing smoke checks: certain shapes of answers MUST land
//    on result_frontline_computed; certain shapes MUST be routed away
//    (eligibility-No goes to IW, exclusion-Yes goes to IW, etc).
//
// What this does NOT prove
// ------------------------
// SKU-price math inside the frontline recommendation card. That's covered
// indirectly by the live browser scenarios already documented and could be
// added here later by inlining the BASE_SKUS / ADDONS constants from
// src/lib/pricing.ts — out of scope for the routing walker.

import { TREE, START_NODE_ID } from "../src/data/tree.js";

const EXIT_OK = 0;
const EXIT_FAIL = 1;

const ENTRY_ID = TREE[START_NODE_ID] ? START_NODE_ID : "start_choice";

// Hard cap so a future accidental cycle in answer-driven navigation fails
// the test instead of hanging CI. Real paths are well under 20 steps
// (longest is the full frontline wizard at ~15 questions).
const MAX_PATH_DEPTH = 40;

// Soft cap on total enumerated paths. Today the tree produces a few hundred;
// blowing past this many likely means someone accidentally introduced
// combinatorial branching that needs explicit review.
const MAX_TOTAL_PATHS = 20000;

const errors = [];
const warnings = [];

function err(msg) {
  errors.push(msg);
}
function warn(msg) {
  warnings.push(msg);
}

function nodeKind(node) {
  if (node.choice) return "choice";
  if (node.info) return "info";
  if (node.result) return "result";
  return "question";
}

/**
 * Enumerate every distinct answer-driven path from `startId`.
 *
 * The walker treats result and info nodes as terminals (the user can
 * navigate away from them via actions, but those are not "answer
 * decisions" the user is making — they're navigation aids). It branches
 * exhaustively at choice nodes (one path per choice target) and at
 * question nodes (one path for Yes, one for No, if both are wired).
 *
 * Returns { paths, truncated } where each path is
 *   { trail: Array<{id, label, kind}>, terminal: { id, kind } }.
 */
function enumeratePaths(tree, startId) {
  const paths = [];
  let truncated = false;

  function walk(id, trail, visitedQuestionIds) {
    if (paths.length >= MAX_TOTAL_PATHS) {
      truncated = true;
      return;
    }
    if (trail.length > MAX_PATH_DEPTH) {
      err(
        `Path depth exceeded ${MAX_PATH_DEPTH} starting from ${startId}; ` +
          `likely an answer-driven cycle. Trail head: ${trail
            .slice(0, 6)
            .map((s) => s.id)
            .join(" → ")}`
      );
      return;
    }
    const node = tree[id];
    if (!node) {
      err(
        `Walked to non-existent node "${id}". Last hop: ${trail[trail.length - 1]?.id ?? "(none)"}`
      );
      return;
    }
    const kind = nodeKind(node);
    if (kind === "result" || kind === "info") {
      paths.push({ trail, terminal: { id, kind } });
      return;
    }
    if (visitedQuestionIds.has(id)) {
      err(
        `Cycle: re-entered question/choice node "${id}" via trail ${trail
          .map((s) => `${s.id}:${s.label}`)
          .join(" → ")}`
      );
      return;
    }
    const nextVisited = new Set(visitedQuestionIds);
    nextVisited.add(id);

    if (kind === "choice") {
      const choices = (node.choices ?? []).filter((c) => c.target);
      if (choices.length === 0) {
        err(`Choice node "${id}" has no targets — would be a dead end.`);
        return;
      }
      for (const c of choices) {
        walk(c.target, [...trail, { id, label: c.label, kind: "choice" }], nextVisited);
      }
      return;
    }
    // question node
    const yes = node.yes;
    const no = node.no;
    if (!yes && !no) {
      err(`Question node "${id}" has no yes/no targets.`);
      return;
    }
    if (yes) {
      walk(yes, [...trail, { id, label: "Yes", kind: "question" }], nextVisited);
    }
    if (no) {
      walk(no, [...trail, { id, label: "No", kind: "question" }], nextVisited);
    }
  }

  walk(startId, [], new Set());
  return { paths, truncated };
}

/** Structural validation of result / info terminals. */
function validateTerminals(tree, paths) {
  const seenTerminals = new Set();
  for (const { terminal } of paths) {
    if (seenTerminals.has(terminal.id)) continue;
    seenTerminals.add(terminal.id);
    const node = tree[terminal.id];
    if (!node) {
      err(`Terminal "${terminal.id}" not in tree (should be unreachable).`);
      continue;
    }
    if (!node.title || typeof node.title !== "string") {
      err(`Terminal "${terminal.id}" is missing a string \`title\`.`);
    }
    if (terminal.kind === "result") {
      const hasBody =
        (Array.isArray(node.paragraphs) && node.paragraphs.length > 0) ||
        (Array.isArray(node.bullets) && node.bullets.length > 0) ||
        node.computed;
      if (!hasBody) {
        err(
          `Result "${terminal.id}" has no paragraphs, no bullets, and no \`computed\` — nothing to render.`
        );
      }
    } else if (terminal.kind === "info") {
      if (!Array.isArray(node.paragraphs) || node.paragraphs.length === 0) {
        err(`Info node "${terminal.id}" needs paragraphs.`);
      }
    }
  }
  return seenTerminals;
}

/**
 * Structural validation of the WHOLE tree (not just terminals reached by the
 * walker). These invariants protect content quality: every result needs a
 * `license` summary + `decisionBasis` paragraph + citations + a way for the
 * user to navigate away; every question needs a `rationale` block so the
 * "Why this question matters" disclosure has something to render; every
 * node target must exist.
 */
function validateStructural(tree) {
  const allIds = new Set(Object.keys(tree));

  for (const [id, node] of Object.entries(tree)) {
    const kind = nodeKind(node);

    // --- Broken target detection (every yes/no/choice.target/action.target
    // must reference a real node id) -------------------------------------
    if (kind === "question") {
      if (node.yes && !allIds.has(node.yes)) {
        err(`Question "${id}" yes-target "${node.yes}" does not exist.`);
      }
      if (node.no && !allIds.has(node.no)) {
        err(`Question "${id}" no-target "${node.no}" does not exist.`);
      }
    }
    if (kind === "choice") {
      for (const c of node.choices ?? []) {
        if (c.target && !allIds.has(c.target)) {
          err(`Choice "${id}" option "${c.label}" target "${c.target}" does not exist.`);
        }
      }
    }
    for (const a of node.actions ?? []) {
      if (a.target && !allIds.has(a.target)) {
        err(`Node "${id}" action "${a.label}" target "${a.target}" does not exist.`);
      }
    }
    if (node.helpLink?.target && !allIds.has(node.helpLink.target)) {
      err(
        `Node "${id}" helpLink "${node.helpLink.label}" target "${node.helpLink.target}" does not exist.`
      );
    }

    // --- Result-node content invariants ---------------------------------
    if (kind === "result") {
      // Computed result cards (frontline wizard) generate their own copy
      // from wizard state — they don't carry static license / decisionBasis.
      if (!node.computed) {
        if (!node.license || typeof node.license !== "string" || node.license.trim().length === 0) {
          err(`Result "${id}" is missing the \`license\` summary line.`);
        }
        if (
          !node.decisionBasis ||
          typeof node.decisionBasis !== "string" ||
          node.decisionBasis.trim().length === 0
        ) {
          err(`Result "${id}" is missing the \`decisionBasis\` paragraph.`);
        }
      }
      const sources = node.docs ?? node.techDocs ?? [];
      if (!Array.isArray(sources) || sources.length === 0) {
        err(`Result "${id}" must cite at least one source (\`docs\` or \`techDocs\`).`);
      }
      // The assessment client always renders a global Back / Restart row,
      // so a result without per-node `actions` is still navigable. We
      // surface missing per-node actions as a warning so authors can
      // decide whether the result deserves a "Continue → next add-on" or
      // "← Back to profile selector" affordance inline.
      if (!node.computed) {
        const actions = node.actions ?? [];
        if (!Array.isArray(actions) || actions.length === 0) {
          warn(
            `Result "${id}" has no per-node \`actions\` row — user falls back to the global Back / Restart buttons.`
          );
        }
      }
    }

    // --- Info-node content invariants -----------------------------------
    if (kind === "info") {
      const sources = node.docs ?? node.techDocs ?? [];
      if (!Array.isArray(sources) || sources.length === 0) {
        warn(`Info node "${id}" should cite at least one source (\`docs\` or \`techDocs\`).`);
      }
      const actions = node.actions ?? [];
      if (!Array.isArray(actions) || actions.length === 0) {
        warn(
          `Info node "${id}" has no per-node \`actions\` row — user falls back to the global Back / Restart buttons.`
        );
      }
    }

    // --- Question-node content invariants -------------------------------
    if (kind === "question") {
      if (!node.question || typeof node.question !== "string") {
        err(`Question "${id}" is missing the \`question\` prompt string.`);
      }
      if (!node.rationale || typeof node.rationale !== "object") {
        warn(
          `Question "${id}" has no \`rationale\` — the "why this question matters" disclosure will be empty.`
        );
      } else {
        if (!node.rationale.why) {
          warn(`Question "${id}" \`rationale.why\` is empty.`);
        }
        if (!node.rationale.yes && !node.rationale.no) {
          warn(
            `Question "${id}" \`rationale.yes\` and \`rationale.no\` are both empty — users get no per-branch explanation.`
          );
        }
      }
      const sources = node.techDocs ?? node.docs ?? [];
      if (!Array.isArray(sources) || sources.length === 0) {
        warn(`Question "${id}" should cite at least one \`techDocs\` source.`);
      }
    }

    // --- Step-metadata invariants ---------------------------------------
    if ((kind === "question" || kind === "choice") && node.step) {
      if (typeof node.step.major !== "number") {
        err(`Node "${id}" \`step.major\` must be a number.`);
      }
      if (node.step.sub != null && typeof node.step.sub !== "number") {
        err(`Node "${id}" \`step.sub\` must be a number when present.`);
      }
      if (node.step.subTotal != null && typeof node.step.subTotal !== "number") {
        err(`Node "${id}" \`step.subTotal\` must be a number when present.`);
      }
      if (
        node.step.sub != null &&
        node.step.subTotal != null &&
        node.step.sub > node.step.subTotal
      ) {
        err(
          `Node "${id}" \`step.sub\` (${node.step.sub}) exceeds \`step.subTotal\` (${node.step.subTotal}).`
        );
      }
    }
  }
}

/** Group paths by the immediate choice picked from start_choice. */
function groupByProfile(paths) {
  const groups = new Map();
  for (const path of paths) {
    const first = path.trail[0];
    const key = first?.label ?? "(direct)";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(path);
  }
  return groups;
}

/**
 * Routing smoke checks specific to the frontline wizard. These guard against
 * regressions where (a) frontline-ineligible users land on the computed
 * card anyway, or (b) eligible users get routed away from it.
 */
function frontlineRoutingChecks(tree, paths) {
  const FL_LABEL = (
    Object.entries(tree).find(([id]) => id === "start_choice")?.[1]?.choices ?? []
  ).find((c) => c.target === "q_frontline_eligibility")?.label;
  if (!FL_LABEL) {
    err(
      "start_choice no longer offers a path to q_frontline_eligibility — " +
        "frontline routing checks cannot run."
    );
    return;
  }
  const frontlinePaths = paths.filter((p) => p.trail[0]?.label === FL_LABEL);
  if (frontlinePaths.length === 0) {
    err("No paths flow through the frontline branch of start_choice.");
    return;
  }
  // Every frontline path must end EITHER at result_frontline_computed
  // (the wizard's computed card) OR be redirected into the IW knowledge-
  // worker tree (e.g. eligibility=No goes to q_iw_platform, which forks
  // into the M365 sub-tree via q_iw_security or the O365 sub-tree via
  // q_iw_o365_collab). Anything else is a misrouting.
  const allowedTerminals = new Set();
  // Walk forward from q_iw_platform to gather every IW terminal — that's
  // the legitimate redirection target for "this user isn't actually a
  // frontline worker".
  function gatherReachable(id, into) {
    if (!id || into.has(id)) return;
    into.add(id);
    const n = tree[id];
    if (!n) return;
    const kind = nodeKind(n);
    if (kind === "result" || kind === "info") return;
    if (kind === "choice") {
      for (const c of n.choices ?? []) gatherReachable(c.target, into);
    } else {
      gatherReachable(n.yes, into);
      gatherReachable(n.no, into);
    }
  }
  const iwReachable = new Set();
  gatherReachable("q_iw_platform", iwReachable);
  for (const id of iwReachable) {
    const n = tree[id];
    if (n && (n.result || n.info)) allowedTerminals.add(id);
  }
  allowedTerminals.add("result_frontline_computed");

  for (const p of frontlinePaths) {
    if (!allowedTerminals.has(p.terminal.id)) {
      err(
        `Frontline path lands at unexpected terminal "${p.terminal.id}". ` +
          `Trail: ${p.trail.map((s) => `${s.id}:${s.label}`).join(" → ")}`
      );
    }
  }

  // At least ONE frontline path must terminate at the computed card —
  // otherwise the wizard's entire reason for existing is dead code.
  const reachedComputed = frontlinePaths.some((p) => p.terminal.id === "result_frontline_computed");
  if (!reachedComputed) {
    err("No frontline path reaches result_frontline_computed.");
  }
}

function fmtTrailShort(trail, maxSteps = 5) {
  const head = trail
    .slice(0, maxSteps)
    .map((s) => `${s.id}=${s.label}`)
    .join(" → ");
  return trail.length > maxSteps ? `${head} … (+${trail.length - maxSteps} more)` : head;
}

function main() {
  if (!TREE || typeof TREE !== "object") {
    err("TREE not found in src/data/tree.js");
    return finish();
  }
  const { paths, truncated } = enumeratePaths(TREE, ENTRY_ID);
  if (truncated) {
    err(
      `Path enumeration truncated at ${MAX_TOTAL_PATHS} — combinatorial ` +
        "explosion in the tree. Review recent changes for accidental fan-out."
    );
  }

  const terminals = validateTerminals(TREE, paths);

  // Whole-tree structural checks (license + decisionBasis + docs on every
  // result; rationale + techDocs on every question; no broken targets).
  validateStructural(TREE);

  // Some result nodes are intentionally reachable only as "deep-dive" links
  // FROM another answer-driven result (e.g. result_frontline_f1 and
  // result_frontline_f3 are linked from result_frontline_computed). Those
  // aren't terminals of any Yes/No path — they're informational follow-ups
  // — so we also collect action-reachable terminals from each answer-driven
  // terminal to decide whether an "unreachable" result really is dead code.
  const actionReachable = new Set();
  function gatherActionReachable(id) {
    if (!id || actionReachable.has(id)) return;
    actionReachable.add(id);
    const n = TREE[id];
    if (!n) return;
    for (const a of n.actions ?? []) gatherActionReachable(a.target);
  }
  for (const id of terminals) gatherActionReachable(id);

  // Every result/info node in the tree should be reachable as a path
  // terminal OR via an action from an answer-driven terminal (deep-dive)
  // OR be an info node intentionally only reachable via helpLink. We
  // surface helpLink-only info as warnings (legitimate but worth eyeballing);
  // truly-unreachable result nodes are errors.
  const allTerminals = Object.entries(TREE).filter(([, n]) => n.result || n.info);
  for (const [id, node] of allTerminals) {
    if (terminals.has(id)) continue;
    if (actionReachable.has(id)) continue; // deep-dive via action — fine
    if (node.info) {
      warn(`info node "${id}" not reachable via answer-driven walk (likely helpLink-only).`);
    } else {
      err(`Result "${id}" is unreachable by any answer-driven OR action-driven path.`);
    }
  }

  frontlineRoutingChecks(TREE, paths);

  const profiles = groupByProfile(paths);
  console.log(`Enumerated ${paths.length} answer-driven paths from "${ENTRY_ID}":`);
  for (const [profile, group] of profiles) {
    const uniqueTerminals = new Set(group.map((p) => p.terminal.id));
    const minLen = Math.min(...group.map((p) => p.trail.length));
    const maxLen = Math.max(...group.map((p) => p.trail.length));
    console.log(
      `  • ${profile}: ${group.length} paths, ${uniqueTerminals.size} distinct terminals, depth ${minLen}–${maxLen}`
    );
  }
  console.log(
    `Terminals hit: ${terminals.size} of ${allTerminals.length} ` + `(result+info nodes in tree).`
  );

  return finish();
}

function finish() {
  if (warnings.length) {
    console.warn(`\nWarnings (${warnings.length}):`);
    for (const w of warnings) console.warn(`  ! ${w}`);
  }
  if (errors.length) {
    console.error(`\nErrors (${errors.length}):`);
    for (const e of errors) console.error(`  ✗ ${e}`);
    process.exit(EXIT_FAIL);
  }
  console.log("\nTree walk OK.");
  process.exit(EXIT_OK);
}

main();
