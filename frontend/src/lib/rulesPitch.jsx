/**
 * Shared pitch animation and quiz components.
 * Used by both RulesModal (overlay) and RulesPage (full page).
 */
import { useState, useRef, useEffect, useCallback } from 'react';

// ── Pitch SVG background ────────────────────────────────────────────
export function PitchBackground() {
  const lc = "rgba(255,255,255,0.85)";
  const lw = "0.4";
  return (
    <g className="rp-markings" fill="none" stroke={lc} strokeWidth={lw}>
      <rect x={1} y={1} width={98} height={62} />
      <line x1={50} y1={1} x2={50} y2={63} />
      <circle cx={50} cy={32} r={8} />
      <circle cx={50} cy={32} r={0.5} fill={lc} stroke="none" />
      <rect x={1} y={12} width={16} height={40} />
      <rect x={1} y={22} width={6} height={20} />
      <path d="M 17 22 A 8 8 0 0 1 17 42" />
      <circle cx={12} cy={32} r={0.5} fill={lc} stroke="none" />
      <rect x={-1} y={27} width={2} height={10} fill={lc} stroke="none" />
      <rect x={83} y={12} width={16} height={40} />
      <rect x={93} y={22} width={6} height={20} />
      <path d="M 83 22 A 8 8 0 0 0 83 42" />
      <circle cx={88} cy={32} r={0.5} fill={lc} stroke="none" />
      <rect x={99} y={27} width={2} height={10} fill={lc} stroke="none" />
      <path d="M 1 4 A 3 3 0 0 1 4 1" />
      <path d="M 96 1 A 3 3 0 0 1 99 4" />
      <path d="M 99 60 A 3 3 0 0 1 96 63" />
      <path d="M 4 63 A 3 3 0 0 1 1 60" />
    </g>
  );
}

export function PlayerMarker({ player, pos }) {
  return (
    <g className={`rp-player rp-team-${player.team}`} transform={`translate(${pos.x},${pos.y})`}>
      <circle className="rp-disc" r={3} />
      {player.label && <text className="rp-label" y={0.2}>{player.label}</text>}
    </g>
  );
}

export function BallMarker({ pos }) {
  return (
    <g className="rp-ball">
      <circle cx={pos.x} cy={pos.y} r={1.3} />
    </g>
  );
}

// ── Sequence animation ──────────────────────────────────────────────
export function SequenceAnimation({ animation }) {
  const { players = [], steps = [] } = animation;

  const initPos = useCallback(() => {
    const p = {};
    players.forEach(pl => { p[pl.id] = { x: pl.x, y: pl.y }; });
    return p;
  }, [players]);

  const [positions, setPositions] = useState(initPos);
  const [caption, setCaption]     = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef(null);

  const reset = useCallback(() => {
    clearTimeout(timerRef.current);
    setIsPlaying(false);
    setPositions(initPos());
    setCaption('');
  }, [initPos]);

  const play = useCallback(() => {
    if (isPlaying) return;
    setIsPlaying(true);
    setPositions(initPos());
    setCaption('▶ Watch closely…');
    const run = (idx) => {
      if (idx >= steps.length) { setIsPlaying(false); return; }
      const step = steps[idx];
      setCaption(step.caption || '');
      if (step.positions && Object.keys(step.positions).length > 0) {
        setPositions(prev => {
          const next = { ...prev };
          Object.entries(step.positions).forEach(([id, [x, y]]) => { next[id] = { x, y }; });
          return next;
        });
      }
      timerRef.current = setTimeout(() => run(idx + 1), step.duration || 1500);
    };
    run(0);
  }, [isPlaying, steps, initPos]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const hasSteps = steps.length > 0;
  const conceptual = "This rule is about timing and officiating rather than player movement — read the explanation alongside the quiz!";

  return (
    <div className="rp-widget">
      <svg className="rp-pitch" viewBox="0 0 100 64">
        <PitchBackground />
        {players.map(pl => pl.team === 'ball'
          ? <BallMarker key={pl.id} pos={positions[pl.id] ?? { x: pl.x, y: pl.y }} />
          : <PlayerMarker key={pl.id} player={pl} pos={positions[pl.id] ?? { x: pl.x, y: pl.y }} />
        )}
      </svg>
      <div className="rp-caption">
        {caption || (!hasSteps ? conceptual : 'Press Play to watch the animation.')}
      </div>
      {hasSteps && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-green" onClick={play} disabled={isPlaying} style={{ flex: 1 }}>
            {isPlaying ? '▶ Playing…' : '▶ Play'}
          </button>
          <button className="btn btn-ghost" onClick={reset} disabled={!caption && !isPlaying}>
            ↺ Replay
          </button>
        </div>
      )}
    </div>
  );
}

