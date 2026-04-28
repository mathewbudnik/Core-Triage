import { useState, useEffect, useCallback } from 'react'
import { ChevronRight, Shield, Heart, Zap, Move } from 'lucide-react'

const TIPS = [
  {
    category: 'Prevention',
    icon: Shield,
    color: '#14b8a6',       // teal
    glow: 'rgba(20,184,166,0.18)',
    border: 'rgba(20,184,166,0.30)',
    text: 'Warm up your pulleys before every session — 10 min of easy open-hand hangs prevents most A2 tweaks.',
  },
  {
    category: 'Recovery',
    icon: Heart,
    color: '#fb7185',       // coral
    glow: 'rgba(251,113,133,0.18)',
    border: 'rgba(251,113,133,0.30)',
    text: 'A2 pulley tweak? Rest 3–5 days, then ease back with pain-free open-hand hangs. Controlled load heals ligaments faster than full rest.',
  },
  {
    category: 'Training',
    icon: Zap,
    color: '#fbbf24',       // gold
    glow: 'rgba(251,191,36,0.15)',
    border: 'rgba(251,191,36,0.28)',
    text: 'Limit max-effort sessions to 2–3 per week. Tendons and pulleys need 48–72 h to remodel after hard loading.',
  },
  {
    category: 'Prevention',
    icon: Shield,
    color: '#14b8a6',
    glow: 'rgba(20,184,166,0.18)',
    border: 'rgba(20,184,166,0.30)',
    text: "Don't skip antagonist training. Push-ups, wrist extensions, and shoulder external rotation balance what climbing takes from your body.",
  },
  {
    category: 'Recovery',
    icon: Heart,
    color: '#fb7185',
    glow: 'rgba(251,113,133,0.18)',
    border: 'rgba(251,113,133,0.30)',
    text: 'Ice reduces swelling in the first 48 h. After that, gentle heat and movement restore blood flow to healing tendons.',
  },
  {
    category: 'Training',
    icon: Zap,
    color: '#fbbf24',
    glow: 'rgba(251,191,36,0.15)',
    border: 'rgba(251,191,36,0.28)',
    text: 'Open-hand grip spreads load across all four pulleys. Full-crimp puts up to 3× more force on A2 alone — use it sparingly on hard moves.',
  },
  {
    category: 'Mobility',
    icon: Move,
    color: '#a78bfa',       // violet
    glow: 'rgba(167,139,250,0.15)',
    border: 'rgba(167,139,250,0.28)',
    text: 'Shoulder CARs (Controlled Articular Rotations) daily reduce impingement risk and improve overhead mobility for clips and reaches.',
  },
  {
    category: 'Prevention',
    icon: Shield,
    color: '#14b8a6',
    glow: 'rgba(20,184,166,0.18)',
    border: 'rgba(20,184,166,0.30)',
    text: 'Grade down at the start of a session. Most climbing injuries happen in the first 20 minutes before tissue is fully warm.',
  },
  {
    category: 'Recovery',
    icon: Heart,
    color: '#fb7185',
    glow: 'rgba(251,113,133,0.18)',
    border: 'rgba(251,113,133,0.30)',
    text: 'Sleep is when tissue repairs. 7–9 hours per night accelerates tendon healing more than any supplement or treatment.',
  },
  {
    category: 'Mobility',
    icon: Move,
    color: '#a78bfa',
    glow: 'rgba(167,139,250,0.15)',
    border: 'rgba(167,139,250,0.28)',
    text: 'Tight forearms limit wrist extension and increase elbow strain. Two minutes of forearm rolling before climbing makes a measurable difference.',
  },
]

const ROTATE_MS = 12000

export default function TipCard() {
  const [index, setIndex]   = useState(() => Math.floor(Math.random() * TIPS.length))
  const [fading, setFading] = useState(false)

  const advance = useCallback((next) => {
    setFading(true)
    setTimeout(() => {
      setIndex(next)
      setFading(false)
    }, 220)
  }, [])

  // Auto-rotate
  useEffect(() => {
    const id = setTimeout(() => {
      advance((index + 1) % TIPS.length)
    }, ROTATE_MS)
    return () => clearTimeout(id)
  }, [index, advance])

  const tip = TIPS[index]
  const Icon = tip.icon

  return (
    <div
      style={{
        margin: '0 12px 4px',
        borderRadius: 10,
        border: `1px solid ${tip.border}`,
        background: `linear-gradient(135deg, ${tip.glow} 0%, rgba(18,27,46,0.0) 60%)`,
        boxShadow: `0 0 20px ${tip.glow}`,
        transition: 'border-color 0.4s ease, box-shadow 0.4s ease',
        overflow: 'hidden',
      }}
    >
      {/* Colored top bar */}
      <div style={{
        height: 2,
        background: `linear-gradient(90deg, ${tip.color}, transparent)`,
        transition: 'background 0.4s ease',
      }} />

      <div style={{ padding: '10px 12px 10px' }}>
        {/* Category header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon size={11} style={{ color: tip.color, flexShrink: 0, transition: 'color 0.4s ease' }} />
            <span style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: tip.color,
              transition: 'color 0.4s ease',
            }}>
              {tip.category}
            </span>
          </div>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            {TIPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width:  i === index ? 12 : 4,
                  height: 3,
                  borderRadius: 99,
                  backgroundColor: i === index ? tip.color : 'rgba(169,183,208,0.2)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                }}
                onClick={() => i !== index && advance(i)}
              />
            ))}
          </div>
        </div>

        {/* Tip text */}
        <p style={{
          fontSize: 11.5,
          lineHeight: 1.55,
          color: 'rgba(232,238,252,0.82)',
          margin: 0,
          marginBottom: 10,
          opacity: fading ? 0 : 1,
          transform: fading ? 'translateY(4px)' : 'translateY(0)',
          transition: 'opacity 0.22s ease, transform 0.22s ease',
          minHeight: 52,
        }}>
          {tip.text}
        </p>

        {/* Next button */}
        <button
          onClick={() => advance((index + 1) % TIPS.length)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: 'rgba(169,183,208,0.45)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.06em',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = tip.color}
          onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(169,183,208,0.45)'}
        >
          next tip <ChevronRight size={11} />
        </button>
      </div>
    </div>
  )
}
