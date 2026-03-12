import { useState, useEffect, useCallback } from 'react';
import { T, formatTime } from '../theme.js';

/**
 * EmbedView — Vue minimaliste pour intégration iframe.
 * 
 * URL: /#embed-ROOMCODE?pseudo=Jean&avatar=🦊&password=ABC123
 * 
 * postMessage API (parent → iframe):
 *   { type: 'buzzer:reset' }         — Réinitialise l'état du buzz du joueur
 *   { type: 'buzzer:enable' }        — Force l'activation du buzzer (visuel uniquement)
 *   { type: 'buzzer:disable' }       — Force la désactivation du buzzer (visuel uniquement)
 * 
 * postMessage API (iframe → parent):
 *   { type: 'buzzer:ready',   playerId, pseudo, avatar }
 *   { type: 'buzzer:buzzed',  playerId, pseudo, avatar, rank, relativeTime }
 *   { type: 'buzzer:update',  buzzes: [...], buzzerEnabled, timerRunning }
 *   { type: 'buzzer:kicked',  playerId }
 *   { type: 'buzzer:closed' }
 *   { type: 'buzzer:error',   error: string }
 */

export default function EmbedView({ roomCode, params, socket }) {
  const [room, setRoom] = useState(null);
  const [playerId, setPlayerId] = useState('');
  const [playerInfo, setPlayerInfo] = useState(null);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');
  const [pressing, setPressing] = useState(false);
  // For manual pseudo entry if not provided via URL
  const [manualPseudo, setManualPseudo] = useState('');

  const pseudo = params.pseudo;
  const avatar = params.avatar || '🎮';
  const password = params.password || '';
  const autoJoin = !!pseudo; // Auto-join if pseudo is provided

  // Notify parent
  const notifyParent = useCallback((data) => {
    try {
      window.parent.postMessage(data, '*');
    } catch { /* not in iframe, ignore */ }
  }, []);

  // Listen for messages from parent
  useEffect(() => {
    const handler = (event) => {
      const { type } = event.data || {};
      if (type === 'buzzer:reset' || type === 'buzzer:enable' || type === 'buzzer:disable') {
        // These are informational — actual state is managed by admin via socket
        // But we forward to let the UI know
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Listen for socket updates
  useEffect(() => {
    const unsub1 = socket.on('room-update', (data) => {
      setRoom((prevRoom) => {
        // Detect if we just buzzed (new buzz with our playerId that wasn't there before)
        if (playerId && data.buzzes) {
          const myNewBuzz = data.buzzes.find(b => b.playerId === playerId);
          const myOldBuzz = prevRoom?.buzzes?.find(b => b.playerId === playerId);
          if (myNewBuzz && !myOldBuzz) {
            const rank = data.buzzes.findIndex(b => b.playerId === playerId);
            notifyParent({
              type: 'buzzer:buzzed',
              playerId,
              pseudo: playerInfo?.pseudo,
              avatar: playerInfo?.avatar,
              rank,
              relativeTime: myNewBuzz.relativeTime,
            });
          }
        }
        return data;
      });
      notifyParent({
        type: 'buzzer:update',
        buzzes: data.buzzes,
        buzzerEnabled: data.buzzerEnabled,
        timerRunning: data.timerRunning,
      });
    });
    const unsub2 = socket.on('kicked', () => {
      notifyParent({ type: 'buzzer:kicked', playerId });
      setError('Expulsé de la room');
      setJoined(false);
    });
    const unsub3 = socket.on('room-closed', () => {
      notifyParent({ type: 'buzzer:closed' });
      setError('Room fermée');
      setJoined(false);
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [socket, playerId, notifyParent]);

  // Auto-join when socket is connected
  useEffect(() => {
    if (!socket.connected || joined || !roomCode) return;
    if (!autoJoin) return; // Wait for manual pseudo entry

    doJoin(pseudo, avatar);
  }, [socket.connected, roomCode, joined, autoJoin]);

  const doJoin = async (joinPseudo, joinAvatar) => {
    const res = await socket.emit('join-room', {
      code: roomCode,
      pseudo: joinPseudo,
      avatar: joinAvatar,
      password: password,
    });

    if (!res.ok) {
      setError(res.error || 'Impossible de rejoindre');
      notifyParent({ type: 'buzzer:error', error: res.error });
      return;
    }

    setPlayerId(res.playerId);
    setPlayerInfo({ pseudo: joinPseudo, avatar: joinAvatar });
    setRoom(res.room);
    setJoined(true);
    setError('');
    notifyParent({
      type: 'buzzer:ready',
      playerId: res.playerId,
      pseudo: joinPseudo,
      avatar: joinAvatar,
    });
  };

  const handleBuzz = async () => {
    if (!joined) return;
    setPressing(true);
    await socket.emit('buzz');
    setTimeout(() => setPressing(false), 200);
  };

  // ─── Manual join screen (when no pseudo in URL) ───
  if (!autoJoin && !joined) {
    return (
      <div style={{
        minHeight: '100vh',
        background: T.bg,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}>
        <div style={{
          fontSize: 36, marginBottom: 12,
          filter: 'drop-shadow(0 0 16px rgba(255,51,102,0.3))',
        }}>🔴</div>
        <div style={{
          color: T.textDim, fontSize: 12, letterSpacing: 2,
          marginBottom: 24, textTransform: 'uppercase',
        }}>ROOM {roomCode}</div>

        <input
          type="text"
          placeholder="Ton pseudo"
          value={manualPseudo}
          onChange={(e) => setManualPseudo(e.target.value)}
          maxLength={20}
          style={{
            width: '100%', maxWidth: 280,
            background: T.surface,
            border: `2px solid ${T.border}`,
            borderRadius: 12,
            color: T.text,
            padding: '12px 16px',
            fontSize: 15,
            fontFamily: "'JetBrains Mono', monospace",
            outline: 'none',
            textAlign: 'center',
            marginBottom: 12,
          }}
          onFocus={(e) => (e.target.style.borderColor = T.accent)}
          onBlur={(e) => (e.target.style.borderColor = T.border)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && manualPseudo.trim()) doJoin(manualPseudo.trim(), avatar);
          }}
        />

        {error && (
          <div style={{
            color: T.danger, fontSize: 12, marginBottom: 12,
            padding: '8px 14px', background: T.dangerGlow, borderRadius: 8,
          }}>{error}</div>
        )}

        <button
          onClick={() => manualPseudo.trim() && doJoin(manualPseudo.trim(), avatar)}
          disabled={!manualPseudo.trim() || !socket.connected}
          style={{
            padding: '12px 28px', borderRadius: 12,
            border: 'none',
            background: manualPseudo.trim() && socket.connected
              ? `linear-gradient(135deg, ${T.green}, ${T.greenDim})`
              : T.surface,
            color: manualPseudo.trim() && socket.connected ? '#000' : T.textMuted,
            fontSize: 14, fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            cursor: manualPseudo.trim() && socket.connected ? 'pointer' : 'not-allowed',
          }}
        >Rejoindre</button>
      </div>
    );
  }

  // ─── Loading / Error states ───
  if (error) {
    return (
      <div style={{
        minHeight: '100vh', background: T.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}>
        <div style={{
          color: T.danger, fontSize: 14, textAlign: 'center',
          padding: '16px 24px', background: T.dangerGlow, borderRadius: 12,
          fontFamily: "'JetBrains Mono', monospace",
        }}>{error}</div>
      </div>
    );
  }

  if (!joined || !room) {
    return (
      <div style={{
        minHeight: '100vh', background: T.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          color: T.textDim, fontSize: 13,
          fontFamily: "'JetBrains Mono', monospace",
        }}>Connexion à la room...</div>
      </div>
    );
  }

  // ─── Buzzer state ───
  const player = room.players?.[playerId];
  const myBuzzes = room.buzzes?.filter((b) => b.playerId === playerId) || [];
  const myFirstBuzz = myBuzzes[0];
  const buzzRank = room.buzzes?.findIndex((b) => b.playerId === playerId);
  const hasBuzzed = myBuzzes.length > 0;
  const isRebuzzMode = room.buzzMode === 'rebuzz';
  const isBuzzerActive = room.buzzerEnabled && player && !player.buzzerDisabled
    && (isRebuzzMode || !hasBuzzed);

  // ─── RENDER ───
  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      userSelect: 'none',
      WebkitUserSelect: 'none',
      overflow: 'hidden',
    }}>
      {/* Player tag */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 12,
      }}>
        <span style={{ fontSize: 20 }}>{playerInfo.avatar}</span>
        <span style={{
          color: T.text, fontWeight: 700, fontSize: 14,
          fontFamily: "'JetBrains Mono', monospace",
        }}>{playerInfo.pseudo}</span>
      </div>

      {/* Buzz result */}
      {hasBuzzed && !isRebuzzMode && (
        <div style={{
          color: T.green,
          fontFamily: "'Orbitron', monospace",
          fontSize: 16, fontWeight: 700,
          marginBottom: 12, textAlign: 'center',
        }}>
          #{buzzRank + 1}{myFirstBuzz.relativeTime > 0 ? ` — ${formatTime(myFirstBuzz.relativeTime)}` : ''}
        </div>
      )}
      {isRebuzzMode && hasBuzzed && (
        <div style={{
          color: T.orange,
          fontFamily: "'Orbitron', monospace",
          fontSize: 13, fontWeight: 700,
          marginBottom: 12, textAlign: 'center',
        }}>
          {myBuzzes.length} buzz{myBuzzes.length > 1 ? 'es' : ''}
        </div>
      )}

      {/* THE BUZZER */}
      <button
        onClick={handleBuzz}
        disabled={!isBuzzerActive}
        style={{
          width: 'min(220px, 60vw)',
          height: 'min(220px, 60vw)',
          borderRadius: '50%',
          border: 'none',
          cursor: isBuzzerActive ? 'pointer' : 'not-allowed',
          background: isBuzzerActive
            ? `radial-gradient(circle at 35% 35%, #ff4477, ${T.accent}, ${T.accentDim})`
            : (hasBuzzed && !isRebuzzMode)
              ? `radial-gradient(circle at 35% 35%, #1a6b3a, #0d4a25, #093018)`
              : `radial-gradient(circle at 35% 35%, #2a2a3a, #1a1a26, #12121a)`,
          boxShadow: isBuzzerActive
            ? `0 0 50px ${T.accentGlow}, 0 0 100px rgba(255,51,102,0.12), inset 0 -6px 20px rgba(0,0,0,0.3)`
            : (hasBuzzed && !isRebuzzMode)
              ? `0 0 30px ${T.greenGlow}, inset 0 -6px 20px rgba(0,0,0,0.3)`
              : 'inset 0 -6px 20px rgba(0,0,0,0.3)',
          transition: 'all 0.2s ease',
          transform: pressing ? 'scale(0.9)' : 'scale(1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column',
        }}
      >
        <span style={{
          fontSize: 'clamp(28px, 7vw, 44px)',
          fontWeight: 900,
          fontFamily: "'Orbitron', monospace",
          color: isBuzzerActive ? '#fff' : (hasBuzzed && !isRebuzzMode) ? T.green : T.textMuted,
          textShadow: isBuzzerActive ? '0 2px 16px rgba(255,255,255,0.3)' : 'none',
          letterSpacing: 3,
        }}>
          {(hasBuzzed && !isRebuzzMode) ? '✓' : 'BUZZ'}
        </span>
        {!isBuzzerActive && !hasBuzzed && (
          <span style={{
            fontSize: 10, color: T.textMuted, marginTop: 6, letterSpacing: 2,
            fontFamily: "'JetBrains Mono', monospace",
          }}>EN ATTENTE</span>
        )}
      </button>

      {/* Mini buzz list */}
      {room.buzzes?.length > 0 && (
        <div style={{ marginTop: 16, width: '100%', maxWidth: 260 }}>
          {room.buzzes.slice(0, 5).map((b, i) => (
            <div key={`${b.playerId}-${b.time}`} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 10px', borderRadius: 8,
              background: b.playerId === playerId ? 'rgba(255,51,102,0.1)' : 'transparent',
              marginBottom: 2,
            }}>
              <span style={{
                color: i === 0 ? T.yellow : T.textDim,
                fontFamily: "'Orbitron', monospace",
                fontSize: 11, fontWeight: 800, width: 24,
              }}>#{i + 1}</span>
              <span style={{ fontSize: 14 }}>{b.avatar}</span>
              <span style={{
                color: b.playerId === playerId ? T.accent : T.text,
                fontSize: 11, fontWeight: 600, flex: 1,
                fontFamily: "'JetBrains Mono', monospace",
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{b.pseudo}</span>
              <span style={{
                color: T.textDim, fontSize: 10,
                fontFamily: "'JetBrains Mono', monospace",
              }}>{formatTime(b.relativeTime)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
