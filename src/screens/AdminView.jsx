import { useState, useEffect, useRef } from 'react';
import { T, formatTime } from '../theme.js';

const BUZZ_MODES = {
  standard: { label: 'Standard', icon: '🔒', color: T.accent, desc: '1 buzz/joueur, admin débloque' },
  exclusive: { label: 'Exclusif', icon: '⚡', color: T.yellow, desc: 'Premier buzz gagne, tous bloqués' },
  rebuzz: { label: 'Re-buzz', icon: '🔄', color: T.orange, desc: 'Buzz illimité pour tous' },
};

const TIMER_PRESETS = [0, 10, 15, 20, 30, 45, 60, 90, 120];

export default function AdminView({ room, socket, onLeave, initialStreamerMode }) {
  const [streamerMode, setStreamerMode] = useState(initialStreamerMode || false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [pwVisible, setPwVisible] = useState(false);
  const [customDuration, setCustomDuration] = useState('');
  const timerRef = useRef(null);

  // Timer display
  useEffect(() => {
    clearInterval(timerRef.current);
    if (room?.timerRunning && room?.timerStart) {
      const base = room.timerElapsed || 0;
      timerRef.current = setInterval(() => {
        setElapsed(base + (Date.now() - room.timerStart));
      }, 50);
    } else {
      setElapsed(room?.timerElapsed || 0);
    }
    return () => clearInterval(timerRef.current);
  }, [room?.timerRunning, room?.timerStart, room?.timerElapsed]);

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
  const embedUrl = `${window.location.origin}/#embed-${room.code}`;
  const embedUrlWithPassword = room.password
    ? `${embedUrl}?password=${encodeURIComponent(room.password)}`
    : embedUrl;

  const action = (event, data) => socket.emitNoAck(event, data);

  const isCountdown = (room.timerDuration || 0) > 0;
  const timerIsActive = room.timerRunning || (room.timerElapsed > 0);

  // For countdown: display remaining time
  let displayTime;
  if (isCountdown) {
    const totalMs = room.timerDuration * 1000;
    const remaining = Math.max(0, totalMs - elapsed);
    displayTime = (remaining / 1000).toFixed(1) + 's';
  } else {
    displayTime = (elapsed / 1000).toFixed(1) + 's';
  }

  const handlePasswordClick = () => {
    if (!streamerMode) return;
    setPwVisible(true);
    setTimeout(() => setPwVisible(false), 2000);
  };

  const setDuration = (sec) => {
    action('admin:set-timer-duration', { duration: sec });
    setCustomDuration('');
  };

  const handleCustomDuration = () => {
    const val = parseInt(customDuration, 10);
    if (val > 0) {
      setDuration(val);
    }
  };

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
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
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
            }}
          >{streamerMode ? '📺 Streamer ON' : '📺 Streamer'}</button>
          <button onClick={onLeave} style={{
            padding: '8px 14px', borderRadius: 10,
            border: `1px solid ${T.border}`, background: 'transparent',
            color: T.textMuted, fontSize: 11, fontWeight: 700, cursor: 'pointer',
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
              Mot de passe {streamerMode && '(clic)'}
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

      {/* ─── BUZZER ON/OFF ─── */}
      <button
        onClick={() => action('admin:toggle-buzzer')}
        style={{
          width: '100%',
          background: room.buzzerEnabled ? 'rgba(0,230,118,0.1)' : T.surface,
          border: `2px solid ${room.buzzerEnabled ? T.green : T.border}`,
          borderRadius: 16, padding: '18px 24px', cursor: 'pointer',
          textAlign: 'center', transition: 'all 0.2s',
          marginBottom: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        }}
      >
        <span style={{ fontSize: 28 }}>{room.buzzerEnabled ? '🟢' : '🔴'}</span>
        <span style={{
          fontFamily: "'Orbitron', monospace",
          color: room.buzzerEnabled ? T.green : T.accent,
          fontSize: 16, fontWeight: 800, letterSpacing: 2,
        }}>{room.buzzerEnabled ? 'BUZZERS ACTIFS' : 'BUZZERS DÉSACTIVÉS'}</span>
      </button>

      {/* ─── BUZZ MODE ─── */}
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 16, padding: 16, marginBottom: 12,
      }}>
        <div style={{ color: T.textDim, fontSize: 10, letterSpacing: 2, marginBottom: 10, textTransform: 'uppercase' }}>
          Mode de buzz
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {Object.entries(BUZZ_MODES).map(([key, cfg]) => {
            const active = room.buzzMode === key;
            return (
              <button
                key={key}
                onClick={() => action('admin:set-buzz-mode', { mode: key })}
                style={{
                  padding: '12px 8px', borderRadius: 12, cursor: 'pointer',
                  border: `2px solid ${active ? cfg.color : T.border}`,
                  background: active ? `${cfg.color}15` : 'transparent',
                  textAlign: 'center', transition: 'all 0.2s',
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 4 }}>{cfg.icon}</div>
                <div style={{
                  color: active ? cfg.color : T.textDim,
                  fontSize: 12, fontWeight: 700, letterSpacing: 0.5,
                }}>{cfg.label}</div>
                <div style={{ color: T.textMuted, fontSize: 9, marginTop: 4, lineHeight: 1.3 }}>{cfg.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── TIMER ─── */}
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 16, padding: 16, marginBottom: 12,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 12, flexWrap: 'wrap', gap: 8,
        }}>
          <div style={{ color: T.textDim, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>
            ⏱️ Timer {isCountdown ? '(Décompte)' : '(Chrono)'}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {!room.timerRunning && elapsed === 0 && (
              smallBtn('▶ Start', T.green, 'rgba(0,230,118,0.3)',
                () => action('admin:timer-start'))
            )}
            {room.timerRunning && (
              smallBtn('⏸ Pause', T.yellow, 'rgba(255,214,0,0.3)',
                () => action('admin:timer-pause'))
            )}
            {!room.timerRunning && elapsed > 0 && !room.timerExpired && (
              smallBtn('▶ Reprendre', T.green, 'rgba(0,230,118,0.3)',
                () => action('admin:timer-resume'))
            )}
            {(room.timerRunning || elapsed > 0) && (
              smallBtn('⏹ Stop', T.danger, 'rgba(255,23,68,0.3)',
                () => action('admin:timer-stop'))
            )}
          </div>
        </div>

        {/* Timer duration config */}
        <div style={{ marginBottom: timerIsActive ? 12 : 0 }}>
          <div style={{
            color: T.textMuted, fontSize: 10, letterSpacing: 1,
            marginBottom: 8, textTransform: 'uppercase',
          }}>Durée</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {TIMER_PRESETS.map((sec) => (
              <button
                key={sec}
                onClick={() => setDuration(sec)}
                style={{
                  padding: '6px 10px', borderRadius: 8,
                  border: `1px solid ${(room.timerDuration || 0) === sec ? T.yellow : T.border}`,
                  background: (room.timerDuration || 0) === sec ? 'rgba(255,214,0,0.1)' : 'transparent',
                  color: (room.timerDuration || 0) === sec ? T.yellow : T.textDim,
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >{sec === 0 ? '∞' : `${sec}s`}</button>
            ))}
            {/* Custom input */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input
                type="number"
                placeholder="..."
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomDuration()}
                style={{
                  width: 50,
                  background: T.bg,
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  color: T.text,
                  padding: '6px 8px',
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                  outline: 'none',
                  textAlign: 'center',
                }}
              />
              <button
                onClick={handleCustomDuration}
                style={{
                  padding: '6px 8px', borderRadius: 8,
                  border: `1px solid ${T.border}`,
                  background: 'transparent',
                  color: T.textDim, fontSize: 11, cursor: 'pointer',
                }}
              >OK</button>
            </div>
          </div>
          <div style={{ color: T.textMuted, fontSize: 9, marginTop: 6 }}>
            ∞ = chrono libre (compte vers le haut). Sinon = décompte, buzzers désactivés à 0.
          </div>
        </div>

        {/* Timer display */}
        {timerIsActive && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <span style={{
              fontFamily: "'Orbitron', monospace",
              fontSize: 'clamp(28px, 7vw, 48px)',
              color: room.timerExpired ? T.danger : room.timerRunning ? T.yellow : T.textDim,
              fontWeight: 900, letterSpacing: 4,
              textShadow: room.timerRunning ? '0 0 30px rgba(255,214,0,0.3)' : 'none',
            }}>{displayTime}</span>
            {room.timerExpired && (
              <div style={{
                color: T.danger, fontSize: 12, fontWeight: 700,
                letterSpacing: 2, marginTop: 4, textTransform: 'uppercase',
                animation: 'blink 1s ease-in-out infinite',
              }}>⏰ TEMPS ÉCOULÉ</div>
            )}
            {!room.timerRunning && elapsed > 0 && !room.timerExpired && (
              <div style={{
                color: T.textMuted, fontSize: 10, letterSpacing: 2,
                marginTop: 4, textTransform: 'uppercase',
              }}>En pause</div>
            )}
          </div>
        )}
      </div>

      {/* ─── QUICK ACTIONS ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 10, marginBottom: 16,
      }}>
        <button
          onClick={() => action('admin:new-round', { withTimer: true })}
          style={{
            background: 'rgba(255,214,0,0.08)', border: `2px solid ${T.yellow}`,
            borderRadius: 14, padding: 16, cursor: 'pointer',
            textAlign: 'center', transition: 'all 0.2s',
          }}
        >
          <div style={{ fontSize: 22, marginBottom: 4 }}>⏱️</div>
          <div style={{ color: T.yellow, fontSize: 11, fontWeight: 700 }}>
            Nouveau round<br /><span style={{ fontSize: 9, color: T.textDim }}>+ timer</span>
          </div>
        </button>

        <button
          onClick={() => action('admin:new-round', { withTimer: false })}
          style={{
            background: 'rgba(0,230,118,0.06)', border: `2px solid rgba(0,230,118,0.4)`,
            borderRadius: 14, padding: 16, cursor: 'pointer',
            textAlign: 'center', transition: 'all 0.2s',
          }}
        >
          <div style={{ fontSize: 22, marginBottom: 4 }}>🔄</div>
          <div style={{ color: T.green, fontSize: 11, fontWeight: 700 }}>
            Nouveau round<br /><span style={{ fontSize: 9, color: T.textDim }}>sans timer</span>
          </div>
        </button>

        <button
          onClick={() => action('admin:clear-buzzes')}
          style={{
            background: T.surface, border: `2px solid ${T.border}`,
            borderRadius: 14, padding: 16, cursor: 'pointer',
            textAlign: 'center', transition: 'all 0.2s',
          }}
        >
          <div style={{ fontSize: 22, marginBottom: 4 }}>🧹</div>
          <div style={{ color: T.textDim, fontSize: 11, fontWeight: 700 }}>
            Effacer buzz<br /><span style={{ fontSize: 9 }}>garder timer</span>
          </div>
        </button>

        <button
          onClick={() => action('admin:reset')}
          style={{
            background: T.surface, border: `2px solid ${T.border}`,
            borderRadius: 14, padding: 16, cursor: 'pointer',
            textAlign: 'center', transition: 'all 0.2s',
          }}
        >
          <div style={{ fontSize: 22, marginBottom: 4 }}>🗑️</div>
          <div style={{ color: T.textMuted, fontSize: 11, fontWeight: 700 }}>Reset tout</div>
        </button>
      </div>

      {/* ─── BUZZ LIST ─── */}
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 16, padding: 20, marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 16 }}>🔔</span>
          <span style={{ color: T.text, fontSize: 15, fontWeight: 700, letterSpacing: 1 }}>Buzz</span>
          <span style={{
            background: T.surfaceHover, color: T.textDim,
            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
          }}>{buzzes.length}</span>
        </div>

        {buzzes.length === 0 ? (
          <div style={{ color: T.textMuted, textAlign: 'center', padding: 20, fontSize: 13 }}>
            Aucun buzz pour le moment
          </div>
        ) : (
          buzzes.map((b, i) => (
            <div key={`${b.playerId}-${b.time}`} style={{
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
              {b.relativeTime > 0 ? (
                <span style={{
                  fontFamily: "'Orbitron', monospace",
                  fontSize: 14, fontWeight: 700,
                  color: i === 0 ? T.yellow : T.textDim,
                }}>{formatTime(b.relativeTime)}</span>
              ) : null}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>👥</span>
            <span style={{ color: T.text, fontSize: 15, fontWeight: 700, letterSpacing: 1 }}>Joueurs</span>
            <span style={{
              background: T.surfaceHover, color: T.textDim,
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
            }}>{players.length}</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {smallBtn('✅ Activer tous', T.green, 'rgba(0,230,118,0.3)',
              () => action('admin:enable-all-buzzers'))}
            {smallBtn('⛔ Bloquer tous', T.danger, 'rgba(255,23,68,0.3)',
              () => action('admin:disable-all-buzzers'))}
          </div>
        </div>

        {players.length === 0 ? (
          <div style={{ color: T.textMuted, textAlign: 'center', padding: 20, fontSize: 13 }}>
            En attente de joueurs...
          </div>
        ) : (
          players.map(([pid, p]) => (
            <div key={pid} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 12,
              background: T.surfaceHover, marginBottom: 6, flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 22 }}>{p.avatar}</span>
              <span style={{
                color: T.text, fontWeight: 700, fontSize: 14, flex: 1, minWidth: 80,
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

      {/* ─── OVERLAY ─── */}
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
          }}
        >📺 Overlay OBS {showOverlay ? '▾' : '▸'}</button>

        {showOverlay && (
          <div style={{ marginTop: 16 }}>
            <p style={{ color: T.textDim, fontSize: 12, lineHeight: 1.6, marginTop: 0 }}>
              Source "Navigateur" dans OBS. Fond transparent activé.
            </p>
            <div
              onClick={() => navigator.clipboard?.writeText(overlayUrl)}
              style={{
                background: T.bg, padding: '12px 16px', borderRadius: 10,
                color: T.accent, fontSize: 12, wordBreak: 'break-all',
                lineHeight: 1.6, border: `1px solid ${T.border}`, cursor: 'pointer',
              }}
              title="Cliquer pour copier"
            >{overlayUrl}</div>
            <p style={{ color: T.textMuted, fontSize: 11, marginTop: 8 }}>
              Clic pour copier — 500×700px recommandé
            </p>
          </div>
        )}
      </div>

      {/* ─── EMBED ─── */}
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 16, padding: 20, marginTop: 16,
      }}>
        <button
          onClick={() => setShowEmbed(!showEmbed)}
          style={{
            background: 'none', border: 'none',
            color: T.text, fontSize: 15, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            padding: 0, letterSpacing: 1, width: '100%',
          }}
        >🔗 Intégration embed {showEmbed ? '▾' : '▸'}</button>

        {showEmbed && (
          <div style={{ marginTop: 16 }}>
            <p style={{ color: T.textDim, fontSize: 12, lineHeight: 1.6, marginTop: 0 }}>
              Intègre le buzzer via iframe dans une autre app.
            </p>
            <div
              onClick={() => navigator.clipboard?.writeText(embedUrlWithPassword)}
              style={{
                background: T.bg, padding: '12px 16px', borderRadius: 10,
                color: T.accent, fontSize: 12, wordBreak: 'break-all',
                lineHeight: 1.6, border: `1px solid ${T.border}`, cursor: 'pointer',
                marginBottom: 8,
              }}
              title="Cliquer pour copier"
            >{embedUrlWithPassword}</div>
            <div
              onClick={() => {
                const iframe = `<iframe src="${embedUrlWithPassword}" style="width:100%;height:400px;border:none;"></iframe>`;
                navigator.clipboard?.writeText(iframe);
              }}
              style={{
                background: T.bg, padding: '12px 16px', borderRadius: 10,
                color: T.green, fontSize: 11, wordBreak: 'break-all',
                lineHeight: 1.6, border: `1px solid ${T.border}`, cursor: 'pointer',
              }}
              title="Cliquer pour copier"
            >{`<iframe src="${embedUrlWithPassword}" style="width:100%;height:400px;border:none;"></iframe>`}</div>
            <p style={{ color: T.textMuted, fontSize: 11, marginTop: 8, lineHeight: 1.6 }}>
              Clic pour copier. Ajouter <span style={{ color: T.text }}>?pseudo=X&avatar=🦊</span> pour auto-join.
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
