import { useState, useEffect } from 'react';
import { RULES } from '../lib/rulesData';
import { SequenceAnimation, OffsideWidget, RuleQuiz } from '../lib/rulesPitch';

// ── Rule Card (in list view) ────────────────────────────────────────────────

function RuleCard({ rule, index, onClick }) {
  return (
    <button className="rc-card" onClick={onClick} style={{ '--rc-color': rule.color }}>
      <div className="rc-visual">
        <span className="rc-number">{String(index + 1).padStart(2, '0')}</span>
        <span className="rc-icon">{rule.icon}</span>
      </div>
      <div className="rc-body">
        <h3 className="rc-title">{rule.title}</h3>
        <p className="rc-short">{rule.short}</p>
        <span className="rc-cta">Learn more →</span>
      </div>
    </button>
  );
}

// ── Rule Detail view ────────────────────────────────────────────────────────

function RuleDetail({ rule, prevRule, nextRule, onBack, onNavigate }) {
  return (
    <div>
      {/* Hero */}
      <div className="rd-hero" style={{ '--rc-color': rule.color }}>
        <button className="rd-back" onClick={onBack}>← All Rules</button>
        <span className="rd-icon">{rule.icon}</span>
        <h2 className="rd-title">{rule.title}</h2>
        <p className="rd-subtitle">{rule.short}</p>
      </div>

      <div style={{ padding: '24px 24px 32px' }}>
        {/* Two-column layout */}
        <div className="rd-layout">
          {/* Explanation */}
          <div>
            <h3 className="rd-section-title" style={{ borderColor: rule.color }}>The Rule</h3>
            <ul className="rd-explanation">
              {rule.explanation.map((text, i) => (
                <li key={i} style={i === 0 ? { borderLeft: `3px solid ${rule.color}` } : {}}>
                  {i > 0 && <span className="rd-bullet" style={{ background: rule.color }} />}
                  {text}
                </li>
              ))}
            </ul>
          </div>

          {/* Animation/diagram */}
          <div>
            <h3 className="rd-section-title" style={{ borderColor: rule.color }}>
              {rule.animation?.type === 'interactive' ? 'Interactive Demo' : 'See It In Action'}
            </h3>
            {rule.animation?.type === 'interactive'
              ? <OffsideWidget />
              : <SequenceAnimation animation={rule.animation || { players: [], steps: [] }} />
            }
          </div>
        </div>

        {/* Quiz */}
        {rule.quiz?.length > 0 && (
          <div className="rd-quiz-section" style={{ borderColor: rule.color }}>
            <h3 className="rd-section-title" style={{ borderColor: rule.color }}>Test Yourself</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, marginTop: -4 }}>
              Answer the questions below to check your understanding.
            </p>
            <RuleQuiz quiz={rule.quiz} ruleColor={rule.color} />
          </div>
        )}

        {/* Prev / Next */}
        <div className="rd-pager">
          {prevRule ? (
            <button className="rd-pager-btn" onClick={() => onNavigate(prevRule.id)}>
              ← {prevRule.title}
            </button>
          ) : <div />}
          {nextRule && (
            <button className="rd-pager-btn rd-pager-next" onClick={() => onNavigate(nextRule.id)}>
              {nextRule.title} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main RulesModal ─────────────────────────────────────────────────────────

export default function RulesModal({ onClose }) {
  const [selectedId, setSelectedId] = useState(null);

  const selectedIndex = RULES.findIndex(r => r.id === selectedId);
  const selectedRule  = selectedIndex >= 0 ? RULES[selectedIndex] : null;
  const prevRule      = selectedIndex > 0 ? RULES[selectedIndex - 1] : null;
  const nextRule      = selectedIndex < RULES.length - 1 ? RULES[selectedIndex + 1] : null;

  const handleNavigate = (id) => setSelectedId(id);

  // Close on Escape
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <>
      <div className="rm-backdrop" onClick={onClose} />
      <div className="rm-overlay" role="dialog" aria-modal="true">
        <div className="rm-modal">
          {/* Modal header */}
          <div className="rm-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {selectedRule && (
                <button className="rm-back-sm" onClick={() => setSelectedId(null)}>←</button>
              )}
              <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>
                {selectedRule ? selectedRule.title : '📋 Football Rules'}
              </span>
              {!selectedRule && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{RULES.length} rules</span>
              )}
            </div>
            <button className="rm-close" onClick={onClose} aria-label="Close">×</button>
          </div>

          {/* Scrollable body */}
          <div className="rm-body">
            {selectedRule ? (
              <RuleDetail
                rule={selectedRule}
                prevRule={prevRule}
                nextRule={nextRule}
                onBack={() => setSelectedId(null)}
                onNavigate={handleNavigate}
              />
            ) : (
              <div style={{ padding: '20px 20px 28px' }}>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
                  Master the Laws of the Game — animated diagrams, interactive demos, and quick quizzes for every major rule.
                </p>
                <div className="rm-grid">
                  {RULES.map((rule, i) => (
                    <RuleCard key={rule.id} rule={rule} index={i} onClick={() => setSelectedId(rule.id)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
