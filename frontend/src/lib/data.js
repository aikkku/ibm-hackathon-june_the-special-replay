// StatsBomb coordinate system: 120 wide × 80 tall
// Attack toward x=120 (right goal), y=0 is top, y=80 is bottom

export const MOMENTS = [
  {
    id: 'counter_attack',
    label: 'Counter Attack',
    desc: '67\' · 3v2 + GK',
    match: 'WC 2026 — QF',
    color: 'var(--brand-blue)',
  },
  {
    id: 'corner_kick',
    label: 'Corner Kick',
    desc: '82\' · Box situation',
    match: 'WC 2026 — SF',
    color: 'var(--brand-purple)',
  },
  {
    id: 'penalty',
    label: 'Penalty',
    desc: '90+3\' · Spot kick',
    match: 'WC 2026 — Final',
    color: 'var(--brand-green)',
  },
];

// Players for each moment. Coordinates in StatsBomb units (0-120, 0-80).
// Video positions are percentages within the video frame (for detection animation).
export const MOMENT_DATA = {
  counter_attack: {
    players: [
      { id: 1, team: 0, x: 87, y: 38, label: 'ST', name: 'Striker',
        videoX: 58, videoY: 50 },
      { id: 2, team: 0, x: 81, y: 21, label: 'LW', name: 'Left Wing',
        videoX: 43, videoY: 27 },
      { id: 3, team: 0, x: 79, y: 57, label: 'RW', name: 'Right Wing',
        videoX: 46, videoY: 72 },
      { id: 4, team: 1, x: 97, y: 34, label: 'CB', name: 'Center Back',
        videoX: 70, videoY: 47 },
      { id: 5, team: 1, x: 99, y: 50, label: 'CB', name: 'Center Back',
        videoX: 74, videoY: 63 },
      { id: 6, team: 1, x: 116, y: 40, label: 'GK', name: 'Goalkeeper', isKeeper: true,
        videoX: 88, videoY: 54 },
    ],
    ball: { x: 87, y: 38 },
    actorId: 1,
  },
  corner_kick: {
    players: [
      { id: 1, team: 0, x: 108, y: 36, label: 'CF', name: 'Center Forward',
        videoX: 68, videoY: 44 },
      { id: 2, team: 0, x: 112, y: 50, label: 'SS', name: 'Second Striker',
        videoX: 74, videoY: 60 },
      { id: 3, team: 0, x: 103, y: 25, label: 'AM', name: 'Attacking Mid',
        videoX: 60, videoY: 29 },
      { id: 4, team: 1, x: 105, y: 40, label: 'CB', name: 'Center Back',
        videoX: 65, videoY: 50 },
      { id: 5, team: 1, x: 109, y: 44, label: 'CB', name: 'Center Back',
        videoX: 70, videoY: 55 },
      { id: 6, team: 1, x: 116, y: 40, label: 'GK', name: 'Goalkeeper', isKeeper: true,
        videoX: 86, videoY: 50 },
      { id: 7, team: 0, x: 99, y: 18, label: 'CK', name: 'Corner Taker',
        videoX: 51, videoY: 20 },
    ],
    ball: { x: 120, y: 0 },
    actorId: 7,
  },
  penalty: {
    players: [
      { id: 1, team: 0, x: 108, y: 40, label: 'PK', name: 'Penalty Taker',
        videoX: 56, videoY: 50 },
      { id: 2, team: 1, x: 120, y: 40, label: 'GK', name: 'Goalkeeper', isKeeper: true,
        videoX: 84, videoY: 50 },
      { id: 3, team: 0, x: 92, y: 38, label: 'ST', name: 'Teammate',
        videoX: 40, videoY: 48 },
      { id: 4, team: 1, x: 91, y: 43, label: 'DF', name: 'Defender',
        videoX: 42, videoY: 55 },
    ],
    ball: { x: 108, y: 40 },
    actorId: 1,
  },
};

export const TEAM_COLORS = {
  0: { fill: '#1abcfe', stroke: '#0895c9', label: 'Team A' },
  1: { fill: '#f24e1e', stroke: '#c33310', label: 'Team B' },
};
