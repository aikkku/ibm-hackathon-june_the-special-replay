import { useState } from 'react';
import { searchPlayers } from '../lib/api';

const TOP_LEAGUES = [
  { id: 39,  name: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League' },
  { id: 140, name: '🇪🇸 La Liga' },
  { id: 78,  name: '🇩🇪 Bundesliga' },
  { id: 135, name: '🇮🇹 Serie A' },
  { id: 61,  name: '🇫🇷 Ligue 1' },
  { id: 2,   name: '⭐ Champions League' },
  { id: 1,   name: '🌍 World Cup' },
];

const CLUB_SEASONS   = [2024, 2023, 2022, 2021, 2020, 2019];
const WC_SEASONS     = [2022, 2018, 2014, 2010, 2006];
const UCL_SEASONS    = [2024, 2023, 2022, 2021, 2020, 2019];

function seasonsFor(leagueId) {
  if (leagueId === 1)  return WC_SEASONS;
  return CLUB_SEASONS;
}

const STAT_DEFAULTS = {
  Attacker:   { rating: '6.8', goals_total: 8,  goals_assists: 5,  shots_on: 22, passes_accuracy: 76, dribbles_success: 55, dribbles_attempts: 80 },
  Midfielder: { rating: '6.9', goals_total: 4,  goals_assists: 8,  shots_on: 10, passes_accuracy: 83, dribbles_success: 60, dribbles_attempts: 70 },
  Defender:   { rating: '7.0', goals_total: 1,  goals_assists: 2,  shots_on: 4,  passes_accuracy: 79, dribbles_success: 40, dribbles_attempts: 45 },
  Goalkeeper: { rating: '7.0', goals_total: 0,  goals_assists: 0,  shots_on: 0,  passes_accuracy: 60, dribbles_success: 0,  dribbles_attempts: 0  },
};

function StatChip({ label, value }) {
  if (value == null || value === '') return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 7px', borderRadius: 4,
      background: 'rgba(255,255,255,0.05)',
      fontSize: 10, color: 'rgba(244,243,238,0.55)',
    }}>
      <span style={{ color: 'rgba(244,243,238,0.3)' }}>{label}</span> {value}
    </span>
  );
}

