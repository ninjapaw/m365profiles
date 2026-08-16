// Card-based assessment renderer. Reads the tree from an inline JSON island
// on the Astro page; handles keyboard, history, copy, print, and lazy PDF.

import { APP_VERSION } from "../lib/version";
import { STORAGE_KEYS } from "../lib/site";
import { each, escapeHTML, h, when } from "../lib/dom";
import type {
  Action,
  DocLink,
  FrontlineNodeMeta,
  ProductScopeItem,
  Rationale,
  StepMeta,
  Tone,
  Tree,
  TreeNode,
} from "../lib/tree";
import {
  ADDONS,
  BASE_SKUS,
  EXCHANGE_ONLINE_LIMITS,
  MICROSOFT_365_ENTERPRISE_PRICING,
  MICROSOFT_365_FRONTLINE_PRICING,
  MICROSOFT_365_LICENSING_DOCS,
  MODERN_WORK_PLAN_COMPARISON,
  PRICING_LAST_VERIFIED,
  formatPrice,
  getResultPricing,
  sumLines,
  type PriceItem,
} from "../lib/pricing";

type Config = { tree: Tree; startId: string; totalSteps: number };
type SubAnswer = { name: string; answer: "yes" | "no" };
type HistoryEntry = {
  id: string;
  label?: string;
  /** Per-product Yes/No picks captured when the user answered this question
   *  in interactive breakdown mode. Absent when the user committed in the
   *  default "Show all & decide overall" mode (they decided in their head;
   *  we didn't capture the sub-decisions). */
  subAnswers?: SubAnswer[];
};
type State = {
  currentId: string;
  history: HistoryEntry[];
  profile?: string;
  version: string;
};

/** Derived state of the frontline wizard, recomputed from `state.history`. */
type FrontlineWizardState = {
  /** Whether the user passed the eligibility gate (always true if they reached
   *  the computed result — ineligible users are routed to the IW tree). */
  eligible: boolean;
  /** Set when the mailbox question was answered Yes. Drives F1 vs F3 base. */
  needsMailbox: boolean;
  /** Soft advisory flags (e.g. considerE5). Surfaced in reasoning. */
  softFlags: Set<string>;
  /** Microsoft-approved add-ons selected, keyed for dedupe. */
  addons: Map<string, PriceItem>;
  /** Hard-fail feature gaps that force an enterprise uplift. */
  hardFails: Array<{ key: string; reason: string; upgrade: "e3" | "e5" }>;
};

type FrontlineRecommendation = {
  baseSku: PriceItem;
  addons: PriceItem[];
  monthlyTotal: number;
  /** Comparison rows (recommended row plus the alternatives). */
  comparison: Array<{
    label: string;
    total: number;
    delta: string;
    recommended: boolean;
    note?: string;
  }>;
  /** Plain-English bullets explaining why this is the recommendation. */
  reasoning: string[];
  /** Hard-fail reasons surfaced when an uplift was forced. */
  hardFails: string[];
};

const toneBtn = (t?: Tone) =>
  t === "primary"
    ? "btn-primary"
    : t === "ghost"
      ? "btn-ghost"
      : t === "warning"
        ? "btn-danger"
        : "btn-secondary";

const docsOf = (n: TreeNode) => n.docs ?? n.techDocs ?? [];

const truncate = (s: string, max: number) => (s.length > max ? `${s.slice(0, max)}…` : s);

class Assessment {
  private readonly cfg: Config;
  private readonly root: HTMLElement;
  private state: State;
  /** Per-item Yes/No picks tracked while the user is in interactive
   *  breakdown mode on a productBreakdown question. Reset on every
   *  navigation (in `goto()` and `restart()`); restored from the popped
   *  history entry in `back()` when that entry had captured sub-answers. */
  private pendingSubAnswers: Record<string, "yes" | "no"> = {};
  /** Whether the current productBreakdown question is being answered in
   *  interactive mode (per-item Yes/No → computed overall). Defaults to
   *  false (the user reads the cards and picks overall Yes/No themselves).
   *  Per-question; resets on navigation. */
  private interactiveBreakdown = false;
  /** Furthest aggregable-card index reached in the interactive walkthrough.
   *  0..aggregable.length. When equal to aggregable.length, every
   *  aggregable card has an answer and the "Finish final determination"
   *  button is shown. Only meaningful when `interactiveBreakdown` is true.
   *  Per-question; resets on navigation. */
  private walkthroughStep = 0;
  /** True after the user clicks "Finish final determination" — reveals
   *  the reasoning summary and the outer Yes/No commit row (with the
   *  computed answer carrying the recommendation halo). Per-question;
   *  resets on navigation. */
  private walkthroughFinished = false;

  constructor(root: HTMLElement, cfg: Config) {
    this.cfg = cfg;
    this.root = root;
    this.state = this.load() ?? { currentId: cfg.startId, history: [], version: APP_VERSION };
    this.render();
    document.addEventListener("keydown", (e) => this.onKey(e));
  }

