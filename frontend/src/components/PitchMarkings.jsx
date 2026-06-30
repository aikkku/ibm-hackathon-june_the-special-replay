// All coordinates in StatsBomb units (120 × 80).
// SVG viewBox should be "-4 -2.5 128 85" to include goals + padding.

export default function PitchMarkings({ dim = false }) {
  const PENALTY_ARC_R = 10.35;
  const lineColor = dim ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.88)';
  const lw = 0.38; // line width in StatsBomb units

  function penaltyArcPath(cx, isLeft) {
    const edgeX = isLeft ? 18 : 102;
    const dx = edgeX - cx;
    const dy = Math.sqrt(PENALTY_ARC_R ** 2 - dx ** 2);
    const y1 = 40 - dy;
    const y2 = 40 + dy;
    const sweep = isLeft ? 1 : 0;
    return `M ${edgeX} ${y1} A ${PENALTY_ARC_R} ${PENALTY_ARC_R} 0 0 ${sweep} ${edgeX} ${y2}`;
  }

  return (
    <g>
      {/* Grass background with subtle alternating stripes */}
      <rect x={0} y={0} width={120} height={80} fill="#1b5e35" />
      {[0,1,2,3,4,5].map(i => (
        <rect key={i}
          x={i * 20} y={0} width={20} height={80}
          fill={i % 2 === 0 ? '#1b5e35' : '#1a5430'}
        />
      ))}

      {/* ── White lines ── */}

      {/* Outer boundary */}
      <rect x={0} y={0} width={120} height={80}
        fill="none" stroke={lineColor} strokeWidth={lw} />

      {/* Halfway line */}
      <line x1={60} y1={0} x2={60} y2={80}
        stroke={lineColor} strokeWidth={lw} />

      {/* Centre circle */}
      <circle cx={60} cy={40} r={10.35}
        fill="none" stroke={lineColor} strokeWidth={lw} />
      <circle cx={60} cy={40} r={0.45} fill={lineColor} />

      {/* Left penalty box */}
      <rect x={0} y={18} width={18} height={44}
        fill="none" stroke={lineColor} strokeWidth={lw} />

      {/* Right penalty box */}
      <rect x={102} y={18} width={18} height={44}
        fill="none" stroke={lineColor} strokeWidth={lw} />

      {/* Left goal area */}
      <rect x={0} y={30} width={6} height={20}
        fill="none" stroke={lineColor} strokeWidth={lw} />

      {/* Right goal area */}
      <rect x={114} y={30} width={6} height={20}
        fill="none" stroke={lineColor} strokeWidth={lw} />

      {/* Goals (net area behind goal line) */}
      <rect x={-3.8} y={36} width={3.8} height={8}
        fill="rgba(255,255,255,0.06)" stroke={lineColor} strokeWidth={lw} />
      <rect x={120} y={36} width={3.8} height={8}
        fill="rgba(255,255,255,0.06)" stroke={lineColor} strokeWidth={lw} />

      {/* Penalty spots */}
      <circle cx={12} cy={40} r={0.42} fill={lineColor} />
      <circle cx={108} cy={40} r={0.42} fill={lineColor} />

      {/* Penalty arcs (D) */}
      <path d={penaltyArcPath(12, true)}
        fill="none" stroke={lineColor} strokeWidth={lw} />
      <path d={penaltyArcPath(108, false)}
        fill="none" stroke={lineColor} strokeWidth={lw} />

      {/* Corner arcs (1 unit radius quarter circles) */}
      <path d="M 0 1 A 1 1 0 0 1 1 0"   fill="none" stroke={lineColor} strokeWidth={lw} />
      <path d="M 119 0 A 1 1 0 0 1 120 1" fill="none" stroke={lineColor} strokeWidth={lw} />
      <path d="M 1 80 A 1 1 0 0 1 0 79"  fill="none" stroke={lineColor} strokeWidth={lw} />
      <path d="M 120 79 A 1 1 0 0 1 119 80" fill="none" stroke={lineColor} strokeWidth={lw} />
    </g>
  );
}
