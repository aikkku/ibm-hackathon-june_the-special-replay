import { useState, useEffect, useRef } from 'react';
import { getPrediction } from '../lib/api';

const OUTCOMES = {
  'Goal':             { bg: 'rgba(10,207,131,0.12)', color: '#07a365', icon: '⚽' },
  'Good Chance':      { bg: 'rgba(10,207,131,0.08)', color: '#0aaf70', icon: '🎯' },
  'Dangerous Attack': { bg: 'rgba(242,78,30,0.10)',  color: '#c33310', icon: '⚡' },
  'Possession Lost':  { bg: 'rgba(255,114,98,0.12)', color: '#b83a2e', icon: '❌' },
  'Safe Play':        { bg: 'rgba(110,110,120,0.10)','color': '#6e6e78', icon: '🛡️' },
};

export default function PredictionPanel({ players, ball, selectedId, playerActions, onMovements, onPlay, isPlaying, playerAssignments, onPredictionResult }) {
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState(null);
  const [typed, setTyped]       = useState('');
  const typeTimer = useRef(null);

  const action = selectedId !== null ? playerActions[selectedId] : null;
  const actor  = players.find(p => p.id === selectedId);
  const hasAction = !!action;

  // clear result when selection changes
  useEffect(() => {
    setResult(null);
    setError(null);
    setTyped('');
    clearInterval(typeTimer.current);
  }, [selectedId]);

  function typeOut(text) {
    clearInterval(typeTimer.current);
    let i = 0;
    setTyped('');
    typeTimer.current = setInterval(() => {
      i++;
      setTyped(text.slice(0, i));
      if (i >= text.length) clearInterval(typeTimer.current);
    }, 16);
  }

  async function handlePredict() {
    if (!hasAction || loading) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setTyped('');

    try {
      // Convert playerAssignments keys to strings (JSON obj keys are always strings)
      const assignments = playerAssignments
        ? Object.fromEntries(Object.entries(playerAssignments).map(([k, v]) => [String(k), v]))
        : null;
      const data = await getPrediction({
        players: players.map(p => ({ ...p })),
        ball,
        actor_id: selectedId,
        action: action.type,
        pass_target_id: action.targetId ?? null,
        shot_zone: action.zone ?? null,
        pass_style: action.passStyle ?? null,
        goal_side: action.goalSide ?? null,
        player_assignments: assignments,
      });
      setResult(data);
      typeOut(data.explanation || '');
      onPredictionResult?.(data);
      if (data.movements?.length > 0 && onMovements) {
        onMovements(data.movements);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const outcomeStyle = result
    ? (OUTCOMES[result.outcome] || OUTCOMES['Safe Play'])
    : null;

  const actionLabel = action
    ? action.type === 'pass'
      ? `${actor?.label ?? 'P'} → Pass`
      : action.type === 'shoot'
      ? `${actor?.label ?? 'P'} → Shoot`
      : action.type === 'carry'
      ? `${actor?.label ?? 'P'} → Carry`
      : `${actor?.label ?? 'P'} → Hold`
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* ── Trigger button ── */}
      <button
        className={`btn ${hasAction ? 'btn-purple' : 'btn-ghost'}`}
        onClick={handlePredict}
        disabled={!hasAction || loading}
        style={{ justifyContent: 'center', opacity: hasAction ? 1 : 0.5 }}
      >
        {loading ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-block', animation: 'pulse-ring 1s ease infinite', fontSize: 14 }}>◌</span>
            Consulting IBM Granite…
          </span>
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>◈</span>
            {hasAction ? `Predict: ${actionLabel}` : 'Select a player + action first'}
          </span>
        )}
      </button>

      {/* ── Error ── */}
      {error && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(255,114,98,0.08)',
          border: '1px solid rgba(255,114,98,0.25)',
          borderRadius: 8, fontSize: 12, color: '#b83a2e',
        }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Result card ── */}
      {result && (
        <div className="card" style={{ padding: 16, animation: 'fade-in 0.3s ease' }}>

          {/* Outcome + source row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 13px', borderRadius: 999,
              background: outcomeStyle.bg, color: outcomeStyle.color,
              fontWeight: 700, fontSize: 13,
            }}>
              <span>{outcomeStyle.icon}</span> {result.outcome}
            </div>

            {result.xg_estimate != null && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                xG <strong style={{ color: 'var(--text)' }}>{(result.xg_estimate * 100).toFixed(0)}%</strong>
              </div>
            )}

            <div style={{
              marginLeft: 'auto',
              fontSize: 10, fontWeight: 700,
              padding: '3px 9px', borderRadius: 999,
              background: result.source === 'granite' || result.source === 'gemini'
                ? 'rgba(162,89,255,0.12)'
                : 'rgba(110,110,120,0.1)',
              color: result.source === 'granite' || result.source === 'gemini'
                ? '#7a30e0'
                : '#6e6e78',
              letterSpacing: '0.04em',
            }}>
              {result.source === 'granite' || result.source === 'gemini' ? '◈ IBM Granite'
               : '◈ Local Engine'}
            </div>
          </div>

          {/* Explanation (typed out) */}
          <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text)', margin: '0 0 0 0' }}>
            {typed}
            <span style={{
              opacity: typed.length < (result.explanation || '').length ? 1 : 0,
              borderRight: '2px solid var(--brand-purple)',
              marginLeft: 1,
            }}>
              {' '}
            </span>
          </p>

          {/* Movements list */}
          {result.movements?.length > 0 && typed.length >= (result.explanation || '').length && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', animation: 'fade-in 0.4s ease' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 8 }}>
                PREDICTED MOVEMENTS
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {result.movements.map((m, i) => (
                  <div key={i} style={{
                    fontSize: 11, padding: '4px 9px', borderRadius: 6,
                    background: m.team === 0 ? 'rgba(26,188,254,0.1)' : 'rgba(242,78,30,0.1)',
                    color: m.team === 0 ? '#0895c9' : '#c33310',
                  }}>
                    <strong>{m.label}</strong> — {m.reason}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Play scenario button ── */}
      {result && result.movements?.length > 0 && typed.length >= (result.explanation || '').length && (
        <button
          className="btn btn-orange"
          onClick={() => onPlay?.({
            movements: result.movements,
            ballEnd:   result.ball_end ?? null,
            action:    action?.type,
            actorId:   selectedId,
            targetId:  action?.targetId ?? null,
            shotZone:  action?.zone ?? null,
            passStyle: action?.passStyle ?? null,
            goalSide:  action?.goalSide ?? 'right',
          })}
          disabled={isPlaying}
          style={{ justifyContent: 'center', width: '100%', gap: 8 }}
        >
          {isPlaying ? (
            <>
              <span style={{ display: 'inline-block', animation: 'pulse-ring 0.8s ease infinite' }}>◉</span>
              Playing scenario…
            </>
          ) : (
            <>
              <span style={{ fontSize: 16 }}>▶</span>
              Play Scenario on Pitch
            </>
          )}
        </button>
      )}
    </div>
  );
}
