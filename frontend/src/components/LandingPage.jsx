import { useState, useEffect, useRef, useCallback } from 'react';

const ZLATAN_HERO_PHOTO = 'https://icdn.football-italia.net/wp-content/uploads/2024/04/Zlatan-Ibrahimovic-Milan-sunglasses-770x513.jpg';

const ZLATAN_QUOTES = [
  "Zlatan does not need machine learning. Zlatan IS the machine.",
  "You ask ChatGPT for help. ChatGPT asks Zlatan.",
  "IBM Granite is powerful. Zlatan is the reason IBM exists.",
  "Tactics are for people who cannot do what Zlatan does. Zlatan does.",
  "They said AI would replace humans. They did not consult Zlatan.",
  "Zlatan does not predict goals. Zlatan scores them before they happen.",
  "A lion does not concern itself with the opinion of the algorithm.",
  "Zlatan has no weaknesses. Only areas where Zlatan chooses to be average.",
  "An average player studies formations. Zlatan studies Zlatan.",
  "When Zlatan analyzes the frame, the frame is honored.",
  "The goalkeeper had no chance. Zlatan knew this before the shot was taken.",
  "Zlatan retired. The sport has not recovered.",
];

function ZlatanQuote() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * ZLATAN_QUOTES.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(i => (i + 1) % ZLATAN_QUOTES.length);
        setVisible(true);
      }, 500);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      width: 190,
      padding: '9px 12px',
      background: 'rgba(5,5,8,0.72)',
      backdropFilter: 'blur(10px)',
      borderRadius: 14,
      border: '1px solid rgba(162,89,255,0.22)',
      boxShadow: 'inset 3px 0 0 rgba(162,89,255,0.5)',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.5s ease',
    }}>
      <p style={{
        margin: 0, fontSize: 11, color: 'rgba(244,243,238,0.62)',
        fontStyle: 'italic', lineHeight: 1.5,
      }}>
        &ldquo;{ZLATAN_QUOTES[index]}&rdquo;
      </p>
    </div>
  );
}

/* ─── Draggable Zlatan avatar (landing page hero) ───────────────── */