  // ---------- State ----------
  private load(): State | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEYS.assessmentState);
      if (!raw) return null;
      const p = JSON.parse(raw) as Partial<State>;
      if (p?.currentId && this.cfg.tree[p.currentId] && p.version === APP_VERSION)
        return p as State;
    } catch {
      /* ignore */
    }
    return null;
  }

  private save(): void {
    try {
      sessionStorage.setItem(STORAGE_KEYS.assessmentState, JSON.stringify(this.state));
    } catch {
      /* ignore */
    }
  }

  // ---------- Navigation ----------
  private goto(targetId: string, label?: string): void {
    if (!this.cfg.tree[targetId]) {
      console.warn("Unknown target:", targetId);
      return;
    }
    const entry: HistoryEntry = { id: this.state.currentId, label };
    // If the user committed in interactive mode on a productBreakdown
    // question, attach their per-item picks to the history entry so the
    // summary, trail, and PDF can show them. Items with scope
    // `tenant-wide-not-scopeable` are excluded — they're informational
    // only and don't drive the overall outcome.
    const fromNode = this.cfg.tree[this.state.currentId];
    if (this.interactiveBreakdown && fromNode?.productBreakdown?.length) {
      const subAnswers: SubAnswer[] = fromNode.productBreakdown
        .filter((i) => i.scope !== "tenant-wide-not-scopeable")
        .map((i) => {
          const a = this.pendingSubAnswers[i.name];
          return a ? { name: i.name, answer: a } : null;
        })
        .filter((x): x is SubAnswer => x !== null);
      if (subAnswers.length > 0) entry.subAnswers = subAnswers;
    }
    this.state.history.push(entry);
    this.state.currentId = targetId;
    this.pendingSubAnswers = {};
    this.interactiveBreakdown = false;
    this.walkthroughStep = 0;
    this.walkthroughFinished = false;
    this.captureContext();
    this.save();
    this.render();
    this.scrollToTop();
  }

  private captureContext(): void {
    const lastEntry = this.state.history[this.state.history.length - 1];
    const fromId = lastEntry?.id;
    const from = fromId ? this.cfg.tree[fromId] : undefined;
    if (!from?.choice) return;
    // Multiple choices can share the same `target`, so identify the picked
    // choice by the label that was just pushed onto history.
    const picked =
      from.choices?.find(
        (c) => c.target === this.state.currentId && c.label === lastEntry?.label
      ) ?? from.choices?.find((c) => c.target === this.state.currentId);
    if (!picked) return;
    if (!this.state.profile && from === this.cfg.tree["start_choice"])
      this.state.profile = picked.label;
  }

  private back(): void {
    const prev = this.state.history.pop();
    if (!prev) return;
    this.state.currentId = prev.id;
    // If the question we're returning to was answered in interactive mode,
    // restore the user's per-item picks so they can review or change them.
    // Restore them at the "finished" walkthrough state (all cards reviewed,
    // reasoning visible) since that's where they were when they committed.
    if (prev.subAnswers?.length) {
      this.pendingSubAnswers = Object.fromEntries(prev.subAnswers.map((s) => [s.name, s.answer]));
      this.interactiveBreakdown = true;
      const fromNode = this.cfg.tree[this.state.currentId];
      const aggregableCount =
        fromNode?.productBreakdown?.filter((i) => i.scope !== "tenant-wide-not-scopeable").length ??
        0;
      this.walkthroughStep = aggregableCount;
      this.walkthroughFinished = true;
    } else {
      this.pendingSubAnswers = {};
      this.interactiveBreakdown = false;
      this.walkthroughStep = 0;
      this.walkthroughFinished = false;
    }
    this.save();
    this.render();
    this.scrollToTop();
  }

  private restart(): void {
    // Hard-reset path: clear every in-memory field AND sessionStorage, then
    // hard-navigate to /assessment?restart=1. The navigation is what gives
    // the strongest "truly fresh" guarantee — it discards the entire JS
    // context (so any closure-captured state goes away), defeats Safari's
    // bfcache (which can otherwise restore old in-memory state on back/
    // forward), and re-runs boot() which itself clears sessionStorage
    // before constructing a new Assessment. Without the navigation, an
    // in-place reset is correct on paper but harder to prove bulletproof
    // across browsers and edge cases. The flicker is acceptable for an
    // explicit "Start over" action and actually reinforces that the
    // reset took effect.
    this.state = { currentId: this.cfg.startId, history: [], version: APP_VERSION };
    this.pendingSubAnswers = {};
    this.interactiveBreakdown = false;
    this.walkthroughStep = 0;
    this.walkthroughFinished = false;
    try {
      sessionStorage.removeItem(STORAGE_KEYS.assessmentState);
    } catch {
      /* ignore — falling through to navigation still clears state */
    }
    try {
      const url = new URL(window.location.href);
      // Strip any params that could pre-seed or otherwise mutate the next
      // boot, then set the restart sentinel that boot() consumes.
      url.searchParams.delete("entry");
      url.searchParams.delete("fresh");
      url.searchParams.set("restart", "1");
      window.location.replace(url.toString());
      return;
    } catch {
      /* If URL construction or replace() somehow throws (extremely rare),
       * fall back to the in-place reset we already did above so the user
       * still sees a fresh start_choice card on the next render. */
    }
    this.save();
    this.render();
    this.scrollToTop();
  }

  private scrollToTop(): void {
    const top = this.root.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  // ---------- Input ----------
  private onKey(e: KeyboardEvent): void {
    if ((e.target as HTMLElement | null)?.matches("input, textarea, select")) return;
    const node = this.cfg.tree[this.state.currentId];
    if (!node) return;

    const k = e.key.toLowerCase();
    if (e.key === "Backspace" || e.key === "ArrowLeft") {
      if (this.state.history.length > 0) {
        e.preventDefault();
        this.back();
      }
      return;
    }
    if (k === "r") {
      this.restart();
      return;
    }
    if (node.choice && /^[0-9a-z]$/.test(k)) {
      const c = node.choices?.find((x) => (x.icon ?? "").toLowerCase() === k);
      if (c?.target) {
        e.preventDefault();
        this.goto(c.target, c.label);
      }
      return;
    }
    if (!node.choice && !node.info && !node.result) {
      if ((k === "y" || k === "1") && node.yes) {
        e.preventDefault();
        this.goto(node.yes, "Yes");
      } else if ((k === "n" || k === "2") && node.no) {
        e.preventDefault();
        this.goto(node.no, "No");
      }
    }
  }

  // ---------- Rendering ----------
  private render(): void {
    const node = this.cfg.tree[this.state.currentId];
    this.root.replaceChildren();
    if (!node) {
      this.root.textContent = "Unknown step. Press R to restart.";
      return;
    }
    if (node.step) this.appendHTML(this.progressHTML(node.step));
    this.appendHTML(this.controlsHTML());

    if (node.choice) this.appendHTML(this.choiceCard(node));
    else if (node.info) this.appendHTML(this.infoCard(node));
    else if (node.result) this.appendHTML(this.resultCard(node));
    else this.appendHTML(this.questionCard(node));

    if (this.state.history.length > 0) this.appendHTML(this.trailHTML());

    this.bind();
  }

  private appendHTML(html: string): void {
    const tpl = document.createElement("template");
    tpl.innerHTML = html.trim();
    this.root.appendChild(tpl.content);
  }

  private progressHTML(step: StepMeta): string {
    const total = this.cfg.totalSteps;
    const subFrac = step.sub ? (step.sub / (step.subTotal ?? 1)) * (100 / total) : 0;
    const pct = Math.min(100, Math.max(2, ((step.major - 1) / total) * 100 + subFrac));
    const subTxt = step.sub ? ` · ${step.sub} of ${step.subTotal ?? "?"}` : "";
    const meta = `Step ${step.major}${step.secondary ? "·" : ""} of ${total} — ${escapeHTML(step.label)}${subTxt}`;
    return h(
      "div",
      { class: "step-progress" },
      h(
        "div",
        { class: "step-progress__meta" },
        h("span", null, meta),
        h("span", null, `${Math.round(pct)}%`)
      ),
      h(
        "div",
        { class: "step-progress__bar" },
        h("div", { class: "step-progress__fill", style: `width:${pct}%` })
      )
    );
  }

  private controlsHTML(): string {
    // On the very first step the user hasn't picked anything yet, so neither
    // Back nor Restart has anything to act on — hide both to reduce noise.
    if (this.state.history.length === 0) return "";
    return h(
      "div",
      { class: "assess__controls no-print" },
      h("button", { type: "button", class: "btn btn-ghost", "data-action": "back" }, "← Back"),
      h("button", { type: "button", class: "btn btn-ghost", "data-action": "restart" }, "↺ Restart")
    );
  }

  private cardCopyButtonHTML(): string {
    return h(
      "div",
      { class: "card__toolbar no-print" },
      h(
        "button",
        {
          type: "button",
          class: "btn btn-ghost btn-sm",
          "data-copy-node": true,
          title: "Copy this question's full details to clipboard",
          "aria-label": "Copy question details to clipboard",
        },
        "📋 Copy details"
      )
    );
  }

  private choiceCard(node: TreeNode): string {
    const choices = each(node.choices, (c, idx) => {
      const tag = c.href ? "a" : "button";
      const baseAttrs = c.href
        ? { href: c.href, target: "_blank", rel: "noopener" }
        : { type: "button" as const };
      const dataset = c.target ? { "data-target": c.target, "data-label": c.label } : {};
      return h(
        tag,
        { class: `choice choice--${c.tone ?? "primary"}`, ...baseAttrs, ...dataset },
        h(
          "span",
          { class: "choice__icon", "aria-hidden": "true" },
          escapeHTML(c.icon ?? String(idx + 1))
        ),
        h(
          "span",
          { class: "choice__body" },
          h("span", { class: "choice__label" }, escapeHTML(c.label)),
          when(c.sublabel, (s) => h("span", { class: "choice__sub" }, escapeHTML(s)))
        )
      );
    });
    return h(
      "section",
      { class: "card question-card" },
      this.cardCopyButtonHTML(),
      h("h2", { class: "question-card__q" }, escapeHTML(node.question ?? "")),
      when(node.help, (s) => h("p", { class: "question-card__help" }, escapeHTML(s))),
      when(node.helpLink, (l) =>
        h("p", null, h("a", { href: "#", "data-helplink": l.target }, `${escapeHTML(l.label)} →`))
      ),
      h("div", { class: "choices" }, choices)
    );
  }

  private questionCard(node: TreeNode): string {
    const hasTitle = Boolean(node.title);
    return h(
      "section",
      { class: "card question-card" },
      this.cardCopyButtonHTML(),
      hasTitle
        ? h("h2", { class: "question-card__title" }, escapeHTML(node.title ?? ""))
        : h("h2", { class: "question-card__q" }, escapeHTML(node.question ?? "")),
      hasTitle && node.question
        ? h(
            "div",
            { class: "question-card__prompt", role: "group", "aria-label": "Question" },
            h("span", { class: "question-card__prompt-label" }, "Question"),
            h("p", { class: "question-card__prompt-text" }, escapeHTML(node.question))
          )
        : "",
      when(node.sub, (s) => h("p", { class: "question-card__sub" }, escapeHTML(s))),
      when(node.help, (s) => h("p", { class: "question-card__help" }, escapeHTML(s))),
      each(node.paragraphs, (p) => h("p", { class: "question-card__para" }, escapeHTML(p))),
      this.rationaleHTML(node.rationale),
      this.productBreakdownHTML(
        node.productBreakdown,
        node.breakdownIntro,
        node.productBreakdownAggregation ?? "any"
      ),
      this.examplesHTML(node.examples),
      this.yesNoButtonsHTML(node),
      this.footnotesHTML(node.techDocs)
    );
  }

  /** Yes / No commit buttons. When the node has a productBreakdown and the
   *  user is in interactive mode, the button labels and styling reflect the
   *  live aggregation so the user can see which answer their sub-decisions
   *  imply. Either button can still be clicked to commit (the user is in
   *  charge); sub-answers are attached to the history entry on commit.
   *
   *  In interactive mode, the row is suppressed entirely until the user
   *  clicks "Finish final determination" — at that point the row reappears
   *  with the computed answer carrying the `btn--recommended` halo so the
   *  user knows exactly which button to press to continue. */
  private yesNoButtonsHTML(node: TreeNode): string {
    const items = node.productBreakdown ?? [];
    const hasBreakdown = items.length > 0;
    const interactive = this.interactiveBreakdown && hasBreakdown;
    // In walkthrough phases 1 (answering) and 2 (Finish button visible),
    // hide the outer commit row. It reappears in phase 3 (after Finish)
    // with the recommendation halo on the computed answer.
    if (interactive && !this.walkthroughFinished) return "";
    const aggregation = node.productBreakdownAggregation ?? "any";
    const aggregable = items.filter((i) => i.scope !== "tenant-wide-not-scopeable");
    const yesCount = aggregable.filter((i) => this.pendingSubAnswers[i.name] === "yes").length;
    const noCount = aggregable.filter((i) => this.pendingSubAnswers[i.name] === "no").length;
    const totalCount = aggregable.length;
    const answeredCount = yesCount + noCount;
    // recommendation: "yes" | "no" | null (null = not enough info yet)
    let recommendation: "yes" | "no" | null = null;
    if (interactive && answeredCount > 0) {
      if (aggregation === "any") {
        if (yesCount > 0) recommendation = "yes";
        else if (answeredCount === totalCount) recommendation = "no";
      } else {
        // "all" — every aggregable item must be Yes for overall Yes
        if (noCount > 0) recommendation = "no";
        else if (answeredCount === totalCount && yesCount === totalCount) recommendation = "yes";
      }
    }
    const yesLabel = hasBreakdown
      ? interactive && recommendation === "yes"
        ? `Continue — Yes (${yesCount} of ${totalCount} apply)`
        : "Yes — at least one applies"
      : "Yes";
    const noLabel = hasBreakdown
      ? interactive && recommendation === "no"
        ? aggregation === "all"
          ? `Continue — No (${noCount} of ${totalCount} don't apply)`
          : `Continue — No (none of ${totalCount} apply)`
        : "No — none apply"
      : "No";
    // Visual roles: when a recommendation exists, the recommended button
    // takes the primary (filled) role and the alternative takes the secondary
    // (outlined) role — this reverses the default Yes=primary/No=secondary
    // pairing when the computed answer is No, so the user can't miss which
    // button to press. Without a recommendation we keep the conventional
    // Yes=primary/No=secondary pairing.
    const yesBaseClass = interactive && recommendation === "no" ? "btn-secondary" : "btn-primary";
    const noBaseClass =
      interactive && recommendation === "yes"
        ? "btn-secondary"
        : recommendation === "no"
          ? "btn-primary"
          : "btn-secondary";
    const yesBtnClass = `btn ${yesBaseClass} ${recommendation === "yes" ? "btn--recommended" : ""} ${interactive && recommendation && recommendation !== "yes" ? "btn--secondary-recommendation" : ""}`;
    const noBtnClass = `btn ${noBaseClass} ${recommendation === "no" ? "btn--recommended" : ""} ${interactive && recommendation && recommendation !== "no" ? "btn--secondary-recommendation" : ""}`;
    const wrapperClasses = ["yesno"];
    if (interactive) wrapperClasses.push("yesno--interactive");
    // `yesno--finale` triggers the one-shot pulse on the recommended button
    // so the user can't miss which Yes/No to click after they Finish the
    // walkthrough. Only meaningful when the user has just finished.
    if (interactive && this.walkthroughFinished) wrapperClasses.push("yesno--finale");
    return h(
      "div",
      { class: wrapperClasses.join(" ") },
      h("button", { type: "button", class: yesBtnClass, "data-yes": true }, yesLabel),
      h("button", { type: "button", class: noBtnClass, "data-no": true }, noLabel)
    );
  }

  private infoCard(node: TreeNode): string {
    return h(
      "section",
      { class: "card info-card" },
      this.cardCopyButtonHTML(),
      when(node.badge, (b) =>
        h("span", { class: `badge ${node.badgeClass ?? "badge-info"}` }, escapeHTML(b))
      ),
      h("h2", { class: "card__title" }, escapeHTML(node.title ?? "")),
      when(node.sub, (s) => h("p", { class: "card__sub" }, escapeHTML(s))),
      each(node.paragraphs, (p) => h("p", null, escapeHTML(p))),
      this.actionsHTML(node.actions),
      this.footnotesHTML(docsOf(node))
    );
  }

  private resultCard(node: TreeNode): string {
    return h(
      "section",
      { class: "card result-card", "data-result-id": this.state.currentId },
      when(node.badge, (b) =>
        h("span", { class: `badge ${node.badgeClass ?? "badge-success"}` }, escapeHTML(b))
      ),
      h("h2", { class: "card__title" }, escapeHTML(node.title ?? "")),
      when(node.sub, (s) => h("p", { class: "card__sub" }, escapeHTML(s))),
      each(node.paragraphs, (p) => h("p", null, escapeHTML(p))),
      // Computed (dynamic) results: inject wizard-derived content above the
      // static bullets and actions. Currently only the frontline wizard uses
      // this; new computed results can switch on `node.computed`.
      // For all OTHER result nodes, render the static result-level pricing
      // recommendation (cost breakdown + comparison chart + AI reasoning +
      // privileged-admin lens) if one exists in RESULT_PRICING.
      node.computed === "frontline"
        ? this.frontlineComputedHTML()
        : this.resultPricingHTML(this.state.currentId),
      node.bullets?.length
        ? h(
            "ul",
            { class: "result-card__bullets" },
            each(node.bullets, (b) => h("li", null, escapeHTML(b)))
          )
        : "",
      this.actionsHTML(node.actions),
      h(
        "div",
        { class: "result-card__cta no-print" },
        h(
          "button",
          { type: "button", class: "btn btn-primary", "data-pdf": true },
          "📄 Download PDF handout"
        ),
        h(
          "button",
          { type: "button", class: "btn btn-secondary", "data-copy": true },
          "📋 Copy summary"
        ),
        h("button", { type: "button", class: "btn btn-secondary", "data-print": true }, "🖨️ Print"),
        h(
          "button",
          { type: "button", class: "btn btn-ghost", "data-restart": true },
          "↺ Start over"
        )
      ),
      this.footnotesHTML(docsOf(node))
    );
  }

  private rationaleHTML(r?: Rationale): string {
    if (!r) return "";
    const rows = [
      r.why && h("dt", null, "Why we ask") + h("dd", null, escapeHTML(r.why)),
      r.yes && h("dt", null, "If <strong>Yes</strong>") + h("dd", null, escapeHTML(r.yes)),
      r.no && h("dt", null, "If <strong>No</strong>") + h("dd", null, escapeHTML(r.no)),
    ]
      .filter(Boolean)
      .join("");
    return rows ? h("dl", { class: "rationale" }, rows) : "";
  }

  private examplesHTML(ex?: string[]): string {
    if (!ex?.length) return "";
    return h(
      "details",
      { class: "examples" },
      h("summary", null, "Examples"),
      h(
        "ul",
        null,
        each(ex, (e) => h("li", null, escapeHTML(e)))
      )
    );
  }

  private productBreakdownHTML(
    items?: ProductScopeItem[],
    intro?: string,
    aggregation: "any" | "all" = "any"
  ): string {
    if (!items?.length) return "";
    const interactive = this.interactiveBreakdown;
    const scopeLabel: Record<ProductScopeItem["scope"], string> = {
      "per-user": "Per-user licence",
      "per-device": "Per-device licence",
      "per-mailbox": "Per-mailbox licence",
      "tenant-wide-scopeable": "Tenant-wide · scopeable",
      "tenant-wide-not-scopeable": "Tenant-wide · not scopeable *",
    };
    const hasNotScopeable = items.some((i) => i.scope === "tenant-wide-not-scopeable");
    // Aggregable items drive the computed overall outcome in interactive mode.
    // Tenant-wide-not-scopeable cards are informational only.
    const aggregable = items.filter((i) => i.scope !== "tenant-wide-not-scopeable");
    const answers = aggregable.map((i) => this.pendingSubAnswers[i.name]);
    const yesCount = answers.filter((a) => a === "yes").length;
    const noCount = answers.filter((a) => a === "no").length;
    const answeredCount = yesCount + noCount;
    const totalCount = aggregable.length;
    // Walkthrough state (interactive mode only). `walkthroughStep` points at
    // the currently-active aggregable card (0..aggregable.length). When it
    // equals `aggregable.length`, every aggregable card has been answered
    // and the Finish button is shown (or the reasoning box if finished).
    const step = Math.min(this.walkthroughStep, aggregable.length);
    const finished = this.walkthroughFinished;
    // Source-array index of the active aggregable card. Items at source
    // indices > this one are hidden until the walkthrough advances.
    // When `step` === aggregable.length (all answered) or `finished`,
    // we treat every item as visible.
    const activeSourceIndex =
      interactive && !finished && step < aggregable.length
        ? items.indexOf(aggregable[step]!)
        : items.length - 1;
    const rows = each(items, (item, sourceIdx) => {
      const notScopeable = item.scope === "tenant-wide-not-scopeable";
      const itemAnswer = this.pendingSubAnswers[item.name];
      // Walkthrough per-card state (only meaningful when `interactive`):
      //   - active        : the aggregable card the user is currently on
      //   - reviewed      : an aggregable card the user has moved past
      //                     (collapsed; expandable for edits)
      //   - informational : a not-scopeable advisory card (always open)
      // Hidden cards (sourceIdx beyond the active card, and we're not yet
      // in the finished state) return "" and aren't rendered at all.
      let cardState: "active" | "reviewed" | "informational" | null = null;
      if (interactive) {
        if (sourceIdx > activeSourceIndex && !finished) return "";
        if (notScopeable) {
          cardState = "informational";
        } else if (!finished && aggregable.indexOf(item) === step) {
          cardState = "active";
        } else {
          cardState = "reviewed";
        }
      }
      const isOpen = interactive && (cardState === "active" || cardState === "informational");
      const classes = ["scope-item"];
      if (cardState === "active") classes.push("scope-item--active-step");
      if (cardState === "reviewed") classes.push("scope-item--reviewed");
      const detailsAttrs: Record<string, string | number | boolean> = {
        class: classes.join(" "),
        "data-scope": item.scope,
      };
      if (isOpen) detailsAttrs.open = true;
      if (interactive && itemAnswer) detailsAttrs["data-answered"] = itemAnswer;
      return h(
        "details",
        detailsAttrs,
        h(
          "summary",
          null,
          h("span", { class: "scope-item__name" }, escapeHTML(item.name)),
          when(item.sku, (s) => h("span", { class: "scope-item__sku" }, escapeHTML(s))),
          h(
            "span",
            { class: `scope-badge scope-badge--${item.scope}` },
            escapeHTML(scopeLabel[item.scope])
          ),
          interactive && itemAnswer
            ? h(
                "span",
                {
                  class: `scope-item__answer-pill scope-item__answer-pill--${itemAnswer}`,
                  "aria-label": `Your answer: ${itemAnswer === "yes" ? "Yes, applies" : "No, doesn't apply"}`,
                },
                itemAnswer === "yes" ? "✓ Yes" : "✗ No"
              )
            : ""
        ),
        h(
          "div",
          { class: "scope-item__body" },
          notScopeable
            ? h(
                "p",
                { class: "scope-item__advisory" },
                h("strong", null, "Informational only \u2014 no verdict suggested. "),
                "This feature is tenant-wide and not scopeable, so the licensing call for this user is a judgement that depends on your reading of the Microsoft Product Terms, your tenant's technical posture, and Microsoft's Secure Future Initiative (SFI). The card below gives you the technical mechanics, the per-product Microsoft references, and both Microsoft statements side-by-side \u2014 use them to make the informed decision yourself. ",
                h("strong", null, "This card does not drive the answer to the outer question.")
              )
            : "",
          h(
            "p",
            { class: "scope-item__note" },
            h("strong", null, "How it scopes: "),
            escapeHTML(item.scopeNote)
          ),
          notScopeable
            ? ""
            : h("p", null, h("strong", null, "In scope when: "), escapeHTML(item.inScopeMeans)),
          notScopeable
            ? ""
            : when(item.notInScopeMeans, (s) =>
                h("p", null, h("strong", null, "Not in scope when: "), escapeHTML(s))
              ),
          !notScopeable && item.examples?.length
            ? h(
                "ul",
                { class: "scope-item__examples" },
                each(item.examples, (e) => h("li", null, escapeHTML(e)))
              )
            : "",
          notScopeable
            ? h(
                "aside",
                {
                  class: "scope-item__footnote",
                  "aria-label": "Microsoft Secure Future Initiative and Product Terms statements",
                },
                h(
                  "p",
                  { class: "scope-item__footnote-title" },
                  h(
                    "strong",
                    null,
                    "* Tenant-wide and not scopeable — two Microsoft statements to weigh"
                  )
                ),
                h(
                  "p",
                  { class: "scope-item__footnote-section" },
                  h("strong", null, "Microsoft Secure Future Initiative (SFI) — statement. "),
                  "Microsoft's ",
                  h(
                    "a",
                    {
                      href: "https://www.microsoft.com/en-us/trust-center/security/secure-future-initiative",
                      target: "_blank",
                      rel: "noopener",
                    },
                    "Secure Future Initiative"
                  ),
                  " is grounded in three principles — ",
                  h("em", null, "Secure by Design, Secure by Default, Secure Operations"),
                  ". Satya Nadella's ",
                  h(
                    "a",
                    {
                      href: "https://blogs.microsoft.com/blog/2024/05/03/prioritizing-security-above-all-else/",
                      target: "_blank",
                      rel: "noopener",
                    },
                    "May 2024 SFI memo"
                  ),
                  " states verbatim: \u201Csecurity protections are enabled and enforced by default, require no extra effort, and are not optional.\u201D Microsoft's recommendation for tenant-wide protections like this one is therefore to ",
                  h("strong", null, "enable them"),
                  " — leaving them off is the riskier posture."
                ),
                h(
                  "p",
                  { class: "scope-item__footnote-section" },
                  h("strong", null, "Microsoft Product Terms — statement. "),
                  "The feature is tenant-wide and not scopeable — once on, every user who benefits is technically protected. The licence, per ",
                  h(
                    "a",
                    {
                      href: "https://www.microsoft.com/licensing/terms/",
                      target: "_blank",
                      rel: "noopener",
                    },
                    "Microsoft Product Terms"
                  ),
                  " (also published as the ",
                  h(
                    "a",
                    {
                      href: "https://www.microsoft.com/en-us/licensing/product-licensing/products",
                      target: "_blank",
                      rel: "noopener",
                    },
                    "Microsoft Product Licensing portal"
                  ),
                  " and on ",
                  h(
                    "a",
                    {
                      href: "https://learn.microsoft.com/licensing/",
                      target: "_blank",
                      rel: "noopener",
                    },
                    "Microsoft Learn — Licensing"
                  ),
                  "), must still be assigned to every user who benefits — Microsoft simply can't enforce it technically."
                ),
                h(
                  "p",
                  { class: "scope-item__footnote-note" },
                  h("em", null, "Both statements are official Microsoft sources. "),
                  "See the per-product references on this card below for the specific service description and licensing data sheet \u2014 each one points back to the Product Terms entry and the SFI guidance for the product. The decision on how to balance Microsoft's security recommendation against the licensing footprint is yours."
                )
              )
            : "",
          item.docs?.length
            ? h(
                "ul",
                { class: "scope-item__docs" },
                each(item.docs, ([label, url]) =>
                  h(
                    "li",
                    null,
                    h("a", { href: url, target: "_blank", rel: "noopener" }, escapeHTML(label))
                  )
                )
              )
            : "",
          // Per-item Yes/No decision row (interactive mode, scopeable items
          // only). Placed at the BOTTOM of the body so the user reads "How
          // it scopes / In scope when / Not in scope when / examples / docs"
          // first, then decides. In walkthrough mode, answering here on the
          // active card auto-advances to the next aggregable card.
          interactive && !notScopeable
            ? h(
                "div",
                {
                  class: "scope-item__decide",
                  role: "group",
                  "aria-label": `Does ${item.name} apply to this user?`,
                },
                h("span", { class: "scope-item__decide-label" }, "Does this apply to this user?"),
                h(
                  "div",
                  { class: "scope-item__decide-buttons" },
                  h(
                    "button",
                    {
                      type: "button",
                      class: `scope-decide-btn scope-decide-btn--yes ${itemAnswer === "yes" ? "scope-decide-btn--active" : ""}`,
                      "data-subitem-name": item.name,
                      "data-subitem-answer": "yes",
                      "aria-pressed": itemAnswer === "yes",
                    },
                    itemAnswer === "yes" ? "✓ Yes — applies" : "Yes — applies"
                  ),
                  h(
                    "button",
                    {
                      type: "button",
                      class: `scope-decide-btn scope-decide-btn--no ${itemAnswer === "no" ? "scope-decide-btn--active" : ""}`,
                      "data-subitem-name": item.name,
                      "data-subitem-answer": "no",
                      "aria-pressed": itemAnswer === "no",
                    },
                    itemAnswer === "no" ? "✗ No — doesn't apply" : "No — doesn't apply"
                  ),
                  itemAnswer
                    ? h(
                        "button",
                        {
                          type: "button",
                          class: "scope-decide-btn scope-decide-btn--clear",
                          "data-subitem-name": item.name,
                          "data-subitem-answer": "clear",
                          "aria-label": `Clear answer for ${item.name}`,
                        },
                        "↺ Clear"
                      )
                    : ""
                )
              )
            : ""
        )
      );
    });
    const sectionClasses = ["scope-breakdown"];
    if (interactive) {
      sectionClasses.push("scope-breakdown--interactive");
      sectionClasses.push(
        finished ? "scope-breakdown--walkthrough-finished" : "scope-breakdown--walkthrough"
      );
    }
    return h(
      "section",
      {
        class: sectionClasses.join(" "),
        "aria-label": "Per-product scope breakdown",
      },
      h(
        "div",
        { class: "scope-breakdown__head" },
        h("h3", { class: "scope-breakdown__title" }, "Walk through each product"),
        h(
          "p",
          { class: "scope-breakdown__intro" },
          escapeHTML(
            intro ??
              "Each product below is its own mini-card. Open any card to see how that feature is scoped (per-user, per-device, or tenant-wide), what 'in scope' means in plain language, examples, and the Microsoft source. Answer Yes below if at least one applies to this user."
          )
        ),
        // Mode toggle — interactive vs. show-all. Default is show-all (current
        // behavior). In interactive mode, per-item Yes/No buttons appear on each
        // card and drive the overall computed Yes/No recommendation; the picks
        // are captured in the summary + PDF. In show-all mode, only the overall
        // answer is captured (the user decided in their head).
        h(
          "div",
          {
            class: "scope-breakdown__mode no-print",
            role: "group",
            "aria-label": "How would you like to answer?",
          },
          h(
            "span",
            { class: "scope-breakdown__mode-label" },
            h("strong", null, "How would you like to answer? "),
            "Pick a mode below."
          ),
          h(
            "div",
            { class: "scope-breakdown__mode-options" },
            h(
              "button",
              {
                type: "button",
                class: `scope-mode-btn ${!interactive ? "scope-mode-btn--active" : ""}`,
                "data-breakdown-mode": "show-all",
                "aria-pressed": !interactive,
              },
              h("span", { class: "scope-mode-btn__icon", "aria-hidden": "true" }, "📖"),
              h(
                "span",
                { class: "scope-mode-btn__body" },
                h("span", { class: "scope-mode-btn__title" }, "Show all & decide overall"),
                h(
                  "span",
                  { class: "scope-mode-btn__hint" },
                  "Read the expandable cards yourself, then pick Yes / No below. The final summary will show only the overall answer."
                )
              )
            ),
            h(
              "button",
              {
                type: "button",
                class: `scope-mode-btn ${interactive ? "scope-mode-btn--active" : ""}`,
                "data-breakdown-mode": "interactive",
                "aria-pressed": interactive,
              },
              h("span", { class: "scope-mode-btn__icon", "aria-hidden": "true" }, "✏️"),
              h(
                "span",
                { class: "scope-mode-btn__body" },
                h("span", { class: "scope-mode-btn__title" }, "Walk through interactively"),
                h(
                  "span",
                  { class: "scope-mode-btn__hint" },
                  "Answer Yes / No on each card; we compute the overall and capture every pick in the summary."
                )
              )
            )
          ),
          interactive
            ? h(
                "p",
                { class: "scope-breakdown__mode-status" },
                this.aggregationStatusHTML(
                  answeredCount,
                  totalCount,
                  yesCount,
                  noCount,
                  aggregation
                )
              )
            : ""
        ),
        hasNotScopeable
          ? h(
              "p",
              { class: "scope-breakdown__legend" },
              h("span", { class: "scope-breakdown__legend-star" }, "*"),
              " marks items that are tenant-wide and ",
              h("em", null, "not"),
              " scopeable. These cards are ",
              h(
                "strong",
                null,
                "informational only \u2014 they do not push the Yes / No on this question"
              ),
              ". Expand any starred card for the technical mechanics, the per-product Microsoft references, and Microsoft's two official statements (Secure Future Initiative and Product Terms), so you can make the call yourself."
            )
          : ""
      ),
      // Walkthrough header (interactive mode only): progress + Back button.
      interactive ? this.walkthroughHeaderHTML(step, totalCount, finished) : "",
      h("div", { class: "scope-breakdown__list" }, rows),
      // Finish button — appears once every aggregable card has an answer.
      interactive && !finished && totalCount > 0 && step >= totalCount
        ? this.walkthroughFinishHTML()
        : "",
      // Reasoning summary — appears after the user clicks Finish.
      interactive && finished
        ? this.walkthroughReasoningHTML(aggregable, aggregation, yesCount, noCount, totalCount)
        : ""
    );
  }

  /** Walkthrough header: step indicator (Card X of Y / "All N reviewed") plus
   *  a Back button to revisit the prior card or exit the Finish view. Only
   *  rendered in interactive walkthrough mode. */
  private walkthroughHeaderHTML(step: number, total: number, finished: boolean): string {
    if (total === 0) return "";
    const displayStep = Math.min(step + 1, total);
    const label = finished
      ? `All ${total} card${total === 1 ? "" : "s"} reviewed — see determination below`
      : step >= total
        ? `All ${total} card${total === 1 ? "" : "s"} answered`
        : `Card ${displayStep} of ${total}`;
    const filled = finished ? total : Math.min(step, total);
    const pct = Math.round((filled / total) * 100);
    const showBack = finished || step > 0;
    return h(
      "div",
      { class: "walkthrough-header no-print", role: "status", "aria-live": "polite" },
      h(
        "div",
        { class: "walkthrough-header__progress" },
        h("span", { class: "walkthrough-header__step" }, escapeHTML(label)),
        h(
          "div",
          { class: "walkthrough-progress", "aria-hidden": "true" },
          h("div", { class: "walkthrough-progress__bar", style: `width:${pct}%` }, "")
        )
      ),
      showBack
        ? h(
            "button",
            {
              type: "button",
              class: "btn btn-ghost walkthrough-header__back",
              "data-walkthrough-back": true,
            },
            finished ? "← Back to review" : "← Back"
          )
        : ""
    );
  }

  /** "Finish final determination" button — appears once every aggregable card
   *  has an answer (step === aggregable.length) and the user has not yet
   *  clicked Finish. Clicking it reveals the reasoning summary and the
   *  outer Yes/No commit row with the recommended button highlighted. */
  private walkthroughFinishHTML(): string {
    return h(
      "div",
      { class: "walkthrough-finish no-print" },
      h(
        "p",
        { class: "walkthrough-finish__intro" },
        "Every card answered. Click below to lock in your picks and reveal the recommended overall Yes / No."
      ),
      h(
        "button",
        {
          type: "button",
          class: "btn btn-primary walkthrough-finish__btn",
          "data-walkthrough-finish": true,
        },
        "✓ Finish final determination"
      )
    );
  }

  /** Reasoning summary box. Shown after the user clicks "Finish final
   *  determination". Explains the computed overall in plain English (which
   *  rule fired, which sub-cards applied / didn't), then points down to the
   *  outer Yes/No commit row where the recommended answer has the halo. */
  private walkthroughReasoningHTML(
    aggregable: ProductScopeItem[],
    aggregation: "any" | "all",
    yesCount: number,
    noCount: number,
    totalCount: number
  ): string {
    let overall: "yes" | "no";
    let why: string;
    if (aggregation === "any") {
      if (yesCount > 0) {
        overall = "yes";
        why = `<strong>${yesCount} of ${totalCount}</strong> apply. This question uses an <em>any</em> rule (at least one match is enough), so the overall answer is <strong class="scope-status--yes">Yes</strong>.`;
      } else {
        overall = "no";
        why = `<strong>None of ${totalCount}</strong> apply. This question uses an <em>any</em> rule (at least one match is needed), so the overall answer is <strong class="scope-status--no">No</strong>.`;
      }
    } else if (noCount === 0 && yesCount === totalCount) {
      overall = "yes";
      why = `<strong>All ${totalCount}</strong> apply. This question uses an <em>all</em> rule (every criterion must pass), so the overall answer is <strong class="scope-status--yes">Yes</strong>.`;
    } else {
      overall = "no";
      why = `<strong>${noCount} of ${totalCount}</strong> don't apply. This question uses an <em>all</em> rule (every criterion must pass), so the overall answer is <strong class="scope-status--no">No</strong>.`;
    }
    const yesItems = aggregable
      .filter((i) => this.pendingSubAnswers[i.name] === "yes")
      .map((i) => i.name);
    const noItems = aggregable
      .filter((i) => this.pendingSubAnswers[i.name] === "no")
      .map((i) => i.name);
    return h(
      "div",
      {
        class: `walkthrough-summary walkthrough-summary--${overall} no-print`,
        role: "region",
        "aria-label": "Computed determination and reasoning",
      },
      h(
        "p",
        { class: "walkthrough-summary__verdict" },
        "Computed overall: ",
        h("strong", { class: `scope-status--${overall}` }, overall === "yes" ? "Yes" : "No")
      ),
      h("p", { class: "walkthrough-summary__why" }, why),
      yesItems.length
        ? h(
            "p",
            { class: "walkthrough-summary__list" },
            h("strong", null, "Applies: "),
            escapeHTML(yesItems.join(", "))
          )
        : "",
      noItems.length
        ? h(
            "p",
            { class: "walkthrough-summary__list" },
            h("strong", null, "Doesn't apply: "),
            escapeHTML(noItems.join(", "))
          )
        : "",
      h(
        "p",
        { class: "walkthrough-summary__cta" },
        "↓ Click the highlighted ",
        h("strong", null, overall === "yes" ? "Yes" : "No"),
        " button below to continue."
      )
    );
  }

  /** Plain-language status line shown in interactive mode: progress + computed
   *  overall recommendation based on the aggregation rule. */
  private aggregationStatusHTML(
    answered: number,
    total: number,
    yes: number,
    no: number,
    aggregation: "any" | "all"
  ): string {
    if (total === 0) return "";
    if (answered === 0) {
      return `Answer each card above. We'll compute the overall ${aggregation === "all" ? "(all must apply)" : "(any applies)"} as you go.`;
    }
    const remaining = total - answered;
    if (aggregation === "any") {
      if (yes > 0) {
        return `Computed overall: <strong class="scope-status--yes">Yes</strong> — ${yes} of ${total} applies${remaining > 0 ? `, ${remaining} not yet answered` : ""}.`;
      }
      if (remaining === 0) {
        return `Computed overall: <strong class="scope-status--no">No</strong> — none of ${total} apply.`;
      }
      return `So far ${no} of ${total} don't apply, ${remaining} not yet answered.`;
    }
    // "all" — every aggregable item must be Yes for overall Yes
    if (no > 0) {
      return `Computed overall: <strong class="scope-status--no">No</strong> — ${no} card${no === 1 ? "" : "s"} don't apply (need all ${total} to qualify).`;
    }
    if (remaining === 0 && yes === total) {
      return `Computed overall: <strong class="scope-status--yes">Yes</strong> — all ${total} apply.`;
    }
    return `So far ${yes} of ${total} apply, ${remaining} not yet answered.`;
  }

  private footnotesHTML(docs: DocLink[] | undefined): string {
    if (!docs || !docs.length) return "";
    return h(
      "div",
      { class: "footnotes" },
      h("div", { class: "footnotes__title" }, "Sources & further reading"),
      h(
        "ol",
        { class: "footnotes__list" },
        each(docs, ([label, url], i) =>
          h(
            "li",
            { id: `fn-${i + 1}` },
            h("a", { href: url, target: "_blank", rel: "noopener" }, escapeHTML(label))
          )
        )
      ),
      // Universal authoritative-source footnote. The Microsoft Learn refs
      // above describe how to operate the features; the Product Terms govern
      // who must be licensed and what each SKU includes.
      h(
        "p",
        { class: "footnotes__terms" },
        "<strong>Authoritative source &mdash;</strong> the legally binding Use Rights for every Microsoft Online Service named above live in the ",
        h(
          "a",
          { href: "https://www.microsoft.com/licensing/terms", target: "_blank", rel: "noopener" },
          "Microsoft Product Terms"
        ),
        " (per-SKU entries at ",
        h(
          "a",
          {
            href: "https://www.microsoft.com/licensing/terms/productoffering",
            target: "_blank",
            rel: "noopener",
          },
          "Product Offerings"
        ),
        "; cross-cutting rules at ",
        h(
          "a",
          {
            href: "https://www.microsoft.com/licensing/terms/product/UniversalLicenseTerms/all",
            target: "_blank",
            rel: "noopener",
          },
          "Universal License Terms"
        ),
        " and ",
        h(
          "a",
          {
            href: "https://www.microsoft.com/licensing/terms/product/ForOnlineServices/all",
            target: "_blank",
            rel: "noopener",
          },
          "For Online Services"
        ),
        "). The ",
        h(
          "a",
          { href: "https://www.microsoft.com/en-us/licensing", target: "_blank", rel: "noopener" },
          "Microsoft Licensing Hub"
        ),
        " carries program-level changes (e.g.&nbsp;the ",
        h(
          "a",
          {
            href: "https://www.microsoft.com/en-us/licensing/news/Microsoft365-Teams-2025",
            target: "_blank",
            rel: "noopener",
          },
          "Microsoft 365 + Teams 2025 packaging"
        ),
        " update and the ",
        h(
          "a",
          {
            href: "https://www.microsoft.com/en-us/licensing/news/Update-to-external-users-2024",
            target: "_blank",
            rel: "noopener",
          },
          "2024 External Users definition"
        ),
        "). Verify SKU eligibility with your Microsoft account team before purchase."
      )
    );
  }

  private actionsHTML(actions?: Action[]): string {
    if (!actions?.length) return "";
    const btns = each(actions, (a, i) => {
      const cls = `btn ${toneBtn(a.tone)}`;
      return a.href
        ? h(
            "a",
            { class: cls, href: a.href, target: "_blank", rel: "noopener" },
            escapeHTML(a.label)
          )
        : h(
            "button",
            {
              type: "button",
              class: cls,
              "data-action-target": a.target ?? "",
              "data-action-idx": i,
            },
            escapeHTML(a.label)
          );
    });
    return h("div", { class: "btn-row no-print" }, btns);
  }

  // ---------- Frontline wizard (computed result) ----------

  /**
   * Walk the navigation history, find every frontline-tagged question the
   * user answered, and reduce to a single derived wizard state. Recomputed
   * on every render so Back navigation automatically un-does its effects.
   */
  private computeFrontlineState(): FrontlineWizardState {
    const state: FrontlineWizardState = {
      eligible: true,
      needsMailbox: false,
      softFlags: new Set(),
      addons: new Map(),
      hardFails: [],
    };
    for (const entry of this.state.history) {
      const node = this.cfg.tree[entry.id];
      const meta = node?.frontline as FrontlineNodeMeta | undefined;
      if (!meta || !entry.label) continue;
      const branch = entry.label === "Yes" ? meta.yes : entry.label === "No" ? meta.no : undefined;
      if (!branch) continue;
      if (branch.flag) {
        if (branch.flag.key === "needsMailbox") state.needsMailbox = branch.flag.value;
        if (branch.flag.key === "eligible") state.eligible = branch.flag.value;
      }
      if (branch.softFlag) state.softFlags.add(branch.softFlag.key);
      if (branch.addon) {
        const item = (ADDONS as Record<string, PriceItem>)[branch.addon.key];
        if (item) state.addons.set(item.key, item);
      }
      if (branch.hardFail) {
        if (!state.hardFails.some((h) => h.key === branch.hardFail!.key)) {
          state.hardFails.push(branch.hardFail);
        }
      }
      if (branch.ineligible) state.eligible = false;
    }
    return state;
  }

  /**
   * Apply the recommendation logic: pick the cheapest licensing posture that
   * still closes every requirement the user flagged.
   *
   * - Hard fails to E5 take precedence over hard fails to E3.
   * - A hard fail to E3 promotes the base SKU to E3 (add-ons stripped — they
   *   are already covered by E or no longer relevant).
   * - Otherwise base = F3 if mailbox needed, else F1.
   * - Add-on totals are computed on top of the F base. If F + add-ons exceeds
   *   the corresponding E SKU list price (or the considerE5 soft flag fires),
   *   the recommendation flips to the E SKU and the add-ons are noted as
   *   "already included in E5 / E3" where applicable.
   */
  private recommendFrontline(s: FrontlineWizardState): FrontlineRecommendation {
    const reasoning: string[] = [];
    const hardFailReasons = s.hardFails.map((f) => f.reason);
    const e3 = BASE_SKUS.e3;
    const e5 = BASE_SKUS.e5;
    const copilotAddon = s.addons.get("copilot_m365");
    const purviewAddon = s.addons.get("purview_dlp");
    const considerE5 = s.softFlags.has("considerE5") || !!purviewAddon;

    // Hard fail to E5 — purview + other E5-only features.
    const hardE5 = s.hardFails.some((f) => f.upgrade === "e5");
    const hardE3 = s.hardFails.some((f) => f.upgrade === "e3");

    const fBase = s.needsMailbox ? BASE_SKUS.f3 : BASE_SKUS.f1;
    const addonList = [...s.addons.values()];
    const fAddonTotal = addonList.reduce((sum, a) => sum + a.cost, 0);
    const fTotal = fBase.cost + fAddonTotal;

    // Build all comparison candidates so the UI can show the trade-off.
    const e3Plus = copilotAddon ? e3.cost + copilotAddon.cost : e3.cost;
    const e5Plus = copilotAddon ? e5.cost + copilotAddon.cost : e5.cost;

    let baseSku: PriceItem;
    let finalAddons: PriceItem[];
    let monthlyTotal: number;
    let recommendedLabel: string;

    if (hardE5 || (considerE5 && fTotal >= e5.cost)) {
      baseSku = e5;
      finalAddons = copilotAddon ? [copilotAddon] : [];
      monthlyTotal = baseSku.cost + finalAddons.reduce((sum, a) => sum + a.cost, 0);
      recommendedLabel = copilotAddon ? "Microsoft 365 E5 + Copilot" : "Microsoft 365 E5";
      if (hardE5) {
        reasoning.push(
          "At least one hard-fail feature gap requires Microsoft 365 E5 (Purview E5 / Defender XDR / Entra ID P2 features that have no F-compatible add-on)."
        );
      }
      if (considerE5 && !hardE5) {
        reasoning.push(
          `The Purview E5 Compliance add-on (or other E5-tier feature) you flagged makes M365 E5 the better-value posture once cumulative F add-ons reach ${formatPrice(fTotal)} / user / month.`
        );
      }
    } else if (hardE3 || fTotal > e3.cost) {
      baseSku = e3;
      finalAddons = copilotAddon ? [copilotAddon] : [];
      monthlyTotal = baseSku.cost + finalAddons.reduce((sum, a) => sum + a.cost, 0);
      recommendedLabel = copilotAddon ? "Microsoft 365 E3 + Copilot" : "Microsoft 365 E3";
      if (hardE3) {
        reasoning.push(
          "At least one hard-fail feature gap cannot be closed with any F add-on (desktop apps / >10.9″ mobile / >2 GB OneDrive). E3 closes the gap with the bundled benefit."
        );
      } else {
        reasoning.push(
          `Cumulative F + add-on cost (${formatPrice(fTotal)}) exceeds the M365 E3 list price (${formatPrice(e3.cost)}). E3 bundles the same benefits and costs less — recommend E3.`
        );
      }
    } else {
      baseSku = fBase;
      finalAddons = addonList;
      monthlyTotal = fTotal;
      recommendedLabel =
        addonList.length > 0
          ? `${fBase.name} + ${addonList.length} add-on${addonList.length === 1 ? "" : "s"}`
          : fBase.name;
      if (s.needsMailbox) {
        reasoning.push("User needs their own Exchange mailbox → F3 is the correct base SKU.");
      } else {
        reasoning.push(
          "User does not need a personal mailbox → F1 is the cheapest legitimate base SKU."
        );
      }
      if (addonList.length > 0) {
        reasoning.push(
          `Microsoft-approved add-ons total ${formatPrice(fAddonTotal)} / user / month on top of the ${formatPrice(fBase.cost)} base.`
        );
        reasoning.push(
          `Total of ${formatPrice(monthlyTotal)} is still cheaper than M365 E3 (${formatPrice(e3.cost)}) — F + add-ons wins on value.`
        );
      } else {
        reasoning.push(
          "No add-ons required — the base F SKU covers every requirement you flagged."
        );
      }
    }

    const comparison: FrontlineRecommendation["comparison"] = [];

    // Recommended row first
    comparison.push({
      label: recommendedLabel,
      total: monthlyTotal,
      delta: "Recommended",
      recommended: true,
      note: "Closes every requirement you flagged at the lowest list price.",
    });

    // Always include F1 / F3 alternatives so the trade-off is visible.
    if (baseSku.key !== "f1" && !hardE3 && !hardE5 && !s.needsMailbox) {
      const f1Total = BASE_SKUS.f1.cost + fAddonTotal;
      comparison.push({
        label: `${BASE_SKUS.f1.name} + add-ons`,
        total: f1Total,
        delta: this.formatDelta(f1Total, monthlyTotal),
        recommended: false,
        note: "F1 alternative if a personal mailbox isn't actually required.",
      });
    }
    if (baseSku.key !== "f3" && !hardE3 && !hardE5) {
      const f3Total = BASE_SKUS.f3.cost + fAddonTotal;
      comparison.push({
        label: `${BASE_SKUS.f3.name} + add-ons`,
        total: f3Total,
        delta: this.formatDelta(f3Total, monthlyTotal),
        recommended: false,
        note: "F3 alternative — the full-featured frontline tier with mailbox + mobile Office.",
      });
    }
    if (baseSku.key !== "e3") {
      comparison.push({
        label: copilotAddon ? "Microsoft 365 E3 + Copilot" : "Microsoft 365 E3",
        total: e3Plus,
        delta: this.formatDelta(e3Plus, monthlyTotal),
        recommended: false,
        note: "E3 baseline — desktop Office, 100 GB mailbox, 1+ TB OneDrive, archive, full Teams.",
      });
    }
    if (baseSku.key !== "e5") {
      comparison.push({
        label: copilotAddon ? "Microsoft 365 E5 + Copilot" : "Microsoft 365 E5",
        total: e5Plus,
        delta: this.formatDelta(e5Plus, monthlyTotal),
        recommended: false,
        note: "E5 ceiling — adds Defender XDR + Purview E5 + Entra ID P2 + Teams Phone + Power BI Pro.",
      });
    }

    return {
      baseSku,
      addons: finalAddons,
      monthlyTotal,
      comparison,
      reasoning,
      hardFails: hardFailReasons,
    };
  }

  private formatDelta(candidate: number, recommended: number): string {
    const diff = candidate - recommended;
    if (Math.abs(diff) < 0.005) return "Same price";
    const sign = diff > 0 ? "+" : "−";
    return `${sign}${formatPrice(Math.abs(diff))} / user / month vs. recommended`;
  }

  /** Detect whether the user picked the privileged-admin profile at the
   *  start. Drives whether the result-pricing panel renders the privileged-
   *  admin lens callout (cross-references info_privileged_admins). */
  private isPrivilegedAdminProfile(): boolean {
    const p = (this.state.profile ?? "").toLowerCase();
    return p.includes("admin") || p.includes("privileged");
  }

  /** Build the static result-pricing panel for any result node that has an
   *  entry in RESULT_PRICING. Layout mirrors the frontline computed panel
   *  for visual consistency: AI-assisted callout → optional privileged-admin
   *  lens callout → cost-breakdown table → comparison bar chart → reasoning
   *  list → canonical sources. Specialty-priced SKUs (E7, Education,
   *  Government, Nonprofit, External ID) skip the numeric tables and bar
   *  chart and render a "contact your Microsoft account team" note instead. */
  private resultPricingHTML(resultId: string): string {
    const rec = getResultPricing(resultId);
    if (!rec) return ""; // no pricing data — graceful fallback
    const isPrivAdmin = this.isPrivilegedAdminProfile();
    const recommendedTotal = sumLines(rec.lines);
    const hasNumericTotal = rec.lines.some((l) => l.cost !== null);

    // Cost-breakdown rows. Specialty SKUs (cost: null) render with a "—"
    // in the cost column instead of $0 to keep "no list price" honest.
    const lineRows = each(rec.lines, (line) => {
      const labelCell =
        line.source != null
          ? h(
              "a",
              { href: line.source.url, target: "_blank", rel: "noopener" },
              escapeHTML(line.label)
            )
          : escapeHTML(line.label);
      const costCell =
        line.cost === null
          ? h("span", { class: "result-pricing__cost-na" }, "—")
          : formatPrice(line.cost);
      return h(
        "tr",
        { class: "frontline-calc__row" },
        h("td", null, labelCell),
        h("td", { class: "frontline-calc__cost" }, costCell),
        h("td", null, escapeHTML(line.note ?? ""))
      );
    });

    const totalRow = hasNumericTotal
      ? h(
          "tr",
          { class: "frontline-calc__row frontline-calc__row--total" },
          h("td", null, h("strong", null, "Total per user / month (USD)")),
          h(
            "td",
            { class: "frontline-calc__cost" },
            h("strong", null, formatPrice(recommendedTotal))
          ),
          h("td", null, "List price, annual commitment.")
        )
      : "";

    // Bar-chart-friendly comparison rows. The chart is rendered as a CSS
    // bar with width proportional to cost — recommended row is highlighted.
    // Use the max across all numeric values (recommended + alternatives)
    // as the bar denominator so the recommended row's bar reflects its
    // RELATIVE size next to the alternatives, not just the highest.
    const numericAlternatives = rec.alternatives.filter((a) => a.cost !== null);
    const maxCost = Math.max(
      recommendedTotal,
      ...numericAlternatives.map((a) => a.cost as number),
      0.01 // avoid divide-by-zero when everything is $0
    );

    // Build chart entries: recommended posture first, then each alternative
    // in declared order. Each entry has its own bar width % of max.
    const chartEntries = [
      {
        label: rec.recommendationLabel,
        cost: hasNumericTotal ? recommendedTotal : null,
        delta: "Recommended",
        note: "Closes every requirement you flagged at the lowest list price.",
        recommended: true,
      },
      ...rec.alternatives.map((alt) => ({
        label: alt.label,
        cost: alt.cost,
        delta:
          alt.cost === null
            ? "Specialty — contact account team"
            : hasNumericTotal
              ? this.formatDelta(alt.cost, recommendedTotal)
              : "—",
        note: alt.note,
        recommended: false,
      })),
    ];

    const chartRows = each(chartEntries, (entry) => {
      const widthPct =
        entry.cost === null ? 0 : Math.max(2, Math.round((entry.cost / maxCost) * 100));
      const barLabel = entry.cost === null ? "n/a" : formatPrice(entry.cost);
      return h(
        "tr",
        {
          class: `frontline-compare__row${entry.recommended ? " frontline-compare__row--rec" : ""}`,
        },
        h(
          "td",
          null,
          entry.recommended ? h("strong", null, escapeHTML(entry.label)) : escapeHTML(entry.label)
        ),
        h(
          "td",
          { class: "result-pricing__chart-cell" },
          h(
            "div",
            { class: "result-pricing__chart-row" },
            h(
              "div",
              {
                class: `result-pricing__bar${entry.recommended ? " result-pricing__bar--rec" : ""}`,
                style: `width: ${widthPct}%`,
                "aria-hidden": "true",
              },
              ""
            ),
            h("span", { class: "result-pricing__bar-label" }, barLabel)
          )
        ),
        h("td", null, escapeHTML(entry.delta)),
        h("td", null, escapeHTML(entry.note ?? ""))
      );
    });

    const reasoningList = each(rec.reasoning, (r) => h("li", null, escapeHTML(r)));

    const specialtyNote = rec.specialty
      ? h(
          "div",
          { class: "frontline-callout frontline-callout--warn" },
          h(
            "p",
            null,
            h("strong", null, "Specialty pricing. "),
            "This SKU does not have a flat public list price. The recommendation, sources, and reasoning below are accurate as of " +
              escapeHTML(PRICING_LAST_VERIFIED) +
              " — always confirm pricing with your Microsoft account team or the appropriate channel (Education / Government / Nonprofit / Federal)."
          )
        )
      : "";

    const privAdminLens =
      isPrivAdmin && rec.privilegedAdminLens
        ? h(
            "div",
            { class: "frontline-callout result-pricing__priv-admin" },
            h(
              "p",
              null,
              h("strong", null, "Privileged-admin lens. "),
              escapeHTML(rec.privilegedAdminLens)
            ),
            h(
              "p",
              { class: "frontline-callout__source" },
              "Full guide: ",
              h(
                "a",
                {
                  href: "#",
                  "data-helplink": "info_privileged_admins",
                },
                "Why privileged (dedicated) admin accounts? (info_privileged_admins)"
              )
            )
          )
        : "";

    return h(
      "section",
      { class: "frontline-computed result-pricing", "data-result-id": resultId },
      h(
        "div",
        { class: "frontline-callout frontline-callout--ai" },
        h(
          "p",
          null,
          h("strong", null, "AI-assisted recommendation. "),
          `Computed from your wizard answers using Microsoft public list prices (last verified ${PRICING_LAST_VERIFIED}). Always confirm CSP / EA / partner-channel pricing with your Microsoft account team.`
        )
      ),
      specialtyNote,
      privAdminLens,
      h("h3", { class: "frontline-calc__heading" }, "Cost breakdown"),
      h(
        "table",
        { class: "frontline-calc" },
        h(
          "thead",
          null,
          h(
            "tr",
            null,
            h("th", null, "Line item"),
            h("th", { class: "frontline-calc__cost" }, "USD / user / month"),
            h("th", null, "Notes")
          )
        ),
        h("tbody", null, lineRows, totalRow)
      ),
      rec.alternatives.length > 0
        ? h(
            "div",
            null,
            h("h3", { class: "frontline-calc__heading" }, "Compare against alternatives (visual)"),
            h(
              "table",
              { class: "frontline-compare result-pricing__chart" },
              h(
                "thead",
                null,
                h(
                  "tr",
                  null,
                  h("th", null, "Option"),
                  h("th", null, "Cost (visual bar)"),
                  h("th", null, "Delta"),
                  h("th", null, "Notes")
                )
              ),
              h("tbody", null, chartRows)
            )
          )
        : "",
      h("h3", { class: "frontline-calc__heading" }, "Why this recommendation (AI reasoning)"),
      h("ul", { class: "frontline-reasoning" }, reasoningList),
      h(
        "p",
        { class: "frontline-callout__source" },
        "Canonical sources: ",
        h(
          "a",
          { href: MICROSOFT_365_ENTERPRISE_PRICING.url, target: "_blank", rel: "noopener" },
          "Enterprise pricing"
        ),
        " · ",
        h(
          "a",
          { href: MICROSOFT_365_FRONTLINE_PRICING.url, target: "_blank", rel: "noopener" },
          "Frontline pricing"
        ),
        " · ",
        h(
          "a",
          { href: MODERN_WORK_PLAN_COMPARISON.url, target: "_blank", rel: "noopener" },
          "Modern Work comparison PDF"
        ),
        " · ",
        h(
          "a",
          { href: MICROSOFT_365_LICENSING_DOCS.url, target: "_blank", rel: "noopener" },
          "M365 Licensing hub"
        ),
        "."
      )
    );
  }

  /** Build the dynamic wizard-result HTML injected into the result card. */
  private frontlineComputedHTML(): string {
    const wstate = this.computeFrontlineState();
    const rec = this.recommendFrontline(wstate);
    const baseRow = h(
      "tr",
      { class: "frontline-calc__row frontline-calc__row--base" },
      h("td", null, escapeHTML(rec.baseSku.name)),
      h("td", { class: "frontline-calc__cost" }, formatPrice(rec.baseSku.cost)),
      h("td", null, escapeHTML(rec.baseSku.note ?? ""))
    );
    const addonRows = each(rec.addons, (addon) =>
      h(
        "tr",
        { class: "frontline-calc__row" },
        h(
          "td",
          null,
          h(
            "a",
            { href: addon.source.url, target: "_blank", rel: "noopener" },
            escapeHTML(addon.name)
          )
        ),
        h("td", { class: "frontline-calc__cost" }, `+${formatPrice(addon.cost)}`),
        h("td", null, escapeHTML(addon.note ?? ""))
      )
    );
    const totalRow = h(
      "tr",
      { class: "frontline-calc__row frontline-calc__row--total" },
      h("td", null, h("strong", null, "Total per user / month (USD)")),
      h("td", { class: "frontline-calc__cost" }, h("strong", null, formatPrice(rec.monthlyTotal))),
      h("td", null, "")
    );

    const comparisonRows = each(rec.comparison, (row) =>
      h(
        "tr",
        { class: `frontline-compare__row${row.recommended ? " frontline-compare__row--rec" : ""}` },
        h(
          "td",
          null,
          row.recommended ? h("strong", null, escapeHTML(row.label)) : escapeHTML(row.label)
        ),
        h("td", { class: "frontline-calc__cost" }, formatPrice(row.total)),
        h("td", null, escapeHTML(row.delta)),
        h("td", null, escapeHTML(row.note ?? ""))
      )
    );

    const reasoningList = each(rec.reasoning, (r) => h("li", null, escapeHTML(r)));
    const hardFailList = rec.hardFails.length
      ? h(
          "div",
          { class: "frontline-callout frontline-callout--warn" },
          h("p", null, h("strong", null, "Frontline ceiling hit on the following requirements:")),
          h(
            "ul",
            null,
            each(rec.hardFails, (r) => h("li", null, escapeHTML(r)))
          )
        )
      : "";

    return h(
      "section",
      { class: "frontline-computed", "data-base-sku": rec.baseSku.key },
      h(
        "div",
        { class: "frontline-callout frontline-callout--ai" },
        h(
          "p",
          null,
          h("strong", null, "AI-assisted recommendation. "),
          `Computed from your wizard answers using Microsoft public list prices (last verified ${PRICING_LAST_VERIFIED}). Always confirm CSP / EA / partner-channel pricing with your Microsoft account team.`
        ),
        h(
          "p",
          { class: "frontline-callout__source" },
          "Canonical sources: ",
          h(
            "a",
            {
              href: MICROSOFT_365_FRONTLINE_PRICING.url,
              target: "_blank",
              rel: "noopener",
            },
            "Frontline F1 / F3 pricing"
          ),
          " · ",
          h(
            "a",
            {
              href: MICROSOFT_365_ENTERPRISE_PRICING.url,
              target: "_blank",
              rel: "noopener",
            },
            "Enterprise E3 / E5 pricing"
          ),
          " · ",
          h(
            "a",
            {
              href: MODERN_WORK_PLAN_COMPARISON.url,
              target: "_blank",
              rel: "noopener",
            },
            "Modern Work plan comparison PDF"
          ),
          " · ",
          h(
            "a",
            {
              href: EXCHANGE_ONLINE_LIMITS.url,
              target: "_blank",
              rel: "noopener",
            },
            "Exchange Online service limits"
          ),
          " · ",
          h(
            "a",
            {
              href: MICROSOFT_365_LICENSING_DOCS.url,
              target: "_blank",
              rel: "noopener",
            },
            "M365 Licensing Resources hub"
          ),
          "."
        )
      ),
      hardFailList,
      h("h3", { class: "frontline-calc__heading" }, "Cost breakdown"),
      h(
        "table",
        { class: "frontline-calc" },
        h(
          "thead",
          null,
          h(
            "tr",
            null,
            h("th", null, "Line item"),
            h("th", { class: "frontline-calc__cost" }, "USD / user / month"),
            h("th", null, "Notes")
          )
        ),
        h("tbody", null, baseRow, addonRows, totalRow)
      ),
      h("h3", { class: "frontline-calc__heading" }, "Compare against alternatives"),
      h(
        "table",
        { class: "frontline-compare" },
        h(
          "thead",
          null,
          h(
            "tr",
            null,
            h("th", null, "Option"),
            h("th", { class: "frontline-calc__cost" }, "USD / user / month"),
            h("th", null, "Delta"),
            h("th", null, "Notes")
          )
        ),
        h("tbody", null, comparisonRows)
      ),
      h("h3", { class: "frontline-calc__heading" }, "Why this recommendation"),
      h("ul", { class: "frontline-reasoning" }, reasoningList)
    );
  }

  private trailHTML(): string {
    const items = each(this.state.history, (entry) => {
      const n = this.cfg.tree[entry.id];
      const q = n?.question ?? n?.title ?? entry.id;
      return h(
        "li",
        null,
        h("span", { class: "trail__q" }, escapeHTML(truncate(q, 90))),
        when(entry.label, (a) => h("span", { class: "trail__a" }, escapeHTML(a))),
        entry.subAnswers?.length
          ? h(
              "ul",
              { class: "trail__subanswers", "aria-label": "Per-product answers" },
              each(entry.subAnswers, (s) =>
                h(
                  "li",
                  { class: `trail__suba trail__suba--${s.answer}` },
                  h("span", { class: "trail__suba-name" }, escapeHTML(s.name)),
                  h("span", { class: "trail__suba-answer" }, s.answer === "yes" ? "✓ Yes" : "✗ No")
                )
              )
            )
          : ""
      );
    });
    return h(
      "aside",
      { class: "trail no-print", "aria-label": "Your answers so far" },
      h(
        "details",
        null,
        h("summary", null, `Your answers (${this.state.history.length})`),
        h("ol", { class: "trail__list" }, items)
      )
    );
  }

  // ---------- Event binding ----------
  private bind(): void {
    this.root.addEventListener("click", this.onClick, { once: true });
  }

  private onClick = (e: Event): void => {
    const t = e.target as HTMLElement;
    const choice = t.closest<HTMLElement>("[data-target]");
    if (choice && choice.dataset.target) {
      e.preventDefault();
      this.goto(choice.dataset.target, choice.dataset.label);
      return;
    }
    const help = t.closest<HTMLAnchorElement>("[data-helplink]");
    if (help) {
      e.preventDefault();
      this.goto(help.dataset.helplink!);
      return;
    }
    const action = t.closest<HTMLElement>("[data-action-target]");
    if (action && action.dataset.actionTarget) {
      this.goto(action.dataset.actionTarget, action.textContent ?? undefined);
      return;
    }
    const ctrl = t.closest<HTMLElement>("[data-action]");
    if (ctrl) {
      if (ctrl.dataset.action === "back") this.back();
      else if (ctrl.dataset.action === "restart") this.restart();
      this.bind();
      return;
    }
    // Productbreakdown mode toggle ("Show all" vs "Walk through interactively").
    // Toggling away from interactive preserves the user's picks, so flipping
    // back doesn't lose work; toggling INTO interactive starts the walkthrough
    // at the first unanswered aggregable card (or at the Finish-button view
    // if every aggregable card already has an answer from a previous pass).
    const modeBtn = t.closest<HTMLElement>("[data-breakdown-mode]");
    if (modeBtn) {
      const mode = modeBtn.dataset.breakdownMode;
      const next = mode === "interactive";
      if (next !== this.interactiveBreakdown) {
        this.interactiveBreakdown = next;
        if (next) {
          // Seed walkthrough position from any preserved picks. We count
          // answered aggregable items as the resume point so the user doesn't
          // re-walk cards they've already decided on. Walking is sequential,
          // so non-sequential picks still resume at the highest contiguous
          // index — but we keep things simple and just count.
          const node = this.cfg.tree[this.state.currentId];
          const aggregable =
            node?.productBreakdown?.filter((i) => i.scope !== "tenant-wide-not-scopeable") ?? [];
          const answered = aggregable.filter(
            (i) =>
              this.pendingSubAnswers[i.name] === "yes" || this.pendingSubAnswers[i.name] === "no"
          ).length;
          this.walkthroughStep = answered;
          this.walkthroughFinished = false;
        } else {
          this.walkthroughStep = 0;
          this.walkthroughFinished = false;
        }
        this.render();
      } else {
        this.bind();
      }
      return;
    }
    // Walkthrough navigation buttons: Back (revisit prior card), Finish
    // (lock in the computed determination → reveal the outer Yes/No row).
    if (t.closest<HTMLElement>("[data-walkthrough-back]")) {
      if (this.walkthroughFinished) {
        // Step back out of the "finished" state into the Finish-button view
        // so the user can re-open prior cards or change an answer.
        this.walkthroughFinished = false;
      } else if (this.walkthroughStep > 0) {
        this.walkthroughStep -= 1;
      }
      this.render();
      return;
    }
    if (t.closest<HTMLElement>("[data-walkthrough-finish]")) {
      this.walkthroughFinished = true;
      this.render();
      return;
    }
    // Per-item Yes/No (or Clear) decision inside a productBreakdown card.
    // In walkthrough mode, answering the active card auto-advances to the
    // next; clearing an earlier card rewinds the walkthrough to that point
    // (and exits the "finished" reasoning view if we were in it).
    const subItem = t.closest<HTMLElement>("[data-subitem-name]");
    if (subItem) {
      const name = subItem.dataset.subitemName;
      const answer = subItem.dataset.subitemAnswer;
      if (name) {
        const node = this.cfg.tree[this.state.currentId];
        const aggregable =
          node?.productBreakdown?.filter((i) => i.scope !== "tenant-wide-not-scopeable") ?? [];
        const idx = aggregable.findIndex((i) => i.name === name);
        if (answer === "clear") {
          delete this.pendingSubAnswers[name];
          if (this.interactiveBreakdown) {
            this.walkthroughFinished = false;
            if (idx >= 0 && idx < this.walkthroughStep) this.walkthroughStep = idx;
          }
        } else if (answer === "yes" || answer === "no") {
          this.pendingSubAnswers[name] = answer;
          // Auto-advance only when the user just answered the currently-
          // active card (idx === walkthroughStep). Editing a previously-
          // reviewed card updates the answer but keeps position.
          if (this.interactiveBreakdown && idx === this.walkthroughStep) {
            this.walkthroughStep = Math.min(this.walkthroughStep + 1, aggregable.length);
          }
        }
        // Re-render so the live aggregation and styling reflect the new pick.
        this.render();
      } else {
        this.bind();
      }
      return;
    }
    const node = this.cfg.tree[this.state.currentId];
    if (t.matches("[data-yes]") && node?.yes) {
      this.goto(node.yes, "Yes");
      return;
    }
    if (t.matches("[data-no]") && node?.no) {
      this.goto(node.no, "No");
      return;
    }
    if (t.matches("[data-restart]")) {
      this.restart();
      return;
    }
    if (t.matches("[data-print]")) {
      window.print();
      this.bind();
      return;
    }
    if (t.matches("[data-copy]")) {
      void this.copySummary(node);
      this.bind();
      return;
    }
    if (t.closest("[data-copy-node]")) {
      void this.copyNodeDetails(node);
      this.bind();
      return;
    }
    if (t.matches("[data-pdf]")) {
      void this.generatePDF(node);
      this.bind();
      return;
    }
    this.bind();
  };

  // ---------- Summary / PDF / Copy ----------
  private buildSummary(node?: TreeNode): string {
    if (!node) return "";
    const trail = this.state.history
      .map((entry) => {
        const q = this.cfg.tree[entry.id]?.question ?? this.cfg.tree[entry.id]?.title ?? entry.id;
        const main = `  - ${q} → ${entry.label ?? ""}`;
        if (!entry.subAnswers?.length) return main;
        const subLines = entry.subAnswers.map(
          (s) => `      • ${s.name}: ${s.answer === "yes" ? "Yes" : "No"}`
        );
        return [main, ...subLines].join("\n");
      })
      .join("\n");
    const frontlineBlock = node.computed === "frontline" ? this.buildFrontlineSummaryBlock() : "";
    const pricingBlock =
      node.result && node.computed !== "frontline"
        ? this.buildResultPricingSummaryBlock(this.state.currentId)
        : "";
    const lines: (string | false)[] = [
      "M365 Profiles recommendation",
      "===========================",
      "",
      `Profile:         ${this.state.profile ?? "(not specified)"}`,
      "",
      `Recommendation: ${node.title ?? "(see details)"}`,
      !!node.sub && node.sub,
      "",
      !!frontlineBlock && frontlineBlock,
      !!pricingBlock && pricingBlock,
      !!node.bullets?.length &&
        ["Key points:", ...node.bullets.map((b) => `  • ${b}`), ""].join("\n"),
      "Your answers:",
      trail || "  (none)",
      "",
      "Sources:",
      ...docsOf(node).map(([l, u]) => `  - ${l}: ${u}`),
      "",
      `Generated by M365 Profiles ${APP_VERSION} — unofficial helper, not Microsoft guidance.`,
    ];
    return lines.filter((l): l is string => Boolean(l)).join("\n");
  }

  /** Plain-text rendering of the per-result static pricing recommendation
   *  for inclusion in the clipboard summary + PDF handout. Mirrors
   *  `buildFrontlineSummaryBlock` for non-frontline result nodes. Returns
   *  an empty string when the result has no RESULT_PRICING entry. */
  private buildResultPricingSummaryBlock(resultId: string): string {
    const rec = getResultPricing(resultId);
    if (!rec) return "";
    const isPrivAdmin = this.isPrivilegedAdminProfile();
    const recommendedTotal = sumLines(rec.lines);
    const hasNumericTotal = rec.lines.some((l) => l.cost !== null);
    const lines: string[] = [
      "AI-assisted pricing recommendation",
      "---------------------------------",
      `Recommended posture:  ${rec.recommendationLabel}`,
    ];
    if (hasNumericTotal) {
      lines.push(
        `Total list price:     ${formatPrice(recommendedTotal)} / user / month (USD, annual commitment)`
      );
    } else {
      lines.push(`Total list price:     specialty SKU — confirm with your Microsoft account team`);
    }
    lines.push(`Pricing last verified: ${PRICING_LAST_VERIFIED}`);
    if (rec.specialty) {
      lines.push(
        `Note: this SKU does not have a flat public per-user / month list price (Education / Government / Nonprofit / E7 Frontier Suite / MAU-based External ID).`
      );
    }
    lines.push("");
    lines.push("Cost breakdown:");
    for (const line of rec.lines) {
      const costStr = line.cost === null ? "—" : formatPrice(line.cost);
      const note = line.note ? `  — ${line.note}` : "";
      lines.push(`  - ${line.label}: ${costStr}${note}`);
    }
    if (hasNumericTotal && rec.lines.length > 1) {
      lines.push(`  = TOTAL: ${formatPrice(recommendedTotal)} / user / month`);
    }
    lines.push("");
    if (rec.alternatives.length > 0) {
      lines.push("Compare against alternatives:");
      lines.push(
        `  ★ ${rec.recommendationLabel}: ${hasNumericTotal ? formatPrice(recommendedTotal) : "n/a"}  (Recommended)`
      );
      for (const alt of rec.alternatives) {
        const costStr = alt.cost === null ? "specialty pricing" : formatPrice(alt.cost);
        const delta =
          alt.cost === null
            ? "contact account team"
            : hasNumericTotal
              ? this.formatDelta(alt.cost, recommendedTotal)
              : "—";
        lines.push(`    ${alt.label}: ${costStr} — ${delta}`);
        if (alt.note) lines.push(`      ${alt.note}`);
      }
      lines.push("");
    }
    lines.push("Why this recommendation (AI reasoning):");
    for (const r of rec.reasoning) lines.push(`  • ${r}`);
    lines.push("");
    if (isPrivAdmin && rec.privilegedAdminLens) {
      lines.push("Privileged-admin lens:");
      lines.push(`  ${rec.privilegedAdminLens}`);
      lines.push(
        `  Full guide: Why privileged (dedicated) admin accounts? (info_privileged_admins)`
      );
      lines.push("");
    }
    return lines.join("\n");
  }

  /** Plain-text rendering of the frontline computed recommendation for
   *  inclusion in clipboard summary + PDF. */
  private buildFrontlineSummaryBlock(): string {
    const wstate = this.computeFrontlineState();
    const rec = this.recommendFrontline(wstate);
    const lines: string[] = [
      "Frontline wizard — AI-assisted recommendation",
      "---------------------------------------------",
      `Recommended posture:  ${rec.baseSku.name}${rec.addons.length > 0 ? ` + ${rec.addons.length} add-on${rec.addons.length === 1 ? "" : "s"}` : ""}`,
      `Total list price:     ${formatPrice(rec.monthlyTotal)} / user / month (USD, annual commitment)`,
      `Pricing last verified: ${PRICING_LAST_VERIFIED}`,
      `Canonical sources:`,
      `  - ${MICROSOFT_365_FRONTLINE_PRICING.label}`,
      `      ${MICROSOFT_365_FRONTLINE_PRICING.url}`,
      `  - ${MICROSOFT_365_ENTERPRISE_PRICING.label}`,
      `      ${MICROSOFT_365_ENTERPRISE_PRICING.url}`,
      `  - ${MODERN_WORK_PLAN_COMPARISON.label}`,
      `      ${MODERN_WORK_PLAN_COMPARISON.url}`,
      `  - ${EXCHANGE_ONLINE_LIMITS.label}`,
      `      ${EXCHANGE_ONLINE_LIMITS.url}`,
      `  - ${MICROSOFT_365_LICENSING_DOCS.label}`,
      `      ${MICROSOFT_365_LICENSING_DOCS.url}`,
      "",
      "Cost breakdown:",
      `  - ${rec.baseSku.name}: ${formatPrice(rec.baseSku.cost)}`,
    ];
    for (const addon of rec.addons) {
      lines.push(`  - ${addon.name}: +${formatPrice(addon.cost)}  (source: ${addon.source.url})`);
    }
    lines.push(`  = TOTAL: ${formatPrice(rec.monthlyTotal)} / user / month`);
    lines.push("");
    if (rec.hardFails.length) {
      lines.push("Frontline ceiling hit on the following requirements:");
      for (const reason of rec.hardFails) lines.push(`  ! ${reason}`);
      lines.push("");
    }
    lines.push("Comparison:");
    for (const row of rec.comparison) {
      const flag = row.recommended ? "★ " : "  ";
      lines.push(`  ${flag}${row.label}: ${formatPrice(row.total)} — ${row.delta}`);
    }
    lines.push("");
    lines.push("Why this recommendation:");
    for (const r of rec.reasoning) lines.push(`  • ${r}`);
    lines.push("");
    return lines.join("\n");
  }

  private async copySummary(node?: TreeNode): Promise<void> {
    if (!node) return;
    await this.copyText(this.buildSummary(node), "Summary copied to clipboard.");
  }

  private buildNodeDetails(node: TreeNode): string {
    const heading = node.title ?? node.question ?? "Assessment step";
    const lines: (string | false)[] = [heading, "=".repeat(Math.min(heading.length, 80)), ""];
    if (node.title && node.question) lines.push(`Question: ${node.question}`, "");
    if (node.sub) lines.push(node.sub, "");
    if (node.help) lines.push("Context:", node.help, "");
    if (node.rationale?.why) lines.push("Why we ask:", `  ${node.rationale.why}`, "");
    if (node.rationale?.yes) lines.push("If Yes:", `  ${node.rationale.yes}`, "");
    if (node.rationale?.no) lines.push("If No:", `  ${node.rationale.no}`, "");
    if (node.paragraphs?.length) {
      for (const p of node.paragraphs) lines.push(p, "");
    }
    if (node.bullets?.length) {
      lines.push("Key points:");
      for (const b of node.bullets) lines.push(`  • ${b}`);
      lines.push("");
    }
    if (node.choices?.length) {
      lines.push("Options:");
      for (const c of node.choices) {
        lines.push(`  • ${c.label}${c.sublabel ? ` — ${c.sublabel}` : ""}`);
      }
      lines.push("");
    }
    if (node.examples?.length) {
      lines.push("Examples:");
      for (const ex of node.examples) lines.push(`  • ${ex}`);
      lines.push("");
    }
    if (node.productBreakdown?.length) {
      lines.push("Per-product scope breakdown:");
      for (const item of node.productBreakdown) {
        lines.push("");
        const star = item.scope === "tenant-wide-not-scopeable" ? " *" : "";
        lines.push(`  ▸ ${item.name}${item.sku ? `  [${item.sku}]` : ""}  (${item.scope}${star})`);
        if (item.scope === "tenant-wide-not-scopeable") {
          lines.push("      Informational only — no verdict suggested.");
          lines.push(
            "      This feature is tenant-wide and not scopeable, so the licensing call for this user is a judgement that depends on your reading of the Microsoft Product Terms, your tenant's technical posture, and Microsoft's Secure Future Initiative (SFI). The technical mechanics, per-product Microsoft references, and Microsoft's two official statements (SFI + Product Terms) are below — use them to make the informed decision yourself. This card does not drive the answer to the outer question."
          );
        }
        lines.push(`      How it scopes: ${item.scopeNote}`);
        if (item.scope !== "tenant-wide-not-scopeable") {
          lines.push(`      In scope when: ${item.inScopeMeans}`);
          if (item.notInScopeMeans) lines.push(`      Not in scope when: ${item.notInScopeMeans}`);
          if (item.examples?.length) {
            for (const ex of item.examples) lines.push(`        - ${ex}`);
          }
        }
        if (item.scope === "tenant-wide-not-scopeable") {
          lines.push("      * Tenant-wide and not scopeable — two Microsoft statements to weigh:");
          lines.push("        Microsoft Secure Future Initiative (SFI) — statement:");
          lines.push(
            "        - SFI is grounded in three principles: Secure by Design, Secure by Default, Secure Operations."
          );
          lines.push(
            "        - Per Satya Nadella's May 2024 SFI memo: \u201Csecurity protections are enabled and enforced by default, require no extra effort, and are not optional.\u201D"
          );
          lines.push(
            "        - Microsoft's recommendation for tenant-wide protections like this one is to enable them — leaving them off is the riskier posture."
          );
          lines.push(
            "        - Source: https://www.microsoft.com/en-us/trust-center/security/secure-future-initiative"
          );
          lines.push(
            "        - Source: https://blogs.microsoft.com/blog/2024/05/03/prioritizing-security-above-all-else/"
          );
          lines.push("        Microsoft Product Terms — statement:");
          lines.push(
            "        - The feature is tenant-wide and not scopeable — once on, every user who benefits is technically protected."
          );
          lines.push(
            "        - The licence, per Microsoft Product Terms, must still be assigned to every user who benefits — Microsoft simply can't enforce it technically."
          );
          lines.push("        - Source: https://www.microsoft.com/licensing/terms/");
          lines.push(
            "        - Source: https://www.microsoft.com/en-us/licensing/product-licensing/products"
          );
          lines.push("        - Source: https://learn.microsoft.com/licensing/");
          lines.push(
            "        Both statements are official Microsoft sources. See the per-product references on this card below for the specific service description and licensing data sheet."
          );
        }
        if (item.docs?.length) {
          for (const [l, u] of item.docs) lines.push(`        source: ${l} — ${u}`);
        }
      }
      lines.push("");
    }
    const docs = docsOf(node);
    if (docs.length) {
      lines.push("Sources & further reading:");
      for (const [label, url] of docs) lines.push(`  - ${label}: ${url}`);
      lines.push("");
    }
    lines.push(
      `Generated by M365 Profiles ${APP_VERSION} — unofficial helper, not Microsoft guidance.`
    );
    return lines.filter((l): l is string => Boolean(l) || l === "").join("\n");
  }

  private async copyNodeDetails(node?: TreeNode): Promise<void> {
    if (!node) return;
    await this.copyText(this.buildNodeDetails(node), "Question details copied to clipboard.");
  }

  private async copyText(txt: string, successMsg: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(txt);
      this.toast(successMsg);
    } catch {
      // Modern browsers all ship the async Clipboard API. The legacy
      // textarea + document.execCommand("copy") fallback was removed —
      // execCommand is deprecated and unreliable under HTTPS / Permissions
      // Policy. If the user is on a browser that blocks the Clipboard API
      // (e.g. an aggressive policy on a managed device) we surface a clear
      // error rather than failing silently.
      this.toast("Copy failed — your browser blocked clipboard access.");
    }
  }

  private async generatePDF(node?: TreeNode): Promise<void> {
    if (!node) return;
    this.toast("Building PDF…");
    try {
      const { buildHandoutPDF } = await import("./pdf");
      // For computed results (e.g. frontline wizard) prepend the dynamic
      // recommendation as additional paragraphs so the handout matches the
      // on-screen card. For all other result nodes, prepend the static
      // result-level pricing recommendation from RESULT_PRICING.
      const frontlineExtra =
        node.computed === "frontline" ? this.buildFrontlineSummaryBlock().split("\n") : [];
      const pricingExtra =
        node.result && node.computed !== "frontline"
          ? this.buildResultPricingSummaryBlock(this.state.currentId).split("\n")
          : [];
      const extraParagraphs = [...frontlineExtra, ...pricingExtra].filter((l) => l.length > 0);
      await buildHandoutPDF({
        profile: this.state.profile,
        title: node.title ?? "Recommendation",
        sub: node.sub,
        bullets: node.bullets ?? [],
        paragraphs: [...extraParagraphs, ...(node.paragraphs ?? [])],
        docs: docsOf(node),
        trail: this.state.history.map((entry) => {
          const n = this.cfg.tree[entry.id];
          return {
            q: n?.question ?? n?.title ?? entry.id,
            a: entry.label ?? "",
            subAnswers: entry.subAnswers,
          };
        }),
      });
      this.toast("PDF downloaded.");
    } catch (err) {
      console.error(err);
      this.toast("PDF failed. Try Print instead.");
    }
  }

  private toast(msg: string): void {
    let t = document.getElementById("toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "toast";
      t.className = "toast";
      t.setAttribute("role", "status");
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("toast--visible");
    window.setTimeout(() => t!.classList.remove("toast--visible"), 2500);
  }
}

