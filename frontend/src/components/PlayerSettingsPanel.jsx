import { TEAM_COLORS } from '../lib/data';

const SECTION = ({ label }) => (
  <div style={{
    fontSize: 9, fontWeight: 700, letterSpacing: '0.18em',
    color: 'rgba(244,243,238,0.45)', marginBottom: 8,
    fontFamily: 'var(--font-head)',
  }}>{label}</div>
);

const Btn = ({ active, color = '#0acf83', onClick, children, danger }) => (
  <button onClick={onClick} style={{
    flex: 1,
    padding: '8px 6px', borderRadius: 8, cursor: 'pointer',
    fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-head)',
    transition: 'all 0.15s', border: '1.5px solid',
    borderColor: danger
      ? (active ? 'rgba(255,85,85,0.7)' : 'rgba(255,85,85,0.3)')
      : (active ? color : 'rgba(255,255,255,0.15)'),
    background: danger
      ? (active ? 'rgba(255,85,85,0.18)' : 'rgba(255,85,85,0.06)')
      : (active ? `${color}22` : 'rgba(255,255,255,0.05)'),
    color: danger
      ? (active ? '#ff6b6b' : 'rgba(255,100,100,0.7)')
      : (active ? color : 'rgba(244,243,238,0.65)'),
  }}>
    {children}
  </button>
);

