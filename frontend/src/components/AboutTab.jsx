import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Layers, Search, MessageSquare, Database, FileText, ExternalLink } from 'lucide-react'
import { getKbFiles } from '../api'

const FEATURES = [
  {
    icon: Layers,
    color: 'text-accent',
    bg: 'bg-accent/10 border-accent/20',
    title: 'Rule-based triage',
    desc: 'Structured intake with red flag screening and injury pattern buckets by region and mechanism.',
  },
  {
    icon: Search,
    color: 'text-accent3',
    bg: 'bg-accent3/10 border-accent3/20',
    title: 'TF-IDF retrieval (RAG)',
    desc: 'Cosine similarity search over a curated climbing KB. Top matching chunks ground every response.',
  },
  {
    icon: MessageSquare,
    color: 'text-accent2',
    bg: 'bg-accent2/10 border-accent2/20',
    title: 'Multi-mode chat',
    desc: 'KB-only (offline), GPT-4o (OpenAI), or Ollama (local LLM). All grounded in climbing-specific content.',
  },
  {
    icon: Database,
    color: 'text-accent',
    bg: 'bg-accent/10 border-accent/20',
    title: 'Session history',
    desc: 'Postgres-backed session storage with connection pooling. Sessions are saved, browsable, and deletable.',
  },
]

const ARCH = [
  { name: 'main.py', desc: 'FastAPI backend — REST API, triage, chat routing, session persistence' },
  { name: 'src/triage.py', desc: 'Red flag screening, region-specific pattern buckets, conservative plan' },
  { name: 'src/retriever.py', desc: 'TF-IDF vectorization and cosine similarity search over KB docs' },
  { name: 'src/render.py', desc: 'Intake → search query, citation formatting' },
  { name: 'database.py', desc: 'Postgres helpers with ThreadedConnectionPool' },
  { name: 'frontend/', desc: 'React + Tailwind + Framer Motion — this interface' },
]

export default function AboutTab() {
  const [kbFiles, setKbFiles] = useState([])

  useEffect(() => {
    getKbFiles()
      .then((d) => setKbFiles(d.files))
      .catch(() => {})
  }, [])

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-10">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-accent via-text to-accent2 bg-clip-text text-transparent">
          CoreTriage
        </h2>
        <p className="text-muted leading-relaxed max-w-2xl">
          An educational climbing injury triage and rehab guidance tool. CoreTriage combines structured intake,
          rule-based safety screening, and retrieval-augmented generation to produce conservative, climbing-specific guidance.
        </p>
        <p className="text-xs text-muted/70 italic">
          All output is educational only and intentionally non-diagnostic.
        </p>
      </motion.div>

      {/* Features */}
      <div>
        <h3 className="text-xs font-semibold text-muted uppercase tracking-widest mb-4">Features</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="card flex gap-4"
            >
              <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${f.bg}`}>
                <f.icon size={16} className={f.color} />
              </div>
              <div>
                <p className="text-sm font-semibold text-text">{f.title}</p>
                <p className="text-xs text-muted mt-0.5 leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Architecture */}
      <div>
        <h3 className="text-xs font-semibold text-muted uppercase tracking-widest mb-4">Architecture</h3>
        <div className="space-y-1.5">
          {ARCH.map((a, i) => (
            <motion.div
              key={a.name}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-4 px-4 py-3 bg-panel border border-outline rounded-lg"
            >
              <code className="text-xs font-mono text-accent w-40 shrink-0">{a.name}</code>
              <span className="text-xs text-muted">{a.desc}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* KB files */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={14} className="text-muted" />
          <h3 className="text-xs font-semibold text-muted uppercase tracking-widest">
            Knowledge Base ({kbFiles.length} files)
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {kbFiles.length === 0 && (
            <span className="text-xs text-muted">Loading KB files…</span>
          )}
          {kbFiles.map((f) => (
            <div
              key={f}
              className="flex items-center gap-1.5 text-xs bg-panel border border-outline rounded-full px-3 py-1.5 text-muted"
            >
              <FileText size={11} className="text-accent" />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-accent3/5 border border-accent3/20 rounded-xl p-5"
      >
        <p className="text-xs font-semibold text-accent3 uppercase tracking-wide mb-2">Disclaimer</p>
        <p className="text-sm text-muted leading-relaxed">
          CoreTriage does not provide medical diagnosis or treatment. It is an educational tool intended to promote
          conservative load management and appropriate medical referral when indicated. If symptoms worsen, involve
          neurological signs, or follow significant trauma, seek professional evaluation immediately.
        </p>
      </motion.div>
    </div>
  )
}
