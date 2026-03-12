import { useState, useEffect, useRef } from 'react';
import { T, formatTime } from '../theme.js';

export default function AdminView({ room, socket, onLeave }) {
  const [streamerMode, setStreamerMode] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [pwVisible, setPwVisible] = useState(false);
  const timerRef = useRef(null);

  // Timer
  useEffect(() => {
    clearInterval(timerRef.current);
    if (room?.timerRunning && room?.timerStart) {
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - room.timerStart);
      }, 50);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(timerRef.current);
  }, [room?.timerRunning, room?.timerStart]);

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

  const players = Object.entries(room.players || {}).filter(([, p]) => !p.kicked);
  const buzzes = room.buzzes || [];
  const overlayUrl = `${window.location.origin}/#overlay-${room.code}`;

  const action = (event, data) => socket.emitNoAck(event, data);

  // Password reveal logic for streamer mode
  const handlePasswordClick = () => {
    if (!streamerMode) return;
    setPwVisible(true);
    setTimeout(() => setPwVisible(false), 2000);
  };

  const sectionTitle = (icon, label, count) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      marginBottom: 16,
    }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ color: T.text, fontSize: 15, fontWeight: 700, letterSpacing: 1 }}>
        {label}
      </span>
      {count !== undefined && (
        <span style={{
          background: T.surfaceHover, color: T.textDim,
          fontSize: 11, fontWeight: 700, padding: '2px 8px',
          borderRadius: 8, marginLeft: 4,
        }}>{count}</span>
      )}
    </div>
  );

  const smallBtn = (label, color, borderColor, onClick) => (
    <button onClick={onClick} style={{
      padding: '6px 12px', borderRadius: 8,
      border: `1px solid ${borderColor}`,
      background: 'transparent',
      color, fontSize: 11, fontWeight: 700, cursor: 'pointer',
      fontFamily: "'JetBrains Mono', monospace",
      transition: 'all 0.15s',
    }}>{label}</button>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      padding: 16,
    }}>
      {/* ─── TOP BAR ─── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 10, marginBottom: 20,
      }}>
        <h1 style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: 'clamp(16px, 4vw, 22px)',
          color: T.text, margin: 0, letterSpacing: 3,
        }}>🔴 ADMIN</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => setStreamerMode(!streamerMode)}
            style={{
              padding: '8px 14px', borderRadius: 10,
              border: `1px solid ${streamerMode ? '#9c27b0' : T.border}`,
              background: streamerMode ? 'rgba(156,39,176,0.15)' : 'transparent',
              color: streamerMode ? '#ce93d8' : T.textDim,
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >{streamerMode ? '📺 Streamer ON' : '📺 Streamer'}</button>
          <button onClick={onLeave} style={{
            padding: '8px 14px', borderRadius: 10,
            border: `1px solid ${T.border}`, background: 'transparent',
            color: T.textMuted, fontSize: 11, fontWeight: 700, cursor: 'pointer',
            fontFamily: "'JetBrains Mono', monospace",
          }}>Quitter</button>
        </div>
      </div>

      {/* ─── ROOM INFO ─── */}
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 16, padding: 20, marginBottom: 16,
        display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center',
      }}>
        <div>
          <div style={{ color: T.textDim, fontSize: 10, letterSpacing: 2, marginBottom: 4, textTransform: 'uppercase' }}>Code</div>
          <div style={{
            fontFamily: "'Orbitron', monospace", fontSize: 28,
            color: T.accent, letterSpacing: 8, fontWeight: 900,
          }}>{room.code}</div>
        </div>
        {room.password && (
          <div onClick={handlePasswordClick} style={{ cursor: streamerMode ? 'pointer' : 'default' }}>
            <div style={{ color: T.textDim, fontSize: 10, letterSpacing: 2, marginBottom: 4, textTransform: 'uppercase' }}>
              Mot de passe {streamerMode && '(clic pour révéler)'}
            </div>
            <div style={{
              fontFamily: "'Orbitron', monospace", fontSize: 20,
              color: T.yellow, letterSpacing: 4, fontWeight: 700,
              filter: streamerMode && !pwVisible ? 'blur(8px)' : 'none',
              transition: 'filter 0.3s',
            }}>{room.password}</div>
          </div>
        )}
        <div>
          <div style={{ color: T.textDim, fontSize: 10, letterSpacing: 2, marginBottom: 4, textTransform: 'uppercase' }}>Joueurs</div>
          <div style={{
            fontFamily: "'Orbitron', monospace", fontSize: 28,
            color: T.green, fontWeight: 900,
          }}>{players.length}</div>
        </div>
      </div>

      {/* ─── CONTROLS GRID ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 12, marginBottom: 16,
      }}>
        {/* Buzzer toggle */}
        <button
          onClick={() => action('admin:toggle-buzzer')}
          style={{
            background: room.buzzerEnabled ? 'rgba(0,230,118,0.08)' : T.surface,
            border: `2px solid ${room.buzzerEnabled ? T.green : T.border}`,
            borderRadius: 16, padding: 20, cursor: 'pointer',
            textAlign: 'center', transition: 'all 0.2s',
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 6 }}>
            {room.buzzerEnabled ? '🟢' : '🔴'}
          </div>
          <div style={{
            color: room.buzzerEnabled ? T.green : T.accent,
            fontSize: 12, fontWeight: 700, letterSpacing: 1,
            fontFamily: "'JetBrains Mono', monospace",
          }}>{room.buzzerEnabled ? 'BUZZER ACTIF' : 'BUZZER OFF'}</div>
        </button>

        {/* Rebuzz toggle */}
        <button
          onClick={() => action('admin:toggle-rebuzz')}
          style={{
            background: room.allowRebuzz ? 'rgba(255,145,0,0.08)' : T.surface,
            border: `2px solid ${room.allowRebuzz ? T.orange : T.border}`,
            borderRadius: 16, padding: 20, cursor: 'pointer',
            textAlign: 'center', transition: 'all 0.2s',
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 6 }}>
            {room.allowRebuzz ? '🔄' : '🚫'}
          </div>
          <div style={{
            color: room.allowRebuzz ? T.orange : T.textDim,
            fontSize: 12, fontWeight: 700, letterSpacing: 1,
            fontFamily: "'JetBrains Mono', monospace",
          }}>{room.allowRebuzz ? 'RE-BUZZ OK' : 'BUZZ UNIQUE'}</div>
        </button>

        {/* New round */}
        <button
          onClick={() => action('admin:new-round')}
          style={{
            background: 'rgba(255,214,0,0.08)', border: `2px solid ${T.yellow}`,
            borderRadius: 16, padding: 20, cursor: 'pointer',
            textAlign: 'center', transition: 'all 0.2s',
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 6 }}>⏱️</div>
          <div style={{
            color: T.yellow, fontSize: 12, fontWeight: 700, letterSpacing: 1,
            fontFamily: "'JetBrains Mono', monospace",
          }}>NOUVEAU ROUND</div>
        </button>

        {/* Reset */}
        <button
          onClick={() => action('admin:reset')}
          style={{
            background: T.surface, border: `2px solid ${T.border}`,
            borderRadius: 16, padding: 20, cursor: 'pointer',
            textAlign: 'center', transition: 'all 0.2s',
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 6 }}>🗑️</div>
          <div style={{
            color: T.textDim, fontSize: 12, fontWeight: 700, letterSpacing: 1,
            fontFamily: "'JetBrains Mono', monospace",
          }}>RESET TOUT</div>
        </button>
      </div>

      {/* ─── TIMER ─── */}
      {room.timerRunning && (
        <div style={{ textAlign: 'center', marginBottom: 16, padding: '8px 0' }}>
          <span style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: 'clamp(28px, 7vw, 48px)',
            color: T.yellow, fontWeight: 900, letterSpacing: 4,
            textShadow: '0 0 30px rgba(255,214,0,0.3)',
          }}>{(elapsed / 1000).toFixed(1)}s</span>
        </div>
      )}

      {/* ─── BUZZ LIST ─── */}
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 16, padding: 20, marginBottom: 16,
      }}>
        {sectionTitle('🔔', 'Buzz', buzzes.length)}
        {buzzes.length === 0 ? (
          <div style={{
            color: T.textMuted, textAlign: 'center',
            padding: 20, fontSize: 13,
          }}>Aucun buzz pour le moment</div>
        ) : (
          buzzes.map((b, i) => (
            <div key={b.playerId} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', borderRadius: 12,
              background: i === 0 ? 'rgba(255,214,0,0.08)' : T.surfaceHover,
              border: i === 0 ? '1px solid rgba(255,214,0,0.3)' : '1px solid transparent',
              marginBottom: 8,
            }}>
              <span style={{
                fontFamily: "'Orbitron', monospace",
                fontSize: 18, fontWeight: 900,
                color: i === 0 ? T.yellow : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : T.textDim,
                width: 36, textAlign: 'center',
              }}>#{i + 1}</span>
              <span style={{ fontSize: 24 }}>{b.avatar}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: T.text, fontWeight: 700, fontSize: 14 }}>{b.pseudo}</div>
              </div>
              <span style={{
                fontFamily: "'Orbitron', monospace",
                fontSize: 14, fontWeight: 700,
                color: i === 0 ? T.yellow : T.textDim,
              }}>{formatTime(b.relativeTime)}</span>
            </div>
          ))
        )}
      </div>

      {/* ─── PLAYER LIST ─── */}
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 16, padding: 20, marginBottom: 16,
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 8, marginBottom: 16,
        }}>
          {sectionTitle('👥', 'Joueurs', players.length)}
          <div style={{ display: 'flex', gap: 6 }}>
            {smallBtn('✅ Activer tous', T.green, 'rgba(0,230,118,0.3)',
              () => action('admin:enable-all-buzzers'))}
            {smallBtn('⛔ Bloquer tous', T.danger, 'rgba(255,23,68,0.3)',
              () => action('admin:disable-all-buzzers'))}
          </div>
        </div>

        {players.length === 0 ? (
          <div style={{
            color: T.textMuted, textAlign: 'center', padding: 20, fontSize: 13,
          }}>En attente de joueurs...</div>
        ) : (
          players.map(([pid, p]) => (
            <div key={pid} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 12,
              background: T.surfaceHover, marginBottom: 6,
              flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 22 }}>{p.avatar}</span>
              <span style={{
                color: T.text, fontWeight: 700, fontSize: 14,
                flex: 1, minWidth: 80,
              }}>{p.pseudo}</span>
              <span style={{
                fontSize: 10, padding: '3px 8px', borderRadius: 6,
                background: p.buzzerDisabled ? 'rgba(255,23,68,0.15)' : 'rgba(0,230,118,0.15)',
                color: p.buzzerDisabled ? T.danger : T.green,
                fontWeight: 700, letterSpacing: 1,
              }}>{p.buzzerDisabled ? 'BLOQUÉ' : 'ACTIF'}</span>
              {smallBtn(
                p.buzzerDisabled ? 'Débloquer' : 'Bloquer',
                p.buzzerDisabled ? T.green : T.orange,
                p.buzzerDisabled ? 'rgba(0,230,118,0.3)' : 'rgba(255,145,0,0.3)',
                () => action('admin:toggle-player-buzzer', { playerId: pid }),
              )}
              {smallBtn('Kick', T.danger, 'rgba(255,23,68,0.3)',
                () => action('admin:kick', { playerId: pid }),
              )}
            </div>
          ))
        )}
      </div>

      {/* ─── OVERLAY INFO ─── */}
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 16, padding: 20,
      }}>
        <button
          onClick={() => setShowOverlay(!showOverlay)}
          style={{
            background: 'none', border: 'none',
            color: T.text, fontSize: 15, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            padding: 0, letterSpacing: 1, width: '100%',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >📺 Overlay OBS {showOverlay ? '▾' : '▸'}</button>

        {showOverlay && (
          <div style={{ marginTop: 16 }}>
            <p style={{ color: T.textDim, fontSize: 12, lineHeight: 1.6, marginTop: 0 }}>
              Ajoute une source "Navigateur" (Browser Source) dans OBS avec l'URL ci-dessous.
              Active le fond transparent dans les propriétés de la source.
            </p>
            <div
              onClick={() => navigator.clipboard?.writeText(overlayUrl)}
              style={{
                background: T.bg, padding: '12px 16px', borderRadius: 10,
                color: T.accent, fontSize: 12, wordBreak: 'break-all',
                lineHeight: 1.6, border: `1px solid ${T.border}`,
                cursor: 'pointer',
              }}
              title="Cliquer pour copier"
            >{overlayUrl}</div>
            <p style={{ color: T.textMuted, fontSize: 11, marginTop: 8 }}>
              Clic sur l'URL pour copier — Dimensions recommandées : 500×700px
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
