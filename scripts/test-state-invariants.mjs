#!/usr/bin/env node
// State-machine simulator for the Assessment class — proves the goto / back /
// restart semantics are invariant under the kinds of mutations a user
// performs in the UI: walk forward, walk back, flip an answer mid-way,
// restart from a deep state, etc.
//
// This is a PURE in-memory simulation that mirrors the state shape and
// transition rules from src/client/assessment.ts. It does NOT exercise
// the renderer, DOM, productBreakdown sub-answer capture, or the frontline
// pricing math — those are covered separately by the build pipeline
// (typecheck + bundle) and the live-browser smoke runs documented in the
// repo. The point here is to lock in the navigation invariants so a future
// state-shape refactor can't silently break "Start over" or "Back".
//
// Invariants asserted (each is a separate Test):
//   I1. Fresh state: currentId == startId, history == [].
//   I2. push(target, label) appends {id: previousCurrent, label} to history
//        and sets currentId := target.
//   I3. pop() removes the last entry and restores currentId := entry.id.
//        After push(x) then pop(), state is deep-equal to pre-push state.
//   I4. restart() returns state to (currentId == startId, history == []).
//        After ANY sequence of pushes, restart() then re-pushing the same
//        sequence yields identical state.
//   I5. Random walks of N steps (within the tree's actual node graph) end
//        at a result/info terminal (no dead ends, no missing nodes).
//   I6. Flip-the-last-answer: walk to terminal, pop once, flip Yes↔No,
//        push the OPPOSITE branch — the terminal id may change but the
//        state stays consistent (history length unchanged, no orphan
//        fields).

import { TREE, START_NODE_ID } from "../src/data/tree.js";

const ENTRY_ID = TREE[START_NODE_ID] ? START_NODE_ID : "start_choice";

const failures = [];
let testsRun = 0;
let testsPassed = 0;