export default function PlayerSearchModal({ onAssign, onClose, targetPlayer }) {
  const [league, setLeague]   = useState(39);
  const [season, setSeason]   = useState(2024);

  // Reset season when league changes to avoid invalid combos (e.g. WC 2024 doesn't exist)
  const handleLeagueChange = (newLeague) => {
    setLeague(newLeague);
    const available = seasonsFor(newLeague);
    if (!available.includes(season)) setSeason(available[0]);
  };
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const handleSearch = async () => {
    if (query.trim().length < 4) { setError('Type at least 4 characters'); return; }
    setLoading(true); setError(null); setResults(null);
    try {
      const data = await searchPlayers(query.trim(), league, season);
      setResults(data);
      if (data.length === 0) setError('No players found — try a different name, league, or season.');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const buildAssignment = (player, stat) => {
    const games    = stat?.games    ?? {};
    const goals    = stat?.goals    ?? {};
    const shots    = stat?.shots    ?? {};
    const passes   = stat?.passes   ?? {};
    const dribbles = stat?.dribbles ?? {};
    return {
      apiId:       player.id,
      name:        player.name,
      photo:       player.photo,
      nationality: player.nationality,
      age:         player.age,
      team:        stat?.team?.name   ?? '',
      league:      stat?.league?.name ?? '',
      position:    games.position     ?? 'Player',
      rating:      games.rating ? parseFloat(games.rating).toFixed(1) : null,
      stats: {
        goals_total:        goals.total,
        goals_assists:      goals.assists,
        shots_total:        shots.total,
        shots_on:           shots.on,
        passes_total:       passes.total,
        passes_key:         passes.key,
        passes_accuracy:    passes.accuracy,
        dribbles_attempts:  dribbles.attempts,
        dribbles_success:   dribbles.success,
        games_appearences:  games.appearences,
        games_minutes:      games.minutes,
      },
    };
  };

  const assignDefault = (roleKey) => {
    const defaults = STAT_DEFAULTS[roleKey] ?? STAT_DEFAULTS.Midfielder;
    onAssign({
      apiId: null, name: `Default ${roleKey}`, photo: null,
      nationality: null, age: null, team: null, league: null,
      position: roleKey, rating: defaults.rating,
      stats: {
        goals_total:       defaults.goals_total,
        goals_assists:     defaults.goals_assists,
        shots_on:          defaults.shots_on,
        passes_accuracy:   defaults.passes_accuracy,
        dribbles_success:  defaults.dribbles_success,
        dribbles_attempts: defaults.dribbles_attempts,
      },
    });
    onClose();
  };

  const selectStyle = {
    padding: '6px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    color: '#f4f3ee', cursor: 'pointer', outline: 'none',
    fontFamily: 'var(--font-body)',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      background: 'rgba(5,5,8,0.88)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, animation: 'fade-in 0.2s ease',
    }}>
      <div style={{
        background: '#0f0f12', border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 14, width: '100%', maxWidth: 560,
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f4f3ee', fontFamily: 'var(--font-head)' }}>
              Search Real Player
            </div>
            {targetPlayer && (
              <div style={{ fontSize: 11, color: 'rgba(244,243,238,0.35)', marginTop: 2 }}>
                Assigning to: {targetPlayer.name || targetPlayer.label || 'Player'}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 20, color: 'rgba(255,255,255,0.3)', lineHeight: 1,
          }}>×</button>
        </div>

        {/* Search controls */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <select value={league} onChange={e => handleLeagueChange(+e.target.value)} style={{ ...selectStyle, flex: 1 }}>
              {TOP_LEAGUES.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <select value={season} onChange={e => setSeason(+e.target.value)} style={{ ...selectStyle, width: 80 }}>
              {seasonsFor(league).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Player name (min. 4 chars)…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && handleSearch()}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 7, fontSize: 12,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                color: '#f4f3ee', outline: 'none', fontFamily: 'var(--font-body)',
              }}
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              style={{
                padding: '8px 18px', borderRadius: 7, fontWeight: 700, fontSize: 12,
                background: loading ? 'rgba(10,207,131,0.4)' : '#0acf83',
                border: 'none', cursor: loading ? 'default' : 'pointer',
                color: '#0b0b0e', fontFamily: 'var(--font-head)',
              }}
            >
              {loading ? '…' : 'Search'}
            </button>
          </div>
          {error && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#ff6b6b', padding: '6px 10px', background: 'rgba(255,51,51,0.08)', borderRadius: 6 }}>
              {error}
            </div>
          )}
        </div>

        {/* Default players strip */}
        <div style={{
          padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, color: 'rgba(244,243,238,0.28)', fontWeight: 600, letterSpacing: '0.1em', marginRight: 4 }}>
            DEFAULTS
          </span>
          {Object.keys(STAT_DEFAULTS).map(role => (
            <button key={role} onClick={() => assignDefault(role)} style={{
              padding: '4px 10px', fontSize: 10, fontWeight: 700,
              borderRadius: 5, border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent', color: 'rgba(244,243,238,0.4)',
              cursor: 'pointer', fontFamily: 'var(--font-head)',
              transition: 'all 0.15s',
            }}>
              {role}
            </button>
          ))}
        </div>

        {/* Results */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {results === null && !loading && (
            <div style={{ padding: 32, textAlign: 'center', color: 'rgba(244,243,238,0.2)', fontSize: 13 }}>
              Search for a player above, or pick a default role
            </div>
          )}
          {results?.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'rgba(244,243,238,0.2)', fontSize: 13 }}>
              No results
            </div>
          )}
          {results?.map(item => {
            const { player, statistics } = item;
            const stat   = statistics?.[0];
            const games  = stat?.games  ?? {};
            const goals  = stat?.goals  ?? {};
            const shots  = stat?.shots  ?? {};
            const passes = stat?.passes ?? {};
            const drib   = stat?.dribbles ?? {};
            const rating = games.rating ? parseFloat(games.rating).toFixed(1) : null;

            return (
              <div key={player.id} style={{
                padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', gap: 12, alignItems: 'flex-start',
                transition: 'background 0.12s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Photo */}
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}>
                  <img
                    src={player.photo}
                    width={44} height={44}
                    style={{ display: 'block', borderRadius: '50%' }}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#f4f3ee', fontFamily: 'var(--font-head)' }}>
                      {player.name}
                    </span>
                    {rating && (
                      <span style={{
                        fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                        background: parseFloat(rating) >= 8 ? 'rgba(10,207,131,0.15)' : 'rgba(255,255,255,0.07)',
                        color: parseFloat(rating) >= 8 ? '#0acf83' : 'rgba(244,243,238,0.5)',
                      }}>
                        {rating}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(244,243,238,0.4)', marginBottom: 6 }}>
                    {stat?.team?.name ?? '—'} · {games.position ?? '—'} · {stat?.league?.name ?? '—'}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <StatChip label="G"  value={goals.total} />
                    <StatChip label="A"  value={goals.assists} />
                    <StatChip label="SH" value={shots.on} />
                    <StatChip label="PA" value={passes.accuracy != null ? `${passes.accuracy}%` : null} />
                    <StatChip label="DR" value={drib.success != null && drib.attempts != null ? `${drib.success}/${drib.attempts}` : null} />
                    <StatChip label="KP" value={passes.key} />
                    {games.minutes && <StatChip label="min" value={games.minutes} />}
                  </div>
                </div>

                {/* Assign */}
                <button
                  onClick={() => { onAssign(buildAssignment(player, stat)); onClose(); }}
                  style={{
                    padding: '7px 14px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                    background: 'rgba(10,207,131,0.1)', border: '1px solid rgba(10,207,131,0.3)',
                    color: '#0acf83', cursor: 'pointer', flexShrink: 0,
                    fontFamily: 'var(--font-head)', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#0acf83'; e.currentTarget.style.color = '#0b0b0e'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(10,207,131,0.1)'; e.currentTarget.style.color = '#0acf83'; }}
                >
                  Assign →
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
