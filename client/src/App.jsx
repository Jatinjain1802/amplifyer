import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Layout, BarChart, Calendar, Users, Zap, Menu, X, ArrowRight, Globe, Search, Palette, Type, Target, Briefcase } from 'lucide-react'

function App() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  // Load from LocalStorage on mount (Best Practice: Persist State)
  useEffect(() => {
    const savedResult = localStorage.getItem('lastAnalysis')
    const savedUrl = localStorage.getItem('lastUrl')
    if (savedResult && savedUrl) {
      setResult(JSON.parse(savedResult))
      setUrl(savedUrl)
    }
  }, [])

  const handleAnalyze = async (e) => {
    e.preventDefault()
    if (!url) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await axios.post('http://localhost:5000/api/agents/analyze', { url })
      if (response.data.success) {
        setResult(response.data.data)
        // Store in localStorage
        localStorage.setItem('lastAnalysis', JSON.stringify(response.data.data))
        localStorage.setItem('lastUrl', url)
      } else {
        setError(response.data.error || 'Failed to analyze brand')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Server error occurred. Make sure the backend is running and MongoDB is connected.')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setResult(null)
    setUrl('')
    localStorage.removeItem('lastAnalysis')
    localStorage.removeItem('lastUrl')
  }

  return (
    <div className="app-container">
      {/* Navbar */}
      <nav className="glass" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        margin: '1rem',
        padding: '0.75rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Zap size={32} color="var(--primary)" fill="var(--primary)" />
          <h2 style={{ letterSpacing: '-1px' }}>Amplifyer</h2>
        </div>

        <div className="desktop-nav" style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Solutions</a>
          <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Pricing</a>
          <button className="btn btn-primary">Dashboard</button>
        </div>
      </nav>

      {/* Hero / Input Section */}
      <header style={{
        paddingTop: '160px',
        paddingBottom: '60px',
        textAlign: 'center',
        background: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)'
      }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          <h1 style={{
            fontSize: '3.5rem',
            marginBottom: '1rem',
            lineHeight: 1.1,
            fontWeight: 800
          }}>
            Analyze Any Brand <br />
            <span className="gradient-text">In Seconds</span>
          </h1>
          <p style={{
            color: 'var(--text-muted)',
            marginBottom: '2.5rem',
            fontSize: '1.2rem'
          }}>
            Enter a website URL and let our Agent 1 (Brand Strategist) extract
            deep brand intelligence and visual identity.
          </p>

          <form onSubmit={handleAnalyze} style={{ position: 'relative', display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Globe size={20} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="url"
                placeholder="https://example.com"
                className="glass-input"
                style={{ paddingLeft: '3.5rem' }}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? <div className="spinner"></div> : <><Search size={18} /> Analyze</>}
            </button>
          </form>

          {error && (
            <div className="glass" style={{ marginTop: '2rem', padding: '1rem', borderColor: 'var(--accent)', color: '#ffb3b3', background: 'rgba(244, 63, 94, 0.1)' }}>
              {error}
            </div>
          )}
        </div>
      </header>

      {/* Results Section */}
      {result && (
        <section className="container" style={{ paddingBottom: '100px' }}>
          <div className="glass result-card">
            <div className="result-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  {result.logo_url && (
                    <div className="glass" style={{ width: '60px', height: '60px', borderRadius: '12px', overflow: 'hidden', padding: '0.5rem', background: 'white' }}>
                      <img src={result.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                  )}
                  <div>
                    <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Brand Intelligence Report</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Found in: {result.industry}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button onClick={handleClear} className="glass btn" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>Reset</button>
                  <div className="tag">AGENT 1 ACTIVE</div>
                </div>
              </div>
            </div>

            <div className="grid-2">
              <div className="result-section">
                <span className="section-title"><Briefcase size={14} inline /> Summary & Strategy</span>
                <p style={{ marginBottom: '1.5rem', fontSize: '1.05rem', color: '#e2e8f0' }}>{result.brand_summary}</p>

                <h4 style={{ marginBottom: '0.8rem', fontSize: '0.9rem' }}>Market Positioning</h4>
                <p className="glass" style={{ padding: '1rem', borderStyle: 'dashed', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                  "{result.suggested_positioning_statement}"
                </p>
              </div>

              <div className="result-section">
                <span className="section-title"><Target size={14} inline /> Target & Value</span>
                <div style={{ marginBottom: '1rem' }}>
                  <small style={{ color: 'var(--text-muted)' }}>Target Audience:</small>
                  <p>{result.target_audience}</p>
                </div>
                <div>
                  <small style={{ color: 'var(--text-muted)' }}>Value Proposition:</small>
                  <p>{result.value_proposition}</p>
                </div>
              </div>
            </div>

            <div className="grid-2" style={{ marginTop: '1rem' }}>
              <div className="result-section">
                <span className="section-title"><Search size={14} inline /> Personality & Tone</span>
                <div className="tag-container">
                  {result.brand_personality_traits.map((trait, i) => (
                    <span key={i} className="tag">{trait}</span>
                  ))}
                  {result.brand_tone.map((tone, i) => (
                    <span key={i} className="tag" style={{ background: 'rgba(168, 85, 247, 0.1)', borderColor: 'rgba(168, 85, 247, 0.2)', color: 'var(--secondary)' }}>{tone}</span>
                  ))}
                </div>
              </div>

              <div className="result-section">
                <span className="section-title"><Layout size={14} inline /> Content Pillars</span>
                <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-muted)' }}>
                  {result.content_pillars.map((pillar, i) => (
                    <li key={i} style={{ marginBottom: '0.3rem' }}>{pillar}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '2.5rem', marginTop: '1rem' }}>
              <span className="section-title"><Palette size={14} inline /> Visual Identity</span>
              <div className="grid-2">
                <div>
                  <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>Color Palette</h4>
                  <div className="color-swatch-container">
                    {result.visual_identity.primary_colors.map((c, i) => (
                      <ColorSwatch key={i} hex={c.hex} label="Primary" />
                    ))}
                    {result.visual_identity.accent_colors.map((c, i) => (
                      <ColorSwatch key={i} hex={c.hex} label="CTA/Accent" />
                    ))}
                  </div>
                </div>
                <div>
                  <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>Typography & Style</h4>
                  <div style={{ display: 'flex', gap: '2rem' }}>
                    <div>
                      <small style={{ color: 'var(--text-muted)' }}>Primary Font:</small>
                      <p style={{ fontFamily: result.visual_identity.typography.primary_font }}>{result.visual_identity.typography.primary_font}</p>
                    </div>
                    <div>
                      <small style={{ color: 'var(--text-muted)' }}>Secondary Font:</small>
                      <p style={{ fontFamily: result.visual_identity.typography.secondary_font }}>{result.visual_identity.typography.secondary_font}</p>
                    </div>
                  </div>
                  <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {result.visual_identity.design_style_description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {!result && !loading && (
        <section className="container" style={{ padding: '40px 0', textAlign: 'center' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem',
            opacity: 0.5
          }}>
            <FeatureCard title="Step 1: Scrape" icon={<Globe />} description="Agent 1 crawls the website HTML and styles." />
            <FeatureCard title="Step 2: Process" icon={<Zap />} description="Llama-3.3-70b analyzes the strategic positioning." />
            <FeatureCard title="Step 3: Extract" icon={<Target />} description="Structured Brand Intelligence is returned." />
          </div>
        </section>
      )}

      <footer style={{
        padding: '60px 0',
        borderTop: '1px solid var(--surface-border)',
        textAlign: 'center',
        color: 'var(--text-muted)'
      }}>
        <p>&copy; 2026 Amplifyer SaaS. Built with Multi-Agent AI.</p>
      </footer>
    </div>
  )
}

function ColorSwatch({ hex, label }) {
  return (
    <div className="color-swatch">
      <div className="swatch-circle" style={{ backgroundColor: hex || '#333' }}></div>
      <span className="swatch-hex">{hex || 'N/A'}</span>
      <small style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{label}</small>
    </div>
  )
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="glass" style={{ padding: '2rem' }}>
      <div style={{ color: 'var(--primary)', marginBottom: '1rem' }}>{icon}</div>
      <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>{title}</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{description}</p>
    </div>
  )
}

export default App
