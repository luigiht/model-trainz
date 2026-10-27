"use client";

import { useState } from "react";
import { backToResume, submitProfile, useSession } from "@/game/session/session";
import { PLAYER_NAME_MAX } from "@/lib/gameId";

const FIELD =
  "rounded border border-amber-700/70 bg-black/45 px-3 py-2 text-base text-amber-50 placeholder:text-amber-100/35 focus-visible:outline-2 focus-visible:outline-amber-300";

/** First-visit form on the loading screen: the player's name, and a Game ID to continue a game. */
export function ProfileForm() {
  const suggestedId = useSession((s) => s.suggestedId);
  const suggestedName = useSession((s) => s.suggestedName);
  const resumable = useSession((s) => s.resumable);
  const [name, setName] = useState<string | null>(null);
  const [id, setId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nameValue = name ?? suggestedName;
  const idValue = id ?? suggestedId;

  return (
    <form
      className="panel flex w-[min(22rem,calc(100vw-3rem))] flex-col gap-3 p-4"
      aria-label="Start playing"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(await submitProfile(nameValue, idValue));
        setBusy(false);
      }}
    >
      <label className="flex flex-col gap-1">
        <span className="font-body text-sm text-amber-200">Your name</span>
        <input
          data-testid="profile-name"
          className={FIELD}
          value={nameValue}
          onChange={(e) => setName(e.target.value)}
          maxLength={PLAYER_NAME_MAX}
          autoComplete="nickname"
          placeholder="e.g. Ada"
          required
          autoFocus
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-body text-sm text-amber-200">
          Game ID <span className="text-amber-100/60">(optional)</span>
        </span>
        <input
          data-testid="profile-id"
          className={`${FIELD} font-mono uppercase`}
          value={idValue}
          onChange={(e) => setId(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="e.g. 7K2M-9QXP-4HCW"
          aria-describedby="profile-id-hint"
        />
        <span
          id="profile-id-hint"
          className="text-xs text-amber-100/65 [@media(max-height:500px)]:sr-only"
        >
          Have the ID of a previous game? Enter it to keep playing that game.
        </span>
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
      <button
        type="submit"
        data-testid="profile-play"
        disabled={busy || !nameValue.trim()}
        className="font-body rounded-lg border-2 border-amber-300 bg-gradient-to-b from-amber-400 to-amber-600 px-6 py-2.5 text-sm text-[#2a1a08] shadow-lg transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 disabled:opacity-50"
      >
        {busy ? "Starting…" : "Play"}
      </button>
      {resumable && (
        <button
          type="button"
          onClick={backToResume}
          className="self-center rounded text-xs text-amber-100/70 underline underline-offset-2 hover:text-amber-100 focus-visible:outline-2 focus-visible:outline-amber-300"
        >
          Back to my previous game
        </button>
      )}
    </form>
  );
}
