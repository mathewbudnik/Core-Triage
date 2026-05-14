// Four background patterns, one per tool. Each is a full-bleed absolute layer
// that goes behind card content. Patterns use the tool's accent colour at low
// opacity so they read as texture, not noise.
//
// Use via:
//   <div className="relative overflow-hidden ...">
//     <Pattern tool="train" />
//     <content with z-10 />
//   </div>

const PATTERNS = {
  pulse: (
    <svg
      width="100%" height="100%"
      preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, opacity: 0.45 }}
      aria-hidden="true"
    >
      <defs>
        <pattern id="hub-pulse" width="80" height="40" patternUnits="userSpaceOnUse">
          <path
            d="M0 20 H20 L25 8 L30 32 L35 14 L40 20 H80"
            stroke="#fb7185" strokeWidth="1.2" fill="none"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hub-pulse)" />
    </svg>
  ),
  dots: (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute', inset: 0, opacity: 0.65,
        backgroundImage: 'radial-gradient(circle, rgba(20,184,166,0.40) 1px, transparent 1.4px)',
        backgroundSize: '12px 12px',
      }}
    />
  ),
  stripes: (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute', inset: 0, opacity: 0.65,
        backgroundImage:
          'repeating-linear-gradient(45deg, transparent 0 8px, rgba(167,139,250,0.12) 8px 10px)',
      }}
    />
  ),
  speech: (
    <svg
      width="100%" height="100%"
      preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, opacity: 0.45 }}
      aria-hidden="true"
    >
      <defs>
        <pattern id="hub-speech" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M8 8 H32 V22 H22 L18 27 L18 22 H8 Z" fill="none" stroke="#fbbf24" strokeWidth="1" />
          <path d="M28 32 H52 V46 H42 L38 51 L38 46 H28 Z" fill="none" stroke="#fbbf24" strokeWidth="0.8" opacity="0.65" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hub-speech)" />
    </svg>
  ),
}

export default function HubPattern({ pattern }) {
  return PATTERNS[pattern] || null
}
