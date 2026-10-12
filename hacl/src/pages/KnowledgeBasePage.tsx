import { useState } from 'react';
import {
  KNOWLEDGE_BASE_ARTICLES,
  searchKnowledgeBase,
  matchKnowledgeBase,
  getKnowledgeBaseStats,
  type KnowledgeBaseArticle,
} from '../services/knowledgeBase';

export function KnowledgeBasePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeArticle, setActiveArticle] = useState<KnowledgeBaseArticle | null>(KNOWLEDGE_BASE_ARTICLES[0]);
  const [testQuery, setTestQuery] = useState('');
  const [testResult, setTestResult] = useState<ReturnType<typeof matchKnowledgeBase>>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, boolean>>({});

  const stats = getKnowledgeBaseStats();
  const searchResults = searchKnowledgeBase(searchTerm);
  const filteredArticles = selectedCategory === 'All'
    ? searchResults
    : searchResults.filter((art) => art.category.toLowerCase().includes(selectedCategory.toLowerCase()));

  const categories = ['All', 'Account Access', 'Refunds and Cancellations', 'Delivery and Shipping', 'Billing and Payments', 'Product Issues', 'General Inquiry'];

  const handleTestRoutineQuery = () => {
    if (!testQuery.trim()) return;
    const match = matchKnowledgeBase(testQuery);
    setTestResult(match);
  };

  const handleFeedback = (articleId: string, helpful: boolean) => {
    setFeedbackGiven((prev) => ({ ...prev, [articleId]: true }));
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff', padding: '1.75rem 2rem', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <img src="/logo.png" alt="SupportSphere AI" className="brand-logo-img" />
          <h1 style={{ margin: 0, fontSize: '1.65rem' }}>Automated Knowledge Base &amp; Routine Query Deflector</h1>
        </div>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem', maxWidth: '850px' }}>
          Resolves common and routine customer inquiries instantly without human agent queue delays. Routine inquiries (passwords, tracking, refund policies, FAQs) are automatically detected and served with step-by-step verified resolutions.
        </p>
      </div>

      {/* Analytics Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.2rem', textAlign: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Active KB Articles</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>{stats.totalArticles}</div>
          <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 500 }}>{stats.routineArticles} routine self-serviceable</span>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.2rem', textAlign: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Routine Deflection Rate</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a', marginTop: '0.25rem' }}>{stats.routineDeflectionRate}</div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Zero human queue wait</span>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.2rem', textAlign: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Avg Deflection Speed</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0284c7', marginTop: '0.25rem' }}>&lt; 1.2s</div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Instant resolution delivery</span>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.2rem', textAlign: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Customer Satisfaction</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#8b5cf6', marginTop: '0.25rem' }}>{stats.satisfactionRate}%</div>
          <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>Based on {stats.totalViews} views</span>
        </div>
      </div>

      {/* Routine Query Deflection Sandbox */}
      <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '1.25rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', fontSize: '1.1rem' }}>
          ⚡ Test Instant Query Matching &amp; Deflection
        </h3>
        <p style={{ margin: '0 0 0.85rem 0', color: '#64748b', fontSize: '0.88rem' }}>
          Type any routine query to see how the automated knowledge base matches keywords, estimates confidence, and offers instant solutions before a ticket enters an agent queue.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            placeholder="e.g. How do I reset my password and login? or Where is my package tracking number?"
            style={{ flex: 1, padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleTestRoutineQuery(); }}
          />
          <button
            type="button"
            className="primary-button"
            onClick={handleTestRoutineQuery}
            style={{ whiteSpace: 'nowrap' }}
          >
            Match Knowledge Base
          </button>
        </div>

        {testResult && (
          <div style={{ marginTop: '1rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>{testResult.isRoutineSolvable ? '🤖' : 'ℹ️'}</span>
                <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{testResult.article.title}</strong>
              </div>
              <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, background: testResult.isRoutineSolvable ? '#dcfce7' : '#e0f2fe', color: testResult.isRoutineSolvable ? '#166534' : '#0369a1' }}>
                {testResult.isRoutineSolvable ? 'Instant Deflection (Solvable)' : 'Related Guidance'}
              </span>
            </div>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#475569' }}>
              {testResult.explanation}
            </p>
            <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.85rem', color: '#334155' }}>
                {testResult.article.solution}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Main Catalog View */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '1.5rem' }}>
        {/* Left Side: Article List & Search */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="Search knowledge base articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
            />

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '0.3rem 0.6rem',
                    borderRadius: '16px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    border: '1px solid #cbd5e1',
                    background: selectedCategory === cat ? '#0284c7' : '#fff',
                    color: selectedCategory === cat ? '#fff' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '550px', overflowY: 'auto' }}>
            {filteredArticles.map((article) => (
              <div
                key={article.id}
                onClick={() => setActiveArticle(article)}
                style={{
                  background: activeArticle?.id === article.id ? '#f0f9ff' : '#ffffff',
                  border: activeArticle?.id === article.id ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#0284c7', textTransform: 'uppercase' }}>{article.category}</span>
                  {article.isRoutine && (
                    <span style={{ fontSize: '0.7rem', color: '#16a34a', background: '#dcfce7', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>
                      Routine Auto-Solve
                    </span>
                  )}
                </div>
                <h4 style={{ margin: '0.3rem 0', fontSize: '0.9rem', color: '#0f172a' }}>{article.title}</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{article.summary}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Article Detail Inspector */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {activeArticle ? (
            <>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>
                    {activeArticle.id} • {activeArticle.category}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    👁️ {activeArticle.viewCount} views • 👍 {activeArticle.helpfulCount} found helpful
                  </span>
                </div>
                <h2 style={{ margin: '0 0 0.4rem 0', fontSize: '1.25rem', color: '#0f172a' }}>{activeArticle.title}</h2>
                <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem' }}>{activeArticle.summary}</p>
              </div>

              <div>
                <h3 style={{ fontSize: '0.95rem', color: '#1e293b', marginBottom: '0.5rem' }}>Step-by-Step Resolution Guide</h3>
                <div style={{ background: '#f8fafc', padding: '1.1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.88rem', color: '#334155', lineHeight: 1.55 }}>
                    {activeArticle.solution}
                  </pre>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Keywords:</span>
                {activeArticle.keywords.map((kw, i) => (
                  <span key={i} style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.72rem', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                    {kw}
                  </span>
                ))}
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#475569' }}>Was this resolution helpful?</span>
                {feedbackGiven[activeArticle.id] ? (
                  <span style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 600 }}>Thank you for your feedback!</span>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="secondary-button"
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                      onClick={() => handleFeedback(activeArticle.id, true)}
                    >
                      👍 Yes, Solved My Issue
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                      onClick={() => handleFeedback(activeArticle.id, false)}
                    >
                      👎 No, Need Agent
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p style={{ color: '#64748b' }}>Select an article to view details.</p>
          )}
        </div>
      </div>
    </div>
  );
}

