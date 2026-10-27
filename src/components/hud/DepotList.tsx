"use client";

import { useShallow } from "zustand/react/shallow";
import { TRAIN_SETS } from "@/game/content/trainSets";
import { playerDepot, useHud } from "@/game/state/game";
import { formatCoins } from "@/lib/format";
import { sfx } from "@/audio/sfx";

/** Depot: buy a new train set (cosmetic) or swap back to one already owned. */
export function DepotList({ id, hidden }: { id: string; hidden: boolean }) {
  const { coins, trainSet, ownedSets } = useHud(
    useShallow((s) => ({ coins: s.coins, trainSet: s.trainSet, ownedSets: s.ownedSets })),
  );

  return (
    <ul
      id={id}
      role="tabpanel"
      aria-label="Depot"
      className={`${hidden ? "hidden" : "flex"} flex-col gap-1.5 overflow-y-auto px-2.5 pb-2.5 [@media(max-height:520px)]:gap-1`}
    >
      <li className="text-xs leading-tight text-amber-100/60">
        New train sets look different but run and earn the same.
      </li>
      {TRAIN_SETS.map((t) => {
        const owned = ownedSets.includes(t.id);
        const active = trainSet === t.id;
        const affordable = owned || coins >= t.price;
        const status = active ? "In service" : owned ? "Use" : formatCoins(t.price);
        return (
          <li key={t.id}>
            <button
              data-testid={`depot-${t.id}`}
              disabled={active || !affordable}
              aria-pressed={active}
              onClick={(e) => {
                if (playerDepot(t.id)) {
                  if (owned) sfx.coin();
                  else sfx.buy();
                }
                if (e.detail > 0) e.currentTarget.blur();
              }}
              className={`flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-left transition focus-visible:outline-2 focus-visible:outline-amber-300 ${
                active
                  ? "border-emerald-400/70 bg-emerald-900/30"
                  : affordable
                    ? "border-amber-500/60 bg-amber-900/30 hover:bg-amber-800/40 active:scale-[0.98]"
                    : "border-white/10 bg-black/20 opacity-70"
              }`}
            >
              <span
                aria-hidden
                className="mt-0.5 grid h-6 w-6 shrink-0 grid-rows-3 overflow-hidden rounded"
              >
                {t.livery.map((c) => (
                  <span key={c} style={{ background: c }} />
                ))}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-body truncate text-sm text-amber-50">{t.name}</span>
                  <span
                    className={`shrink-0 font-mono text-xs ${
                      active
                        ? "text-emerald-300"
                        : affordable
                          ? "text-amber-300"
                          : "text-amber-100/50"
                    }`}
                  >
                    {status}
                  </span>
                </span>
                <span className="block text-xs leading-tight text-amber-100/80">{t.kind}</span>
                <span className="block text-xs italic leading-tight text-amber-100/45 [@media(max-height:600px)]:hidden">
                  {t.flavor}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
