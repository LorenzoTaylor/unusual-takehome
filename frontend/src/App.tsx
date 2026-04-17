import { useState, useRef } from 'react'
import {
  ArrowRight, Copy, Check, AlertCircle, RotateCcw,
  TrendingUp, Zap, Globe, ChevronRight,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────

type PredefinedGoal = 'increase_visibility' | 'reposition_brand' | 'expand_market'
type GoalMode = 'predefined' | 'custom'
type Tab = 'copy' | 'changes' | 'strategy'

interface Change {
  category: string
  description: string
  reason: string
  impact: string
}

interface OptimizeResult {
  optimized_content: string
  changes: Change[]
  missed_opportunities: string[]
  summary: { overall_strategy: string; key_improvements: string[] }
}

type Phase = 'idle' | 'loading' | 'streaming' | 'success' | 'error'

// ── Constants ─────────────────────────────────────

const GOALS = [
  { value: 'increase_visibility' as PredefinedGoal, label: 'Increase Visibility', sub: 'Surface more in AI responses',  Icon: TrendingUp },
  { value: 'reposition_brand'    as PredefinedGoal, label: 'Reposition Brand',    sub: 'Shift how AI describes you',   Icon: Zap         },
  { value: 'expand_market'       as PredefinedGoal, label: 'Expand Market',       sub: 'Resonate with a new audience', Icon: Globe       },
]

const CATEGORY_LABEL: Record<string, string> = {
  positioning: 'Positioning', category_definition: 'Category',
  audience_alignment: 'Audience', discoverability: 'Discoverability',
  differentiation: 'Differentiation', clarity: 'Clarity', conversion_signal: 'Conversion',
}

// ── Helpers ───────────────────────────────────────

function impactLevel(s: string): 'High' | 'Medium' | 'Low' {
  const l = s.toLowerCase()
  return l.startsWith('high') ? 'High' : l.startsWith('medium') ? 'Medium' : 'Low'
}

function impactNote(s: string): string {
  const i = s.indexOf('—')
  return i !== -1 ? s.slice(i + 1).trim() : ''
}

const PANEL_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'
const PANEL_DURATION = '0.7s'

// ── Shared primitives ─────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 10 }}>
      {children}
    </p>
  )
}

function TabBtn({ active, disabled, onClick, children }: {
  active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'none', border: 'none',
        borderBottom: `2px solid ${active && !disabled ? 'var(--accent)' : 'transparent'}`,
        padding: '0 14px', height: 44, marginBottom: -1,
        color: disabled ? 'var(--muted)' : active ? 'var(--text)' : 'var(--muted-light)',
        fontFamily: 'var(--font)', fontSize: 13,
        fontWeight: active && !disabled ? 600 : 400,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.18s',
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
      }}
    >
      {children}
    </button>
  )
}

function Skeleton({ width = '100%', height = 13, delay = '0s', mb = 9 }: {
  width?: string | number; height?: number; delay?: string; mb?: number
}) {
  return (
    <div style={{ width, height, borderRadius: 4, background: 'var(--surface)', position: 'relative', overflow: 'hidden', marginBottom: mb, flexShrink: 0 }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, transparent 0%, var(--surface-hover) 50%, transparent 100%)',
        backgroundSize: '200% 100%',
        animation: `shimmer 1.8s ${delay} ease-in-out infinite`,
      }} />
    </div>
  )
}

// ── Result tab components ─────────────────────────

function ChangeCard({ change, index }: { change: Change; index: number }) {
  const level = impactLevel(change.impact)
  const note  = impactNote(change.impact)
  const cat   = CATEGORY_LABEL[change.category] ?? change.category
  const levelColor = level === 'High' ? 'var(--accent)' : level === 'Medium' ? 'var(--text)' : 'var(--muted-light)'

  return (
    <div className="anim-in" style={{ animationDelay: `${index * 0.06}s`, paddingBottom: 22, borderBottom: '1px solid var(--border)', marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--accent)', minWidth: 22, fontVariantNumeric: 'tabular-nums' }}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', background: 'var(--surface)', border: '1px solid var(--border)', padding: '2px 7px', borderRadius: 3 }}>
          {cat}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: levelColor, letterSpacing: '0.05em' }}>
          {level}
        </span>
      </div>
      <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 5, lineHeight: 1.5, paddingLeft: 30 }}>{change.description}</p>
      <p style={{ fontSize: 13, color: 'var(--muted-light)', lineHeight: 1.65, paddingLeft: 30, marginBottom: note ? 5 : 0 }}>{change.reason}</p>
      {note && <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, paddingLeft: 30, fontStyle: 'italic' }}>{note}</p>}
    </div>
  )
}

