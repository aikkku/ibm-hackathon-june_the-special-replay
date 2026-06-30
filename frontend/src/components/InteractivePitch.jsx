import { useRef, useState, useCallback } from 'react';
import PitchMarkings from './PitchMarkings';
import { TEAM_COLORS } from '../lib/data';

const ACTIONS = [
  { id: 'pass',  label: 'Pass',  icon: '↗', color: 'var(--brand-purple)', desc: 'Click a teammate' },
  { id: 'shoot', label: 'Shoot', icon: '⚽', color: 'var(--brand-green)',  desc: 'Toward goal' },
  { id: 'carry', label: 'Carry', icon: '▶', color: 'var(--brand-orange)', desc: '10m forward' },
  { id: 'hold',  label: 'Hold',  icon: '⬡', color: 'var(--brand-blue)',   desc: 'Hold position' },
];

function toSVGCoords(e, svgEl) {
  const pt = svgEl.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const svgPt = pt.matrixTransform(svgEl.getScreenCTM().inverse());
  return {
    x: Math.max(0, Math.min(120, svgPt.x)),
    y: Math.max(0, Math.min(80, svgPt.y)),
  };
}

export default function InteractivePitch({
  players, ball, onUpdatePlayer, onUpdateBall, revealed,
  predictionMovements = [],
  ghostPlayers = null,
  onSelectionChange, onActionsChange,
  offsideInfo = null,
  onAddPlayer,
  playerAssignments = {},
  placingTeam = null,
  onPlacingTeamChange,
}) {
  const svgRef = useRef(null);
  const [selected, setSelected]     = useState(null);
  const [dragging, setDragging]     = useState(null); // 'ball' | player.id | null
  const [passMode, setPassMode]     = useState(false);
  const [playerActions, setActions] = useState({});   // id → {type, targetId?}

  const _setSelected = (v) => { setSelected(v); onSelectionChange?.(v); };
  const _setActions  = (fn) => {
    setActions(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn;
      onActionsChange?.(next);
      return next;
    });
  };

  /* ── Drag helpers ── */
  const handlePointerMove = useCallback((e) => {
    if (!dragging || !svgRef.current) return;
    e.preventDefault();
    const { x, y } = toSVGCoords(e, svgRef.current);
    if (dragging === 'ball') {
      onUpdateBall(x, y);
    } else {
      onUpdatePlayer(dragging, x, y);
    }
  }, [dragging, onUpdatePlayer, onUpdateBall]);

  const handlePointerUp = useCallback((e) => {
    if (svgRef.current?.hasPointerCapture?.(e.pointerId)) {
      svgRef.current.releasePointerCapture(e.pointerId);
    }
    setDragging(null);
  }, []);

  const startDrag = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    svgRef.current.setPointerCapture(e.pointerId);
    setDragging(id);
  };

  /* ── Player click / pass-target ── */
  const handlePlayerDown = (e, player) => {
    if (passMode && selected !== null && player.id !== selected) {
      _setActions(prev => ({ ...prev, [selected]: { type: 'pass', targetId: player.id } }));
      setPassMode(false);
      return;
    }
    _setSelected(player.id);
    startDrag(e, player.id);
  };

  const handleBallDown = (e) => {
    _setSelected(null);
    setPassMode(false);
    startDrag(e, 'ball');
  };

  /* ── Action bar callbacks ── */
  const applyAction = (type) => {
    if (type === 'pass') {
      setPassMode(true);
      return;
    }
    _setActions(prev => ({ ...prev, [selected]: { type } }));
    if (type !== 'hold') setPassMode(false);
  };

  const clearAction = () => {
    _setActions(prev => { const n = { ...prev }; delete n[selected]; return n; });
    _setSelected(null);
    setPassMode(false);
  };

  /* ── Carry target: 12 units forward (clamped) ── */
  const carryTarget = (p) => ({
    x: Math.min(118, p.x + 12),
    y: p.y,
  });

  const selectedPlayer = players.find(p => p.id === selected);

  // Ball distance helpers
  const distToBall = (p) => ball
    ? Math.sqrt((p.x - ball.x) ** 2 + (p.y - ball.y) ** 2)
    : Infinity;
  const BALL_THRESHOLD = 8;  // StatsBomb units — "has the ball" (generous for CV inaccuracy)
  const ballCarrierId = players.reduce((best, p) => {
    const d = distToBall(p);
    return (!best || d < distToBall(players.find(x => x.id === best))) ? p.id : best;
  }, null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Pass-mode hint banner */}
      {passMode && (
        <div style={{
          background: 'rgba(162,89,255,0.12)', border: '1.5px solid var(--brand-purple)',
          borderRadius: 8, padding: '8px 16px', fontSize: 13,
          color: 'var(--brand-purple)', fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 8, animation: 'fade-in 0.2s ease',
        }}>
          <span>↗</span>
          Click a teammate to set the pass target
          <button onClick={() => setPassMode(false)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand-purple)', fontSize: 16 }}
          >×</button>
        </div>
      )}

      {/* Place-mode hint banner */}
      {placingTeam !== null && (
        <div style={{
          background: placingTeam === 'ref' ? 'rgba(170,170,170,0.1)' : placingTeam === 0 ? 'rgba(26,188,254,0.1)' : 'rgba(242,78,30,0.1)',
          border: `1.5px solid ${placingTeam === 'ref' ? '#aaa' : placingTeam === 0 ? '#1abcfe' : '#f24e1e'}`,
          borderRadius: 8, padding: '8px 16px', fontSize: 13,
          color: placingTeam === 'ref' ? '#aaa' : placingTeam === 0 ? '#1abcfe' : '#f24e1e',
          fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, animation: 'fade-in 0.2s ease',
        }}>
          <span>+</span>
          Click anywhere on the pitch to place the new player
          <button onClick={() => onPlacingTeamChange?.(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16,
              color: placingTeam === 'ref' ? '#aaa' : placingTeam === 0 ? '#1abcfe' : '#f24e1e' }}
          >×</button>
        </div>
      )}

      {/* ── SVG Pitch ── */}
      <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', boxShadow: '0 12px 40px rgba(15,15,20,0.18)' }}>
        <svg
          ref={svgRef}
          viewBox="-4 -2.5 128 85"
          style={{ width: '100%', display: 'block', cursor: dragging ? 'grabbing' : 'default', touchAction: 'none' }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <defs>
            {/* Arrow markers */}
            <marker id="arrow-pass" viewBox="0 0 8 8" refX="7" refY="4"
              markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 8 4 L 0 8 Z" fill="#a259ff" opacity="0.9" />
            </marker>
            <marker id="arrow-shoot" viewBox="0 0 8 8" refX="7" refY="4"
              markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 8 4 L 0 8 Z" fill="#0acf83" opacity="0.9" />
            </marker>
            <marker id="arrow-carry" viewBox="0 0 8 8" refX="7" refY="4"
              markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 8 4 L 0 8 Z" fill="#f24e1e" opacity="0.9" />
            </marker>
            <marker id="arrow-pred" viewBox="0 0 8 8" refX="7" refY="4"
              markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 8 4 L 0 8 Z" fill="#fbbf24" opacity="0.95" />
            </marker>

            {/* Glow filter for selected player */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <PitchMarkings />

          {/* ── Offside lines ── */}
          {offsideInfo?.lines.map((ln, i) => {
            const color = TEAM_COLORS[ln.team]?.fill ?? '#ff6b35';
            return (
              <g key={`ofs-line-${i}`} style={{ pointerEvents: 'none' }}>
                <line x1={ln.x} y1={-2} x2={ln.x} y2={82}
                  stroke={color} strokeWidth={0.5} strokeDasharray="2 1.5" opacity={0.65}
                />
                <rect x={ln.x + 0.5} y={-1.8} width={10} height={2.2} rx={0.5}
                  fill={color} opacity={0.18}
                />
                <text x={ln.x + 1} y={-0.2}
                  fontSize={1.3} fill={color} fontFamily="Inter,sans-serif"
                  fontWeight="800" opacity={0.8} style={{ userSelect: 'none' }}
                >OFFSIDE</text>
              </g>
            );
          })}

          {/* ── Place-mode click layer (behind everything else) ── */}
          {placingTeam !== null && (
            <rect x={-4} y={-2.5} width={128} height={85} fill="rgba(255,255,255,0.03)"
              style={{ cursor: 'crosshair' }}
              onPointerDown={(e) => {
                e.stopPropagation();
                const { x, y } = toSVGCoords(e, svgRef.current);
                onAddPlayer?.(placingTeam === 'ref' ? null : placingTeam, x, y);
                onPlacingTeamChange?.(null);
              }}
            />
          )}

          {/* ── Action arrows ── */}
          {players.map(p => {
            const act = playerActions[p.id];
            if (!act) return null;

            if (act.type === 'pass') {
              const target = players.find(t => t.id === act.targetId);
              if (!target) return null;
              return (
                <line key={`pass-${p.id}`}
                  x1={p.x} y1={p.y} x2={target.x} y2={target.y}
                  stroke="#a259ff" strokeWidth={0.6}
                  strokeDasharray="3 1.5"
                  markerEnd="url(#arrow-pass)"
                  style={{ strokeDashoffset: 200, animation: 'arrow-draw 0.5s ease forwards' }}
                />
              );
            }
            if (act.type === 'shoot') {
              const goalX = act.goalSide === 'left' ? 0 : 120;
              return (
                <line key={`shoot-${p.id}`}
                  x1={p.x} y1={p.y} x2={goalX} y2={40}
                  stroke="#0acf83" strokeWidth={0.6}
                  strokeDasharray="3 1.5"
                  markerEnd="url(#arrow-shoot)"
                  style={{ strokeDashoffset: 200, animation: 'arrow-draw 0.5s ease forwards' }}
                />
              );
            }
            if (act.type === 'carry') {
              const ct = carryTarget(p);
              return (
                <line key={`carry-${p.id}`}
                  x1={p.x} y1={p.y} x2={ct.x} y2={ct.y}
                  stroke="#f24e1e" strokeWidth={0.6}
                  strokeDasharray="3 1.5"
                  markerEnd="url(#arrow-carry)"
                  style={{ strokeDashoffset: 200, animation: 'arrow-draw 0.5s ease forwards' }}
                />
              );
            }
            if (act.type === 'hold') {
              return (
                <circle key={`hold-${p.id}`}
                  cx={p.x} cy={p.y} r={3}
                  fill="none" stroke="#1abcfe" strokeWidth={0.5}
                  strokeDasharray="1.5 1"
                />
              );
            }
            return null;
          })}

          {/* ── Ghost players (original positions during scenario playback) ── */}
          {ghostPlayers && ghostPlayers.map(p => {
            const colors = TEAM_COLORS[p.team] || { fill: '#aaa' };
            const isRevealed = !revealed || revealed.includes(p.id);
            if (!isRevealed) return null;
            return (
              <g key={`ghost-${p.id}`} style={{ pointerEvents: 'none' }}>
                {/* Ghost shadow */}
                <ellipse cx={p.x + 0.3} cy={p.y + 1.6} rx={1.4} ry={0.4}
                  fill="rgba(0,0,0,0.1)" />
                {/* Ghost ring */}
                <circle cx={p.x} cy={p.y} r={2.0}
                  fill="none"
                  stroke={colors.fill}
                  strokeWidth={0.5}
                  strokeDasharray="1.2 0.8"
                  opacity={0.35}
                />
                {/* Ghost label */}
                <text x={p.x} y={p.y + 0.65}
                  textAnchor="middle" fontSize={1.3}
                  fontFamily="Inter, sans-serif" fontWeight="700"
                  fill={colors.fill} opacity={0.3}
                  style={{ userSelect: 'none' }}
                >
                  {p.label}
                </text>
              </g>
            );
          })}

          {/* ── Prediction movement arrows ── */}
          {predictionMovements.map((m, i) => (
            <g key={`pred-${i}`} style={{ animation: 'arrow-draw 0.7s ease forwards', animationDelay: `${i * 0.15}s` }}>
              <line
                x1={m.from[0]} y1={m.from[1]} x2={m.to[0]} y2={m.to[1]}
                stroke="#fbbf24" strokeWidth={0.7} strokeDasharray="2.5 1.5" opacity={0.85}
                markerEnd="url(#arrow-pred)"
              />
              {/* Endpoint ghost marker */}
              <circle cx={m.to[0]} cy={m.to[1]} r={1.2}
                fill="rgba(251,191,36,0.25)" stroke="#fbbf24" strokeWidth={0.35}
              />
            </g>
          ))}

          {/* ── Ball ── */}
          {ball && (
            <g onPointerDown={handleBallDown} style={{ cursor: 'grab' }}>
              {/* Dashed line to nearest player when they're not right on it */}
              {ballCarrierId && distToBall(players.find(p => p.id === ballCarrierId)) > BALL_THRESHOLD && (
                <line
                  x1={ball.x} y1={ball.y}
                  x2={players.find(p => p.id === ballCarrierId)?.x ?? ball.x}
                  y2={players.find(p => p.id === ballCarrierId)?.y ?? ball.y}
                  stroke="rgba(255,255,255,0.18)" strokeWidth={0.4}
                  strokeDasharray="1.5 1"
                />
              )}
              <circle cx={ball.x} cy={ball.y} r={1.6}
                fill="white" stroke="rgba(0,0,0,0.15)" strokeWidth={0.25} />
              <circle cx={ball.x} cy={ball.y} r={0.55}
                fill="#222" opacity={0.7} />
            </g>
          )}

          {/* ── Players ── */}
          {players.map((player, idx) => {
            const colors = TEAM_COLORS[player.team] || { fill: '#aaa', stroke: '#888' };
            const isSelected = selected === player.id;
            const isPassTarget = Object.values(playerActions).some(
              a => a.type === 'pass' && a.targetId === player.id
            );
            const isPassCandidate = passMode && player.team === selectedPlayer?.team && player.id !== selected;
            const isRevealed = !revealed || revealed.includes(player.id);
            const isOffside = offsideInfo?.offsideIds.includes(player.id);

            if (!isRevealed) return null;

            return (
              <g
                key={player.id}
                onPointerDown={e => handlePlayerDown(e, player)}
                style={{
                  cursor: passMode && player.team === selectedPlayer?.team && player.id !== selected
                    ? 'crosshair'
                    : 'grab',
                  animation: `dotBounce 0.5s cubic-bezier(0.34,1.56,0.64,1) ${idx * 0.08}s both`,
                }}
              >
                {/* Selection ring */}
                {isSelected && (
                  <>
                    <circle cx={player.x} cy={player.y} r={3.4}
                      fill="rgba(162,89,255,0.08)"
                      stroke="#a259ff"
                      strokeWidth={0.55}
                    />
                    <circle cx={player.x} cy={player.y} r={2.8}
                      fill="none"
                      stroke="#a259ff"
                      strokeWidth={0.4}
                      strokeDasharray="1.8 1"
                      opacity={0.7}
                    />
                  </>
                )}

                {/* Pass candidate highlight */}
                {isPassCandidate && (
                  <circle cx={player.x} cy={player.y} r={3.2}
                    fill="rgba(162,89,255,0.15)"
                    stroke="#a259ff"
                    strokeWidth={0.5}
                    strokeDasharray="1.5 1"
                  />
                )}

                {/* Pass target ring */}
                {isPassTarget && (
                  <circle cx={player.x} cy={player.y} r={2.8}
                    fill="none"
                    stroke="#a259ff"
                    strokeWidth={0.5}
                  />
                )}

                {/* Shadow */}
                <ellipse cx={player.x + 0.3} cy={player.y + 1.6}
                  rx={1.4} ry={0.4}
                  fill="rgba(0,0,0,0.25)"
                />

                {/* Offside indicator */}
                {isOffside && (
                  <>
                    <circle cx={player.x} cy={player.y} r={3.1}
                      fill="rgba(255,51,51,0.12)" stroke="#ff3333"
                      strokeWidth={0.55} strokeDasharray="1.5 0.8"
                    />
                    <polygon
                      points={`${player.x},${player.y - 4.8} ${player.x - 1},${player.y - 3} ${player.x + 1},${player.y - 3}`}
                      fill="#ff3333" opacity={0.95}
                    />
                  </>
                )}

                {/* Main dot */}
                <circle
                  cx={player.x} cy={player.y} r={2.0}
                  fill={isSelected ? '#a259ff' : colors.fill}
                  stroke="white"
                  strokeWidth={0.4}
                  filter={isSelected ? 'url(#glow)' : undefined}
                />

                {/* Keeper ring */}
                {player.isKeeper && (
                  <circle cx={player.x} cy={player.y} r={2.4}
                    fill="none" stroke={colors.fill} strokeWidth={0.35} opacity={0.7}
                  />
                )}

                {/* Label */}
                <text
                  x={player.x} y={player.y + 0.65}
                  textAnchor="middle"
                  fontSize={1.45}
                  fontFamily="Inter, sans-serif"
                  fontWeight="700"
                  fill="white"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {player.label}
                </text>

                {/* Assigned real player name badge */}
                {playerAssignments[player.id] && (
                  <text
                    x={player.x} y={player.y - 3.2}
                    textAnchor="middle"
                    fontSize={1.3}
                    fontFamily="Inter, sans-serif"
                    fontWeight="700"
                    fill="#0acf83"
                    opacity={0.9}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {playerAssignments[player.id].name.split(' ').pop().slice(0, 9)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Drag hint overlay (shown briefly) */}
        {players.length > 0 && !dragging && !selected && (
          <div style={{
            position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(15,15,20,0.7)',
            color: 'white', fontSize: 11, fontWeight: 500,
            padding: '5px 12px', borderRadius: 999, letterSpacing: '0.02em',
            pointerEvents: 'none',
          }}>
            Drag players · Click to assign action
          </div>
        )}
      </div>

      {/* ── Action Bar (appears when player selected) ── */}
      {selectedPlayer && !passMode && (() => {
        const dist = distToBall(selectedPlayer);
        const hasBall = dist <= BALL_THRESHOLD;
        const distLabel = hasBall
          ? '● Has ball'
          : `${dist.toFixed(1)} units away`;
        const distColor = hasBall ? '#07a365' : dist < 15 ? 'rgba(244,243,238,0.4)' : '#c33310';

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, animation: 'fade-in 0.18s ease' }}>
            <div style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: dist < 15 ? 12 : '12px 12px 0 0',
              padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            }}>
              {/* Player info + distance badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 4 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: TEAM_COLORS[selectedPlayer.team]?.fill,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: 'white',
                }}>
                  {selectedPlayer.label}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedPlayer.name ?? selectedPlayer.label}</div>
                  <div style={{ fontSize: 10, color: distColor, fontWeight: 600 }}>
                    {distLabel}
                  </div>
                </div>
              </div>

              <div style={{ width: 1, height: 32, background: 'var(--border)', flexShrink: 0 }} />

              {/* Action buttons */}
              {ACTIONS.map(a => {
                const currentAction = playerActions[selected];
                const isActive = currentAction?.type === a.id;
                const needsRun = dist >= 15 && a.id !== 'hold';
                return (
                  <button
                    key={a.id}
                    onClick={() => applyAction(a.id)}
                    title={needsRun ? `Player will sprint to ball first (${dist.toFixed(0)} units)` : ''}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                      padding: '8px 12px',
                      background: isActive ? a.color : 'var(--bg-alt)',
                      color: isActive ? 'white' : 'var(--text)',
                      border: `1.5px solid ${isActive ? a.color : 'var(--border)'}`,
                      borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                      minWidth: 56, opacity: 1,
                      position: 'relative',
                    }}
                  >
                    <span style={{ fontSize: 15 }}>{a.icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 600 }}>{a.label}</span>
                    {needsRun && (
                      <span style={{ fontSize: 8, color: isActive ? 'rgba(255,255,255,0.75)' : '#d97706', fontWeight: 600 }}>
                        run first
                      </span>
                    )}
                    {a.id === 'pass' && !needsRun && (
                      <span style={{ fontSize: 9, color: isActive ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>
                        click target
                      </span>
                    )}
                  </button>
                );
              })}

              <button
                onClick={clearAction}
                style={{
                  marginLeft: 'auto', padding: '6px 12px',
                  background: 'none', border: '1.5px solid var(--border)',
                  borderRadius: 8, cursor: 'pointer', fontSize: 12,
                  color: 'var(--text-muted)', fontWeight: 500,
                }}
              >
                Done ×
              </button>

              {/* ── Shot options ── */}
              {playerActions[selected]?.type === 'shoot' && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 2 }}>
                  {/* Goal selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Goal:</span>
                    {[
                      { id: 'left',  label: '← Left goal' },
                      { id: 'right', label: 'Right goal →' },
                    ].map(g => {
                      const isActive = (playerActions[selected]?.goalSide ?? 'right') === g.id;
                      return (
                        <button key={g.id}
                          onClick={() => _setActions(prev => ({ ...prev, [selected]: { ...prev[selected], goalSide: g.id } }))}
                          style={{
                            flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 600,
                            borderRadius: 7, border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
                            background: isActive ? '#0acf83' : 'var(--bg-alt)',
                            borderColor: isActive ? '#0acf83' : 'var(--border)',
                            color: isActive ? 'white' : 'var(--text-muted)',
                          }}
                        >
                          {g.label}
                        </button>
                      );
                    })}
                  </div>
                  {/* Aim zone */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Aim:</span>
                    {[
                      { id: 'left',   label: '← Post' },
                      { id: 'center', label: '· Centre' },
                      { id: 'right',  label: 'Post →' },
                    ].map(zone => {
                      const isActive = (playerActions[selected]?.zone ?? 'center') === zone.id;
                      return (
                        <button key={zone.id}
                          onClick={() => _setActions(prev => ({ ...prev, [selected]: { ...prev[selected], zone: zone.id } }))}
                          style={{
                            flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 600,
                            borderRadius: 7, border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
                            background: isActive ? 'var(--bg-alt)' : 'transparent',
                            borderColor: isActive ? 'var(--brand-green)' : 'var(--border)',
                            color: isActive ? 'var(--brand-green)' : 'var(--text-muted)',
                          }}
                        >
                          {zone.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Pass style selector ── */}
              {playerActions[selected]?.type === 'pass' && playerActions[selected]?.targetId != null && (
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 2 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Style:</span>
                  {[
                    { id: 'feet',   label: '⬤ To feet' },
                    { id: 'behind', label: '↗ Into space' },
                  ].map(style => {
                    const isActive = (playerActions[selected]?.passStyle ?? 'feet') === style.id;
                    return (
                      <button key={style.id}
                        onClick={() => _setActions(prev => ({ ...prev, [selected]: { ...prev[selected], passStyle: style.id } }))}
                        style={{
                          flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 600,
                          borderRadius: 7, border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
                          background: isActive ? 'var(--brand-purple)' : 'var(--bg-alt)',
                          borderColor: isActive ? 'var(--brand-purple)' : 'var(--border)',
                          color: isActive ? 'white' : 'var(--text-muted)',
                        }}
                      >
                        {style.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Run-to-ball warning strip */}
            {!hasBall && dist >= 15 && (
              <div style={{
                background: 'rgba(217,119,6,0.08)',
                border: '1px solid rgba(217,119,6,0.25)',
                borderTop: 'none',
                borderRadius: '0 0 12px 12px',
                padding: '7px 16px',
                fontSize: 11, color: '#b45309', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span>⚠</span>
                This player must sprint {dist.toFixed(0)} units to reach the ball first — the AI will account for the extra movement and time.
              </div>
            )}
          </div>
        );
      })()}

      {/* Legend + Add Player */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', paddingLeft: 4, flexWrap: 'wrap' }}>
        {Object.entries(TEAM_COLORS).map(([id, c]) => (
          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: c.fill, border: '1.5px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{c.label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'white', border: '1.5px solid #ccc', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Ball</span>
        </div>
      </div>

    </div>
  );
}
