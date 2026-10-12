import React, { useState } from 'react';
import { login as apiLogin, register as apiRegister, logout as apiLogout } from '../lib/api';
import { ThemeToggle } from '../components/ThemeToggle';
import type { User } from '../types/auth';
import '../styles/landing-page.css';

interface LandingPageProps {
  currentUser: User | null;
  onEnterWorkspace: (targetModule?: string) => void;
  onUserChange: (user: User | null) => void;
}

export function LandingPage({ currentUser, onEnterWorkspace, onUserChange }: LandingPageProps) {
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authNotice, setAuthNotice] = useState('');

  const fillQuickCredentials = (email: string, pass: string) => {
    setAuthTab('login');
    setLoginEmail(email);
    setLoginPassword(pass);
    setAuthError('');
    setAuthNotice('Credentials populated. Click "Sign In & Launch Workspace" to authenticate.');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAuthLoading(true);
      setAuthError('');
      setAuthNotice('');
      const res = await apiLogin({ email: loginEmail, password: loginPassword });
      onUserChange(res.user);
      onEnterWorkspace(res.user.role === 'Customer' ? 'tickets' : res.user.role === 'Admin' ? 'analyticsSla' : 'agentAdmin');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Login failed. Check your email and password.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAuthLoading(true);
      setAuthError('');
      setAuthNotice('');
      const res = await apiRegister({ name: regName, email: regEmail, password: regPassword });
      onUserChange(res.user);
      onEnterWorkspace('tickets');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await apiLogout();
    } catch {}
    onUserChange(null);
    setAuthSuccess('You have been signed out safely.');
    setTimeout(() => setAuthSuccess(''), 3000);
  };

  const handleModuleClick = (moduleId: string) => {
    if (currentUser) {
      onEnterWorkspace(moduleId);
    } else {
      setAuthNotice('🔒 Please sign in or create an account to access this module.');
      setAuthTab('login');
      document.getElementById('access')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLaunchWorkspaceClick = () => {
    if (currentUser) {
      onEnterWorkspace(currentUser.role === 'Customer' ? 'tickets' : 'analyticsSla');
    } else {
      setAuthNotice('🔒 Please sign in or create an account to enter the workspace.');
      setAuthTab('login');
      document.getElementById('access')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const modules = [
    {
      id: 'tickets',
      num: 'MOD 01',
      icon: '🎫',
      title: 'Customer Support Operations',
      desc: 'Scoped ticket submission, live SSE streaming updates, SLA response timers, and 5-star CSAT feedback.',
      tag: 'Core Queue & Portal',
    },
    {
      id: 'knowledgeBase',
      num: 'MOD 02',
      icon: '🤖',
      title: 'Automated Knowledge Deflection',
      desc: 'Routine query deflector serving instant verified solutions for common inquiries without human queue wait.',
      tag: 'Self-Service Deflection',
    },
    {
      id: 'sentiment',
      num: 'MOD 03',
      icon: '💬',
      title: 'Emotional Sentiment Analyzer',
      desc: 'Deep lexicon-driven emotional frustration scorer (0-100) detecting customer dissatisfaction before escalation.',
      tag: 'Emotional Intelligence',
    },
    {
      id: 'urgency',
      num: 'MOD 04',
      icon: '⚡',
      title: 'Urgency & Classification Engine',
      desc: 'Deterministic keyword extraction classifying tickets into Low, Medium, High, or Critical urgency.',
      tag: 'SLA Risk Prediction',
    },
    {
      id: 'customerValue',
      num: 'MOD 05',
      icon: '💎',
      title: 'Customer Value Analysis (CLV)',
      desc: 'Analyzes client spend, tenure, and account tier to protect high-value business relationships.',
      tag: 'Account Intelligence',
    },
    {
      id: 'priority',
      num: 'MOD 06',
      icon: '📈',
      title: 'Priority Score Calculation',
      desc: 'Weighted multi-factor formula integrating urgency, frustration, customer tier, and SLA risk into a 0-100 score.',
      tag: 'Mathematical Scoring',
    },
    {
      id: 'routing',
      num: 'MOD 07',
      icon: '🔀',
      title: 'Intelligent Ticket Routing',
      desc: 'Smart agent matching engine routing tickets to specialized support departments and senior staff.',
      tag: 'Workload & Dispatch',
    },
    {
      id: 'triageRouter',
      num: 'MOD 08',
      icon: '🎯',
      title: 'Predictive Triage Simulator',
      desc: 'End-to-end interactive triage pipeline orchestrating all analytical stages in real-time.',
      tag: 'Unified Pipeline',
    },
    {
      id: 'agentAdmin',
      num: 'MOD 09',
      icon: '🖥️',
      title: 'Agent & Admin Workbench',
      desc: 'Role-guarded workspace for support specialists: ticket handling, priority override, and team assignment.',
      tag: 'Staff Operations',
    },
    {
      id: 'analyticsSla',
      num: 'MOD 10',
      icon: '📊',
      title: 'SLA Command Center & Analytics',
      desc: 'Organization-wide analytics dashboard, 9 interactive Recharts metrics, and compliance adherence tracking.',
      tag: 'Executive Governance',
    },
    {
      id: 'userManagement',
      num: 'ADMIN',
      icon: '👥',
      title: 'User & Role Governance',
      desc: 'Cryptographic scrypt session authentication, user status toggles, and security audit logs.',
      tag: 'RBAC Security',
    },
  ];

  return (
    <div className="landing-wrapper">
      {/* Top Navbar */}
      <nav className="landing-nav">
        <div className="landing-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <img src="/logo.png" alt="SupportSphere AI Logo" className="landing-logo-img" />
          <span className="landing-logo-text">SupportSphere AI</span>
        </div>

        <div className="landing-nav-links">
          <a href="#pipeline" className="landing-nav-link">Live Pipeline</a>
          <a href="#modules" className="landing-nav-link">10 Modules</a>
          <a href="#sla" className="landing-nav-link">SLA Matrix</a>
          <a href="#access" className="landing-nav-link">Access Portal</a>
        </div>

        <div className="landing-nav-actions">
          <ThemeToggle />
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.86rem', color: '#c7d2fe', fontWeight: 600 }}>
                👤 {currentUser.name} ({currentUser.role})
              </span>
              <button
                type="button"
                className="lp-btn lp-btn-primary"
                onClick={handleLaunchWorkspaceClick}
              >
                Enter Workspace 🚀
              </button>
              <button
                type="button"
                className="lp-btn lp-btn-secondary"
                onClick={handleSignOut}
                style={{ padding: '8px 14px', fontSize: '0.84rem' }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="lp-btn lp-btn-secondary"
                onClick={() => {
                  setAuthTab('login');
                  setAuthNotice('');
                  document.getElementById('access')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className="lp-btn lp-btn-primary"
                onClick={() => {
                  setAuthTab('register');
                  setAuthNotice('');
                  document.getElementById('access')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Create Account
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="hero-pill">
          <span>✨</span>
          <span>PREDICTIVE CUSTOMER TRIAGE &amp; SENTIMENT ROUTER 2.0</span>
        </div>

        <h1 className="hero-title">
          Turn Support Chaos into Clarity with <br />
          <span className="hero-gradient-text">Real-Time Predictive SLA Routing</span>
        </h1>

        <p className="hero-subtitle">
          Intelligently prioritize, route, and escalate incoming customer queries based on live emotional sentiment analysis,
          deterministic urgency prediction, and account lifetime value. Eliminate queue bottlenecks with zero SLA breaches.
        </p>

        <div className="hero-cta-group">
          <button
            type="button"
            className="lp-btn lp-btn-primary lp-btn-lg"
            onClick={handleLaunchWorkspaceClick}
          >
            {currentUser ? '🚀 Launch Operational Workspace' : '🔐 Sign In to Enter Workspace'}
          </button>
          <button
            type="button"
            className="lp-btn lp-btn-secondary lp-btn-lg"
            onClick={() => {
              document.getElementById('pipeline')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            ⚡ View Triage Pipeline
          </button>
        </div>

        {/* Live Triage Pipeline Preview */}
        <div id="pipeline" className="hero-preview-container">
          <div className="hero-preview-card">
            <div className="preview-header">
              <div className="preview-window-dots">
                <span className="preview-dot red" />
                <span className="preview-dot yellow" />
                <span className="preview-dot green" />
              </div>
              <div className="preview-badge-status">
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                <span>REAL-TIME STREAMING · ZERO LATENCY</span>
              </div>
            </div>

            <div className="pipeline-flow-grid">
              <div className="pipeline-stage-box">
                <div className="stage-label">Step 1 · Ingestion</div>
                <div className="stage-value">🚨 Payment Error</div>
                <div className="stage-sub">"Our checkout failed for enterprise order"</div>
              </div>

              <div className="pipeline-stage-box">
                <div className="stage-label">Step 2 · Sentiment</div>
                <div className="stage-value" style={{ color: '#f87171' }}>😡 Frustrated (84%)</div>
                <div className="stage-sub">Dissatisfaction detected</div>
              </div>

              <div className="pipeline-stage-box">
                <div className="stage-label">Step 3 · Urgency</div>
                <div className="stage-value" style={{ color: '#fb923c' }}>⚡ Critical Urgency</div>
                <div className="stage-sub">SLA Response: 1 Hour</div>
              </div>

              <div className="pipeline-stage-box">
                <div className="stage-label">Step 4 · Value &amp; Score</div>
                <div className="stage-value" style={{ color: '#a78bfa' }}>💎 Gold (92/100)</div>
                <div className="stage-sub">Priority Score: 88/100</div>
              </div>

              <div className="pipeline-stage-box" style={{ borderColor: 'rgba(99, 102, 241, 0.6)', background: 'rgba(99, 102, 241, 0.12)' }}>
                <div className="stage-label" style={{ color: '#a5b4fc' }}>Step 5 · Dispatch</div>
                <div className="stage-value" style={{ color: '#38bdf8' }}>👑 Senior Escalation</div>
                <div className="stage-sub">Routed to Senior Support Lead</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Banner */}
      <section className="metrics-strip">
        <div className="metric-pill-card">
          <div className="metric-num">99.8%</div>
          <div className="metric-desc">SLA Compliance Guarantee</div>
        </div>
        <div className="metric-pill-card">
          <div className="metric-num">&lt; 8 min</div>
          <div className="metric-desc">Average First Response Time</div>
        </div>
        <div className="metric-pill-card">
          <div className="metric-num">68%</div>
          <div className="metric-desc">Automated KB Deflection Rate</div>
        </div>
        <div className="metric-pill-card">
          <div className="metric-num">4.8 / 5</div>
          <div className="metric-desc">Customer Satisfaction (CSAT)</div>
        </div>
      </section>

      {/* Interactive Auth & Login Gateway Card */}
      <section id="access" className="auth-access-section">
        <div className="auth-access-card">
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div className="section-eyebrow">Authentication Gateway</div>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '0 0 8px' }}>
              {currentUser ? `Welcome back, ${currentUser.name}!` : 'Secure Access Required'}
            </h2>
            <p style={{ color: 'var(--lp-text-dim)', fontSize: '0.94rem', margin: 0 }}>
              {currentUser
                ? `You are authenticated as ${currentUser.role}. Enter the workspace or sign out.`
                : 'Access to the 10 support modules requires authenticated credentials. Sign in or register below.'}
            </p>
          </div>

          {currentUser ? (
            <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>
                Currently Active Session
              </div>
              <div style={{ color: '#c7d2fe', marginBottom: '16px', fontSize: '0.9rem' }}>
                Signed in as <strong>{currentUser.name}</strong> ({currentUser.email}) with <strong>{currentUser.role}</strong> permissions.
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                <button
                  type="button"
                  className="lp-btn lp-btn-primary"
                  onClick={handleLaunchWorkspaceClick}
                >
                  Enter Workspace 🚀
                </button>
                <button
                  type="button"
                  className="lp-btn lp-btn-secondary"
                  onClick={handleSignOut}
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="auth-tabs-header">
                <button
                  type="button"
                  className={`auth-tab-btn ${authTab === 'login' ? 'active' : ''}`}
                  onClick={() => {
                    setAuthTab('login');
                    setAuthError('');
                    setAuthNotice('');
                  }}
                >
                  🔑 Sign In to Workspace
                </button>
                <button
                  type="button"
                  className={`auth-tab-btn ${authTab === 'register' ? 'active' : ''}`}
                  onClick={() => {
                    setAuthTab('register');
                    setAuthError('');
                    setAuthNotice('');
                  }}
                >
                  📝 Create Customer Account
                </button>
              </div>

              {authNotice && (
                <div style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid #6366f1', color: '#c7d2fe', padding: '12px 16px', borderRadius: '10px', marginBottom: '18px', fontSize: '0.88rem' }}>
                  {authNotice}
                </div>
              )}

              {authError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '12px 16px', borderRadius: '10px', marginBottom: '18px', fontSize: '0.88rem' }}>
                  {authError}
                </div>
              )}

              {authSuccess && (
                <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#6ee7b7', padding: '12px 16px', borderRadius: '10px', marginBottom: '18px', fontSize: '0.88rem' }}>
                  {authSuccess}
                </div>
              )}

              {authTab === 'login' && (
                <div>
                  {/* Demo Credential Quick-Fill Helpers */}
                  <div style={{ marginBottom: '20px', padding: '14px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--lp-text-muted)', fontWeight: 700, marginBottom: '8px' }}>
                      ⚡ Demo Credential Quick-Fill (Click to populate):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <button
                        type="button"
                        className="demo-pill-btn"
                        onClick={() => fillQuickCredentials('admin@example.com', 'Admin@123')}
                        title="Administrator credentials"
                      >
                        👑 Admin
                      </button>
                      <button
                        type="button"
                        className="demo-pill-btn"
                        onClick={() => fillQuickCredentials('senior@example.com', 'Senior@123')}
                        title="Senior Support Staff credentials"
                      >
                        ⭐ Senior Lead
                      </button>
                      <button
                        type="button"
                        className="demo-pill-btn"
                        onClick={() => fillQuickCredentials('agent@example.com', 'Agent@123')}
                        title="Support Agent credentials"
                      >
                        🎧 Support Agent
                      </button>
                      <button
                        type="button"
                        className="demo-pill-btn"
                        onClick={() => fillQuickCredentials('customer@example.com', 'Customer@123')}
                        title="Customer credentials"
                      >
                        👤 Customer
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleLoginSubmit} className="inline-auth-form">
                    <div className="auth-input-group">
                      <label>Email Address</label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. admin@example.com or user@company.com"
                        className="auth-input-field"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                      />
                    </div>
                    <div className="auth-input-group">
                      <label>Password</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••••••"
                        className="auth-input-field"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="lp-btn lp-btn-primary"
                      style={{ padding: '12px', marginTop: '8px' }}
                    >
                      {authLoading ? 'Authenticating...' : 'Sign In & Launch Workspace'}
                    </button>
                  </form>
                </div>
              )}

              {authTab === 'register' && (
                <form onSubmit={handleRegisterSubmit} className="inline-auth-form">
                  <div className="auth-input-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Prajwal Jadhav"
                      className="auth-input-field"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                    />
                  </div>
                  <div className="auth-input-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. user@company.com"
                      className="auth-input-field"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                    />
                  </div>
                  <div className="auth-input-group">
                    <label>Password (min 8 characters)</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      placeholder="Create a strong password"
                      className="auth-input-field"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="lp-btn lp-btn-primary"
                    style={{ padding: '12px', marginTop: '8px' }}
                  >
                    {authLoading ? 'Creating Account...' : 'Register & Enter Workspace'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </section>

      {/* 10 Enterprise Modules Showcase */}
      <section id="modules" className="modules-section">
        <div className="section-eyebrow">Enterprise Architecture</div>
        <h2 className="section-heading">All 10 Enterprise Modules Built-In</h2>
        <p className="section-desc">
          Engineered as a cohesive, production-grade platform with real-time SSE streaming, persistent LowDB storage, and mathematical triage intelligence.
        </p>

        <div className="modules-grid">
          {modules.map((mod) => (
            <div key={mod.id} className="module-card">
              <span className="module-card-num">{mod.num}</span>
              <div>
                <div className="module-card-icon">{mod.icon}</div>
                <h3 className="module-card-title">{mod.title}</h3>
                <p className="module-card-text">{mod.desc}</p>
              </div>
              <div className="module-card-footer">
                <span className="module-badge-tag">{mod.tag}</span>
                <button
                  type="button"
                  className="module-open-link"
                  onClick={() => handleModuleClick(mod.id)}
                >
                  {currentUser ? 'Open →' : '🔒 Sign In'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SLA Matrix Section */}
      <section id="sla" className="sla-matrix-section">
        <div className="section-eyebrow">Guaranteed Response Targets</div>
        <h2 className="section-heading">Deterministic SLA Policy Matrix</h2>
        <p className="section-desc">
          Automated SLA timers start immediately when a ticket is ingested and count down in real time.
        </p>

        <div className="sla-matrix-card">
          <table className="sla-matrix-table">
            <thead>
              <tr>
                <th>Priority Level</th>
                <th>First Response SLA</th>
                <th>Resolution SLA</th>
                <th>Escalation Path</th>
                <th>Target Adherence</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong style={{ color: '#ef4444' }}>🚨 Critical</strong></td>
                <td>1 Hour</td>
                <td>4 Hours</td>
                <td>Senior Lead &amp; Executive Escalations</td>
                <td>&ge; 98%</td>
              </tr>
              <tr>
                <td><strong style={{ color: '#f59e0b' }}>⚠️ High</strong></td>
                <td>2 Hours</td>
                <td>8 Hours</td>
                <td>Specialized Tier-2 Support Teams</td>
                <td>&ge; 95%</td>
              </tr>
              <tr>
                <td><strong style={{ color: '#3b82f6' }}>🔷 Medium</strong></td>
                <td>4 Hours</td>
                <td>24 Hours</td>
                <td>Standard Support Queue</td>
                <td>&ge; 90%</td>
              </tr>
              <tr>
                <td><strong style={{ color: '#10b981' }}>🟢 Low</strong></td>
                <td>8 Hours</td>
                <td>48 Hours</td>
                <td>Automated Self-Service KB Deflection</td>
                <td>&ge; 85%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="landing-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src="/logo.png" alt="SupportSphere AI Logo" className="landing-logo-img" />
            <span className="landing-logo-text">SupportSphere AI · Predictive Triage &amp; Router</span>
          </div>
          <div className="footer-copy">
            Built with React, TypeScript, Node.js, Express, LowDB, and Server-Sent Events. All systems operational.
          </div>
        </div>
      </footer>
    </div>
  );
}
