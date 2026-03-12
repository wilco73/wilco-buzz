import { useState, useEffect } from 'react';
import { T, formatTime } from '../theme.js';

export default function OverlayView({ room }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval;
    if (room?.timerRunning && room?.timerStart) {
      const base = room.timerElapsed || 0;
      interval = setInterval(() => setElapsed(base + (Date.now() - room.timerStart)), 50);
    } else {
      setElapsed(room?.timerElapsed || 0);
    }
    return () => clearInterval(interval);
  }, [room?.timerRunning, room?.timerStart, room?.timerElapsed]);

  const buzzes = room?.buzzes || [];
  const timerIsActive = room?.timerRunning || (room?.timerElapsed > 0);
  const isCountdown = (room?.timerDuration || 0) > 0;

  let displayTime;
  if (isCountdown) {
    const totalMs = (room?.timerDuration || 0) * 1000;
    const remaining = Math.max(0, totalMs - elapsed);
    displayTime = (remaining / 1000).toFixed(1) + 's';
  } else {
    displayTime = (elapsed / 1000).toFixed(1) + 's';
  }

  return (
    <div style={{
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      background: 'transparent',
      padding: 20,
      minHeight: '100vh',
    }}>
      {/* Timer */}
      {timerIsActive && (
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            display: 'inline-block',
            padding: '12px 32px',
            borderRadius: 16,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${room?.timerExpired ? 'rgba(255,23,68,0.5)' : 'rgba(255,214,0,0.3)'}`,
          }}>
            <span style={{
              fontFamily: "'Orbitron', monospace",
              fontSize: 48, fontWeight: 900,
              color: room?.timerExpired ? T.danger : T.yellow,
              textShadow: `0 0 20px ${room?.timerExpired ? 'rgba(255,23,68,0.5)' : 'rgba(255,214,0,0.5)'}`,
            }}>{displayTime}</span>
            {room?.timerExpired && (
              <div style={{
                color: T.danger, fontSize: 12, fontWeight: 700,
                letterSpacing: 2, marginTop: 4,
              }}>TEMPS ÉCOULÉ</div>
            )}
          </div>
        </div>
      )}

      {/* Buzz list */}
      {buzzes.length > 0 && (
        <div style={{
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(12px)',
          borderRadius: 16, padding: 16,
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 11, letterSpacing: 3, marginBottom: 12,
            textTransform: 'uppercase', textAlign: 'center',
          }}>BUZZ ORDER</div>
          {buzzes.map((b, i) => (
            <div key={b.playerId} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', borderRadius: 10,
              background: i === 0 ? 'rgba(255,214,0,0.15)' : 'rgba(255,255,255,0.03)',
              marginBottom: 6,
              animation: `overlaySlide 0.3s ease ${i * 0.1}s both`,
            }}>
              <span style={{
                fontFamily: "'Orbitron', monospace",
                fontSize: 16, fontWeight: 900, width: 32, textAlign: 'center',
                color: i === 0 ? T.yellow : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.4)',
              }}>#{i + 1}</span>
              <span style={{ fontSize: 22 }}>{b.avatar}</span>
              <span style={{
                color: '#fff', fontWeight: 700, fontSize: 15, flex: 1,
              }}>{b.pseudo}</span>
              <span style={{
                fontFamily: "'Orbitron', monospace",
                fontSize: 13, fontWeight: 700,
                color: i === 0 ? T.yellow : 'rgba(255,255,255,0.5)',
              }}>{formatTime(b.relativeTime)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Waiting state */}
      {buzzes.length === 0 && room?.buzzerEnabled && (
        <div style={{
          textAlign: 'center',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(12px)',
          borderRadius: 16, padding: '20px 24px',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: 13, letterSpacing: 2,
            fontFamily: "'JetBrains Mono', monospace",
          }}>⏳ En attente de buzz...</div>
        </div>
      )}

      <style>{`
        body { background: transparent !important; }
        @keyframes overlaySlide {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
