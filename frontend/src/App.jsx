import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import InteractivePitch from './components/InteractivePitch';
import ExtractionView from './components/ExtractionView';
import PredictionPanel from './components/PredictionPanel';
import PlayerSearchModal from './components/PlayerSearchModal';
import PlayerSettingsPanel from './components/PlayerSettingsPanel';
import ZlatanPanel from './components/ZlatanPanel';
import { MOMENTS, MOMENT_DATA } from './lib/data';
import { fetchClips, extractFrame, prewarmClip, getZlatanComment } from './lib/api';

async function refreshClips() {
  try { return await fetchClips(); } catch { return null; }
}

const SCAN_DURATION   = 1400;   // ms for scanline sweep
const DETECT_INTERVAL = 400;    // ms between each player popping onto pitch

export default function App({ onBack, onGoToRules }) {
  // ── Moment / clip state ──────────────────────────────────────────────────
  const [momentId, setMomentId]   = useState('counter_attack');
  const [phase, setPhase]         = useState('idle');   // idle | scanning | done
  const [revealedIds, setRevealed] = useState([]);
  const [players, setPlayers]     = useState(MOMENT_DATA['counter_attack'].players);
  const [ball, setBall]           = useState(MOMENT_DATA['counter_attack'].ball);

  // ── Backend clips (if server is running) ────────────────────────────────
  const [clips, setClips]             = useState([]);
  const [selectedClip, setSelectedClip] = useState(null);  // clip object from backend
  const [backendLive, setBackendLive] = useState(false);
  const videoRef = useRef(null);

  // ── Prediction state (lifted from InteractivePitch) ───────────────────
  const [selectedId, setSelectedId]       = useState(null);
  const [playerActions, setPlayerActions] = useState({});
  const [predMovements, setPredMovements] = useState([]);

  // ── Extraction error (shown in panel; null when no error) ────────────
  const [extractError, setExtractError] = useState(null);

  // ── Radar image from sports library (ground-truth pitch view) ────────
  const [radarImage, setRadarImage] = useState(null);

  // ── Player real-stats assignments ─────────────────────────────────────
  const [playerAssignments, setPlayerAssignments] = useState({});  // pitchPlayerId → real player data
  const [searchModalFor, setSearchModalFor] = useState(null);      // pitchPlayer obj or null

  // ── Place-mode (lifted from InteractivePitch so left panel can control it) ──
  const [placingTeam, setPlacingTeam] = useState(null);  // null | 0 | 1 | 'ref'

  // ── Zlatan Granitevic assistant ───────────────────────────────────────
  const [zlatanComment, setZlatanComment] = useState(null);
  const [zlatanLoading, setZlatanLoading] = useState(false);
  const [zlatanEvent, setZlatanEvent]     = useState(null);
  const zlatanDebounce = useRef(null);

  // ── Scenario animation ────────────────────────────────────────────────
  const [animPlayers, setAnimPlayers] = useState(null);  // interpolated positions during playback
  const [animBall, setAnimBall]       = useState(null);
  const [ghostPlayers, setGhostPlayers] = useState(null); // faded originals during playback
  const [isPlaying, setIsPlaying]     = useState(false);
  const animRef     = useRef(null);
  const playersSnap = useRef(null);

  // Always-current refs so handlePlayScenario can chain from animated positions
  // without needing players/ball in its deps (which would re-create on every frame).
  const livePlayersRef = useRef(players);
  const liveBallRef    = useRef(ball);
  useEffect(() => { livePlayersRef.current = animPlayers ?? players; }, [animPlayers, players]);
  useEffect(() => { liveBallRef.current    = animBall    ?? ball;    }, [animBall,    ball]);

  // ── Offside detection toggle ──────────────────────────────────────────────
  const [showOffside, setShowOffside] = useState(false);

  const offsideInfo = useMemo(() => {
    if (!showOffside) return null;
    const livePlayers = animPlayers ?? players;
    const liveBall    = animBall    ?? ball;
    if (!livePlayers || livePlayers.length < 6 || !liveBall) return null;

    const nonRef = livePlayers.filter(p => !p.is_referee);
    const team0  = nonRef.filter(p => p.team === 0);
    const team1  = nonRef.filter(p => p.team === 1);
    if (team0.length < 3 || team1.length < 3) return null;

    const avgX0 = team0.reduce((s, p) => s + p.x, 0) / team0.length;
    const avgX1 = team1.reduce((s, p) => s + p.x, 0) / team1.length;
    // team0 attacks right when it sits on the left half (lower avgX)
    const t0Right = avgX0 < avgX1;

    const secondLast = (group, right) => {
      const sorted = [...group].sort((a, b) => right ? b.x - a.x : a.x - b.x);
      return sorted.length >= 2 ? sorted[1].x : null;
    };

    const line0 = secondLast(team1, t0Right);   // trap for team0 attackers
    const line1 = secondLast(team0, !t0Right);  // trap for team1 attackers

    const ids0 = line0 != null ? team0.filter(p => !p.is_keeper && (
      t0Right ? p.x > line0 && p.x > liveBall.x : p.x < line0 && p.x < liveBall.x
    )).map(p => p.id) : [];

    const ids1 = line1 != null ? team1.filter(p => !p.is_keeper && (
      !t0Right ? p.x > line1 && p.x > liveBall.x : p.x < line1 && p.x < liveBall.x
    )).map(p => p.id) : [];

    const offsideIds = [...new Set([...ids0, ...ids1])];
    const lines = [
      line0 != null ? { x: line0, team: 0 } : null,
      line1 != null ? { x: line1, team: 1 } : null,
    ].filter(Boolean);

    return { lines, offsideIds, count: offsideIds.length };
  }, [showOffside, animPlayers, players, animBall, ball]);

  const moment     = MOMENTS.find(m => m.id === momentId);
  const momentData = MOMENT_DATA[momentId];

  // ── Try to connect to backend on mount ──────────────────────────────────
  useEffect(() => {
    fetchClips()
      .then(data => {
        setClips(data);
        setBackendLive(true);
        // Start warming the first clip immediately so it's ready when user picks it
        if (data.length > 0) prewarmClip(data[0].name);
      })
      .catch(() => setBackendLive(false));
  }, []);

  // ── Switch demo moment (resets everything) ────────────────────────────
  const switchMoment = (id) => {
    if (phase === 'scanning') return;
    setMomentId(id);
    setPhase('idle');
    setRevealed([]);
    setPlayers(MOMENT_DATA[id].players);
    setBall(MOMENT_DATA[id].ball);
    setSelectedId(null);
    setPlayerActions({});
    setPredMovements([]);
    setSelectedClip(null);
  };

  // ── Zlatan comment trigger (defined early so all callbacks can reference it) ──
  const triggerZlatan = useCallback(async (event, context = {}) => {
    setZlatanLoading(true);
    setZlatanComment(null);
    setZlatanEvent(event);
    try {
      const data = await getZlatanComment(event, context);
      setZlatanComment(data.comment);
    } catch {
      // Silently ignore — Zlatan wouldn't want us to panic
    } finally {
      setZlatanLoading(false);
    }
  }, []);

  // ── Animate player reveal (shared by demo + real extraction) ─────────
  const animateReveal = useCallback((playerList) => {
    const ids = playerList.map(p => p.id);
    ids.forEach((id, i) => {
      setTimeout(() => {
        setRevealed(prev => [...prev, id]);
        if (i === ids.length - 1) {
          setTimeout(() => setPhase('done'), 300);
        }
      }, SCAN_DURATION + i * DETECT_INTERVAL);
    });
  }, []);

  // ── DEMO extraction (no backend needed) ──────────────────────────────
  const handleDemoExtract = useCallback(() => {
    if (phase === 'scanning') return;
    setPhase('scanning');
    setRevealed([]);
    setPredMovements([]);
    setSelectedId(null);
    setPlayerActions({});
    setPlayers(MOMENT_DATA[momentId].players);
    setBall(MOMENT_DATA[momentId].ball);
    animateReveal(MOMENT_DATA[momentId].players);
    const mData = MOMENT_DATA[momentId];
    setTimeout(() => {
      triggerZlatan('extraction', {
        player_count: mData.players.length,
        is_demo: true,
        moment_name: MOMENTS.find(m => m.id === momentId)?.label,
      });
    }, 1600);
  }, [momentId, phase, animateReveal, triggerZlatan]);

  // ── REAL extraction (backend CV pipeline) ────────────────────────────
  const handleRealExtract = useCallback(async (clipName, timestampMs) => {
    if (phase === 'scanning') return;
    setPhase('scanning');
    setRevealed([]);
    setPredMovements([]);
    setSelectedId(null);
    setPlayerActions({});
    setExtractError(null);

    try {
      const result = await extractFrame(clipName, timestampMs);
      setPlayers(result.players);
      if (result.ball) setBall(result.ball);
      if (result.radar_image) setRadarImage(result.radar_image);
      animateReveal(result.players);
      setTimeout(() => {
        triggerZlatan('extraction', {
          player_count: result.players.length,
          clip_name: clipName,
        });
      }, 1600);
    } catch (e) {
      console.error('Extraction failed:', e);
      setExtractError(e.message);
      setPhase('idle'); // return to idle so user can retry
    }
  }, [momentId, phase, animateReveal, triggerZlatan]);

  // ── Choose extraction path ────────────────────────────────────────────
  const handleExtract = useCallback((clipName, timestampMs) => {
    if (clipName && timestampMs != null) {
      handleRealExtract(clipName, timestampMs);
    } else {
      handleDemoExtract();
    }
  }, [handleDemoExtract, handleRealExtract]);

  // ── Drag callbacks ───────────────────────────────────────────────────
  const updatePlayer = useCallback((id, x, y) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, x, y } : p));
    setPredMovements([]);  // clear predicted movements when user edits
  }, []);

  const updateBall = useCallback((x, y) => {
    setBall({ x, y });
    setPredMovements([]);
  }, []);


  const handleReset = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setPhase('idle');
    setRevealed([]);
    setPlayers(MOMENT_DATA[momentId].players);
    setBall(MOMENT_DATA[momentId].ball);
    setPredMovements([]);
    setSelectedId(null);
    setPlayerActions({});
    setAnimPlayers(null);
    setAnimBall(null);
    setGhostPlayers(null);
    setIsPlaying(false);
    setExtractError(null);
    setSelectedClip(null);
    setRadarImage(null);
    setPlayerAssignments({});
  };

  // Called when a YouTube download finishes — refresh clip list + auto-select
  const handleYoutubeClip = useCallback(async (newClip) => {
    const updated = await refreshClips();
    if (!updated) return;
    setClips(updated);
    const matched = updated.find(c => c.name === newClip.name) || newClip;
    prewarmClip(matched.name);
    // Inline the select logic to avoid circular dep
    setSelectedClip(matched);
    setPhase('idle');
    setRevealed([]);
    setPlayers(MOMENT_DATA[momentId].players);
    setBall(MOMENT_DATA[momentId].ball);
    setPredMovements([]);
    setSelectedId(null);
    setPlayerActions({});
    setAnimPlayers(null);
    setAnimBall(null);
    setGhostPlayers(null);
    setIsPlaying(false);
    setExtractError(null);
    setRadarImage(null);
  }, [momentId]);

  // Switching clips clears any previous extraction so bounding boxes don't linger
  const handleSelectClip = useCallback((clip) => {
    if (clip) prewarmClip(clip.name);  // start fitting TeamClassifier in background
    setSelectedClip(clip);
    setPhase('idle');
    setRevealed([]);
    setPlayers(MOMENT_DATA[momentId].players);
    setBall(MOMENT_DATA[momentId].ball);
    setPredMovements([]);
    setSelectedId(null);
    setPlayerActions({});
    setAnimPlayers(null);
    setAnimBall(null);
    setGhostPlayers(null);
    setIsPlaying(false);
    setExtractError(null);
    setRadarImage(null);
  }, [momentId]);

  // ── Scenario playback ────────────────────────────────────────────────
  const handlePlayScenario = useCallback(({ movements, ballEnd, action, actorId, targetId, shotZone, passStyle, goalSide }) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const ease = t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;

    // Read effective positions — animPlayers if a previous prediction played, else extracted.
    // Using refs so this callback never goes stale and doesn't need players/ball in deps.
    const base     = livePlayersRef.current;
    const baseBall = liveBallRef.current;

    const actor = base.find(p => p.id === actorId);
    const distToBall = actor
      ? Math.sqrt((actor.x - baseBall.x) ** 2 + (actor.y - baseBall.y) ** 2)
      : 0;
    const needsRunToBall = distToBall > 5;

    const targetByLabel = {};
    movements.forEach(m => { targetByLabel[m.label] = { x: m.to[0], y: m.to[1] }; });

    playersSnap.current = base;
    const startPos = base.map(p => ({ x: p.x, y: p.y }));
    const endPos   = base.map(p => {
      const t = targetByLabel[p.label];
      return t ? { x: t.x, y: t.y } : { x: p.x, y: p.y };
    });

    const SHOT_Y = { left: 37.5, center: 40, right: 42.5 };
    const shootX = goalSide === 'left' ? 1 : 119;
    const targetPlayer = base.find(p => p.id === targetId);
    const ballEndPos = ballEnd
      ? { x: ballEnd[0], y: ballEnd[1] }
      : action === 'shoot'
        ? { x: shootX, y: SHOT_Y[shotZone] ?? 40 }
        : action === 'pass' && passStyle === 'behind' && targetPlayer
          ? { x: Math.min(targetPlayer.x + 15, 118), y: targetPlayer.y }
          : targetPlayer
            ? { x: targetPlayer.x, y: targetPlayer.y }
            : actor
              ? { x: Math.min(actor.x + 12, 119), y: actor.y }
              : { ...baseBall };

    // Ghost = where players were at the START of this prediction step
    setGhostPlayers(base.map(p => ({ ...p })));
    setIsPlaying(true);

    const PHASE1 = needsRunToBall ? Math.min(distToBall * 30, 800) : 0;
    const PHASE2 = 1400;
    const TOTAL  = PHASE1 + PHASE2;

    const midPos = base.map((p, i) => {
      if (p.id === actorId && needsRunToBall) return { x: baseBall.x, y: baseBall.y };
      return startPos[i];
    });

    let t0 = null;

    const frame = (ts) => {
      if (!t0) t0 = ts;
      const elapsed = Math.min(ts - t0, TOTAL);
      let animatedPlayers, animatedBall;

      if (elapsed < PHASE1) {
        const t1 = ease(elapsed / PHASE1);
        animatedPlayers = base.map((p, i) => ({
          ...p,
          x: startPos[i].x + (midPos[i].x - startPos[i].x) * t1,
          y: startPos[i].y + (midPos[i].y - startPos[i].y) * t1,
        }));
        animatedBall = { ...baseBall };
      } else {
        const t2 = ease((elapsed - PHASE1) / PHASE2);
        animatedPlayers = base.map((p, i) => ({
          ...p,
          x: midPos[i].x + (endPos[i].x - midPos[i].x) * t2,
          y: midPos[i].y + (endPos[i].y - midPos[i].y) * t2,
        }));
        animatedBall = {
          x: baseBall.x + (ballEndPos.x - baseBall.x) * t2,
          y: baseBall.y + (ballEndPos.y - baseBall.y) * t2,
        };
      }

      setAnimPlayers(animatedPlayers);
      setAnimBall(animatedBall);

      if (elapsed < TOTAL) {
        animRef.current = requestAnimationFrame(frame);
      } else {
        setIsPlaying(false);
        animRef.current = null;
      }
    };

    animRef.current = requestAnimationFrame(frame);
  }, []); // deps-free: reads live state via refs, writes via stable setters

  const handleUndoScenario = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setAnimPlayers(null);
    setAnimBall(null);
    setGhostPlayers(null);
    setIsPlaying(false);
  }, []);

  // ── Player customisation callbacks ────────────────────────────────────
  const deletePlayer = useCallback((id) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
    setAnimPlayers(prev => prev ? prev.filter(p => p.id !== id) : null);
    setGhostPlayers(prev => prev ? prev.filter(p => p.id !== id) : null);
    setPlayerAssignments(prev => { const n = { ...prev }; delete n[id]; return n; });
    setPredMovements([]);
    setSelectedId(null);
    triggerZlatan('adjustment', { action: 'removed a player' });
  }, [triggerZlatan]);

  const updatePlayerMeta = useCallback((id, changes) => {
    const apply = prev => prev ? prev.map(p => p.id === id ? { ...p, ...changes } : p) : null;
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p));
    setAnimPlayers(apply);
    setPredMovements([]);
    clearTimeout(zlatanDebounce.current);
    zlatanDebounce.current = setTimeout(() => {
      triggerZlatan('adjustment', { action: 'adjusted a player' });
    }, 1800);
  }, [triggerZlatan]);

  const addPlayer = useCallback((team, x, y) => {
    setPlayers(prev => {
      const maxId  = Math.max(0, ...prev.map(p => p.id));
      const isRef  = team === null;
      return [...prev, {
        id: maxId + 1, team,
        x: x ?? 60, y: y ?? 40,
        label: isRef ? 'REF' : '',
        name:  isRef ? 'Referee' : `Player ${maxId + 1}`,
        is_keeper: false, is_referee: isRef,
      }];
    });
    setAnimPlayers(null);  // clear animation when roster changes
    setPredMovements([]);
    triggerZlatan('adjustment', { action: 'added a new player' });
  }, [triggerZlatan]);

  const assignRealPlayer = useCallback((pitchPlayerId, playerData) => {
    setPlayerAssignments(prev => ({ ...prev, [pitchPlayerId]: playerData }));
  }, []);

  const clearAssignment = useCallback((pitchPlayerId) => {
    setPlayerAssignments(prev => { const n = { ...prev }; delete n[pitchPlayerId]; return n; });
  }, []);

  // ── Which players list to show in ExtractionView ─────────────────────
  // When a real clip is selected, `players` from extraction; else demo
  const displayPlayers = phase === 'idle'
    ? momentData.players
    : players;

  return (
    <div className="app-dark" style={{ minHeight: '100vh', background: '#0b0b0e' }}>

      {/* ── Header ── */}
      <header style={{
        background: '#0b0b0e',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '0 32px',
        height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        {/* Left: back + wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 500,
                padding: 0, display: 'flex', alignItems: 'center', gap: 5,
                letterSpacing: '0.01em',
              }}
            >
              ← Home
            </button>
          )}
          {onBack && <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)' }} />}
          <span style={{
            fontFamily: 'var(--font-head)', fontWeight: 800,
            fontSize: 17, letterSpacing: '-0.03em', color: '#f4f3ee',
          }}>
            The Special Replay
          </span>
        </div>

        {/* Right: status + rules + IBM */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {backendLive && (
            <span style={{ fontSize: 10, color: '#0acf83', fontWeight: 700, letterSpacing: '0.1em' }}>
              ● LIVE
            </span>
          )}
          {onGoToRules && (
            <button
              onClick={onGoToRules}
              style={{
                padding: '5px 14px', borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s',
                border: '1px solid rgba(255,255,255,0.08)', background: 'transparent',
                color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: 600,
                fontFamily: 'var(--font-head)', letterSpacing: '0.01em',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#0acf83'; e.currentTarget.style.color = '#0acf83'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
            >
              Rules
            </button>
          )}
          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', fontWeight: 600, letterSpacing: '0.06em' }}>
            IBM GRANITE
          </span>
        </div>
      </header>

      {/* ── Main layout ── */}
      <main style={{
        maxWidth: 1420, margin: '0 auto',
        padding: '24px 32px',
        display: 'grid',
        gridTemplateColumns: '210px 1fr 340px',
        gap: 20,
        alignItems: 'start',
      }}>

        {/* ── Far left: Player Settings Panel ── */}
        <div style={{
          paddingTop: 4,
          position: 'sticky', top: 72,
          maxHeight: 'calc(100vh - 90px)',
          overflowY: 'auto',
        }}>
          <PlayerSettingsPanel
            selectedPlayer={(animPlayers ?? players).find(p => p.id === selectedId) ?? null}
            playerAssignments={playerAssignments}
            onUpdatePlayerMeta={updatePlayerMeta}
            onDeletePlayer={deletePlayer}
            onSearchPlayer={(pitchPlayer) => setSearchModalFor(pitchPlayer)}
            onClearAssignment={clearAssignment}
            placingTeam={placingTeam}
            onPlacingTeamChange={setPlacingTeam}
            phase={phase}
          />
        </div>

        {/* ── Center: Pitch + Prediction ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Pitch header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{
                fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800,
                letterSpacing: '-0.04em', marginBottom: 4, color: '#f4f3ee',
              }}>
                Tactical View
              </h1>
              {phase === 'scanning' ? (
                <div className="scan-loader">
                  <div className="scan-loader-row">
                    <span className="scan-loader-text">ANALYZING FRAME</span>
                    <div className="scan-loader-dots">
                      <div className="scan-loader-dot" />
                      <div className="scan-loader-dot" />
                      <div className="scan-loader-dot" />
                    </div>
                  </div>
                  <div className="scan-loader-bar-track">
                    <div className="scan-loader-bar-fill" />
                  </div>
                  <span className="scan-loader-phase">YOLO · HOMOGRAPHY · IBM GRANITE</span>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: 'rgba(244,243,238,0.38)', lineHeight: 1.5 }}>
                  {phase === 'idle'
                    ? 'Extract the frame to map players onto the pitch'
                    : 'Drag players · assign actions · predict with IBM Granite'}
                </p>
              )}
            </div>
            {phase === 'done' && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={() => setShowOffside(o => !o)}
                  style={{
                    background: showOffside ? 'rgba(255,107,53,0.12)' : 'transparent',
                    border: `1px solid ${showOffside ? 'rgba(255,107,53,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 6, cursor: 'pointer', padding: '5px 12px',
                    color: showOffside ? '#ff6b35' : 'rgba(255,255,255,0.4)',
                    fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-head)',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  ⚑ Offside
                  {showOffside && offsideInfo?.count > 0 && (
                    <span style={{
                      background: '#ff3333', color: '#fff',
                      borderRadius: 999, fontSize: 9, fontWeight: 800,
                      padding: '1px 5px', lineHeight: 1.4,
                    }}>{offsideInfo.count}</span>
                  )}
                </button>
                <button
                  onClick={handleReset}
                  style={{
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 6, cursor: 'pointer', padding: '5px 12px',
                    color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600,
                    fontFamily: 'var(--font-head)',
                  }}
                >
                  ↺ Reset
                </button>
              </div>
            )}
          </div>

          {/* Interactive pitch */}
          <InteractivePitch
            players={animPlayers ?? players}
            ball={animBall ?? ball}
            onUpdatePlayer={updatePlayer}
            onUpdateBall={updateBall}
            revealed={phase !== 'done' ? revealedIds : null}
            predictionMovements={predMovements}
            ghostPlayers={ghostPlayers}
            onSelectionChange={setSelectedId}
            onActionsChange={setPlayerActions}
            offsideInfo={offsideInfo}
            onAddPlayer={addPlayer}
            playerAssignments={playerAssignments}
            placingTeam={placingTeam}
            onPlacingTeamChange={setPlacingTeam}
          />

          {/* Prediction panel */}
          {phase === 'done' && (
            <div style={{ animation: 'fade-in 0.4s ease 0.2s both' }}>
              <div style={{
                fontSize: 10, fontWeight: 700, marginBottom: 12,
                color: 'rgba(244,243,238,0.28)', letterSpacing: '0.18em',
                fontFamily: 'var(--font-head)',
              }}>
                WHAT-IF PREDICTION
              </div>
              <PredictionPanel
                players={animPlayers ?? players}
                ball={animBall ?? ball}
                selectedId={selectedId}
                playerActions={playerActions}
                onMovements={setPredMovements}
                onPlay={handlePlayScenario}
                isPlaying={isPlaying}
                playerAssignments={playerAssignments}
                onPredictionResult={(result) => triggerZlatan('prediction', {
                  outcome: result.outcome,
                  explanation: result.explanation?.slice(0, 120),
                })}
              />
              {(animPlayers || ghostPlayers) && !isPlaying && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8, animation: 'fade-in 0.3s ease' }}>
                  <div style={{
                    flex: 1, padding: '6px 10px', borderRadius: 6,
                    background: 'rgba(10,207,131,0.06)', border: '1px solid rgba(10,207,131,0.15)',
                    fontSize: 10, color: 'rgba(10,207,131,0.7)', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <span style={{ fontSize: 12 }}>◉</span> Predict again from here
                  </div>
                  <button
                    onClick={handleUndoScenario}
                    title="Reset to extracted positions"
                    style={{
                      padding: '6px 12px', cursor: 'pointer',
                      background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 6, color: 'rgba(255,255,255,0.3)', fontSize: 11,
                      fontWeight: 600, fontFamily: 'var(--font-head)', whiteSpace: 'nowrap',
                    }}
                  >
                    ↩ Reset
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Extraction panel + Zlatan ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ExtractionView
            moment={moment}
            players={displayPlayers}
            ball={phase === 'idle' ? momentData.ball : ball}
            revealedIds={revealedIds}
            phase={phase}
            onExtract={handleExtract}
            onReset={handleReset}
            clips={clips}
            selectedClip={selectedClip}
            onSelectClip={handleSelectClip}
            videoRef={videoRef}
            extractError={extractError}
            radarImage={radarImage}
            onYoutubeClip={handleYoutubeClip}
          />

        </div>
      </main>

      {/* ── Zlatan Granitevic floating panel (fixed bottom-right) ── */}
      <ZlatanPanel
        comment={zlatanComment}
        loading={zlatanLoading}
        event={zlatanEvent}
      />

      {/* Player search modal */}
      {searchModalFor && (
        <PlayerSearchModal
          targetPlayer={searchModalFor}
          onAssign={(data) => assignRealPlayer(searchModalFor.id, data)}
          onClose={() => setSearchModalFor(null)}
        />
      )}
    </div>
  );
}