export default function PlayerSettingsPanel({
  selectedPlayer,
  playerAssignments = {},
  onUpdatePlayerMeta,
  onDeletePlayer,
  onSearchPlayer,
  onClearAssignment,
  placingTeam,
  onPlacingTeamChange,
  phase,
}) {
  const assignment = selectedPlayer ? playerAssignments[selectedPlayer.id] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingTop: 4 }}>

      {/* ── Player Settings ── */}
      {selectedPlayer ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'fade-in 0.2s ease' }}>

          <SECTION label="PLAYER SETTINGS" />

          {/* Selected player card */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '9px 11px', borderRadius: 10,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: TEAM_COLORS[selectedPlayer.team]?.fill ?? '#aaa',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, color: 'white',
            }}>
              {selectedPlayer.label || (selectedPlayer.is_referee ? 'R' : 'P')}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#f4f3ee', fontFamily: 'var(--font-head)' }}>
                {selectedPlayer.name || selectedPlayer.label || 'Player'}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(244,243,238,0.55)', marginTop: 1 }}>
                {selectedPlayer.is_referee ? 'Referee'
                  : selectedPlayer.is_keeper ? 'Goalkeeper'
                  : selectedPlayer.team === 0 ? 'Team A' : 'Team B'}
              </div>
            </div>
          </div>

          {/* Team */}
          <div>
            <SECTION label="TEAM" />
            <div style={{ display: 'flex', gap: 5 }}>
              <Btn
                active={selectedPlayer.team === 0 && !selectedPlayer.is_referee}
                color="#1abcfe"
                onClick={() => onUpdatePlayerMeta?.(selectedPlayer.id, { team: 0, is_referee: false })}
              >Team A</Btn>
              <Btn
                active={selectedPlayer.team === 1 && !selectedPlayer.is_referee}
                color="#f24e1e"
                onClick={() => onUpdatePlayerMeta?.(selectedPlayer.id, { team: 1, is_referee: false })}
              >Team B</Btn>
              <Btn
                active={!!selectedPlayer.is_referee}
                color="#aaa"
                onClick={() => onUpdatePlayerMeta?.(selectedPlayer.id, { team: null, is_referee: true, label: 'REF' })}
              >Ref</Btn>
            </div>
          </div>

          {/* Role */}
          {!selectedPlayer.is_referee && (
            <div>
              <SECTION label="ROLE" />
              <div style={{ display: 'flex', gap: 5 }}>
                <Btn
                  active={!selectedPlayer.is_keeper}
                  color="#0acf83"
                  onClick={() => onUpdatePlayerMeta?.(selectedPlayer.id, { is_keeper: false, label: '' })}
                >Player</Btn>
                <Btn
                  active={!!selectedPlayer.is_keeper}
                  color="#0acf83"
                  onClick={() => onUpdatePlayerMeta?.(selectedPlayer.id, { is_keeper: true, label: 'GK' })}
                >Goalkeeper</Btn>
              </div>
            </div>
          )}

          {/* Real player assignment */}
          <div>
            <SECTION label="REAL PLAYER" />
            {assignment ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{
                  padding: '8px 11px', borderRadius: 8,
                  background: 'rgba(10,207,131,0.08)',
                  border: '1px solid rgba(10,207,131,0.25)',
                }}>
                  {assignment.photo && (
                    <img src={assignment.photo} width={28} height={28}
                      style={{ borderRadius: '50%', float: 'right', marginLeft: 6 }}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  )}
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0acf83', marginBottom: 2 }}>
                    {assignment.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(10,207,131,0.7)' }}>
                    {assignment.team} · {assignment.position}
                    {assignment.rating && ` · R${assignment.rating}`}
                  </div>
                  {assignment.stats && (
                    <div style={{ marginTop: 5, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {[
                        ['G', assignment.stats.goals_total],
                        ['A', assignment.stats.goals_assists],
                        ['PA', assignment.stats.passes_accuracy != null ? `${assignment.stats.passes_accuracy}%` : null],
                      ].filter(([, v]) => v != null).map(([k, v]) => (
                        <span key={k} style={{
                          fontSize: 9, padding: '1px 5px', borderRadius: 4,
                          background: 'rgba(10,207,131,0.15)',
                          color: 'rgba(10,207,131,0.85)',
                        }}>{k} {v}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => onClearAssignment?.(selectedPlayer.id)} style={{
                  padding: '5px 0', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7,
                  background: 'transparent', color: 'rgba(244,243,238,0.45)',
                  fontFamily: 'var(--font-head)',
                }}>Remove assignment</button>
              </div>
            ) : (
              <button onClick={() => onSearchPlayer?.(selectedPlayer)} style={{
                width: '100%', padding: '8px 0', fontSize: 11, fontWeight: 700,
                borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                border: '1.5px solid rgba(10,207,131,0.35)',
                background: 'rgba(10,207,131,0.07)',
                color: '#0acf83', fontFamily: 'var(--font-head)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <span style={{ fontSize: 13 }}>◉</span> Assign Real Player
              </button>
            )}
          </div>

          {/* Delete */}
          <div style={{ display: 'flex' }}>
            <Btn danger active onClick={() => onDeletePlayer?.(selectedPlayer.id)}>
              🗑 Remove player
            </Btn>
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />
        </div>
      ) : (
        /* No player selected — How it works */
        <div style={{ marginBottom: 14 }}>
          <SECTION label="HOW IT WORKS" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { icon: '▶', title: 'Play video',    body: 'Load a clip or import from YouTube' },
              { icon: '⏸', title: 'Pause moment',  body: 'Stop at the frame you want to analyse' },
              { icon: '⚡', title: 'Extract',       body: 'AI maps every player to the 2D pitch' },
              { icon: '◈', title: 'Predict',        body: 'IBM Granite forecasts the tactical outcome' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                  background: 'rgba(10,207,131,0.1)', border: '1px solid rgba(10,207,131,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, color: '#0acf83',
                }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(244,243,238,0.88)', marginBottom: 2 }}>{s.title}</div>
                  <div style={{ fontSize: 10, color: 'rgba(244,243,238,0.52)', lineHeight: 1.5 }}>{s.body}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        </div>
      )}

      {/* ── Add Players (always shown when extracted) ── */}
      {phase === 'done' && (
        <div style={{ paddingTop: selectedPlayer ? 4 : 0 }}>
          <SECTION label="ADD TO PITCH" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[
              { team: 0,     label: '+ Team A player', color: '#1abcfe' },
              { team: 1,     label: '+ Team B player', color: '#f24e1e' },
              { team: 'ref', label: '+ Referee',        color: '#aaa' },
            ].map(t => {
              const isActive = placingTeam === t.team;
              return (
                <button
                  key={String(t.team)}
                  onClick={() => onPlacingTeamChange?.(isActive ? null : t.team)}
                  style={{
                    padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                    fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-head)',
                    transition: 'all 0.15s', border: '1.5px solid',
                    borderColor: isActive ? t.color : 'rgba(255,255,255,0.12)',
                    background: isActive ? `${t.color}20` : 'rgba(255,255,255,0.04)',
                    color: isActive ? t.color : 'rgba(244,243,238,0.62)',
                    display: 'flex', alignItems: 'center', gap: 7,
                  }}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: isActive ? t.color : 'rgba(255,255,255,0.2)',
                    display: 'inline-block',
                  }} />
                  {isActive ? 'Click pitch to place' : t.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom IBM label */}
      {!selectedPlayer && (
        <div style={{
          marginTop: 'auto', paddingTop: 20,
          fontSize: 9, color: 'rgba(244,243,238,0.22)',
          fontFamily: 'var(--font-head)', fontWeight: 600, letterSpacing: '0.12em',
        }}>
          IBM GRANITE
        </div>
      )}
    </div>
  );
}