// ── Offside interactive widget ──────────────────────────────────────
export function OffsideWidget() {
  const svgRef     = useRef(null);
  const dragging   = useRef(false);

  const initial = {
    gk:        { id: "gk",       team: "away", label: "GK", x: 95, y: 32 },
    defender1: { id: "d1",       team: "away", label: "4",  x: 72, y: 22 },
    defender2: { id: "d2",       team: "away", label: "5",  x: 68, y: 44 },
    passer:    { id: "passer",   team: "home", label: "8",  x: 55, y: 40 },
    ball:      { id: "ball",     team: "ball", label: "",   x: 55, y: 32 },
    attacker:  { id: "attacker", team: "home", label: "9",  x: 60, y: 24 },
  };

  const rb = (mn, mx) => Math.round((Math.random() * (mx - mn) + mn) * 10) / 10;
  const cl = (v, mn, mx) => Math.max(mn, Math.min(mx, v));

  const [state, setState] = useState(initial);

  // Avoids getScreenCTM() which forces a layout reflow on every mousemove.
  const toSvg = (e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 60, y: 24 };
    const rect = svg.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 64,
    };
  };

  const onDown = (e) => { dragging.current = true; e.preventDefault(); };

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      e.preventDefault();
      const { x, y } = toSvg(e);
      setState(p => ({ ...p, attacker: { ...p.attacker, x: cl(x,30,98), y: cl(y,4,60) } }));
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  const offsideX = Math.max(state.ball.x, state.defender1.x, state.defender2.x);
  const isOffside = state.attacker.x > offsideX;

  const randomize = () => {
    const d1x = rb(62,80), d1y = rb(14,30);
    const d2x = rb(58,80), d2y = rb(34,52);
    const bx  = rb(45,65), by  = rb(20,44);
    setState({ ...initial,
      defender1: { ...initial.defender1, x: d1x, y: d1y },
      defender2: { ...initial.defender2, x: d2x, y: d2y },
      passer:    { ...initial.passer, x: bx, y: cl(by+6,4,60) },
      ball:      { ...initial.ball, x: bx, y: by },
      attacker:  { ...initial.attacker, x: rb(55,75), y: rb(10,56) },
    });
  };

  return (
    <div className="rp-widget">
      <svg ref={svgRef} className="rp-pitch" viewBox="0 0 100 64" style={{ touchAction: 'none' }}>
        <PitchBackground />
        <line x1={offsideX} y1={1} x2={offsideX} y2={63}
          stroke="#f0b429" strokeWidth={0.5} strokeDasharray="2 1.5" />
        {[state.gk, state.defender1, state.defender2, state.passer].map(pl =>
          <PlayerMarker key={pl.id} player={pl} pos={{ x: pl.x, y: pl.y }} />
        )}
        <BallMarker pos={{ x: state.ball.x, y: state.ball.y }} />
        <g className="rp-player rp-team-home rp-draggable"
          transform={`translate(${state.attacker.x},${state.attacker.y})`}
          onMouseDown={onDown} onTouchStart={onDown}>
          <circle className="rp-disc" r={3.2} />
          <text className="rp-label" y={0.2}>{state.attacker.label}</text>
        </g>
      </svg>
      <div className={`rp-offside-verdict ${isOffside ? 'is-offside' : 'is-onside'}`}>
        {isOffside
          ? '🚩 OFFSIDE — the attacker is ahead of both the ball and the last defender.'
          : '✅ ONSIDE — the attacker is level with or behind the offside line.'}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-green" onClick={randomize} style={{ flex: 1 }}>↺ New Scenario</button>
        <button className="btn btn-ghost" onClick={() => setState(initial)}>Reset</button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
        Drag the red attacker (9) left and right to test the offside rule
      </p>
    </div>
  );
}

