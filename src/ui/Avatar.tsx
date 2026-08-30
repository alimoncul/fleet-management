// Deterministic 2D avatar — seeded gradient disc with initials. No network, no deps.
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const h = hash(name);
  const hue = h % 360;
  const hue2 = (hue + 40 + (h % 60)) % 360;
  const id = `g${h.toString(36)}`;
  return (
    <svg
      className="avatar"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label={name}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={`hsl(${hue} 55% 42%)`} />
          <stop offset="1" stopColor={`hsl(${hue2} 55% 30%)`} />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill={`url(#${id})`} />
      <text
        x="20"
        y="21"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="15"
        fontWeight="600"
        fill="#fff"
        fontFamily="inherit"
      >
        {initials(name)}
      </text>
    </svg>
  );
}
