import { useState } from 'react';
import { T } from '../theme.js';

export default function HomeScreen({ connected, onCreateRoom, onJoinRoom }) {
  const [joinCode, setJoinCode] = useState('');

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ maxWidth: 460, width: '100%', textAlign: 'center' }}>
        {/* Connection indicator */}
        <div style={{
          position: 'fixed', top: 12, right: 16,
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, color: connected ? T.green : T.danger,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: connected ? T.green : T.danger,
            display: 'inline-block',
            boxShadow: connected ? `0 0 8px ${T.greenGlow}` : `0 0 8px ${T.dangerGlow}`,
          }} />
          {connected ? 'Connecté' : 'Connexion...'}
        </div>

        {/* Logo */}
        <div style={{
          fontSize: 72, marginBottom: 8,
          filter: 'drop-shadow(0 0 30px rgba(255,51,102,0.4))',
          animation: 'pulse 2s ease-in-out infinite',
        }}>🔴</div>

        <h1 style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: 'clamp(24px, 6vw, 38px)',
          color: T.text,
          margin: 0,
          letterSpacing: 4,
          background: `linear-gradient(135deg, ${T.accent}, #ff6b9d)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>WILCO'S BUZZ</h1>

        <div style={{ height: 48 }} />

        {/* Create Room */}
        <button
          onClick={onCreateRoom}
          disabled={!connected}
          style={{
            width: '100%',
            padding: '16px 32px',
            borderRadius: 12,
            border: 'none',
            background: connected
              ? `linear-gradient(135deg, ${T.accent}, ${T.accentDim})`
              : T.surface,
            color: connected ? '#fff' : T.textMuted,
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: 1,
            cursor: connected ? 'pointer' : 'not-allowed',
            boxShadow: connected ? `0 4px 24px ${T.accentGlow}` : 'none',
            textTransform: 'uppercase',
            transition: 'all 0.2s',
            marginBottom: 16,
          }}
        >⚡ Créer une Room</button>

        {/* Divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, margin: '28px 0',
        }}>
          <div style={{ flex: 1, height: 1, background: T.border }} />
          <span style={{ color: T.textMuted, fontSize: 12, letterSpacing: 2 }}>OU</span>
          <div style={{ flex: 1, height: 1, background: T.border }} />
        </div>

        {/* Join Room */}
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            placeholder="CODE"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
            maxLength={4}
            style={{
              flex: 1,
              background: T.surface,
              border: `2px solid ${T.border}`,
              borderRadius: 12,
              color: T.text,
              padding: '14px 18px',
              fontSize: 22,
              fontFamily: "'JetBrains Mono', monospace",
              textAlign: 'center',
              letterSpacing: 10,
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => (e.target.style.borderColor = T.accent)}
            onBlur={(e) => (e.target.style.borderColor = T.border)}
          />
          <button
            onClick={() => joinCode.length === 4 && onJoinRoom(joinCode)}
            disabled={joinCode.length < 4 || !connected}
            style={{
              padding: '14px 24px',
              borderRadius: 12,
              border: `2px solid ${joinCode.length === 4 && connected ? T.green : T.border}`,
              background: T.surface,
              color: joinCode.length === 4 && connected ? T.green : T.textMuted,
              fontSize: 20,
              fontWeight: 700,
              cursor: joinCode.length === 4 && connected ? 'pointer' : 'not-allowed',
              opacity: joinCode.length < 4 || !connected ? 0.5 : 1,
              transition: 'all 0.2s',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >→</button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