function DraggableZlatan() {
  const elRef      = useRef(null);
  const dragRef    = useRef({ active: false, startX: 0, startY: 0, origX: 0, origY: 0, lastX: 0, lastY: 0 });
  const velRef     = useRef({ x: 0, y: 0 });
  const posRef     = useRef(null);            // null = use CSS default positioning
  const rafRef     = useRef(null);
  const [pos, setPos]       = useState(null);
  const [tilt, setTilt]     = useState(0);
  const [hintGone, setHintGone] = useState(false);

  const stopInertia = () => cancelAnimationFrame(rafRef.current);

  const applyInertia = useCallback(() => {
    velRef.current.x *= 0.88;
    velRef.current.y *= 0.88;
    const { x: vx, y: vy } = velRef.current;

    if (Math.abs(vx) < 0.4 && Math.abs(vy) < 0.4) {
      setTilt(0);
      return;
    }

    const next = {
      x: posRef.current.x + vx,
      y: posRef.current.y + vy,
    };
    posRef.current = next;
    setPos({ ...next });
    setTilt(vx * 0.5);
    rafRef.current = requestAnimationFrame(applyInertia);
  }, []);

  const onPointerDown = useCallback((e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setHintGone(true);
    stopInertia();

    // If first drag, capture current rendered position
    if (!posRef.current && elRef.current) {
      const parent = elRef.current.offsetParent ?? document.body;
      const pRect  = parent.getBoundingClientRect();
      const eRect  = elRef.current.getBoundingClientRect();
      posRef.current = { x: eRect.left - pRect.left, y: eRect.top - pRect.top };
      setPos({ ...posRef.current });
    }

    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origX:  posRef.current.x,
      origY:  posRef.current.y,
      lastX:  e.clientX,
      lastY:  e.clientY,
    };
    velRef.current = { x: 0, y: 0 };
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    velRef.current = {
      x: e.clientX - dragRef.current.lastX,
      y: e.clientY - dragRef.current.lastY,
    };
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;

    const next = { x: dragRef.current.origX + dx, y: dragRef.current.origY + dy };
    posRef.current = next;
    setPos({ ...next });
    setTilt(velRef.current.x * 0.5);
  }, []);

  const onPointerUp = useCallback(() => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    rafRef.current = requestAnimationFrame(applyInertia);
  }, [applyInertia]);

  useEffect(() => () => stopInertia(), []);

  const isDragged = pos !== null;

  return (
    /* Outer: handles position (left/top or right/top) + tilt */
    <div
      ref={elRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        position: 'absolute',
        zIndex: 15,                     // above lp-nav (10) and lp-hero-body (10)
        cursor: isDragged && dragRef.current.active ? 'grabbing' : 'grab',
        userSelect: 'none', touchAction: 'none',
        transform: `rotate(${tilt}deg)`,
        transition: dragRef.current.active ? 'none' : 'transform 0.25s ease',
        willChange: 'transform',
        ...(isDragged
          ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' }
          : { right: '8%', top: '38%' }),
      }}
    >
    {/* Inner: float animation only when not yet dragged (separate from tilt transform) */}
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      animation: isDragged ? 'none' : 'zlatanFloat 5s ease-in-out infinite',
    }}>
      {/* Decorative rings */}
      <CircleRing size={200} stroke="rgba(162,89,255,0.18)"
        style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
      <CircleRing size={150} stroke="rgba(10,207,131,0.12)"
        style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
      <CrossMark color="rgba(162,89,255,0.5)" size={12}
        style={{ position: 'absolute', top: -28, right: -22 }} />
      <CrossMark color="rgba(10,207,131,0.4)" size={10}
        style={{ position: 'absolute', bottom: -24, left: -20 }} />

      {/* Drag hint */}
      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
        color: 'rgba(200,157,255,0.55)',
        fontFamily: 'Space Grotesk, sans-serif',
        display: 'flex', alignItems: 'center', gap: 5,
        opacity: hintGone ? 0 : 1,
        transition: 'opacity 0.4s ease',
        pointerEvents: 'none',
      }}>
        <span style={{ fontSize: 11 }}>✥</span> DRAG ME
      </div>

      {/* Circular photo */}
      <div style={{
        width: 110, height: 110, borderRadius: '50%',
        overflow: 'hidden',
        border: '2.5px solid rgba(162,89,255,0.45)',
        boxShadow: '0 0 32px rgba(162,89,255,0.22), 0 0 64px rgba(162,89,255,0.1)',
      }}>
        <img
          src={ZLATAN_HERO_PHOTO}
          alt="Zlatan"
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: '50% 18%',
            filter: 'grayscale(10%) contrast(1.08)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Name badge — fully rounded pill */}
      <div style={{
        background: 'rgba(5,5,8,0.78)', backdropFilter: 'blur(10px)',
        border: '1px solid rgba(162,89,255,0.28)',
        borderRadius: 999, padding: '5px 14px',
        fontSize: 9, fontWeight: 800, letterSpacing: '0.18em',
        color: 'rgba(200,157,255,0.88)',
        fontFamily: 'Space Grotesk, sans-serif',
        whiteSpace: 'nowrap',
      }}>⚡ ZLATAN GRANITEVIC</div>

      {/* Cycling quote — rounded card */}
      <ZlatanQuote />
      </div>
    </div>
  );
}

/* ─── Loading screen (shown for 10s while YouTube preloads) ─────── */

