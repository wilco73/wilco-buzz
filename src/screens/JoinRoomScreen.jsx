import { useState } from 'react';
import { T, AVATARS } from '../theme.js';

export default function JoinRoomScreen({ roomCode, needsPassword, onJoined, onBack }) {
  const [pseudo, setPseudo] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[Math.floor(Math.random() * AVATARS.length)]);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    if (!pseudo.trim()) { setError('Choisis un pseudo !'); return; }
    setJoining(true);
    setError('');
    const err = await onJoined({
      pseudo: pseudo.trim(),
      avatar,
      password: needsPassword ? password : undefined,
    });
    if (err) {
      setError(err);
      setJoining(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ maxWidth: 460, width: '100%' }}>
        <button onClick={onBack} style={{
          padding: '10px 20px',
          borderRadius: 12,
          border: `1px solid ${T.border}`,
          background: 'transparent',
          color: T.textDim,
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          marginBottom: 32,
          fontFamily: "'JetBrains Mono', monospace",
        }}>← Retour</button>

        <h2 style={{
          fontFamily: "'Orbitron', monospace",
          color: T.text,
          fontSize: 24,
          letterSpacing: 2,
          marginBottom: 8,
        }}>Rejoindre</h2>
        <p style={{
          color: T.textDim,
          fontSize: 14,
          marginBottom: 32,
        }}>Room <span style={{ color: T.accent, letterSpacing: 4, fontWeight: 700 }}>{roomCode}</span></p>

        {/* Avatar picker */}
        <div style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          padding: 20,
          marginBottom: 16,
        }}>
          <div style={{
            color: T.textDim, fontSize: 11, letterSpacing: 2,
            marginBottom: 12, textTransform: 'uppercase',
          }}>Avatar</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {AVATARS.slice(0, 20).map((a) => (
              <button
                key={a}
                onClick={() => setAvatar(a)}
                style={{
                  width: 44, height: 44, borderRadius: 12,
                  border: avatar === a ? `2px solid ${T.accent}` : '2px solid transparent',
                  background: avatar === a ? T.accentGlow : T.surfaceHover,
                  fontSize: 22,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >{a}</button>
            ))}
          </div>
        </div>

        {/* Pseudo */}
        <input
          type="text"
          placeholder="Ton pseudo"
          value={pseudo}
          onChange={(e) => { setPseudo(e.target.value); setError(''); }}
          maxLength={20}
          style={{
            width: '100%',
            background: T.surface,
            border: `2px solid ${T.border}`,
            borderRadius: 12,
            color: T.text,
            padding: '14px 18px',
            fontSize: 15,
            outline: 'none',
            marginBottom: 16,
            transition: 'border-color 0.2s',
            fontFamily: "'JetBrains Mono', monospace",
          }}
          onFocus={(e) => (e.target.style.borderColor = T.accent)}
          onBlur={(e) => (e.target.style.borderColor = T.border)}
        />

        {/* Password */}
        {needsPassword && (
          <input
            type="text"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => { setPassword(e.target.value.toUpperCase()); setError(''); }}
            maxLength={6}
            style={{
              width: '100%',
              background: T.surface,
              border: `2px solid ${T.border}`,
              borderRadius: 12,
              color: T.text,
              padding: '14px 18px',
              fontSize: 18,
              outline: 'none',
              marginBottom: 16,
              textAlign: 'center',
              letterSpacing: 6,
              transition: 'border-color 0.2s',
              fontFamily: "'JetBrains Mono', monospace",
            }}
            onFocus={(e) => (e.target.style.borderColor = T.accent)}
            onBlur={(e) => (e.target.style.borderColor = T.border)}
          />
        )}

        {/* Error */}
        {error && (
          <div style={{
            color: T.danger, fontSize: 13,
            marginBottom: 16, padding: '10px 16px',
            background: T.dangerGlow, borderRadius: 10,
          }}>{error}</div>
        )}

        <button
          onClick={handleJoin}
          disabled={joining}
          style={{
            width: '100%',
            padding: '16px 32px',
            borderRadius: 12,
            border: 'none',
            background: `linear-gradient(135deg, ${T.green}, ${T.greenDim})`,
            color: '#000',
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: 1,
            cursor: joining ? 'wait' : 'pointer',
            boxShadow: `0 4px 24px ${T.greenGlow}`,
            textTransform: 'uppercase',
          }}
        >{joining ? 'Connexion...' : '🎮 Rejoindre'}</button>
      </div>
    </div>
  );
}
