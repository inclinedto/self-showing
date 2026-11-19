import styles from "./SummerScene.module.scss";

/** A sine-like strip twice the scene width, so sliding it left by 1440 units loops seamlessly. */
function wave(y: number, amp: number, period: number, closed = true) {
  let d = `M0 ${y} Q ${period / 4} ${y - amp} ${period / 2} ${y}`;
  for (let x = period / 2; x < 2880; x += period / 2) d += ` T ${x + period / 2} ${y}`;
  return closed ? `${d} V160 H0 Z` : d;
}

const RAYS = Array.from({ length: 12 }, (_, index) => index * 30);

// One leaf pointing right with a drooping tip; mirrored for the left side of the crown.
const LEAF = "M0 0 C 26 -26 78 -30 116 4 C 92 -4 70 -6 52 -2 C 34 2 16 4 0 0 Z";
const RIB = "M2 0 C 34 -14 78 -16 110 2";
const FRONDS = [
  { angle: -58, scale: 0.86, dark: false },
  { angle: -22, scale: 1, dark: true },
  { angle: 14, scale: 0.92, dark: false },
  { angle: 44, scale: 0.7, dark: true },
];

function Sun() {
  return (
    <svg className={styles.sun} viewBox="0 0 200 200" aria-hidden="true">
      <g className={styles.rays}>
        {RAYS.map((angle) => (
          <rect key={angle} x="94" y="4" width="12" height="30" rx="6" transform={`rotate(${angle} 100 100)`} />
        ))}
      </g>
      <circle cx="100" cy="100" r="60" fill="#ffd34f" />
      <path d="M58 82 A 46 46 0 0 1 98 50" fill="none" stroke="#fff1b0" strokeWidth="8" strokeLinecap="round" />
      <ellipse cx="80" cy="98" rx="5.5" ry="7.5" fill="#5b3416" />
      <ellipse cx="120" cy="98" rx="5.5" ry="7.5" fill="#5b3416" />
      <circle cx="82" cy="95" r="2" fill="#fff" />
      <circle cx="122" cy="95" r="2" fill="#fff" />
      <path d="M89 115 Q 100 126 111 115" fill="none" stroke="#5b3416" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="68" cy="114" rx="9" ry="5.5" fill="#ff8d7a" opacity="0.6" />
      <ellipse cx="132" cy="114" rx="9" ry="5.5" fill="#ff8d7a" opacity="0.6" />
    </svg>
  );
}

function Moon() {
  return (
    <svg className={styles.moon} viewBox="0 0 200 200" aria-hidden="true">
      <path d="M118 30 A 72 72 0 1 0 172 132 A 58 58 0 1 1 118 30 Z" fill="#ffe9a6" />
      <path d="M74 104 q 6 6 12 0" fill="none" stroke="#7a5a2a" strokeWidth="4" strokeLinecap="round" />
      <path d="M100 118 q 6 6 12 0" fill="none" stroke="#7a5a2a" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="74" cy="122" rx="7" ry="4" fill="#ff9e8a" opacity="0.55" />
    </svg>
  );
}

function Stars() {
  const stars = [
    [8, 18, 1],
    [22, 38, 0.7],
    [38, 12, 0.8],
    [56, 30, 0.6],
    [70, 10, 0.9],
    [86, 42, 0.7],
  ];
  return (
    <div className={styles.stars} aria-hidden="true">
      {stars.map(([left, top, size], index) => (
        <svg
          // biome-ignore lint/suspicious/noArrayIndexKey: static decoration.
          key={index}
          viewBox="0 0 20 20"
          aria-hidden="true"
          style={{ left: `${left}%`, top: `${top}%`, width: 14 * size, height: 14 * size, animationDelay: `${index * 0.6}s` }}
        >
          <path d="M10 0 C 11 7 13 9 20 10 C 13 11 11 13 10 20 C 9 13 7 11 0 10 C 7 9 9 7 10 0 Z" fill="#fff4c2" />
        </svg>
      ))}
    </div>
  );
}

function Cloud({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 160 72" aria-hidden="true">
      <g className={styles.cloudShape}>
        <circle cx="52" cy="44" r="20" />
        <circle cx="82" cy="32" r="27" />
        <circle cx="114" cy="44" r="19" />
        <rect x="30" y="42" width="106" height="24" rx="12" />
      </g>
    </svg>
  );
}

