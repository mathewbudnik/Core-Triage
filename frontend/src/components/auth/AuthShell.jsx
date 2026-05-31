import { motion } from 'framer-motion'
import Logo from '../Logo'

/**
 * Shared wrapper for /forgot-password and /reset-password.
 *
 * Renders a full-viewport dark stage with a soft atmospheric gradient and a
 * centered card. The card holds the CT brand row up top; consumers pass their
 * eyebrow / title / subtitle / form via props or children.
 *
 * Props:
 *   - eyebrow: small uppercase label above the title (e.g. "ACCOUNT RECOVERY")
 *   - title:   JSX or string. Pass <span className="bg-clip-text ...">word</span>
 *              children for the gradient-accented word.
 *   - subtitle: secondary copy under the title
 *   - children: the form (or success-state content)
 *   - helper:  optional footer slot (e.g. "Back to sign in" link)
 */
export default function AuthShell({ eyebrow, title, subtitle, children, helper }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10 bg-ct-forest"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 800px 500px at 12% 10%, rgba(20,184,166,0.10), transparent 60%), " +
          "radial-gradient(ellipse 700px 500px at 88% 90%, rgba(217,119,87,0.10), transparent 60%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
        className="relative w-full max-w-md bg-ct-forest-deep border border-ct-rim rounded-3xl p-8 sm:p-9 shadow-2xl backdrop-blur"
        style={{ boxShadow: '0 20px 60px -20px rgba(0,0,0,0.7)' }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl"
          style={{
            backgroundImage:
              'radial-gradient(circle 200px at 50% 0%, rgba(217,119,87,0.10), transparent 70%)',
          }}
        />

        {/* Brand row */}
        <div className="relative flex items-center gap-2.5 mb-7">
          <Logo size={28} dark />
          <span
            className="font-extrabold text-[15px] tracking-tight"
            style={{
              backgroundImage: 'linear-gradient(90deg, #14b8a6, #d97757)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            CoreTriage
          </span>
        </div>

        <div className="relative">
          {eyebrow && (
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-ct-cream/30 mb-2">
              {eyebrow}
            </div>
          )}
          {title && (
            <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-ct-cream mb-2">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-sm text-ct-cream/70 leading-relaxed mb-6">{subtitle}</p>
          )}

          {children}

          {helper && <div className="text-center mt-5 text-sm text-ct-cream/50">{helper}</div>}
        </div>
      </motion.div>
    </div>
  )
}
