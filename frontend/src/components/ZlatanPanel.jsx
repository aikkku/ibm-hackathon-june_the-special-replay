import { useState, useRef, useEffect } from 'react';
import { getZlatanComment } from '../lib/api';

const PHOTO = 'https://icdn.football-italia.net/wp-content/uploads/2024/04/Zlatan-Ibrahimovic-Milan-sunglasses-770x513.jpg';

const EVENT_LABELS = {
  extraction: 'After extraction',
  adjustment: 'After adjustment',
  prediction: 'After prediction',
  rules: 'Reviewing the rule',
};

export default function ZlatanPanel({ comment, loading, event }) {
  const [messages, setMessages]     = useState([]);
  const [minimized, setMinimized]   = useState(false);
  const [inputText, setInputText]   = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  // typing animation for most-recent Zlatan message
  const [animIdx, setAnimIdx]       = useState(-1);
  const [typed, setTyped]           = useState('');
  const timerRef    = useRef(null);
  const prevComment = useRef(null);
  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);

  // Auto-expand when new auto-comment or loading
  useEffect(() => {
    if (loading || comment) setMinimized(false);
  }, [loading, comment]);

  // Push new auto-comment into messages
  useEffect(() => {
    if (comment && comment !== prevComment.current) {
      prevComment.current = comment;
      pushZlatan(comment);
    }
  }, [comment]); // eslint-disable-line

  // Scroll to bottom on any change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  function pushZlatan(text) {
    setMessages(prev => {
      const next = [...prev, { role: 'zlatan', text }];
      const idx  = next.length - 1;
      startTyping(text, idx);
      return next;
    });
  }

  function startTyping(text, idx) {
    clearInterval(timerRef.current);
    setAnimIdx(idx);
    setTyped('');
    let i = 0;
    timerRef.current = setInterval(() => {
      i++;
      setTyped(text.slice(0, i));
      if (i >= text.length) clearInterval(timerRef.current);
    }, 20);
  }

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || chatLoading) return;
    setInputText('');
    setMinimized(false);
    setMessages(prev => [...prev, { role: 'user', text }]);
    setChatLoading(true);
    try {
      const data = await getZlatanComment('chat', { user_message: text });
      pushZlatan(data.comment ?? 'Zlatan is speechless. Almost.');
    } catch {
      pushZlatan('Even Zlatan cannot connect right now. The server fears Zlatan.');
    } finally {
      setChatLoading(false);
    }
  };

  // Nothing to show yet
  if (!loading && !comment && messages.length === 0) return null;

  /* ── Minimized bubble ─────────────────────────────────────── */
  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        title="Zlatan has something to say"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 2000,
          width: 54, height: 54, borderRadius: '50%',
          padding: 0, border: '2.5px solid rgba(162,89,255,0.55)',
          background: '#14082a',
          boxShadow: '0 4px 20px rgba(162,89,255,0.25), 0 8px 32px rgba(0,0,0,0.55)',
          cursor: 'pointer', overflow: 'hidden',
          animation: 'zlatanSlideIn 0.3s ease',
        }}
      >
        <img src={PHOTO} alt="Zlatan"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 15%' }} />
      </button>
    );
  }

  /* ── Expanded panel ──────────────────────────────────────── */
  const headerLabel = loading || chatLoading
    ? 'Thinking…'
    : EVENT_LABELS[event] ?? 'Chat with Zlatan';

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 2000,
      width: 340,
      background: 'rgba(10,6,18,0.97)',
      border: '1px solid rgba(162,89,255,0.22)',
      borderRadius: 18,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      boxShadow: '0 8px 40px rgba(162,89,255,0.12), 0 24px 64px rgba(0,0,0,0.7)',
      overflow: 'hidden',
      animation: 'zlatanSlideIn 0.3s ease',
      display: 'flex', flexDirection: 'column',
      maxHeight: '70vh',
    }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 14px 11px 12px',
        borderBottom: '1px solid rgba(162,89,255,0.1)',
        background: 'rgba(162,89,255,0.06)',
        flexShrink: 0,
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
          overflow: 'hidden', border: '2px solid rgba(162,89,255,0.45)',
          boxShadow: '0 0 12px rgba(162,89,255,0.3)',
        }}>
          <img src={PHOTO} alt="Zlatan"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 15%' }}
            onError={e => {
              e.target.style.display = 'none';
              e.target.parentNode.style.background = 'rgba(162,89,255,0.2)';
              e.target.parentNode.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#a259ff">Z</div>';
            }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.15em', color: '#c89dff', fontFamily: 'var(--font-head)' }}>
            ZLATAN GRANITEVIC
          </div>
          <div style={{ fontSize: 9, color: 'rgba(200,157,255,0.5)', marginTop: 2 }}>
            {headerLabel}
          </div>
        </div>
        <button
          onClick={() => setMinimized(true)}
          title="Minimize"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.35)', fontSize: 18, lineHeight: 1,
            padding: '4px 6px', borderRadius: 6, flexShrink: 0,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
        >–</button>
      </div>

      {/* ── Messages ── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px 14px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>

        {/* Initial loading spinner (before any messages) */}
        {loading && messages.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, minHeight: 40 }}>
            <span style={{ fontSize: 16, animation: 'pulse-ring 1.2s ease infinite', color: 'rgba(162,89,255,0.55)' }}>◌</span>
            <span style={{ fontSize: 13, fontStyle: 'italic', color: 'rgba(200,157,255,0.5)' }}>Zlatan is thinking…</span>
          </div>
        )}

        {messages.map((m, i) => {
          if (m.role === 'user') {
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{
                  maxWidth: '82%', padding: '8px 12px',
                  borderRadius: 14, borderBottomRightRadius: 4,
                  background: 'rgba(162,89,255,0.18)',
                  border: '1px solid rgba(162,89,255,0.25)',
                  fontSize: 12, color: 'rgba(244,243,238,0.85)', lineHeight: 1.55,
                }}>
                  {m.text}
                </div>
              </div>
            );
          }
          // Zlatan message
          const isAnimating = i === animIdx && typed.length < m.text.length;
          const displayText = i === animIdx ? typed : m.text;
          return (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{
                width: 2, flexShrink: 0, borderRadius: 1, alignSelf: 'stretch', minHeight: 24,
                background: 'linear-gradient(to bottom, #a259ff, rgba(162,89,255,0))',
              }} />
              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.7, fontStyle: 'italic', color: 'rgba(244,243,238,0.88)' }}>
                &ldquo;{displayText}
                {isAnimating && (
                  <span style={{ borderRight: '2px solid #a259ff', marginLeft: 1 }}>&nbsp;</span>
                )}
                &rdquo;
              </p>
            </div>
          );
        })}

        {/* Chat loading spinner */}
        {chatLoading && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 2, alignSelf: 'stretch', borderRadius: 1, background: 'rgba(162,89,255,0.3)', minHeight: 24 }} />
            <span style={{ fontSize: 14, animation: 'pulse-ring 1.2s ease infinite', color: 'rgba(162,89,255,0.55)' }}>◌</span>
            <span style={{ fontSize: 12, fontStyle: 'italic', color: 'rgba(200,157,255,0.45)' }}>Zlatan is thinking…</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Footer glow ── */}
      <div style={{ height: 1, flexShrink: 0, background: 'linear-gradient(to right, transparent, rgba(162,89,255,0.4), transparent)' }} />

      {/* ── Input ── */}
      <div style={{ padding: '10px 12px', display: 'flex', gap: 8, flexShrink: 0 }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Reply to Zlatan…"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 12,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(162,89,255,0.22)',
            color: '#f4f3ee', fontSize: 12, outline: 'none',
            fontFamily: 'var(--font-body)',
          }}
        />
        <button
          onClick={sendMessage}
          disabled={chatLoading || !inputText.trim()}
          style={{
            padding: '8px 14px', borderRadius: 12, flexShrink: 0,
            background: chatLoading || !inputText.trim() ? 'rgba(162,89,255,0.18)' : '#a259ff',
            border: '1px solid rgba(162,89,255,0.3)',
            cursor: chatLoading || !inputText.trim() ? 'default' : 'pointer',
            color: 'white', fontSize: 14, fontWeight: 700,
            transition: 'background 0.15s',
          }}
        >→</button>
      </div>
    </div>
  );
}