function GeneratingView() {
  return (
    <div style={{ paddingTop: 4 }}>
      <Skeleton width="48%" height={12} mb={18} />
      <Skeleton width="94%" />
      <Skeleton width="88%" delay="0.08s" />
      <Skeleton width="96%" delay="0.12s" />
      <Skeleton width="82%" delay="0.16s" />
      <Skeleton width="91%" delay="0.20s" />
      <Skeleton width="67%" delay="0.24s" mb={32} />
      <Skeleton width="36%" height={11} mb={18} delay="0.16s" />
      {[0, 1, 2].map(i => (
        <div key={i} style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'center' }}>
            <Skeleton width={22} height={11} delay={`${i * 0.1}s`} mb={0} />
            <Skeleton width={68} height={11} delay={`${i * 0.1 + 0.05}s`} mb={0} />
          </div>
          <Skeleton width="90%" mb={5} delay={`${i * 0.1 + 0.08}s`} />
          <Skeleton width="72%" height={11} delay={`${i * 0.1 + 0.12}s`} mb={0} />
        </div>
      ))}
    </div>
  )
}

function StreamingCopyTab({ content }: { content: string }) {
  return (
    <div className="anim-in" style={{ animationDuration: '0.2s' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '18px 16px' }}>
        <p style={{ fontSize: 14, lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>
          {content}<span className="cursor" />
        </p>
      </div>
    </div>
  )
}

function CopyTab({ result, copied, onCopy }: { result: OptimizeResult; copied: boolean; onCopy: () => void }) {
  return (
    <div className="anim-in" style={{ animationDuration: '0.28s' }}>
      <div style={{ position: 'relative' }}>
        <button onClick={onCopy} style={{
          position: 'absolute', top: 14, right: 14,
          background: 'var(--surface-hover)', border: '1px solid var(--border)',
          borderRadius: 9999, padding: '5px 10px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5,
          color: copied ? 'var(--accent)' : 'var(--muted-light)',
          fontSize: 11, fontFamily: 'var(--font)', fontWeight: 600,
          transition: 'color 0.15s', letterSpacing: '0.04em',
        }}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '18px 16px', paddingRight: 76 }}>
          <p style={{ fontSize: 14, lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>{result.optimized_content}</p>
        </div>
      </div>
    </div>
  )
}

function ChangesTab({ result }: { result: OptimizeResult }) {
  return (
    <div className="anim-in" style={{ animationDuration: '0.28s' }}>
      {result.changes.map((change, i) => <ChangeCard key={i} change={change} index={i} />)}
    </div>
  )
}

function StrategyTab({ result }: { result: OptimizeResult }) {
  return (
    <div className="anim-in" style={{ animationDuration: '0.28s' }}>
      <p style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--muted-light)', marginBottom: 22, maxWidth: '58ch' }}>
        {result.summary.overall_strategy}
      </p>
      {result.summary.key_improvements.length > 0 && (
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 36 }}>
          {result.summary.key_improvements.map((item, i) => (
            <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, lineHeight: 1.65 }}>
              <span style={{ color: 'var(--accent)', marginTop: 5, flexShrink: 0, fontSize: 7 }}>◆</span>
              {item}
            </li>
          ))}
        </ul>
      )}
      {result.missed_opportunities.length > 0 && (
        <>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 14 }}>
            Gaps to Consider
          </p>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {result.missed_opportunities.map((gap, i) => (
              <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: 'var(--muted-light)', lineHeight: 1.6 }}>
                <span style={{ color: 'var(--muted)', marginTop: 2, flexShrink: 0 }}>○</span>
                {typeof gap === 'string' ? gap : JSON.stringify(gap)}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

// ── Main App ──────────────────────────────────────

export default function App() {
  const [content,      setContent]      = useState('')
  const [brand,        setBrand]        = useState('')
  const [audience,     setAudience]     = useState('')
  const [goal,         setGoal]         = useState<PredefinedGoal>('increase_visibility')
  const [goalMode,     setGoalMode]     = useState<GoalMode>('predefined')
  const [customGoal,   setCustomGoal]   = useState('')
  const [phase,          setPhase]          = useState<Phase>('idle')
  const [result,         setResult]         = useState<OptimizeResult | null>(null)
  const [streamedContent, setStreamedContent] = useState('')
  const accumulatedRef   = useRef('')
  const [error,          setError]          = useState('')
  const [copied,         setCopied]         = useState(false)
  const [activeTab,      setActiveTab]      = useState<Tab>('copy')
  const [panelOpen,      setPanelOpen]      = useState(false)
  const [urlInput,     setUrlInput]     = useState('')
  const [fetching,     setFetching]     = useState(false)
  const [fetchError,   setFetchError]   = useState('')
  const [fetchedTitle, setFetchedTitle] = useState('')

  // Panel is visible when there's something to show
  const showPanel = phase === 'loading' || phase === 'streaming' || phase === 'success'
  // Panel is open when user hasn't closed it AND there's something to show
  const panelExpanded = showPanel && panelOpen

  const canSubmit =
    content.trim().length > 0 &&
    brand.trim().length > 0 &&
    audience.trim().length > 0 &&
    (goalMode === 'predefined' || customGoal.trim().length > 0)

  async function handleFetch() {
    const url = urlInput.trim()
    if (!url) return
    setFetching(true)
    setFetchError('')
    setFetchedTitle('')
    try {
      const res = await fetch('/api/fetch-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to fetch URL')
      setContent(data.content)
      if (data.title) setFetchedTitle(data.title)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch URL')
    } finally {
      setFetching(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setPhase('loading')
    setResult(null)
    setStreamedContent('')
    accumulatedRef.current = ''
    setError('')
    setActiveTab('copy')
    setPanelOpen(true)

    try {
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand:           brand.trim(),
          target_audience: audience.trim(),
          goal_type:       goalMode,
          goal:            goalMode === 'predefined' ? goal : customGoal.trim(),
          content:         content.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Something went wrong')
      }

      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buf += decoder.decode(value, { stream: true })
        const frames = buf.split('\n\n')
        buf = frames.pop() ?? ''

        for (const frame of frames) {
          let eventType = ''
          let data = ''
          for (const line of frame.split('\n')) {
            if (line.startsWith('event: ')) eventType = line.slice(7).trim()
            if (line.startsWith('data: ')) data = line.slice(6)
          }

          if (eventType === 'token') {
            accumulatedRef.current += data
            setStreamedContent(accumulatedRef.current)
            setPhase('streaming')
          } else if (eventType === 'analysis') {
            const analysis = JSON.parse(data)
            setResult({
              optimized_content: accumulatedRef.current,
              changes: analysis.changes ?? [],
              missed_opportunities: analysis.missed_opportunities ?? [],
              summary: analysis.summary ?? { overall_strategy: '', key_improvements: [] },
            })
            setPhase('success')
          } else if (eventType === 'error') {
            throw new Error(data)
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error')
      setPhase('error')
      setPanelOpen(false)
    }
  }

  async function handleCopy() {
    if (!result) return
    await navigator.clipboard.writeText(result.optimized_content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleReset() {
    setPhase('idle')
    setResult(null)
    setError('')
    setPanelOpen(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '11px 13px',
    color: 'var(--text)',
    fontSize: 14,
    fontFamily: 'var(--font)',
    transition: 'border-color 0.15s',
    outline: 'none',
  }

  // ── Form ─────────────────────────────────────────

  const form = (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 3 }}>
          Content Optimizer
        </h1>
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>
          Optimize for AI visibility, positioning, or market expansion.
        </p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <SectionLabel>URL (optional)</SectionLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="url"
            value={urlInput}
            onChange={e => { setUrlInput(e.target.value); setFetchError('') }}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleFetch())}
            placeholder="https://yoursite.com/landing-page"
            disabled={fetching}
            style={{ ...inputStyle, flex: 1 }}
            onFocus={e => (e.target.style.borderColor = 'var(--border-strong)')}
            onBlur={e  => (e.target.style.borderColor = fetchError ? '#f87171' : 'var(--border)')}
          />
          <button
            type="button"
            onClick={handleFetch}
            disabled={fetching || !urlInput.trim()}
            style={{
              flexShrink: 0,
              padding: '11px 16px',
              background: fetching || !urlInput.trim() ? 'var(--surface)' : 'var(--surface-hover)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: fetching || !urlInput.trim() ? 'var(--muted)' : 'var(--text)',
              fontFamily: 'var(--font)',
              fontSize: 13,
              fontWeight: 600,
              cursor: fetching || !urlInput.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {fetching ? 'Fetching…' : 'Fetch'}
          </button>
        </div>
        {fetchError && (
          <p style={{ fontSize: 12, color: '#f87171', marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
            <AlertCircle size={12} /> {fetchError}
          </p>
        )}
      </div>

      <div style={{ marginBottom: 24 }}>
        <SectionLabel>Content</SectionLabel>
        {fetchedTitle && (
          <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontStyle: 'italic' }}>
            From: {fetchedTitle}
          </p>
        )}
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Paste your landing page copy, product description, or any text…"
          style={{ ...inputStyle, minHeight: 130, maxHeight: 240, overflowY: 'auto', lineHeight: 1.75, padding: '13px 14px' }}
          onFocus={e => (e.target.style.borderColor = 'var(--border-strong)')}
          onBlur={e  => (e.target.style.borderColor = 'var(--border)')}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
        <div>
          <SectionLabel>Brand</SectionLabel>
          <input type="text" value={brand} onChange={e => setBrand(e.target.value)} placeholder="Acme, Inc." style={inputStyle}
            onFocus={e => (e.target.style.borderColor = 'var(--border-strong)')}
            onBlur={e  => (e.target.style.borderColor = 'var(--border)')} />
        </div>
        <div>
          <SectionLabel>Target Audience</SectionLabel>
          <input type="text" value={audience} onChange={e => setAudience(e.target.value)} placeholder="SaaS CTOs evaluating doc tools" style={inputStyle}
            onFocus={e => (e.target.style.borderColor = 'var(--border-strong)')}
            onBlur={e  => (e.target.style.borderColor = 'var(--border)')} />
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <SectionLabel>Optimization Goal</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
          {GOALS.map(({ value, label, sub, Icon }) => {
            const active = goalMode === 'predefined' && goal === value
            return (
              <button key={value} type="button" onClick={() => { setGoal(value); setGoalMode('predefined') }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 5,
                  padding: '11px 11px',
                  background: active ? 'var(--accent-dim)' : 'var(--surface)',
                  border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 8, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                }}>
                <Icon size={12} style={{ color: active ? 'var(--accent)' : 'var(--muted)' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: active ? 'var(--accent)' : 'var(--text)', fontFamily: 'var(--font)', lineHeight: 1.3 }}>
                  {label}
                </span>
                <span style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.4, fontFamily: 'var(--font)' }}>
                  {sub}
                </span>
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <input type="text" value={customGoal} onChange={e => { setCustomGoal(e.target.value); setGoalMode(e.target.value ? 'custom' : 'predefined') }}
          onFocus={e => { if (customGoal) setGoalMode('custom'); e.target.style.borderColor = 'var(--border-strong)' }}
          onBlur={e  => { if (!customGoal) setGoalMode('predefined'); e.target.style.borderColor = 'var(--border)' }}
          placeholder="Describe a custom goal…"
          style={inputStyle} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button type="submit" disabled={!canSubmit || phase === 'loading' || phase === 'streaming'}
          style={{
            display: 'flex', alignItems: 'center', gap: 9, padding: '10px 20px',
            background: canSubmit && phase !== 'loading' ? 'var(--accent)' : 'var(--surface)',
            color: canSubmit && phase !== 'loading' ? '#0b1200' : 'var(--muted)',
            border: 'none', borderRadius: 9999,
            fontFamily: 'var(--font)', fontWeight: 600, fontSize: 13,
            cursor: canSubmit && phase !== 'loading' && phase !== 'streaming' ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s',
          }}>
          {phase === 'loading' || phase === 'streaming' ? (
            <><span style={{ display: 'flex', gap: 4 }}><span className="dot" /><span className="dot" /><span className="dot" /></span>Analyzing</>
          ) : (
            <>Optimize for AI <ArrowRight size={14} /></>
          )}
        </button>

        {phase === 'success' && (
          <button type="button" onClick={handleReset}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontFamily: 'var(--font)', fontSize: 12, padding: 0, transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--muted-light)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
            <RotateCcw size={11} /> Start over
          </button>
        )}
      </div>

      {phase === 'error' && (
        <div className="anim-in" style={{ marginTop: 18, padding: '13px 15px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <AlertCircle size={14} style={{ color: '#f87171', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontWeight: 600, fontSize: 12, marginBottom: 2 }}>Something went wrong</p>
            <p style={{ fontSize: 12, color: 'var(--muted-light)' }}>{error}</p>
          </div>
        </div>
      )}
    </form>
  )

  // ── Render ────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        padding: '0 28px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '0.05em' }}>SIGNAL</span>

        <div />
      </header>

      {/* Body — always split layout; right panel transitions via width */}
      <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden', position: 'relative' }}>

        {/* Semicircle panel toggle — rides the seam between panels */}
        {showPanel && (
          <button
            onClick={() => setPanelOpen(o => !o)}
            title={panelOpen ? 'Close results' : 'Open results'}
            style={{
              position: 'absolute',
              right: panelExpanded ? 'calc(50% - 1px)' : '0px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 20,
              width: 22,
              height: 52,
              borderRadius: '28px 0 0 28px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--muted)',
              transition: `right ${PANEL_DURATION} ${PANEL_EASE}, color 0.15s`,
              padding: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)' }}
          >
            <ChevronRight
              size={39}
              style={{
                transform: panelExpanded ? 'none' : 'rotate(180deg)',
                transition: `transform ${PANEL_DURATION} ${PANEL_EASE}`,
                marginLeft: -2,
              }}
            />
          </button>
        )}

        {/* Left: form */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          borderRight: panelExpanded ? '1px solid var(--border)' : 'none',
          transition: `border-color ${PANEL_DURATION} ${PANEL_EASE}`,
        }}>
          <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 28px 80px' }}>
            {form}
          </div>
        </div>

        {/* Right: results panel — width drives the open/close animation */}
        <div style={{
          width: panelExpanded ? '50%' : '0px',
          overflow: 'hidden',
          flexShrink: 0,
          transition: `width ${PANEL_DURATION} ${PANEL_EASE}`,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Inner at a stable width so content doesn't reflow during animation */}
          <div style={{ width: '50vw', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

            {/* Tab bar */}
            <div style={{ height: 44, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'stretch', padding: '0 24px', gap: 2, flexShrink: 0 }}>
              <TabBtn active={activeTab === 'copy'}     disabled={phase === 'loading'} onClick={() => setActiveTab('copy')}>
                Copy
              </TabBtn>
              <TabBtn active={activeTab === 'changes'}  disabled={phase === 'loading' || phase === 'streaming'} onClick={() => setActiveTab('changes')}>
                What Changed{result ? ` · ${result.changes.length}` : ''}
              </TabBtn>
              <TabBtn active={activeTab === 'strategy'} disabled={phase === 'loading' || phase === 'streaming'} onClick={() => setActiveTab('strategy')}>
                Strategy
              </TabBtn>
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
              {phase === 'loading' ? (
                <GeneratingView />
              ) : phase === 'streaming' ? (
                <StreamingCopyTab content={streamedContent} />
              ) : phase === 'success' && result ? (
                <div key={activeTab}>
                  {activeTab === 'copy'     && <CopyTab     result={result} copied={copied} onCopy={handleCopy} />}
                  {activeTab === 'changes'  && <ChangesTab  result={result} />}
                  {activeTab === 'strategy' && <StrategyTab result={result} />}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
