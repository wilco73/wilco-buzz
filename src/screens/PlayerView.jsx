import { useState, useEffect } from 'react';
import { T, formatTime } from '../theme.js';

export default function PlayerView({ room, playerId, playerInfo, onBuzz, onLeave }) {
  const [pressing, setPressing] = useState(false);

  if (!room) {
    return (
      <div style={{
        minHeight: '100vh', background: T.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ color: T.textDim }}>Chargement...</div>
      </div>
    );
  }

  const player = room.players?.[playerId];
  const myBuzzes = room.buzzes?.filter((b) => b.playerId === playerId) || [];
  const myFirstBuzz = myBuzzes[0];
  const firstBuzzRank = room.buzzes?.findIndex((b) => b.playerId === playerId);
  const hasBuzzed = myBuzzes.length > 0;

  // In rebuzz mode: always active as long as buzzer is enabled and player not disabled
  // In standard/exclusive: active only if haven't buzzed yet
  const isRebuzzMode = room.buzzMode === 'rebuzz';
  const isBuzzerActive = room.buzzerEnabled && player && !player.buzzerDisabled
    && (isRebuzzMode || !hasBuzzed);

  const handleBuzz = async () => {
    if (!isBuzzerActive) return;
    setPressing(true);
    await onBuzz();
    setTimeout(() => setPressing(false), 200);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      position: 'relative',
      userSelect: 'none',
      WebkitUserSelect: 'none',
    }}>
      {/* Header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '16px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>{playerInfo.avatar}</span>
          <span style={{ color: T.text, fontWeight: 700, fontSize: 15 }}>
            {playerInfo.pseudo}
          </span>
        </div>
        <button onClick={onLeave} style={{
          padding: '8px 14px', borderRadius: 12,
          border: `1px solid ${T.border}`, background: 'transparent',
          color: T.textMuted, fontSize: 11, fontWeight: 700, cursor: 'pointer',
          fontFamily: "'JetBrains Mono', monospace",
        }}>Quitter</button>
      </div>

      {/* Room code */}
      <div style={{
        color: T.textMuted, fontSize: 12, letterSpacing: 3, marginBottom: 8,
      }}>ROOM {room.code}</div>

      {/* Buzz result */}
      {hasBuzzed && !isRebuzzMode && (
        <div style={{
          color: T.green,
          fontFamily: "'Orbitron', monospace",
          fontSize: 18, fontWeight: 700,
          marginBottom: 16, textAlign: 'center',
        }}>
          #{firstBuzzRank + 1}{myFirstBuzz.relativeTime > 0 ? ` — ${formatTime(myFirstBuzz.relativeTime)}` : ''}
        </div>
      )}
      {isRebuzzMode && hasBuzzed && (
        <div style={{
          color: T.orange,
          fontFamily: "'Orbitron', monospace",
          fontSize: 14, fontWeight: 700,
          marginBottom: 16, textAlign: 'center',
        }}>
          {myBuzzes.length} buzz{myBuzzes.length > 1 ? 'es' : ''}
        </div>
      )}

      {/* THE BUZZER */}
      <button
        onClick={handleBuzz}
        disabled={!isBuzzerActive}
        style={{
          width: 'min(280px, 70vw)',
          height: 'min(280px, 70vw)',
          borderRadius: '50%',
          border: 'none',
          cursor: isBuzzerActive ? 'pointer' : 'not-allowed',
          background: isBuzzerActive
            ? `radial-gradient(circle at 35% 35%, #ff4477, ${T.accent}, ${T.accentDim})`
            : hasBuzzed && !isRebuzzMode
              ? `radial-gradient(circle at 35% 35%, #1a6b3a, #0d4a25, #093018)`
              : `radial-gradient(circle at 35% 35%, #2a2a3a, #1a1a26, #12121a)`,
          boxShadow: isBuzzerActive
            ? `0 0 60px ${T.accentGlow}, 0 0 120px rgba(255,51,102,0.15), inset 0 -8px 24px rgba(0,0,0,0.3)`
            : hasBuzzed && !isRebuzzMode
              ? `0 0 40px ${T.greenGlow}, inset 0 -8px 24px rgba(0,0,0,0.3)`
              : 'inset 0 -8px 24px rgba(0,0,0,0.3)',
          transition: 'all 0.2s ease',
          transform: pressing ? 'scale(0.92)' : 'scale(1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column',
        }}
      >
        <span style={{
          fontSize: 'clamp(36px, 8vw, 56px)',
          fontWeight: 900,
          fontFamily: "'Orbitron', monospace",
          color: isBuzzerActive ? '#fff' : (hasBuzzed && !isRebuzzMode) ? T.green : T.textMuted,
          textShadow: isBuzzerActive ? '0 2px 20px rgba(255,255,255,0.3)' : 'none',
          letterSpacing: 4,
        }}>
          {(hasBuzzed && !isRebuzzMode) ? '✓' : 'BUZZ'}
        </span>
        {!isBuzzerActive && !hasBuzzed && (
          <span style={{
            fontSize: 11, color: T.textMuted, marginTop: 8, letterSpacing: 2,
            fontFamily: "'JetBrains Mono', monospace",
          }}>EN ATTENTE</span>
        )}
      </button>

      {/* Buzz order */}
      {room.buzzes?.length > 0 && (
        <div style={{ marginTop: 32, width: '100%', maxWidth: 320 }}>
          <div style={{
            color: T.textMuted, fontSize: 11, letterSpacing: 2,
            marginBottom: 10, textTransform: 'uppercase',
          }}>Ordre des buzz</div>
          {room.buzzes.map((b, i) => (
            <div key={`${b.playerId}-${b.time}`} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 10,
              background: b.playerId === playerId ? 'rgba(255,51,102,0.1)' : 'transparent',
              marginBottom: 4,
            }}>
              <span style={{
                color: i === 0 ? T.yellow : T.textDim,
                fontFamily: "'Orbitron', monospace",
                fontSize: 13, fontWeight: 800, width: 28,
              }}>#{i + 1}</span>
              <span style={{ fontSize: 18 }}>{b.avatar}</span>
              <span style={{
                color: b.playerId === playerId ? T.accent : T.text,
                fontSize: 13, fontWeight: 600, flex: 1,
              }}>{b.pseudo}</span>
              {b.relativeTime > 0 ? (
                <span style={{
                  color: T.textDim, fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>{formatTime(b.relativeTime)}</span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
