import { useState, useCallback } from 'react';
import { RULES } from '../lib/rulesData';
import { SequenceAnimation, OffsideWidget, RuleQuiz } from '../lib/rulesPitch';
import ZlatanPanel from './ZlatanPanel';
import { getZlatanComment } from '../lib/api';

/* ─── Geometric decorations (shared with LandingPage) ─── */

function CircleRing({ size, stroke = 'rgba(255,255,255,0.07)', style }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ position: 'absolute', pointerEvents: 'none', ...style }}>
      <circle cx={size/2} cy={size/2} r={size/2-1} fill="none" stroke={stroke} strokeWidth="1" />
    </svg>
  );
}

function CrossMark({ color = 'rgba(255,255,255,0.2)', size = 12, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12"
      style={{ position: 'absolute', pointerEvents: 'none', ...style }}>
      <line x1="6" y1="0" x2="6" y2="12" stroke={color} strokeWidth="1" />
      <line x1="0" y1="6" x2="12" y2="6" stroke={color} strokeWidth="1" />
    </svg>
  );
}

function DotGrid({ cols = 8, rows = 6, gap = 28, color = 'rgba(0,0,0,0.1)', style }) {
  const dots = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      dots.push(<circle key={`${r}-${c}`} cx={c*gap+2} cy={r*gap+2} r="1.5" fill={color} />);
  return (
    <svg width={cols*gap} height={rows*gap}
      style={{ position: 'absolute', pointerEvents: 'none', ...style }}>
      {dots}
    </svg>
  );
}

/* ─── Rule card in grid ──────────────────────────────────── */

function RuleCard({ rule, index, onClick }) {
  return (
    <button className="rp2-card" onClick={onClick} style={{ '--rc-color': rule.color }}>
      <div className="rp2-card-num">{String(index + 1).padStart(2, '0')}</div>
      <div className="rp2-card-icon">{rule.icon}</div>
      <div className="rp2-card-title">{rule.title}</div>
      <div className="rp2-card-short">{rule.short}</div>
      <div className="rp2-card-cta">Learn more →</div>
    </button>
  );
}

/* ─── Rule detail (full-page version) ───────────────────── */

