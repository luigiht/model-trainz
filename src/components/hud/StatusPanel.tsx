"use client";

import { useShallow } from "zustand/react/shallow";
import { useHud } from "@/game/state/game";
import { stationName } from "@/game/content/stations";
import { useMessages } from "@/i18n/i18n";
import { formatCoins, formatDistance, formatNumber } from "@/lib/format";

/** Coins, route and progress toward the next station. */
export function StatusPanel() {
  const h = useHud(
    useShallow((s) => ({
      coins: s.coins,
      station: s.station,
      phase: s.phase,
      piecesToNext: s.piecesToNext,
      legProgress: s.legProgress,
      autoLay: s.stats.autoLayPerSec,
      perClick: s.stats.piecesPerClick,
      distance: s.distance,
    })),
  );
  const t = useMessages().status;
  const from = stationName(h.station);
  const to = stationName(h.station + 1);
  const status =
    h.phase === "traveling"
      ? t.traveling(to)
      : h.piecesToNext > 0
        ? t.layMore(h.piecesToNext, to)
        : t.allAboard(to);
  const rates = [
    t.perClick(h.perClick, formatNumber(h.perClick)),
    h.autoLay > 0 && t.gangRate(formatNumber(h.autoLay)),
    t.travelled(formatDistance(h.distance)),
  ];

  return (
    <section className="panel w-full p-3" aria-label={t.label}>
      <div
        className="font-pixel text-3xl leading-none text-amber-300"
        data-testid="coins"
        aria-live="off"
      >
        {formatCoins(h.coins)}
      </div>
      <div className="mt-1 text-xs text-amber-100/70">{rates.filter(Boolean).join(" · ")}</div>
      <div className="mt-3 flex items-baseline justify-between gap-2 text-sm">
        <span className="font-body text-amber-50">{from}</span>
        <span aria-hidden className="text-amber-200/60">
          →
        </span>
        <span className="font-body text-amber-50">{to}</span>
      </div>
      <div
        className="mt-1 h-3 overflow-hidden rounded-full border border-amber-900/60 bg-black/40"
        role="progressbar"
        aria-label={t.progressLabel(to)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(h.legProgress * 100)}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-300 transition-[width] duration-150"
          style={{ width: `${h.legProgress * 100}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-amber-100" data-testid="leg-status" aria-live="polite">
        {status}
      </p>
    </section>
  );
}
