"use client";

import { useState } from "react";
import { backToResume, submitProfile, useSession, type ProfileError } from "@/game/session/session";
import { useMessages } from "@/i18n/i18n";
import { PLAYER_NAME_MAX } from "@/lib/gameId";

const FIELD =
  "rounded border border-amber-700/70 bg-black/45 px-3 py-2 text-base text-amber-50 placeholder:text-amber-100/35 focus-visible:outline-2 focus-visible:outline-amber-300";

/** First-visit form on the loading screen: the player's name, and a Game ID to continue a game. */
export function ProfileForm() {
  const suggestedId = useSession((s) => s.suggestedId);
  const suggestedName = useSession((s) => s.suggestedName);
  const resumable = useSession((s) => s.resumable);
  const t = useMessages();
  const [name, setName] = useState<string | null>(null);
  const [id, setId] = useState<string | null>(null);
  const [error, setError] = useState<ProfileError | null>(null);
  const [busy, setBusy] = useState(false);
  const nameValue = name ?? suggestedName;
  const idValue = id ?? suggestedId;

  return (
    <form
      className="panel flex w-[min(22rem,calc(100vw-3rem))] flex-col gap-3 p-4"
      aria-label={t.profile.formLabel}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(await submitProfile(nameValue, idValue));
        setBusy(false);
      }}
    >
      <label className="flex flex-col gap-1">
        <span className="font-body text-sm text-amber-200">{t.profile.name}</span>
        <input
          data-testid="profile-name"
          className={FIELD}
          value={nameValue}
          onChange={(e) => setName(e.target.value)}
          maxLength={PLAYER_NAME_MAX}
          autoComplete="nickname"
          placeholder={t.profile.namePlaceholder}
          required
          autoFocus
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-body text-sm text-amber-200">
          {t.gameId} <span className="text-amber-100/60">{t.profile.optional}</span>
        </span>
        <input
          data-testid="profile-id"
          className={`${FIELD} font-mono uppercase`}
          value={idValue}
          onChange={(e) => setId(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder={t.profile.idPlaceholder}
          aria-describedby="profile-id-hint"
        />
        <span
          id="profile-id-hint"
          className="text-xs text-amber-100/65 [@media(max-height:500px)]:sr-only"
        >
          {t.profile.idHint}
        </span>
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {t.profile.errors[error]}
        </p>
      )}
      <button
        type="submit"
        data-testid="profile-play"
        disabled={busy || !nameValue.trim()}
        className="font-body rounded-lg border-2 border-amber-300 bg-gradient-to-b from-amber-400 to-amber-600 px-6 py-2.5 text-sm text-[#2a1a08] shadow-lg transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 disabled:opacity-50"
      >
        {busy ? t.profile.starting : t.profile.play}
      </button>
      {resumable && (
        <button
          type="button"
          onClick={backToResume}
          className="self-center rounded text-xs text-amber-100/70 underline underline-offset-2 hover:text-amber-100 focus-visible:outline-2 focus-visible:outline-amber-300"
        >
          {t.profile.back}
        </button>
      )}
    </form>
  );
}