// ---------- Bootstrap ----------
function boot(): void {
  const dataEl = document.getElementById("tree-data");
  const root = document.getElementById("assessment");
  if (!dataEl || !root) return;
  // Honour ?restart=1 / ?fresh=1 / ?entry=<nodeId> on the URL — clears any
  // saved progress so the assessment always starts from the requested node
  // (default: cfg.startId). When ?entry= is supplied AND points at a node
  // that actually exists in the tree, we pre-seed sessionStorage with that
  // node as currentId so the Assessment constructor loads it via load().
  // The flags are stripped from the address bar afterwards so a refresh
  // doesn't keep clobbering state.
  try {
    const url = new URL(window.location.href);
    const restart =
      url.searchParams.has("restart") ||
      url.searchParams.has("fresh") ||
      url.searchParams.has("entry");
    if (restart) {
      sessionStorage.removeItem(STORAGE_KEYS.assessmentState);
      const entry = url.searchParams.get("entry");
      if (entry) {
        const cfgPeek = JSON.parse(dataEl.textContent || "{}") as Partial<Config>;
        if (cfgPeek?.tree && Object.prototype.hasOwnProperty.call(cfgPeek.tree, entry)) {
          const seed: State = { currentId: entry, history: [], version: APP_VERSION };
          try {
            sessionStorage.setItem(STORAGE_KEYS.assessmentState, JSON.stringify(seed));
          } catch {
            /* ignore — fall through to normal start */
          }
        }
      }
      url.searchParams.delete("restart");
      url.searchParams.delete("fresh");
      url.searchParams.delete("entry");
      history.replaceState(null, "", url.toString());
    }
  } catch {
    /* ignore — fall through to normal load */
  }
  try {
    const cfg = JSON.parse(dataEl.textContent || "{}") as Config;
    if (!cfg.tree || !cfg.startId) throw new Error("Invalid tree config");
    new Assessment(root as HTMLElement, cfg);
  } catch (err) {
    console.error(err);
    (root as HTMLElement).innerHTML =
      `<div class="callout callout--danger"><strong>Failed to load assessment.</strong> ${escapeHTML((err as Error).message)}</div>`;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