function RuleDetail({ rule, prevRule, nextRule, onBack, onNavigate }) {
  return (
    <div className="rp2-detail">
      {/* Hero */}
      <div className="rp2-detail-hero" style={{ '--rc-color': rule.color }}>
        <CircleRing size={400} style={{ right: -80, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
        <CrossMark color="rgba(10,207,131,0.4)" size={16} style={{ left: '44%', top: '20%' }} />
        <button className="rp2-back-btn" onClick={onBack}>← All Rules</button>
        <div className="rp2-detail-icon">{rule.icon}</div>
        <h2 className="rp2-detail-title">{rule.title}</h2>
        <p className="rp2-detail-subtitle">{rule.short}</p>
      </div>

      {/* Content */}
      <div className="rp2-detail-body">
        <div className="rp2-detail-layout">
          {/* Explanation */}
          <div>
            <h3 className="rp2-section-title" style={{ borderColor: rule.color }}>The Rule</h3>
            <ul className="rd-explanation">
              {rule.explanation.map((text, i) => (
                <li key={i} style={i === 0 ? { borderLeft: `3px solid ${rule.color}` } : {}}>
                  {i > 0 && <span className="rd-bullet" style={{ background: rule.color }} />}
                  {text}
                </li>
              ))}
            </ul>
          </div>

          {/* Animation */}
          <div>
            <h3 className="rp2-section-title" style={{ borderColor: rule.color }}>
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
          <div className="rp2-quiz-section" style={{ borderColor: rule.color }}>
            <h3 className="rp2-section-title" style={{ borderColor: rule.color }}>Test Yourself</h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20, marginTop: -4 }}>
              Answer the questions below to check your understanding.
            </p>
            <RuleQuiz quiz={rule.quiz} ruleColor={rule.color} />
          </div>
        )}

        {/* Prev / Next pager */}
        <div className="rp2-pager">
          {prevRule ? (
            <button className="rp2-pager-btn" onClick={() => onNavigate(prevRule.id)}>
              ← {prevRule.title}
            </button>
          ) : <div />}
          {nextRule && (
            <button className="rp2-pager-btn rp2-pager-next" onClick={() => onNavigate(nextRule.id)}>
              {nextRule.title} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main RulesPage ─────────────────────────────────────── */

export default function RulesPage({ onBack, onGoToApp }) {
  const [selectedId, setSelectedId]     = useState(null);
  const [zlatanComment, setZlatanComment] = useState('');
  const [zlatanLoading, setZlatanLoading] = useState(false);
  const [zlatanEvent, setZlatanEvent]     = useState('rules');

  const selectedIndex = RULES.findIndex(r => r.id === selectedId);
  const selectedRule  = selectedIndex >= 0 ? RULES[selectedIndex] : null;
  const prevRule      = selectedIndex > 0 ? RULES[selectedIndex - 1] : null;
  const nextRule      = selectedIndex < RULES.length - 1 ? RULES[selectedIndex + 1] : null;

  const triggerZlatan = useCallback(async (rule) => {
    setZlatanEvent('rules');
    setZlatanLoading(true);
    setZlatanComment('');
    try {
      const data = await getZlatanComment('rules', {
        rule_title: rule.title,
        rule_short: rule.short,
      });
      setZlatanComment(data.comment ?? '');
    } catch {
      setZlatanComment('Zlatan has read every rule of football. Twice.');
    } finally {
      setZlatanLoading(false);
    }
  }, []);

  const selectRule = (id) => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setSelectedId(id);
    const rule = RULES.find(r => r.id === id);
    if (rule) triggerZlatan(rule);
  };

  const backToGrid = () => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setSelectedId(null);
  };

  return (
    <div className="rp2-root">

      {/* ── Sticky nav ── */}
      <nav className="rp2-nav">
        <div className="rp2-nav-left">
          {onBack && (
            <button className="rp2-nav-back" onClick={onBack}>← Home</button>
          )}
          <span className="rp2-nav-logo">⚽ The Special Replay</span>
        </div>
        {onGoToApp && (
          <button className="rp2-nav-cta" onClick={onGoToApp}>Try The Special Replay →</button>
        )}
      </nav>

      {selectedRule ? (
        <RuleDetail
          rule={selectedRule}
          prevRule={prevRule}
          nextRule={nextRule}
          onBack={backToGrid}
          onNavigate={selectRule}
        />
      ) : (
        <>
          {/* ── Hero ── */}
          <section className="rp2-hero">
            <CircleRing size={600} style={{ right: -120, top: '50%', transform: 'translateY(-50%)' }} />
            <CircleRing size={300} style={{ right: 150, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            <CrossMark color="rgba(10,207,131,0.5)" size={16} style={{ left: '42%', top: '28%' }} />
            <CrossMark color="rgba(255,255,255,0.2)" size={12} style={{ left: '18%', bottom: '32%' }} />
            <CrossMark color="rgba(255,255,255,0.15)" size={10} style={{ right: '38%', top: '22%' }} />

            <div className="rp2-hero-inner">
              <div className="rp2-hero-label">
                <span>Laws of the Game</span>
                <span className="rp2-hero-label-line" />
                <span>{RULES.length} rules</span>
              </div>
              <h1 className="rp2-h1">
                KNOW
                <br />
                <span className="rp2-h1-outline">THE</span>
                <br />
                RULES.
              </h1>
              <p className="rp2-hero-sub">
                Animated diagrams, interactive demos, and quick quizzes for every major rule.
              </p>
              <button className="rp2-hero-scroll" onClick={() => {
                document.getElementById('rp2-grid')?.scrollIntoView({ behavior: 'smooth' });
              }}>
                Browse rules ↓
              </button>
            </div>
          </section>

          {/* ── Rule grid ── */}
          <section id="rp2-grid" className="rp2-grid-section">
            <DotGrid cols={10} rows={8} gap={32} color="rgba(0,0,0,0.07)"
              style={{ top: 40, right: 60 }} />
            <div className="rp2-grid-header">
              <h2 className="rp2-grid-title">Choose a Rule</h2>
              <p className="rp2-grid-sub">Select any rule to see the full explanation, animation, and quiz.</p>
            </div>
            <div className="rp2-grid">
              {RULES.map((rule, i) => (
                <RuleCard key={rule.id} rule={rule} index={i} onClick={() => selectRule(rule.id)} />
              ))}
            </div>
          </section>
        </>
      )}

      <ZlatanPanel
        comment={zlatanComment}
        loading={zlatanLoading}
        event={zlatanEvent}
      />
    </div>
  );
}