function Gulls() {
  return (
    <svg className={styles.gulls} viewBox="0 0 90 40" aria-hidden="true">
      <path d="M4 22 Q 12 12 20 20 Q 28 12 36 22" />
      <path d="M52 12 Q 58 5 64 11 Q 70 5 76 12" />
    </svg>
  );
}

function Boat() {
  return (
    <svg className={styles.boat} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M31 8 V44 H8 Z" fill="#ffffff" />
      <path d="M35 14 V44 H54 Z" fill="#ffe3cf" />
      <rect x="31" y="6" width="3" height="40" rx="1.5" fill="#8a5a36" />
      <path d="M4 46 H60 L52 56 H12 Z" fill="#fd6325" />
    </svg>
  );
}

function PalmIsland() {
  return (
    <svg className={styles.palm} viewBox="0 0 260 260" aria-hidden="true">
      <path d="M-20 262 C 10 206 170 198 270 262 Z" className={styles.sand} />
      <path d="M-20 262 C 30 226 150 222 230 262 Z" className={styles.sandLight} />
      <circle cx="58" cy="236" r="2.5" className={styles.pebble} />
      <circle cx="150" cy="242" r="2" className={styles.pebble} />
      <circle cx="196" cy="236" r="2.5" className={styles.pebble} />
      <path d="M98 230 C 104 176 120 124 150 78" className={styles.trunk} />
      <path d="M98 230 C 104 176 120 124 150 78" className={styles.trunkBands} />
      <g className={styles.fronds}>
        {FRONDS.map((frond) => (
          <g key={`r${frond.angle}`} transform={`translate(150 74) rotate(${frond.angle}) scale(${frond.scale})`}>
            <path d={LEAF} className={frond.dark ? styles.leafDark : styles.leaf} />
            <path d={RIB} className={styles.rib} />
          </g>
        ))}
        {FRONDS.map((frond) => (
          <g key={`l${frond.angle}`} transform={`translate(150 74) scale(-1 1) rotate(${frond.angle}) scale(${frond.scale})`}>
            <path d={LEAF} className={frond.dark ? styles.leaf : styles.leafDark} />
            <path d={RIB} className={styles.rib} />
          </g>
        ))}
        <g transform="translate(150 74) rotate(-90) scale(0.62)">
          <path d={LEAF} className={styles.leaf} />
          <path d={RIB} className={styles.rib} />
        </g>
      </g>
      <circle cx="143" cy="86" r="8" className={styles.coconut} />
      <circle cx="157" cy="88" r="8" className={styles.coconut} />
      <circle cx="150" cy="98" r="8" className={styles.coconut} />
      <circle cx="140" cy="83" r="2.2" fill="#fff" opacity="0.35" />
    </svg>
  );
}

function ShellCorner() {
  return (
    <svg className={styles.shore} viewBox="0 0 220 120" aria-hidden="true">
      <path d="M0 122 C 60 70 170 56 230 70 V122 Z" className={styles.sand} />
      <path d="M40 122 C 90 92 170 84 230 92 V122 Z" className={styles.sandLight} />
      <path
        d="M120 62 L127 78 L144 79 L131 90 L136 107 L120 97 L104 107 L109 90 L96 79 L113 78 Z"
        className={styles.starfish}
      />
      <circle cx="120" cy="86" r="2" fill="#fff" opacity="0.7" />
      <circle cx="113" cy="82" r="1.4" fill="#fff" opacity="0.6" />
      <circle cx="127" cy="82" r="1.4" fill="#fff" opacity="0.6" />
      <g transform="translate(176 92)">
        <path d="M-16 8 C -16 -10 16 -10 16 8 Z" className={styles.shell} />
        <path d="M0 8 V-6 M-8 8 L-4 -5 M8 8 L4 -5" className={styles.shellLines} />
        <rect x="-5" y="7" width="10" height="5" rx="2.5" className={styles.shell} />
      </g>
    </svg>
  );
}

export function SummerScene() {
  return (
    <div className={styles.scene} aria-hidden="true">
      <Stars />
      <Sun />
      <Moon />
      <Gulls />
      <Cloud className={styles.cloudA} />
      <Cloud className={styles.cloudB} />
      <Boat />
      <svg className={styles.sea} viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true">
        <path className={styles.waveFar} d={wave(58, 7, 240)} />
        <path className={styles.waveMid} d={wave(84, 9, 360)} />
        <path className={styles.waveNear} d={wave(112, 10, 480)} />
        <path className={styles.foam} d={wave(112, 10, 480, false)} />
      </svg>
      <PalmIsland />
      <ShellCorner />
    </div>
  );
}
