/**
 * Floating "+$12" numbers. Imperative DOM (pooled elements + CSS animation) so rapid clicking never
 * re-renders React.
 */
let layer: HTMLElement | null = null;

export function setFloaterLayer(el: HTMLElement | null) {
  layer = el;
}

export type FloaterKind = "coin" | "golden" | "fare";

export function spawnFloater(x: number, y: number, text: string, kind: FloaterKind = "coin") {
  if (!layer) return;
  if (layer.childElementCount > 40) layer.firstElementChild?.remove();
  const el = document.createElement("div");
  el.className = `floater floater--${kind}`;
  el.textContent = text;
  el.style.left = `${x + (Math.random() - 0.5) * 24}px`;
  el.style.top = `${y}px`;
  el.addEventListener("animationend", () => el.remove(), { once: true });
  layer.appendChild(el);
}