function LoadingScreen({ visible }) {
  const [pct, setPct]       = useState(0);
  const [gone, setGone]     = useState(false);

  useEffect(() => {
    const DURATION = 10000;
    const TICK     = 80;
    let elapsed    = 0;
    const id = setInterval(() => {
      elapsed += TICK;
      setPct(Math.min(100, Math.round((elapsed / DURATION) * 100)));
      if (elapsed >= DURATION) clearInterval(id);
    }, TICK);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // After fade-out transition (0.6s), remove from layout entirely
    if (!visible) {
      const t = setTimeout(() => setGone(true), 700);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (gone) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#050508',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, transition: 'opacity 0.6s ease', opacity: visible ? 1 : 0,
      pointerEvents: visible ? 'all' : 'none',
    }}>
      {/* Decorative ring */}
      <svg width={320} height={320} viewBox="0 0 320 320"
        style={{ position: 'absolute', opacity: 0.06, pointerEvents: 'none' }}>
        <circle cx={160} cy={160} r={158} fill="none" stroke="#fff" strokeWidth="1" />
        <circle cx={160} cy={160} r={100} fill="none" stroke="#fff" strokeWidth="1" />
      </svg>

      <div style={{
        fontFamily: 'var(--font-head)', fontSize: 52, fontWeight: 800,
        letterSpacing: '-0.05em', color: '#f4f3ee', marginBottom: 6,
      }}>
        The Special Replay
      </div>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.28em',
        color: 'rgba(244,243,238,0.22)', marginBottom: 56,
      }}>
        TACTICAL INTELLIGENCE
      </div>

      {/* Progress bar */}
      <div style={{ width: 180, height: 1, background: 'rgba(255,255,255,0.08)', position: 'relative' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          background: '#0acf83', width: `${pct}%`,
          transition: 'width 0.08s linear',
        }} />
      </div>
      <div style={{
        fontSize: 10, color: 'rgba(244,243,238,0.18)', marginTop: 14,
        fontFamily: 'var(--font-head)', fontWeight: 700, letterSpacing: '0.12em',
      }}>
        {pct < 100 ? `LOADING ${pct}%` : 'READY'}
      </div>
    </div>
  );
}

/* ─── Geometric SVG decorations ─────────────────────────────────── */

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

