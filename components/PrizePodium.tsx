type PrizePodiumProps = {
  championName?: string | null;
  secondPlaceName?: string | null;
  thirdPlaceName?: string | null;
};

function TrophyCup({ tone }: { tone: "gold" | "silver" | "bronze" }) {
  return (
    <svg
      className={`prizes__cup prizes__cup--${tone}`}
      viewBox="0 0 64 72"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="prizes__cup-bowl"
        d="M16 10h32v10c0 11-7 20-16 20S16 31 16 20V10z"
      />
      <path className="prizes__cup-handle" d="M16 14H10c-3 0-5 3-5 6 0 7 4 12 11 14" />
      <path className="prizes__cup-handle" d="M48 14h6c3 0 5 3 5 6 0 7-4 12-11 14" />
      <rect className="prizes__cup-stem" x="28" y="40" width="8" height="10" rx="1" />
      <path className="prizes__cup-base" d="M22 50h20l4 8H18l4-8z" />
      <rect className="prizes__cup-plate" x="14" y="58" width="36" height="5" rx="1.5" />
    </svg>
  );
}

export default function PrizePodium({
  championName,
  secondPlaceName,
  thirdPlaceName,
}: PrizePodiumProps) {
  return (
    <div className="prizes-block">
      {championName ? (
        <p className="prizes-block__champion">
          Чемпион: <strong>{championName}</strong>
        </p>
      ) : null}

      <div className="prizes" aria-label="Призовые места">
        <article className="prizes__item prizes__item--silver">
          <TrophyCup tone="silver" />
          <span className="prizes__place">2 место</span>
          <strong className="prizes__amount">30 000 ₸</strong>
          {secondPlaceName ? (
            <span className="prizes__team">{secondPlaceName}</span>
          ) : null}
        </article>
        <article className="prizes__item prizes__item--gold">
          <TrophyCup tone="gold" />
          <span className="prizes__place">1 место</span>
          <strong className="prizes__amount">50 000 ₸</strong>
          {championName ? <span className="prizes__team">{championName}</span> : null}
        </article>
        <article className="prizes__item prizes__item--bronze">
          <TrophyCup tone="bronze" />
          <span className="prizes__place">3 место</span>
          <strong className="prizes__amount">20 000 ₸</strong>
          {thirdPlaceName ? <span className="prizes__team">{thirdPlaceName}</span> : null}
        </article>
      </div>
    </div>
  );
}
