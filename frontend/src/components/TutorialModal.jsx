import { useEffect, useState } from 'react';

const STORAGE_KEY = 'tsr_tutorial_v1';

const TIPS = [
  {
    icon: '▶',
    title: 'Play & find the moment',
    body: 'Use the clip selector to load a video, then play it until you reach the tactical moment you want to analyse — a build-up, a corner, a counter attack.',
  },
  {
    icon: '⏸',
    title: 'Pause at the right instant',
    body: 'Pause when players are in their natural positions — not mid-sprint or during a dead ball. The AI reads the exact frozen frame, so a clean still gives the best result.',
  },
  {
    icon: '📐',
    title: 'Camera angle matters',
    body: "Elevated broadcast angles (high side-on or bird’s eye) produce the most accurate pitch mapping. Behind-goal or handheld angles reduce accuracy.",
  },
  {
    icon: '⚡',
    title: 'Extract, then predict',
    body: 'Click "Extract This Frame" to run the AI pipeline. Once players appear on the 2D pitch, drag any to correct their placement, then select a player and predict a tactical outcome with IBM Granite.',
  },
];

export function useTutorial() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setShow(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setShow(false);
  };

  return { show, dismiss };
}

export default function TutorialModal({ onDismiss }) {
  const [step, setStep] = useState(0);
  const total = TIPS.length;
  const tip = TIPS[step];
  const isLast = step === total - 1;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(5,5,8,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, animation: 'fade-in 0.3s ease',
    }}>
      <div style={{
        background: '#0f0f12', border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 16, width: '100%', maxWidth: 420,
        overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
      }}>

        {/* Header */}
        <div style={{
          padding: '20px 22px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{
            fontFamily: 'var(--font-head)', fontWeight: 800,
            fontSize: 13, letterSpacing: '-0.02em', color: '#f4f3ee',
          }}>
            The Special Replay
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.15em',
            color: 'rgba(255,255,255,0.25)',
          }}>
            {step + 1} / {total}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ margin: '12px 22px 0', height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 999 }}>
          <div style={{
            height: '100%', borderRadius: 999, background: '#0acf83',
            width: `${((step + 1) / total) * 100}%`,
            transition: 'width 0.35s ease',
          }} />
        </div>

        {/* Tip content */}
        <div style={{ padding: '28px 22px 24px', minHeight: 180 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'rgba(10,207,131,0.1)', border: '1px solid rgba(10,207,131,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, marginBottom: 18,
          }}>
            {tip.icon}
          </div>
          <div style={{
            fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 17,
            letterSpacing: '-0.02em', color: '#f4f3ee', marginBottom: 10,
          }}>
            {tip.title}
          </div>
          <div style={{
            fontSize: 13, color: 'rgba(244,243,238,0.5)', lineHeight: 1.7,
          }}>
            {tip.body}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '0 22px 20px',
          display: 'flex', gap: 10, alignItems: 'center',
        }}>
          {/* Dots */}
          <div style={{ display: 'flex', gap: 5, flex: 1 }}>
            {TIPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                style={{
                  width: i === step ? 18 : 6, height: 6, borderRadius: 999,
                  background: i === step ? '#0acf83' : 'rgba(255,255,255,0.15)',
                  border: 'none', cursor: 'pointer', padding: 0,
                  transition: 'all 0.25s ease',
                }}
              />
            ))}
          </div>

          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              style={{
                padding: '9px 16px', borderRadius: 8, cursor: 'pointer',
                background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600,
                fontFamily: 'var(--font-head)',
              }}
            >
              Back
            </button>
          )}

          <button
            onClick={isLast ? onDismiss : () => setStep(s => s + 1)}
            style={{
              padding: '9px 20px', borderRadius: 8, cursor: 'pointer',
              background: isLast ? '#0acf83' : 'rgba(255,255,255,0.07)',
              border: isLast ? 'none' : '1px solid rgba(255,255,255,0.1)',
              color: isLast ? '#0b0b0e' : '#f4f3ee',
              fontSize: 12, fontWeight: 700,
              fontFamily: 'var(--font-head)', letterSpacing: '0.01em',
              transition: 'all 0.2s ease',
            }}
          >
            {isLast ? 'Start Analysing' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
