// Tiny DOM helpers used by the assessment renderer.

export type Attrs = Record<string, string | number | boolean | null | undefined>;

const VOID = new Set(["br", "hr", "img", "input", "link", "meta"]);

export function escapeHTML(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      (({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }) as const)[
        c as "&" | "<" | ">" | '"' | "'"
      ]!
  );
}

export function attrs(a?: Attrs): string {
  if (!a) return "";
  const out: string[] = [];
  for (const [k, v] of Object.entries(a)) {
    if (v === null || v === undefined || v === false) continue;
    if (v === true) {
      out.push(k);
      continue;
    }
    out.push(`${k}="${escapeHTML(String(v))}"`);
  }
  return out.length ? " " + out.join(" ") : "";
}

export function h(
  tag: string,
  a?: Attrs | null,
  ...children: (string | undefined | null | false)[]
): string {
  const open = `<${tag}${attrs(a ?? undefined)}>`;
  if (VOID.has(tag)) return open;
  const inner = children.filter((c) => c !== undefined && c !== null && c !== false).join("");
  return `${open}${inner}</${tag}>`;
}

export function each<T>(items: T[] | undefined, render: (item: T, i: number) => string): string {
  return (items ?? []).map(render).join("");
}

export function when<T>(value: T | undefined | null | false, render: (v: T) => string): string {
  return value ? render(value as T) : "";
}
