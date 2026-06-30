import { useState, useRef, useEffect } from 'react';
import PitchMarkings from './PitchMarkings';
import { TEAM_COLORS } from '../lib/data';
import { API, startYoutubeDownload, pollDownloadStatus } from '../lib/api';

const STATUS_STEPS = [
  'Initializing YOLO models…',
  'Running pitch keypoint detection…',
  'Applying homography transform…',
  'Detecting players…',
  'Classifying team jerseys…',
  'Mapping to 2D pitch…',
  'Done!',
];

export default function ExtractionView({
  moment,
  players,
  ball,
  revealedIds,
  phase,          // 'idle' | 'scanning' | 'done'
  onExtract,
  onReset,
  clips = [],
  selectedClip,
  onSelectClip,
  videoRef: externalVideoRef,
  extractError,
  radarImage,
  onYoutubeClip,
}) {
  const internalVideoRef = useRef(null);
  const videoRef = externalVideoRef || internalVideoRef;
  const [videoPaused, setVideoPaused] = useState(true);

  // YouTube import state
  const [ytOpen, setYtOpen]       = useState(false);
  const [ytUrl, setYtUrl]         = useState('');
  const [ytJobId, setYtJobId]     = useState(null);
  const [ytStatus, setYtStatus]   = useState(null); // null | 'downloading' | 'done' | 'error'
  const [ytError, setYtError]     = useState(null);
  const pollRef = useRef(null);

  // Poll download job until done or error
  useEffect(() => {
    if (!ytJobId || ytStatus !== 'downloading') return;
    pollRef.current = setInterval(async () => {
      try {
        const job = await pollDownloadStatus(ytJobId);
        if (job.status === 'done') {
          clearInterval(pollRef.current);
          setYtStatus('done');
          setYtOpen(false);
          setYtUrl('');
          // Notify parent to refresh clips and auto-select the new one
          onYoutubeClip?.(job.clip);
        } else if (job.status === 'error') {
          clearInterval(pollRef.current);
          setYtStatus('error');
          setYtError(job.error || 'Download failed');
        }
      } catch {}
    }, 2500);
    return () => clearInterval(pollRef.current);
  }, [ytJobId, ytStatus]); // eslint-disable-line

  const handleYtSubmit = async () => {
    if (!ytUrl.trim()) return;
    setYtStatus('downloading');
    setYtError(null);
    try {
      const { job_id } = await startYoutubeDownload(ytUrl.trim());
      setYtJobId(job_id);
    } catch (e) {
      setYtStatus('error');
      setYtError(e.message);
    }
  };

  const totalPlayers = players.length;
  const detectedCount = revealedIds.length;
  const progress = phase === 'done' ? 100
    : phase === 'scanning' ? Math.round((detectedCount / Math.max(totalPlayers, 1)) * 85 + 5)
    : 0;

  const statusIdx = phase === 'done' ? STATUS_STEPS.length - 1
    : phase === 'scanning' ? Math.min(3 + Math.floor((detectedCount / Math.max(totalPlayers, 1)) * 3), STATUS_STEPS.length - 2)
    : -1;
  const statusText = statusIdx >= 0 ? STATUS_STEPS[statusIdx] : '';

  const hasRealVideo = !!selectedClip;

  const handleExtractClick = () => {
    if (hasRealVideo && videoRef.current) {
      const ts = Math.round(videoRef.current.currentTime * 1000);
      onExtract(selectedClip.name, ts);
    } else {
      onExtract(null, null);
    }
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{
        padding: '14px 18px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
            {selectedClip ? selectedClip.label : moment.label}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {selectedClip ? `${selectedClip.name}` : `${moment.match} · ${moment.desc}`}
          </div>
        </div>
        <div style={{
          fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
          background: phase === 'done' ? 'rgba(10,207,131,0.12)' : 'rgba(242,78,30,0.12)',
          color: phase === 'done' ? '#07a365' : '#c33310',
        }}>
          {phase === 'done' ? '● LIVE' : '● PAUSED'}
        </div>
      </div>

      {/* ── Clip selector (idle and done phases when clips are available) ── */}
      {(phase === 'idle' || phase === 'done') && (
        <div style={{
          padding: '10px 16px', borderBottom: '1px solid var(--border)',
        }}>
          {/* Clip buttons row */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: ytOpen ? 8 : 0 }}>
            <button
              onClick={() => onSelectClip?.(null)}
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                border: !selectedClip ? '1.5px solid var(--brand-blue)' : '1.5px solid var(--border)',
                background: !selectedClip ? 'rgba(26,188,254,0.1)' : 'transparent',
                color: !selectedClip ? 'var(--brand-blue)' : 'var(--text-muted)',
              }}
            >
              Demo
            </button>
            {clips.map(c => (
              <button
                key={c.name}
                onClick={() => onSelectClip?.(c)}
                style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  border: selectedClip?.name === c.name ? '1.5px solid var(--brand-blue)' : '1.5px solid var(--border)',
                  background: selectedClip?.name === c.name ? 'rgba(26,188,254,0.1)' : 'transparent',
                  color: selectedClip?.name === c.name ? 'var(--brand-blue)' : 'var(--text-muted)',
                }}
              >
                {c.label}
              </button>
            ))}
            {/* YouTube import button */}
            <button
              onClick={() => { setYtOpen(o => !o); setYtStatus(null); setYtError(null); }}
              title="Import from YouTube"
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                border: ytOpen ? '1.5px solid #FF0000' : '1.5px solid var(--border)',
                background: ytOpen ? 'rgba(255,0,0,0.08)' : 'transparent',
                color: ytOpen ? '#FF0000' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              ▶ YouTube
            </button>
          </div>

          {/* YouTube import panel */}
          {ytOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="url"
                  placeholder="Paste YouTube URL…"
                  value={ytUrl}
                  onChange={e => setYtUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && ytStatus !== 'downloading' && handleYtSubmit()}
                  disabled={ytStatus === 'downloading'}
                  style={{
                    flex: 1, padding: '6px 10px', borderRadius: 6,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                    color: '#f4f3ee', fontSize: 11, outline: 'none',
                    fontFamily: 'var(--font-body)',
                  }}
                />
                <button
                  onClick={handleYtSubmit}
                  disabled={!ytUrl.trim() || ytStatus === 'downloading'}
                  style={{
                    padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                    background: '#FF0000', border: 'none', color: '#fff',
                    fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-head)',
                    opacity: (!ytUrl.trim() || ytStatus === 'downloading') ? 0.5 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {ytStatus === 'downloading' ? '…' : 'Import'}
                </button>
              </div>
              {ytStatus === 'downloading' && (
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.04em' }}>
                  Downloading video — this may take 20–60 seconds…
                </div>
              )}
              {ytStatus === 'error' && (
                <div style={{ fontSize: 10, color: '#c33310', lineHeight: 1.5 }}>
                  ⚠ {ytError}
                </div>
              )}
              {ytStatus === 'done' && (
                <div style={{ fontSize: 10, color: '#0acf83' }}>
                  ✓ Downloaded — clip added above
                </div>
              )}
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', lineHeight: 1.5 }}>
                Tip: use a short clip or timestamp link for fastest download. Max ~720p.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Video / frame area ── */}
      <div style={{ position: 'relative', background: '#0d2b18', aspectRatio: '16/9', overflow: 'hidden' }}>

        {/* Real video element */}
        {hasRealVideo && (
          <video
            ref={videoRef}
            src={`${API}${selectedClip.url}`}
            controls={phase === 'idle'}
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              display: 'block', position: 'absolute', inset: 0,
            }}
            onPause={() => setVideoPaused(true)}
            onPlay={() => setVideoPaused(false)}
          />
        )}

        {/* Demo pitch (shown when no real video) */}
        {!hasRealVideo && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '12px 8px',
            transform: 'perspective(500px) rotateX(22deg)',
            transformOrigin: 'center 60%',
            opacity: phase === 'idle' ? 0.7 : 0.5,
            transition: 'opacity 0.4s',
          }}>
            <svg viewBox="-4 -2.5 128 85" style={{ width: '100%', height: '100%' }}>
              <PitchMarkings dim />
            </svg>
          </div>
        )}

        {/* Scan line */}
        {phase === 'scanning' && (
          <div style={{
            position: 'absolute', left: 0, right: 0, height: 3, top: 0,
            background: 'linear-gradient(90deg, transparent 0%, #1abcfe 30%, #a259ff 70%, transparent 100%)',
            boxShadow: '0 0 12px 3px rgba(26,188,254,0.5)',
            animation: 'scanline 1.4s linear',
            animationFillMode: 'both',
          }} />
        )}


        {/* Idle overlay (demo mode) */}
        {phase === 'idle' && !hasRealVideo && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)', gap: 12,
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            }}>▶</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
              Click to extract moment
            </div>
          </div>
        )}

        {/* Real video: pause-to-extract hint */}
        {phase === 'idle' && hasRealVideo && videoPaused && (
          <div style={{
            position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
            color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: 500,
            padding: '5px 14px', borderRadius: 999, whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}>
            Video paused — click "Extract" below
          </div>
        )}

        {/* AI detecting badge */}
        {phase === 'scanning' && (
          <div style={{
            position: 'absolute', top: 10, right: 10,
            background: 'rgba(26,188,254,0.15)', border: '1px solid rgba(26,188,254,0.4)',
            backdropFilter: 'blur(4px)', color: '#1abcfe',
            fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 999, letterSpacing: '0.08em',
          }}>
            ◉ AI DETECTING
          </div>
        )}
      </div>

      {/* ── Progress + action strip ── */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>

        {/* Error banner */}
        {extractError && phase === 'idle' && (
          <div style={{
            marginBottom: 10, padding: '8px 12px', borderRadius: 6,
            background: 'rgba(242,78,30,0.08)', border: '1px solid rgba(242,78,30,0.25)',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#c33310' }}>
              ⚠ Extraction failed
            </div>
            <div style={{ fontSize: 10, color: 'rgba(194,50,16,0.75)', lineHeight: 1.5, wordBreak: 'break-word' }}>
              {extractError}
            </div>
          </div>
        )}

        {phase !== 'idle' && (
          <>
            <div style={{ height: 4, borderRadius: 999, background: 'var(--bg-alt)', marginBottom: 8, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${progress}%`,
                background: phase === 'done' ? 'var(--brand-green)' : 'linear-gradient(90deg, var(--brand-blue), var(--brand-purple))',
                borderRadius: 999, transition: 'width 0.4s ease',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                {phase === 'done' ? `${totalPlayers} players mapped to pitch` : statusText}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {phase === 'done' ? '✓' : `${detectedCount} / ${totalPlayers}`}
              </span>
            </div>
          </>
        )}

        {/* Idle: Extract button */}
        {phase === 'idle' && (
          <button
            className="btn btn-blue"
            onClick={handleExtractClick}
            disabled={hasRealVideo && !videoPaused}
            style={{ width: '100%', justifyContent: 'center', opacity: hasRealVideo && !videoPaused ? 0.5 : 1 }}
          >
            <span>⚡</span>
            {hasRealVideo
              ? videoPaused ? 'Extract This Frame' : 'Pause video first'
              : 'Extract This Moment'}
          </button>
        )}

        {/* Done: stats + accuracy note + try-another button */}
        {phase === 'done' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <StatBox label="Players" value={totalPlayers} color="var(--brand-green)" bg="rgba(10,207,131,0.08)" />
              <StatBox
                label="Team A"
                value={players.filter(p => p.team === 0).length}
                color="var(--brand-blue)" bg="rgba(26,188,254,0.08)"
              />
              <StatBox
                label="Team B"
                value={players.filter(p => p.team === 1).length}
                color="var(--brand-orange)" bg="rgba(242,78,30,0.08)"
              />
            </div>
            {/* Radar image — sports library's own ground-truth render */}
            {radarImage && (
              <div style={{ marginBottom: 10 }}>
                <div style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.15em',
                  color: 'rgba(255,255,255,0.28)', marginBottom: 5,
                  fontFamily: 'var(--font-head)',
                }}>
                  CV ENGINE RADAR (ground truth)
                </div>
                <img
                  src={radarImage}
                  alt="Sports-library radar"
                  style={{ width: '100%', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>
            )}
            {hasRealVideo && (
              <div style={{
                fontSize: 10, color: 'rgba(255,255,255,0.28)', lineHeight: 1.5,
                marginBottom: 10, letterSpacing: '0.01em',
              }}>
                Positions are approximate — accuracy depends on camera angle. Broadcast/elevated angles give best results. Drag players to correct placement.
              </div>
            )}
            {(clips.length > 0 || hasRealVideo) && (
              <button
                onClick={onReset}
                style={{
                  width: '100%', padding: '7px 0', cursor: 'pointer',
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6, color: 'rgba(255,255,255,0.4)', fontSize: 11,
                  fontWeight: 600, fontFamily: 'var(--font-head)', letterSpacing: '0.04em',
                }}
              >
                ↺ Try another video
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, color, bg }) {
  return (
    <div style={{ flex: 1, padding: '6px 10px', background: bg, borderRadius: 8 }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 1 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