// ── Quiz engine ─────────────────────────────────────────────────────
const LETTERS = ['A', 'B', 'C', 'D'];

export function RuleQuiz({ quiz, ruleColor }) {
  const [idx, setIdx]           = useState(0);
  const [score, setScore]       = useState(0);
  const [results, setResults]   = useState([]);
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [selected, setSelected] = useState(null);
  const [done, setDone]         = useState(false);

  if (!quiz?.length) return (
    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No quiz available yet.</p>
  );

  const q   = quiz[idx];
  const pct = Math.round((idx / quiz.length) * 100);

  const select = (i) => {
    if (answered) return;
    const correct = i === q.correct;
    setAnswered(true); setSelected(i);
    setFeedback({ correct, explanation: q.explanation });
    setScore(s => correct ? s + 1 : s);
    setResults(r => { const n = [...r]; n[idx] = correct; return n; });
  };

  const goNext = () => {
    if (idx < quiz.length - 1) {
      setIdx(i => i + 1); setAnswered(false); setFeedback(null); setSelected(null);
    } else { setDone(true); }
  };

  const retake = () => {
    setIdx(0); setScore(0); setResults([]); setAnswered(false);
    setFeedback(null); setSelected(null); setDone(false);
  };

  if (done) {
    const perfect = score === quiz.length, good = score >= Math.ceil(quiz.length / 2);
    return (
      <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
        <div className="rq-progress">
          {quiz.map((_,i) => <span key={i} className={`rq-dot ${results[i] ? 'rq-correct' : 'rq-incorrect'}`} />)}
          <div className="rq-bar"><div className="rq-bar-fill" style={{ width: '100%', background: ruleColor }} /></div>
        </div>
        <div style={{ fontSize: 36, marginBottom: 8 }}>{perfect ? '🏆' : good ? '⚽' : '📖'}</div>
        <div style={{ fontFamily: 'var(--font-head)', fontSize: 36, fontWeight: 700, color: ruleColor, marginBottom: 6 }}>
          {score} / {quiz.length}
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
          {perfect ? "Perfect score — you've nailed this rule!"
            : good ? 'Good effort! Re-read the explanation above to lock it in.'
            : 'Worth another look — scroll up, re-read the rule, then try again.'}
        </p>
        <button className="btn btn-ghost" onClick={retake}>↺ Retake quiz</button>
      </div>
    );
  }

  return (
    <div>
      <div className="rq-progress">
        {quiz.map((_,i) => (
          <span key={i} className={`rq-dot ${i===idx?'rq-active':''} ${results[i]===true?'rq-correct':''} ${results[i]===false?'rq-incorrect':''}`}
            style={i===idx ? { background: ruleColor } : {}}
          />
        ))}
        <div className="rq-bar">
          <div className="rq-bar-fill" style={{ width: pct+'%', background: ruleColor }} />
        </div>
      </div>
      <p className="rq-question">{idx + 1}. {q.question}</p>
      <div className="rq-options">
        {q.options.map((opt, i) => {
          let cls = 'rq-option';
          if (answered) {
            if (i === q.correct) cls += ' rq-is-correct';
            else if (i === selected) cls += ' rq-is-incorrect';
          }
          return (
            <button key={i} className={cls} onClick={() => select(i)} disabled={answered}>
              <span className="rq-letter">{LETTERS[i] || i+1}</span>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>
      {feedback && (
        <div className={`rq-feedback ${feedback.correct ? 'rq-fb-correct' : 'rq-fb-incorrect'}`}>
          <strong>{feedback.correct ? '✅ Correct!' : '❌ Not quite.'}</strong>{' '}
          {feedback.explanation}
        </div>
      )}
      {answered && (
        <button className="btn btn-green" onClick={goNext} style={{ width:'100%', justifyContent:'center', marginTop: 4 }}>
          {idx < quiz.length-1 ? 'Next question →' : 'See results →'}
        </button>
      )}
    </div>
  );
}
