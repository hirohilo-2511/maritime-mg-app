/**
 * プレイヤーガイド Ver.5.1 と同じイラスト（カモメ船長・貨物船・波・雲）。
 * ページに一度だけ置き、各所から <use href="#captain" /> のように参照する。
 */
export function ManualArtDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      <defs>
        {/* カモメ船長 */}
        <symbol id="captain" viewBox="0 0 120 130">
          <ellipse cx="60" cy="124" rx="30" ry="4" fill="#0b1f3a" opacity=".15" />
          <path d="M44 112 l-4 10 h10 z M76 112 l4 10 h-10 z" fill="#f97316" stroke="#0b1f3a" strokeWidth="2.5" strokeLinejoin="round" />
          <ellipse cx="60" cy="86" rx="36" ry="32" fill="#fff" stroke="#0b1f3a" strokeWidth="3" />
          <path d="M26 84 q-14 -6 -18 -22 q16 2 26 12" fill="#cbd5e1" stroke="#0b1f3a" strokeWidth="3" strokeLinejoin="round" />
          <path d="M94 84 q14 -6 18 -22 q-16 2 -26 12" fill="#cbd5e1" stroke="#0b1f3a" strokeWidth="3" strokeLinejoin="round" />
          <path d="M46 100 q14 8 28 0" fill="none" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />
          <circle cx="60" cy="52" r="28" fill="#fff" stroke="#0b1f3a" strokeWidth="3" />
          <circle cx="49" cy="52" r="4.5" fill="#0b1f3a" />
          <circle cx="71" cy="52" r="4.5" fill="#0b1f3a" />
          <circle cx="50.5" cy="50.5" r="1.5" fill="#fff" />
          <circle cx="72.5" cy="50.5" r="1.5" fill="#fff" />
          <circle cx="41" cy="61" r="4" fill="#fda4af" />
          <circle cx="79" cy="61" r="4" fill="#fda4af" />
          <path d="M53 58 h14 l-7 10 z" fill="#fbbf24" stroke="#0b1f3a" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M32 36 q28 -30 56 0 z" fill="#0b1f3a" />
          <rect x="28" y="33" width="64" height="9" rx="4.5" fill="#0b1f3a" />
          <rect x="30" y="34.5" width="60" height="2" rx="1" fill="#fbbf24" />
          <circle cx="60" cy="24" r="6" fill="#fbbf24" stroke="#0b1f3a" strokeWidth="1.5" />
          <path d="M60 20 v8 M57 25 q3 3 6 0" fill="none" stroke="#0b1f3a" strokeWidth="1.5" strokeLinecap="round" />
        </symbol>
        {/* 貨物船 */}
        <symbol id="ship" viewBox="0 0 400 190">
          <g stroke="#0b1f3a" strokeWidth="3" strokeLinejoin="round">
            <circle cx="318" cy="22" r="9" fill="#fff" opacity=".9" />
            <circle cx="332" cy="10" r="7" fill="#fff" opacity=".8" />
            <rect x="304" y="30" width="22" height="34" rx="3" fill="#0b1f3a" />
            <rect x="304" y="38" width="22" height="7" fill="#f43f5e" />
            <rect x="282" y="60" width="72" height="60" rx="5" fill="#fff" />
            <rect x="292" y="70" width="12" height="10" rx="2" fill="#7dd3fc" />
            <rect x="310" y="70" width="12" height="10" rx="2" fill="#7dd3fc" />
            <rect x="328" y="70" width="12" height="10" rx="2" fill="#7dd3fc" />
            <rect x="292" y="88" width="48" height="6" rx="2" fill="#e2e8f0" />
            <rect x="60" y="92" width="44" height="28" fill="#38bdf8" />
            <rect x="104" y="92" width="44" height="28" fill="#fbbf24" />
            <rect x="148" y="92" width="44" height="28" fill="#10b981" />
            <rect x="192" y="92" width="44" height="28" fill="#f97316" />
            <rect x="82" y="64" width="44" height="28" fill="#8b5cf6" />
            <rect x="126" y="64" width="44" height="28" fill="#f43f5e" />
            <rect x="170" y="64" width="44" height="28" fill="#38bdf8" />
            <rect x="236" y="92" width="40" height="28" fill="#fbbf24" />
            <path d="M18 120 H382 L352 168 H52 Z" fill="#e11d48" />
            <path d="M30 136 H372" fill="none" stroke="#fff" strokeWidth="5" />
          </g>
          <text x="200" y="159" textAnchor="middle" fontSize="13" fontWeight="900" fill="#fff" fontFamily="Segoe UI, sans-serif" letterSpacing="1.5">
            MARITIME B2B SIMULATOR
          </text>
        </symbol>
        {/* 波 */}
        <symbol id="wave" viewBox="0 0 800 60" preserveAspectRatio="none">
          <path d="M0 20 Q50 0 100 20 T200 20 T300 20 T400 20 T500 20 T600 20 T700 20 T800 20 V60 H0 Z" />
        </symbol>
        {/* 雲 */}
        <symbol id="cloud" viewBox="0 0 120 60">
          <path d="M20 50 a18 18 0 0 1 4 -35 a24 24 0 0 1 44 -6 a18 18 0 0 1 32 14 a14 14 0 0 1 0 27 z" fill="#fff" stroke="#0b1f3a" strokeWidth="2.5" />
        </symbol>
      </defs>
    </svg>
  );
}