function DotGrid({ cols = 8, rows = 6, gap = 28, color = 'rgba(0,0,0,0.12)', style }) {
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

/* ─── Slide 1: The Special Replay ───────────────────────────────────────────── */

function TSRSlide({ onEnter }) {
  const E = ({ e, size = 72, op = 0.45, rotate = 0, style }) => (
    <div style={{ position:'absolute', fontSize:size, lineHeight:1, opacity:op,
      pointerEvents:'none', userSelect:'none', zIndex:3,
      transform:`rotate(${rotate}deg)`, ...style }}>{e}</div>
  );
  return (
    <div className="lp-slide lp-slide-dark">
      {/* Geometric rings */}
      <CircleRing size={520} style={{ right: -100, top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }} />
      <CircleRing size={260} style={{ right: 110, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
      <CrossMark color="rgba(10,207,131,0.5)" size={16} style={{ left: '44%', top: '22%' }} />
      <CrossMark color="rgba(255,255,255,0.2)" size={12} style={{ left: '20%', bottom: '28%' }} />
      <CrossMark color="rgba(255,255,255,0.15)" size={10} style={{ right: '36%', top: '18%' }} />

      {/* Emoji cluster — right half, inside ring area */}
      <E e="⚽" size={180} op={0.55} rotate={-14} style={{ right:'9%', top:'50%', transform:'translateY(-60%) rotate(-14deg)' }} />
      <E e="🎯" size={72}  op={0.40} rotate={8}  style={{ right:'32%', top:'16%' }} />
      <E e="⚡" size={60}  op={0.35} rotate={-6} style={{ right:'38%', bottom:'20%' }} />
      <E e="🧠" size={52}  op={0.30} rotate={10} style={{ right:'22%', bottom:'26%' }} />
      <E e="📊" size={48}  op={0.28} rotate={-10}style={{ right:'18%', top:'18%' }} />

      <div className="lp-slide-inner">
        <div className="lp-slide-num">
          <span>01</span>
          <div className="lp-slide-num-line" />
        </div>
        <div className="lp-slide-content">
          <p className="lp-slide-label">TACTICAL ANALYSIS</p>
          <h2 className="lp-slide-title lp-dark-title">WHAT<br />IF?</h2>
          <p className="lp-slide-body">
            Place players anywhere on the pitch.<br />
            Assign actions. Let AI predict<br />
            the tactical outcome.
          </p>

          <div className="lp-emoji-row lp-emoji-row-dark">
            <span>⚽ Positioning</span>
            <span>🎯 Actions</span>
            <span>⚡ AI Predict</span>
          </div>

          <button className="lp-cta-btn lp-cta-dark" onClick={onEnter}>
            <span>Try The Special Replay</span>
            <div className="lp-cta-line" />
            <span className="lp-cta-arrow">→</span>
          </button>
        </div>
      </div>
      <div className="lp-slide-bottom-label lp-dl">POWERED BY IBM GRANITE</div>
    </div>
  );
}

/* ─── Slide 2: Rules ─────────────────────────────────────────────── */

function RulesSlide({ onEnter }) {
  const E = ({ e, size = 72, op = 0.4, rotate = 0, style }) => (
    <div style={{ position:'absolute', fontSize:size, lineHeight:1, opacity:op,
      pointerEvents:'none', userSelect:'none', zIndex:3,
      transform:`rotate(${rotate}deg)`, ...style }}>{e}</div>
  );
  return (
    <div className="lp-slide lp-slide-light">
      {/* Geometric decoration */}
      <DotGrid cols={10} rows={8} gap={32} color="rgba(0,0,0,0.08)"
        style={{ left: 60, top: '50%', transform: 'translateY(-50%)' }} />
      <CircleRing size={400} stroke="rgba(0,0,0,0.06)"
        style={{ left: -80, top: '50%', transform: 'translateY(-50%)' }} />
      <CrossMark color="rgba(0,0,0,0.18)" size={16} style={{ right: '25%', top: '22%' }} />
      <CrossMark color="rgba(0,0,0,0.1)"  size={10} style={{ right: '18%', bottom: '24%' }} />

      {/* Emoji cluster — left half, over the dot grid */}
      <E e="🚩" size={170} op={0.50} rotate={10}  style={{ left:'10%', top:'50%', transform:'translateY(-55%) rotate(10deg)' }} />
      <E e="🟨" size={68}  op={0.40} rotate={-8}  style={{ left:'34%', top:'15%' }} />
      <E e="⚽" size={58}  op={0.35} rotate={12}  style={{ left:'38%', bottom:'18%' }} />
      <E e="⚖️" size={52}  op={0.32} rotate={-12} style={{ left:'22%', bottom:'24%' }} />
      <E e="📋" size={48}  op={0.28} rotate={6}   style={{ left:'20%', top:'20%' }} />

      <div className="lp-slide-inner lp-slide-inner-right">
        <div className="lp-slide-num lp-slide-num-dark">
          <span>02</span>
          <div className="lp-slide-num-line lp-dark-line" />
        </div>
        <div className="lp-slide-content">
          <p className="lp-slide-label lp-label-dark">LAWS OF THE GAME</p>
          <h2 className="lp-slide-title lp-light-title">KNOW<br />THE<br />RULES.</h2>
          <p className="lp-slide-body lp-body-dark">
            Every law of football.<br />
            Animated diagrams. Interactive demos.<br />
            Quick quizzes after each rule.
          </p>

          <div className="lp-emoji-row lp-emoji-row-light">
            <span>🚩 Offside</span>
            <span>🟨 Cards</span>
            <span>📋 11 Rules</span>
          </div>

          <button className="lp-cta-btn lp-cta-light" onClick={onEnter}>
            <span>Explore Rules</span>
            <div className="lp-cta-line lp-cta-line-dark" />
            <span className="lp-cta-arrow">→</span>
          </button>
        </div>
      </div>
      <div className="lp-slide-bottom-label lp-ll">11 RULES · ANIMATED DEMOS · INTERACTIVE QUIZZES</div>
    </div>
  );
}

/* ─── Main Landing Page ──────────────────────────────────────────── */

export default function LandingPage({ onGoToApp, onGoToRules }) {
  // Loading gate — YouTube iframe preloads behind the loading screen.
  // loadingRef mirrors the state so stale closures (scroll/wheel effects
  // with [] deps) always read the current value via .current.
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(true);
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(false);
      loadingRef.current = false;
    }, 10000);
    return () => clearTimeout(t);
  }, []);

  // 'hero'  — normal scroll, video visible
  // 'pause' — body locked, transition bar sweeps, no horizontal yet
  // 'slides'— body locked, wheel drives horizontal progress
  const [phase, setPhase]                 = useState('hero');
  const [horizProgress, setHorizProgress] = useState(0);
  const [exiting, setExiting]             = useState(false);

  const phaseRef      = useRef(phase);
  const progressRef   = useRef(horizProgress);
  phaseRef.current    = phase;
  progressRef.current = horizProgress;

  const touchStartY  = useRef(0);
  const cooldownRef  = useRef(false);
  const pauseTimer   = useRef(null);

  // Lock body + brief pause → then show slides
  const enterSlides = () => {
    if (loadingRef.current || cooldownRef.current || phaseRef.current !== 'hero') return;
    document.body.style.overflow = 'hidden';
    setPhase('pause');
    pauseTimer.current = setTimeout(() => {
      setPhase('slides');
      setHorizProgress(0);
    }, 520); // matches transition-bar sweep duration
  };

  // Return to hero from pause or slides
  const exitSlides = () => {
    clearTimeout(pauseTimer.current);
    window.scrollTo(0, 0);            // reset while body still locked
    document.body.style.overflow = '';
    setPhase('hero');
    setHorizProgress(0);
    cooldownRef.current = true;
    setTimeout(() => { cooldownRef.current = false; }, 700);
  };

  // ── Vertical scroll → trigger transition ───────────────────────
  useEffect(() => {
    const onScroll = () => {
      if (phaseRef.current !== 'hero' || cooldownRef.current) return;
      if (window.scrollY >= window.innerHeight * 0.88) enterSlides();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []); // eslint-disable-line

  // ── Wheel + touch drive horizontal (slides phase only) ─────────
  useEffect(() => {
    const normPx = (e) =>
      e.deltaMode === 1 ? e.deltaY * 32
      : e.deltaMode === 2 ? e.deltaY * window.innerHeight
      : e.deltaY;

    const onWheel = (e) => {
      if (phaseRef.current !== 'slides') return;
      e.preventDefault();
      const delta = normPx(e) / (window.innerHeight * 1.2);
      const next  = progressRef.current + delta;
      if (next < -0.04) { exitSlides(); return; }
      setHorizProgress(Math.max(0, Math.min(1, next)));
    };

    const onTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
    const onTouchMove  = (e) => {
      if (phaseRef.current !== 'slides') return;
      e.preventDefault();
      const dy    = touchStartY.current - e.touches[0].clientY;
      touchStartY.current = e.touches[0].clientY;
      const delta = dy / window.innerHeight;
      const next  = progressRef.current + delta;
      if (next < -0.04) { exitSlides(); return; }
      setHorizProgress(Math.max(0, Math.min(1, next)));
    };

    window.addEventListener('wheel',      onWheel,      { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true  });
    window.addEventListener('touchmove',  onTouchMove,  { passive: false });
    return () => {
      window.removeEventListener('wheel',      onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove',  onTouchMove);
    };
  }, []); // eslint-disable-line

  // Cleanup on unmount
  useEffect(() => () => {
    clearTimeout(pauseTimer.current);
    document.body.style.overflow = '';
  }, []);

  const horizPct   = horizProgress * 100; // 0–100
  const activeSlide = horizPct < 50 ? 0 : 1;

  const navigate = (fn) => {
    document.body.style.overflow = '';
    setExiting(true);
    setTimeout(fn, 480);
  };

  return (
    <div className={`lp-root ${exiting ? 'lp-exit' : ''}`}>

      {/* ══ LOADING SCREEN — 10s overlay while YouTube preloads ══════ */}
      <LoadingScreen visible={loading} />

      {/* ══ HERO — inside a 200vh zone so sticky scroll works ════════ */}
      <div className="lp-hero-zone">
      <section className="lp-hero" style={{
        opacity: loading ? 0 : 1,
        transition: loading ? 'none' : 'opacity 1.2s ease',
      }}>

        <div className="lp-video-wrap" aria-hidden="true">
          <iframe
            src="https://www.youtube.com/embed/HsSJT-lGa9s?autoplay=1&mute=1&loop=1&playlist=HsSJT-lGa9s&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&enablejsapi=1"
            allow="autoplay; encrypted-media"
            title="Background reel"
            frameBorder="0"
            tabIndex="-1"
          />
        </div>

        <div className="lp-hero-overlay" />

        <CircleRing size={700} style={{ right: -180, bottom: -180, opacity: 0.5 }} />
        <CrossMark color="rgba(10,207,131,0.6)" size={14} style={{ left: '30%', top: '30%' }} />
        <CrossMark color="rgba(255,255,255,0.3)" size={10} style={{ left: '60%', bottom: '30%' }} />
        <CrossMark color="rgba(255,255,255,0.2)" size={10} style={{ left: '10%', top: '60%' }} />

        {/* ── Zlatan floating avatar (draggable) ── */}
        <DraggableZlatan />

        <nav className="lp-nav">
          <div className="lp-nav-logo">
            <span className="lp-nav-logo-mark">⚽</span>
            <span>The Special Replay</span>
          </div>
          <button className="lp-nav-rules" onClick={() => navigate(onGoToRules)}>
            Rules ↗
          </button>
        </nav>

        <div className="lp-hero-body">
          <p className="lp-hero-eyebrow">
            <span className="lp-eyebrow-dot" />
            FOOTBALL TACTICAL INTELLIGENCE
          </p>
          <h1 className="lp-hero-h1">
            <span className="lp-h1-line">READ</span>
            <span className="lp-h1-line lp-h1-outline">THE</span>
            <span className="lp-h1-line">GAME.</span>
          </h1>
          <p className="lp-hero-sub">
            AI-powered analysis · Interactive pitch · IBM Granite predictions
          </p>
        </div>

        <div className="lp-scroll-hint" aria-hidden="true">
          <div className="lp-scroll-line-wrap">
            <div className="lp-scroll-line-track" />
          </div>
          <span className="lp-scroll-label">SCROLL</span>
        </div>
      </section>
      </div>{/* end lp-hero-zone */}

      {/* ══ TRANSITION BAR — sweeps during pause phase ═══════════════ */}
      <div className={`lp-tbar ${phase === 'pause' || phase === 'slides' ? 'lp-tbar-active' : ''}`} />

      {/* ══ HORIZONTAL SLIDES — fixed overlay, no vertical scroll ════ */}
      {/* Visible from 'pause' phase onward so there's no black gap.
          Pointer events only enabled in 'slides' phase (wheel handler guards too). */}
      <div
        className={`lp-slides-overlay ${phase !== 'hero' ? 'lp-slides-in' : ''}`}
        style={{ pointerEvents: phase === 'slides' ? 'auto' : 'none' }}
      >

        {/* Top progress bar */}
        <div className="lp-hs-progress">
          <div className="lp-hs-progress-fill" style={{ width: `${horizPct}%` }} />
        </div>

        {/* Slide track — translateX drives horizontal */}
        <div className="lp-hs-track" style={{ transform: `translateX(${-horizPct}vw)` }}>
          <TSRSlide onEnter={() => navigate(onGoToApp)} />
          <RulesSlide   onEnter={() => navigate(onGoToRules)} />
        </div>

        {/* Back-to-hero hint (top-left corner) */}
        <button className="lp-slides-back" onClick={exitSlides} aria-label="Back to hero">
          ↑ Back
        </button>

        {/* Slide indicator dots */}
        <div className="lp-hs-dots">
          <button
            className={`lp-hs-dot ${activeSlide === 0 ? 'lp-dot-active' : ''}`}
            onClick={() => setHorizProgress(0)}
            aria-label="The Special Replay"
          />
          <button
            className={`lp-hs-dot ${activeSlide === 1 ? 'lp-dot-active' : ''}`}
            onClick={() => setHorizProgress(1)}
            aria-label="Rules"
          />
        </div>

        {/* Current slide label (bottom right) */}
        <div className="lp-hs-slide-label">
          <span style={{ opacity: activeSlide === 0 ? 1 : 0, transition: 'opacity 0.3s' }}>The Special Replay</span>
          <span style={{ opacity: activeSlide === 1 ? 1 : 0, transition: 'opacity 0.3s', position: 'absolute' }}>Rules</span>
        </div>
      </div>

    </div>
  );
}
