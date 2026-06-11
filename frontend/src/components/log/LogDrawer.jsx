import { useEffect } from 'react'
import { Drawer } from 'vaul'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import LogDrawerContent from './LogDrawerContent'

const REDUCE_MOTION = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * The climb/session log surface. Mobile = a vaul bottom sheet (native drag,
 * momentum, focus-trap, scroll-lock); desktop = a centered modal. Both wrap the
 * same LogDrawerContent so the experience never diverges.
 *
 * The sheet uses a pinned footer (always-visible XP total + Save) with the
 * session metadata behind an expandable "Session details" row — a fractional
 * snap detent is intentionally not used because vaul reveals content top-down,
 * which would hide a bottom-anchored CTA at the peek.
 *
 * Props:
 *   open, onOpenChange — controlled visibility
 *   prefill            — { sessionType?, duration_min? } from a planned session
 *   user               — for the plausibility baseline
 *   onLogged           — fired after a log resolves (refresh the caller's data)
 */
export default function LogDrawer({ open, onOpenChange, prefill, user, onLogged }) {
  const isDesktop = useIsDesktop()
  const close = () => onOpenChange(false)
  // useSessionLog calls onClose once a log resolves (or aborts) — refresh + dismiss.
  const handleClose = () => { onLogged?.(); close() }

  // Desktop Escape-to-close (vaul manages its own on mobile).
  useEffect(() => {
    if (!isDesktop || !open) return
    const onKey = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDesktop, open])

  if (isDesktop) {
    return (
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-40 bg-ink/35 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: REDUCE_MOTION ? 0 : 0.16 }}
              onClick={close}
            />
            <motion.div
              key="modal"
              className="fixed top-[6vh] left-1/2 -translate-x-1/2 z-50 w-full max-w-md max-h-[88vh]
                         flex flex-col overflow-hidden bg-card border border-ct-rim rounded-3xl pt-2"
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              transition={REDUCE_MOTION ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
              role="dialog" aria-modal="true" aria-label="Log a session"
            >
              <div className="flex justify-end px-3 shrink-0">
                <button onClick={close} aria-label="Close" className="p-1.5 rounded-full hover:bg-ink/[0.06]">
                  <X size={16} className="text-ink-soft" />
                </button>
              </div>
              <LogDrawerContent user={user} prefill={prefill} onClose={handleClose} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    )
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-ink/35 backdrop-blur-sm" />
        <Drawer.Content
          className="fixed bottom-0 inset-x-0 z-50 mx-auto max-w-md max-h-[92vh]
                     flex flex-col rounded-t-3xl bg-card border-t border-ct-rim outline-none"
        >
          <Drawer.Handle className="mx-auto my-2 shrink-0 !w-10 !h-1 !rounded-full !bg-ink/20" />
          <Drawer.Title className="sr-only">Log a climb or session</Drawer.Title>
          <Drawer.Description className="sr-only">Record your climbs, grades, and session details.</Drawer.Description>
          <LogDrawerContent user={user} prefill={prefill} onClose={handleClose} />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
