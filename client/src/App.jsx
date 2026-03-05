import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import {
  Zap, Globe, Search, Palette, Target, Briefcase,
  Users, MessageSquare, TrendingUp, Eye, Share2,
  ChevronRight, Hash, BarChart2, Lightbulb, CheckCircle,
  AlertCircle, XCircle, Star, Layers, Type, Copy, Check,
  ArrowUpRight, Sparkles, Shield, Cpu
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   SCRAPE STATUS BADGE
───────────────────────────────────────────────────────────────*/
// status: true = fully scraped, "partial" = partial, false = no data
function ScrapeStatusBadge({ status }) {
  if (status === true)
    return <span className="badge badge--green"><CheckCircle size={10} />Scraped</span>
  if (status === 'partial')
    return <span className="badge badge--amber"><AlertCircle size={10} />Partial</span>
  return <span className="badge badge--red"><XCircle size={10} />No Data</span>
}

/* ─────────────────────────────────────────────────────────────
   COLOR SWATCH — click to copy hex value to clipboard
───────────────────────────────────────────────────────────────*/
function ColorSwatch({ hex, label }) {
  const [copied, setCopied] = useState(false)
  // validate: must be 3 or 6 char hex
  const isValid = hex && /^#[0-9A-Fa-f]{3,6}$/.test(hex)

  const handleCopy = () => {
    if (!isValid) return
    navigator.clipboard.writeText(hex).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="swatch" onClick={handleCopy} title={isValid ? `Copy ${hex}` : 'Invalid'}>
      <div
        className="swatch__color"
        style={{
          background: isValid ? hex : 'repeating-linear-gradient(45deg,#333 0,#333 4px,#111 4px,#111 8px)',
          boxShadow: isValid ? `0 8px 24px ${hex}55` : 'none',
        }}
      />
      <span className="swatch__hex">
        {copied ? <><Check size={10} /> Copied!</> : isValid ? hex : 'N/A'}
      </span>
      {label && <span className="swatch__label">{label}</span>}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PILL TAG — coloured text badges
   variant: 'indigo' | 'purple' | 'teal' | 'rose' | 'amber'
───────────────────────────────────────────────────────────────*/
const TAG_VARS = {
  indigo: { bg: 'rgba(99,102,241,.14)', border: 'rgba(99,102,241,.3)', color: '#a5b4fc' },
  purple: { bg: 'rgba(168,85,247,.14)', border: 'rgba(168,85,247,.3)', color: '#d8b4fe' },
  teal: { bg: 'rgba(20,184,166,.14)', border: 'rgba(20,184,166,.3)', color: '#5eead4' },
  rose: { bg: 'rgba(244,63,94,.12)', border: 'rgba(244,63,94,.28)', color: '#fda4af' },
  amber: { bg: 'rgba(245,158,11,.12)', border: 'rgba(245,158,11,.28)', color: '#fcd34d' },
}

function PillTag({ children, variant = 'indigo' }) {
  const v = TAG_VARS[variant] || TAG_VARS.indigo
  return (
    <span style={{
      background: v.bg, border: `1px solid ${v.border}`, color: v.color,
      padding: '0.28rem 0.8rem', borderRadius: '999px',
      fontSize: '0.78rem', fontWeight: 600,
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      letterSpacing: '0.2px',
    }}>
      {children}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────
   SECTION CARD — glass card with a coloured gradient top border
───────────────────────────────────────────────────────────────*/
function SectionCard({ icon, title, accentFrom = '#6366f1', accentTo = '#a855f7', children }) {
  return (
    <div className="section-card" style={{ '--af': accentFrom, '--at': accentTo }}>
      {/* top gradient line */}
      <div className="section-card__bar" style={{ background: `linear-gradient(90deg, ${accentFrom}, ${accentTo})` }} />
      <div className="section-card__header">
        <span className="section-card__icon" style={{ color: accentFrom }}>{icon}</span>
        <span className="section-card__title" style={{ color: accentFrom }}>{title}</span>
      </div>
      <div className="section-card__body">{children}</div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   GLOWING BULLET LIST
───────────────────────────────────────────────────────────────*/
function BulletList({ items = [], dotColor = '#6366f1', empty = 'No data available.' }) {
  if (!items?.length) return <p className="muted-italic">{empty}</p>
  return (
    <ul className="bullet-list">
      {items.map((item, i) => (
        <li key={i}>
          <span className="bullet-dot" style={{ background: dotColor, boxShadow: `0 0 8px ${dotColor}99` }} />
          {item}
        </li>
      ))}
    </ul>
  )
}

/* ─────────────────────────────────────────────────────────────
   SOCIAL PLATFORM CARD
   Platform colours: LinkedIn=#0A66C2, Instagram=gradient, Facebook=#1877F2
───────────────────────────────────────────────────────────────*/
const PLATFORM_META = {
  linkedin: { label: 'LinkedIn', color: '#0A66C2', bg: 'rgba(10,102,194,.12)', abbr: 'in' },
  instagram: { label: 'Instagram', color: '#E1306C', bg: 'rgba(225,48,108,.12)', abbr: 'ig', gradient: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' },
  facebook: { label: 'Facebook', color: '#1877F2', bg: 'rgba(24,119,242,.12)', abbr: 'fb' },
}

function SocialCard({ platform, data, meta }) {
  const pm = PLATFORM_META[platform] || { label: platform, color: '#6366f1', bg: 'rgba(99,102,241,.1)', abbr: '?' }
  const status = meta?.[platform]?.status
  const url = meta?.[platform]?.url

  // Filter out 'data_source' key; turn snake_case keys into Title Case
  const rows = Object.entries(data || {})
    .filter(([k]) => k !== 'data_source')
    .map(([key, val]) => ({
      label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      val,
    }))

  const hasData = status !== false && rows.length > 0

  return (
    <div className="social-card" style={{ '--pc': pm.color, '--pb': pm.bg }}>
      {/* coloured top accent bar */}
      <div className="social-card__bar" style={{ background: pm.gradient || pm.color }} />

      <div className="social-card__head">
        <div className="social-card__left">
          <div
            className="social-card__icon"
            style={{ background: pm.gradient || pm.color }}
            aria-label={pm.label}
          >
            {pm.abbr}
          </div>
          <div>
            <p className="social-card__name">{pm.label}</p>
            {url && (
              <a href={url} target="_blank" rel="noreferrer" className="social-card__url">
                {url.replace('https://', '')} <ArrowUpRight size={10} />
              </a>
            )}
          </div>
        </div>
        <ScrapeStatusBadge status={status} />
      </div>

      {!hasData ? (
        <p className="muted-italic" style={{ marginTop: '0.8rem' }}>No data was collected for this platform.</p>
      ) : (
        <div className="social-card__rows">
          {rows.map(({ label, val }) => (
            <div key={label} className="social-card__row">
              <span className="social-card__row-label">{label}</span>
              {Array.isArray(val) ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.2rem' }}>
                  {val.map((v, i) => <PillTag key={i} variant="teal"><Hash size={9} />{v}</PillTag>)}
                </div>
              ) : (
                <span className="social-card__row-val">{String(val) || '—'}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   NUMBERED PILLAR ROW
───────────────────────────────────────────────────────────────*/
function PillarRow({ n, text }) {
  return (
    <div className="pillar-row">
      <span className="pillar-row__num">{String(n).padStart(2, '0')}</span>
      <span className="pillar-row__text">{text}</span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   FEATURE STEP CARD (empty state)
───────────────────────────────────────────────────────────────*/
function StepCard({ icon, title, description, step }) {
  return (
    <div className="step-card">
      <div className="step-card__step">0{step}</div>
      <div className="step-card__icon">{icon}</div>
      <h3 className="step-card__title">{title}</h3>
      <p className="step-card__desc">{description}</p>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   STAT PILL — shown in the report hero
───────────────────────────────────────────────────────────────*/
function StatPill({ label, value, color = '#6366f1' }) {
  return (
    <div className="stat-pill" style={{ '--c': color }}>
      <span className="stat-pill__value" style={{ color }}>{value}</span>
      <span className="stat-pill__label">{label}</span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   MAIN APP
───────────────────────────────────────────────────────────────*/
function App() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  // Restore last result from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('lastAnalysis')
    const savedUrl = localStorage.getItem('lastUrl')
    if (saved && savedUrl) {
      setResult(JSON.parse(saved))
      setUrl(savedUrl)
    }
  }, [])

  // Jump to overview whenever a new result arrives
  useEffect(() => { if (result) setActiveTab('overview') }, [result])

  // Analyze — uses MongoDB 24-hour cache by default
  const handleAnalyze = async (e, force = false) => {
    e.preventDefault()
    if (!url) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const apiUrl = `http://localhost:5000/api/agents/analyze${force ? '?force=true' : ''}`
      const res = await axios.post(apiUrl, { url })
      if (res.data.success) {
        setResult(res.data.data)
        localStorage.setItem('lastAnalysis', JSON.stringify(res.data.data))
        localStorage.setItem('lastUrl', url)
      } else {
        setError(res.data.error || 'Failed to analyze brand')
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
        'Server error — make sure the backend is running and MongoDB is connected.'
      )
    } finally {
      setLoading(false)
    }
  }

  // Fresh scan — bypass cache
  const handleForceAnalyze = (e) => {
    localStorage.removeItem('lastAnalysis')
    localStorage.removeItem('lastUrl')
    handleAnalyze(e, true)
  }

  const handleClear = () => {
    setResult(null)
    setUrl('')
    localStorage.removeItem('lastAnalysis')
    localStorage.removeItem('lastUrl')
  }

  // Derive quick stats from result for the report header
  const stats = result ? [
    { label: 'Tone Traits', value: result.brand_tone?.length || 0, color: '#6366f1' },
    { label: 'Content Pillars', value: result.content_pillars?.length || 0, color: '#a855f7' },
    { label: 'Pain Points', value: result.customer_pain_points?.length || 0, color: '#f43f5e' },
    { label: 'Differentiators', value: result.unique_differentiators?.length || 0, color: '#14b8a6' },
  ] : []

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Eye size={14} /> },
    { id: 'identity', label: 'Visual Identity', icon: <Palette size={14} /> },
    { id: 'audience', label: 'Audience', icon: <Users size={14} /> },
    { id: 'content', label: 'Content', icon: <Layers size={14} /> },
    { id: 'social', label: 'Social Media', icon: <Share2 size={14} /> },
  ]

  return (
    <div className="app">

      {/* ── Floating orbs (pure CSS, no JS) ── */}
      <div className="orb orb--1" />
      <div className="orb orb--2" />
      <div className="orb orb--3" />

      {/* ════════════════════════════════════════
          NAVBAR
      ════════════════════════════════════════ */}
      <nav className="navbar glass">
        <div className="navbar__brand">
          <Zap size={26} className="navbar__zap" />
          <span className="navbar__wordmark">Amplifyer</span>
        </div>
        <div className="navbar__links">
          <a href="#" className="navbar__link">Solutions</a>
          <a href="#" className="navbar__link">Pricing</a>
          <button className="btn btn--primary btn--sm">Dashboard</button>
        </div>
      </nav>

      {/* ════════════════════════════════════════
          HERO
      ════════════════════════════════════════ */}
      <header className="hero">
        <div className="container" style={{ maxWidth: 820 }}>

          <div className="hero__eyebrow">
            <Sparkles size={11} />
            Powered by Multi-Agent AI
          </div>

          <h1 className="hero__title">
            Analyze Any Brand<br />
            <span className="gradient-text">In Seconds</span>
          </h1>

          <p className="hero__sub">
            Enter a URL — our Brand Strategist Agent extracts deep brand intelligence,
            visual identity, and social presence in one unified report.
          </p>

          {/* Search bar */}
          <form onSubmit={handleAnalyze} className="search-bar">
            <div className="search-bar__input-wrap">
              <Globe size={17} className="search-bar__icon" />
              <input
                type="url"
                placeholder="https://example.com"
                className="search-bar__input"
                value={url}
                onChange={e => setUrl(e.target.value)}
                required
              />
            </div>
            <button className="btn btn--primary" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : <><Search size={15} /> Analyze</>}
            </button>
            <button
              className="btn btn--ghost"
              type="button"
              disabled={loading || !url}
              onClick={handleForceAnalyze}
              title="Bypass cache — always scrapes fresh"
            >
              🔄 Fresh
            </button>
          </form>

          {error && (
            <div className="error-toast">
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}
        </div>
      </header>

      {/* ════════════════════════════════════════
          RESULTS
      ════════════════════════════════════════ */}
      {result && (
        <main className="container report-wrap">

          {/* ── Report header card ── */}
          <div className="report-header glass">
            <div className="report-header__left">
              {result.logo_url && (
                <div className="report-header__logo">
                  <img src={result.logo_url} alt="brand logo" />
                </div>
              )}
              <div>
                <div className="report-header__eyebrow">
                  <Cpu size={10} /> Agent 1 · Brand Strategist
                </div>
                <h2 className="report-header__title">Brand Intelligence Report</h2>
                {result.industry && (
                  <p className="report-header__industry">
                    Industry — <strong>{result.industry}</strong>
                  </p>
                )}
              </div>
            </div>

            {/* Quick stats */}
            <div className="report-header__stats">
              {stats.map(s => (
                <StatPill key={s.label} label={s.label} value={s.value} color={s.color} />
              ))}
            </div>

            <button onClick={handleClear} className="btn btn--ghost btn--sm report-header__reset">
              ✕ Reset
            </button>
          </div>

          {/* ── Positioning statement ── */}
          {result.suggested_positioning_statement && (
            <div className="positioning-card glass">
              <div className="positioning-card__label">
                <Star size={12} /> Market Positioning
              </div>
              <p className="positioning-card__text">
                "{result.suggested_positioning_statement}"
              </p>
            </div>
          )}

          {/* ── Tab bar ── */}
          <div className="tab-bar">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`tab-btn ${activeTab === t.id ? 'tab-btn--active' : ''}`}
              >
                {t.icon}
                <span className="tab-btn__label">{t.label}</span>
              </button>
            ))}
          </div>

          {/* ━━━━━━━━━━━━━━━━━━━━━━ TAB: OVERVIEW ━━━━━━━━━━━━━━━━━━━━━━ */}
          {activeTab === 'overview' && (
            <div className="tab-pane">
              <div className="grid-2">
                <SectionCard icon={<Briefcase size={14} />} title="Brand Summary"
                  accentFrom="#6366f1" accentTo="#818cf8">
                  <p className="body-text">{result.brand_summary || '—'}</p>
                </SectionCard>
                <SectionCard icon={<Target size={14} />} title="Value Proposition"
                  accentFrom="#a855f7" accentTo="#d8b4fe">
                  <p className="body-text">{result.value_proposition || '—'}</p>
                </SectionCard>
              </div>

              <div className="grid-3 mt-6">
                <SectionCard icon={<MessageSquare size={14} />} title="Brand Tone"
                  accentFrom="#14b8a6" accentTo="#5eead4">
                  <div className="tag-cloud">
                    {result.brand_tone?.map((t, i) => (
                      <PillTag key={i} variant="teal">{t}</PillTag>
                    ))}
                    {!result.brand_tone?.length && <p className="muted-italic">No data.</p>}
                  </div>
                </SectionCard>

                <SectionCard icon={<Star size={14} />} title="Personality Traits"
                  accentFrom="#a855f7" accentTo="#e879f9">
                  <div className="tag-cloud">
                    {result.brand_personality_traits?.map((t, i) => (
                      <PillTag key={i} variant="purple">{t}</PillTag>
                    ))}
                    {!result.brand_personality_traits?.length && <p className="muted-italic">No data.</p>}
                  </div>
                </SectionCard>

                <SectionCard icon={<BarChart2 size={14} />} title="Core Offers"
                  accentFrom="#f59e0b" accentTo="#fcd34d">
                  <div className="tag-cloud">
                    {result.core_offers?.map((o, i) => (
                      <PillTag key={i} variant="amber">{o}</PillTag>
                    ))}
                    {!result.core_offers?.length && <p className="muted-italic">No data.</p>}
                  </div>
                </SectionCard>
              </div>
            </div>
          )}

          {/* ━━━━━━━━━━━━━━━━━━━ TAB: VISUAL IDENTITY ━━━━━━━━━━━━━━━━━━━ */}
          {activeTab === 'identity' && (
            <div className="tab-pane">
              <div className="grid-2">
                {/* Color palette */}
                <SectionCard icon={<Palette size={14} />} title="Color Palette"
                  accentFrom="#6366f1" accentTo="#a855f7">
                  <div className="palette-groups">
                    {[
                      { key: 'primary_colors', label: 'Primary' },
                      { key: 'secondary_colors', label: 'Secondary' },
                      { key: 'accent_colors', label: 'Accent / CTA' },
                    ].map(({ key, label }) =>
                      result.visual_identity?.[key]?.length ? (
                        <div key={key} className="palette-group">
                          <span className="palette-group__label">{label}</span>
                          <div className="swatch-row">
                            {result.visual_identity[key].map((c, i) => (
                              <ColorSwatch key={i} hex={c.hex} label={c.usage} />
                            ))}
                          </div>
                        </div>
                      ) : null
                    )}
                    {!result.visual_identity?.primary_colors?.length &&
                      !result.visual_identity?.secondary_colors?.length &&
                      !result.visual_identity?.accent_colors?.length && (
                        <p className="muted-italic">No colors extracted — try Fresh Scan.</p>
                      )}
                  </div>
                </SectionCard>

                {/* Typography */}
                <SectionCard icon={<Type size={14} />} title="Typography & Style"
                  accentFrom="#a855f7" accentTo="#6366f1">
                  <div className="typo-stack">
                    {[
                      { key: 'primary_font', label: 'Primary Font' },
                      { key: 'secondary_font', label: 'Secondary Font' },
                    ].map(({ key, label }) => {
                      const font = result.visual_identity?.typography?.[key]
                      return font ? (
                        <div key={key} className="font-card">
                          <span className="font-card__label">{label}</span>
                          <p className="font-card__name" style={{ fontFamily: font }}>{font}</p>
                          <p className="font-card__sample" style={{ fontFamily: font }}>
                            The quick brown fox jumps over the lazy dog.
                          </p>
                        </div>
                      ) : null
                    })}

                    {result.visual_identity?.typography?.font_style_description && (
                      <p className="muted-sm" style={{ marginTop: '0.5rem' }}>
                        {result.visual_identity.typography.font_style_description}
                      </p>
                    )}
                  </div>

                  {result.visual_identity?.design_style_description && (
                    <div className="identity-meta">
                      <span className="identity-meta__label">Design Style</span>
                      <p className="body-text">{result.visual_identity.design_style_description}</p>
                    </div>
                  )}

                  {result.visual_identity?.logo_style_description && (
                    <div className="identity-meta">
                      <span className="identity-meta__label">Logo</span>
                      <p className="body-text">{result.visual_identity.logo_style_description}</p>
                    </div>
                  )}
                </SectionCard>
              </div>
            </div>
          )}

          {/* ━━━━━━━━━━━━━━━━━━━━━ TAB: AUDIENCE ━━━━━━━━━━━━━━━━━━━━━━━ */}
          {activeTab === 'audience' && (
            <div className="tab-pane">
              <div className="grid-2">
                <SectionCard icon={<Users size={14} />} title="Target Audience"
                  accentFrom="#6366f1" accentTo="#818cf8">
                  <p className="body-text">{result.target_audience || '—'}</p>
                </SectionCard>
                <SectionCard icon={<TrendingUp size={14} />} title="Unique Differentiators"
                  accentFrom="#14b8a6" accentTo="#5eead4">
                  <BulletList items={result.unique_differentiators} dotColor="#14b8a6" empty="No differentiators found." />
                </SectionCard>
              </div>
              <div className="grid-2 mt-6">
                <SectionCard icon={<AlertCircle size={14} />} title="Customer Pain Points"
                  accentFrom="#f43f5e" accentTo="#fb7185">
                  <BulletList items={result.customer_pain_points} dotColor="#f43f5e" empty="No pain points listed." />
                </SectionCard>
                <SectionCard icon={<Lightbulb size={14} />} title="Desired Outcomes"
                  accentFrom="#f59e0b" accentTo="#fcd34d">
                  <BulletList items={result.desired_customer_outcomes} dotColor="#f59e0b" empty="No outcomes listed." />
                </SectionCard>
              </div>
            </div>
          )}

          {/* ━━━━━━━━━━━━━━━━━━━━━ TAB: CONTENT ━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {activeTab === 'content' && (
            <div className="tab-pane">
              <div className="grid-2">
                <SectionCard icon={<Layers size={14} />} title="Content Pillars"
                  accentFrom="#6366f1" accentTo="#a855f7">
                  {result.content_pillars?.length ? (
                    <div className="pillar-list">
                      {result.content_pillars.map((p, i) => (
                        <PillarRow key={i} n={i + 1} text={p} />
                      ))}
                    </div>
                  ) : <p className="muted-italic">No content pillars found.</p>}
                </SectionCard>
                <SectionCard icon={<Globe size={14} />} title="Cross-Platform Strategy"
                  accentFrom="#a855f7" accentTo="#6366f1">
                  <p className="body-text">
                    {result.cross_platform_content_strategy || 'No strategy data available.'}
                  </p>
                </SectionCard>
              </div>
            </div>
          )}

          {/* ━━━━━━━━━━━━━━━━━━━━ TAB: SOCIAL MEDIA ━━━━━━━━━━━━━━━━━━━━ */}
          {activeTab === 'social' && (
            <div className="tab-pane">
              <div className="social-grid">
                {['linkedin', 'instagram', 'facebook'].map(platform => (
                  <SocialCard
                    key={platform}
                    platform={platform}
                    data={result.social_media_presence?.[platform]}
                    meta={result._social_scrape_meta}
                  />
                ))}
              </div>
            </div>
          )}

        </main>
      )}

      {/* ════════════════════════════════════════
          EMPTY STATE
      ════════════════════════════════════════ */}
      {!result && !loading && (
        <section className="container empty-state">
          <StepCard step={1} icon={<Globe size={28} />} title="Scrape"
            description="Agent 1 crawls the website HTML, CSS variables, and meta tags." />
          <StepCard step={2} icon={<Cpu size={28} />} title="Process"
            description="Llama-3.3-70b analyses strategic positioning and brand voice." />
          <StepCard step={3} icon={<Target size={28} />} title="Extract"
            description="Structured Brand Intelligence returned as a rich JSON report." />
        </section>
      )}

      {/* ════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════ */}
      <footer className="footer">
        <p>© 2026 <strong>Amplifyer</strong> · Built with Multi-Agent AI</p>
      </footer>
    </div>
  )
}

export default App
