/**
 * LajmeAI Logo Component
 * Globe with text curved around it
 */
export default function Logo({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="logo-svg"
    >
      <defs>
        {/* Globe gradient */}
        <radialGradient id="globeGradient" cx="50%" cy="40%">
          <stop offset="0%" stopColor="#1e40af" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1e40af" />
        </radialGradient>

      </defs>

      {/* Globe in center */}
      <g className="logo-globe">
        {/* Globe base */}
        <circle
          cx="100"
          cy="100"
          r="50"
          fill="url(#globeGradient)"
        />

        {/* Continent shapes */}
        <g opacity="0.9">
          {/* North America */}
          <path
            d="M 70 70 Q 65 60, 70 50 Q 80 45, 85 50 Q 82 60, 78 65 Q 74 68, 70 70"
            fill="#06b6d4"
          />
          {/* Europe/Africa */}
          <path
            d="M 95 60 Q 105 55, 110 60 Q 115 70, 112 75 Q 108 80, 100 78 Q 98 70, 95 65 Q 95 62, 95 60"
            fill="#06b6d4"
          />
          {/* South America */}
          <path
            d="M 75 110 Q 78 120, 75 130 Q 72 135, 70 130 Q 68 120, 70 110 Q 72 108, 75 110"
            fill="#06b6d4"
          />
          {/* Asia */}
          <path
            d="M 120 75 Q 130 70, 135 75 Q 140 85, 135 90 Q 130 95, 125 92 Q 122 85, 120 80 Q 120 77, 120 75"
            fill="#06b6d4"
          />
        </g>

        {/* Longitude lines */}
        <g stroke="#ffffff" strokeWidth="0.5" opacity="0.3">
          <path d="M 100 50 Q 120 100, 100 150" fill="none" />
          <path d="M 100 50 Q 80 100, 100 150" fill="none" />
        </g>

        {/* Latitude lines */}
        <g stroke="#ffffff" strokeWidth="0.5" opacity="0.3">
          <ellipse cx="100" cy="100" rx="50" ry="15" fill="none" />
          <ellipse cx="100" cy="100" rx="50" ry="30" fill="none" />
        </g>
      </g>

    </svg>
  );
}