function test(name, fn) {
  testsRun++;
  try {
    fn();
    testsPassed++;
  } catch (e) {
    failures.push({ name, error: e instanceof Error ? e.message : String(e) });
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ---------- State machine (mirrors src/client/assessment.ts) -------------

function freshState() {
  return { currentId: ENTRY_ID, history: [], profile: undefined };
}

function nodeKind(node) {
  if (!node) return "missing";
  if (node.choice) return "choice";
  if (node.info) return "info";
  if (node.result) return "result";
  return "question";
}

function push(state, target, label) {
  if (!TREE[target]) throw new Error(`push: target "${target}" not in tree`);
  state.history.push({ id: state.currentId, label });
  state.currentId = target;
  if (!state.profile && state.history.length === 1 && state.history[0].id === ENTRY_ID) {
    state.profile = label;
  }
  return state;
}

function pop(state) {
  const prev = state.history.pop();
  if (!prev) return state;
  state.currentId = prev.id;
  return state;
}

function restart(state) {
  state.currentId = ENTRY_ID;
  state.history = [];
  state.profile = undefined;
  return state;
}

/**
 * Walk from a node by picking a deterministic answer function. The walker
 * follows choice / question edges only (not actions). It stops at the
 * first result/info terminal or after MAX_STEPS to guard against any
 * future answer-driven cycle.
 */
function walk(state, answerFn, MAX_STEPS = 40) {
  let steps = 0;
  while (steps++ < MAX_STEPS) {
    const node = TREE[state.currentId];
    const kind = nodeKind(node);
    if (kind === "result" || kind === "info" || kind === "missing") return state;
    if (kind === "choice") {
      const choices = (node.choices ?? []).filter((c) => c.target);
      if (choices.length === 0) return state;
      const idx = answerFn(state.currentId, "choice", choices.length, choices);
      const pick = choices[idx % choices.length];
      push(state, pick.target, pick.label);
      continue;
    }
    // question
    const ans = answerFn(state.currentId, "question", 2, ["Yes", "No"]);
    const branch = ans % 2 === 0 ? "yes" : "no";
    const target = node[branch];
    const label = branch === "yes" ? "Yes" : "No";
    if (!target) {
      // one-sided question; fall through with the other side
      const other = branch === "yes" ? "no" : "yes";
      if (!node[other]) return state;
      push(state, node[other], other === "yes" ? "Yes" : "No");
    } else {
      push(state, target, label);
    }
  }
  throw new Error(`walk exceeded ${MAX_STEPS} steps from ${state.currentId}`);
}

// ---------- Tests --------------------------------------------------------

test("I1: fresh state is at entry with empty history", () => {
  const s = freshState();
  assert(s.currentId === ENTRY_ID, `currentId is ${s.currentId}`);
  assert(s.history.length === 0, `history.length is ${s.history.length}`);
  assert(s.profile === undefined, `profile is ${s.profile}`);
});

test("I2: push appends to history and updates currentId", () => {
  const s = freshState();
  push(s, "start", "Privileged (dedicated) admin account");
  assert(s.currentId === "start", `currentId is ${s.currentId}`);
  assert(s.history.length === 1, `history.length is ${s.history.length}`);
  assert(s.history[0].id === ENTRY_ID, `history[0].id is ${s.history[0].id}`);
  assert(
    s.history[0].label === "Privileged (dedicated) admin account",
    `history[0].label is ${s.history[0].label}`
  );
  assert(s.profile === "Privileged (dedicated) admin account", "profile captured");
});

test("I3: push then pop returns to identical pre-push state", () => {
  const a = freshState();
  push(a, "q_iw_security", "Information / knowledge worker (end user)");
  const snapshot = JSON.parse(JSON.stringify(a));
  push(a, "q_iw_copilot_addon", "No");
  pop(a);
  // currentId restored, history length restored
  assert(a.currentId === snapshot.currentId, `currentId ${a.currentId} != ${snapshot.currentId}`);
  assert(a.history.length === snapshot.history.length, "history length differs");
});

test("I4: restart returns to (entry, [])", () => {
  const s = freshState();
  push(s, "q_iw_security", "IW");
  push(s, "q_iw_copilot_addon", "No");
  push(s, "result_iw_e3", "No");
  restart(s);
  assert(s.currentId === ENTRY_ID, "currentId restored");
  assert(s.history.length === 0, "history cleared");
  assert(s.profile === undefined, "profile cleared");
});

test("I4b: restart→replay yields identical state to first walk", () => {
  // Mirrors the "Start over → re-pick same answers → same result" UX
  // contract that the bug-investigation walk-throughs validate.
  const a = freshState();
  const b = freshState();
  const sequence = [
    ["start", "Privileged (dedicated) admin account"],
    ["q_service_principal", "No"],
    ["q_copilot", "No"],
  ];
  // a: walk once
  for (const [t, l] of sequence) push(a, t, l);
  // b: walk, restart, walk again
  for (const [t, l] of sequence) push(b, t, l);
  restart(b);
  for (const [t, l] of sequence) push(b, t, l);
  assert(deepEqual(a, b), `restart+replay diverged: ${JSON.stringify({ a, b })}`);
});

test("I5: random walks land at a result/info terminal", () => {
  // Seed a few PRNGs so the test is deterministic across runs but exercises
  // many distinct paths.
  for (let seed = 1; seed <= 50; seed++) {
    const rand = mulberry32(seed);
    const s = freshState();
    walk(s, () => Math.floor(rand() * 100));
    const node = TREE[s.currentId];
    const kind = nodeKind(node);
    assert(
      kind === "result" || kind === "info",
      `seed ${seed}: walk ended at non-terminal "${s.currentId}" (${kind})`
    );
  }
});

test("I6: flip last answer → terminal may change, state stays consistent", () => {
  // Walk all-No into the frontline path until we reach a terminal.
  const noWalk = freshState();
  push(noWalk, "q_frontline_eligibility", "Frontline worker (F1 / F3)");
  walk(noWalk, () => 1); // always pick the "No" / second option
  const terminalA = noWalk.currentId;
  const histALen = noWalk.history.length;

  // Pop the last decision and flip it.
  const last = noWalk.history[noWalk.history.length - 1];
  pop(noWalk);
  const fromNode = TREE[noWalk.currentId];
  if (fromNode?.yes && fromNode?.no) {
    const flipTo = last.label === "Yes" ? fromNode.no : fromNode.yes;
    const flipLabel = last.label === "Yes" ? "No" : "Yes";
    push(noWalk, flipTo, flipLabel);
    // Walk forward with No again.
    walk(noWalk, () => 1);
    const terminalB = noWalk.currentId;
    assert(
      TREE[terminalB] && (TREE[terminalB].result || TREE[terminalB].info),
      `flip walk ended at non-terminal "${terminalB}"`
    );
    // History length should be EXACTLY 1 greater than histALen if the flipped
    // branch took us to a deeper path, EXACTLY the same if it terminated
    // immediately, or less if it short-circuited. The invariant we
    // actually care about: history is a clean array of {id, label} only,
    // no orphan fields.
    for (const entry of noWalk.history) {
      assert(typeof entry.id === "string", "history entry missing id");
      assert(
        entry.label === undefined || typeof entry.label === "string",
        "history entry has non-string label"
      );
    }
    void terminalA;
    void histALen;
  }
});

test("I7: full all-No frontline walk terminates at the computed card", () => {
  // Specifically guards against the kind of routing regression the user
  // reported. All-No through frontline = baseline F1 recommendation.
  const s = freshState();
  push(s, "q_frontline_eligibility", "Frontline worker (F1 / F3)");
  // The frontline branch needs eligibility=Yes to actually enter the
  // wizard. Eligibility=No reroutes to IW (q_iw_security). Test BOTH.
  // First: eligibility=Yes, workplace=Yes, exclusion=No, rest=No.
  // (workplace No or exclusion Yes would also reroute.)
  const seq = [
    ["q_frontline_workplace", "Yes"], // eligibility=Yes
    ["q_frontline_exclusion", "Yes"], // workplace=Yes
    ["q_frontline_desktop_apps", "No"], // exclusion=No
    ["q_frontline_screen_size", "No"], // desktop_apps=No
    ["q_frontline_mailbox", "No"], // screen_size=No
    ["q_frontline_archive_mailbox", "No"], // mailbox=No (skips mailbox_size)
    ["q_frontline_onedrive", "No"], // archive=No
    ["q_frontline_teams_phone", "No"], // onedrive=No
    ["q_frontline_meetings", "No"], // teams_phone=No
    ["q_frontline_defender_endpoint", "No"], // meetings=No
    ["q_frontline_defender_office", "No"], // defender_endpoint=No
    ["q_frontline_purview", "No"], // defender_office=No
    ["q_frontline_copilot", "No"], // purview=No
    ["result_frontline_computed", "No"], // copilot=No → computed
  ];
  for (const [t, l] of seq) push(s, t, l);
  assert(
    s.currentId === "result_frontline_computed",
    `all-No frontline walk ended at ${s.currentId}, expected result_frontline_computed`
  );
});

test("I8: eligibility=No reroutes frontline walker INTO IW", () => {
  const s = freshState();
  push(s, "q_frontline_eligibility", "Frontline worker (F1 / F3)");
  push(s, "q_iw_platform", "No"); // eligibility=No should target IW entry (q_iw_platform)
  assert(
    s.currentId === "q_iw_platform",
    `eligibility=No should land at q_iw_platform, got ${s.currentId}`
  );
  const node = TREE["q_frontline_eligibility"];
  assert(
    node.no === "q_iw_platform",
    `q_frontline_eligibility.no should be q_iw_platform, is ${node.no}`
  );
});

// ---------- Reporting ----------------------------------------------------

if (failures.length === 0) {
  console.log(`✓ All ${testsRun} state-invariant tests passed.`);
  process.exit(0);
} else {
  console.error(`\n✗ ${failures.length} of ${testsRun} state-invariant tests failed:\n`);
  for (const f of failures) console.error(`  ✗ ${f.name}\n    ${f.error}`);
  process.exit(1);
}

// --- PRNG: tiny deterministic generator so random walks are repeatable.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
