/** An angle (角度) with the summer sun resting inside it. */
export function Logo({ size = 28, id = "logo" }: { size?: number; id?: string }) {
  const sky = `${id}-sky`;
  const sun = `${id}-sun`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#5fd8ff" />
          <stop offset="1" stopColor="#0279be" />
        </linearGradient>
        <radialGradient id={sun} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fff1b8" />
          <stop offset="0.55" stopColor="#ffc247" />
          <stop offset="1" stopColor="#fd7a2f" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${sky})`} />
      <circle cx="33" cy="37" r="6" fill={`url(#${sun})`} />
      <path
        d="M38 15 L14 46 H50"
        fill="none"
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
