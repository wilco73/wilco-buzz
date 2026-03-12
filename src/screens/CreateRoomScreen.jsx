import { useState } from 'react';
import { T } from '../theme.js';

const Toggle = ({ value, onChange }) => (
  <button
    onClick={onChange}
    style={{
      width: 52, height: 28, borderRadius: 14,
      border: 'none',
      background: value ? T.green : T.border,
      cursor: 'pointer',
      position: 'relative',
      transition: 'background 0.3s',
      flexShrink: 0,
    }}
  >
    <div style={{
      width: 22, height: 22, borderRadius: '50%',
      background: '#fff',
      position: 'absolute', top: 3,
      left: value ? 27 : 3,
      transition: 'left 0.3s',
    }} />
  </button>
);

export default function CreateRoomScreen({ onRoomCreated, onBack }) {
  const [usePassword, setUsePassword] = useState(false);
  const [streamerMode, setStreamerMode] = useState(false);

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
          marginBottom: 32,
        }}>Nouvelle Room</h2>

        {/* Options card */}
        <div style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}>
          {/* Password toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}>
            <div>
              <div style={{ color: T.text, fontWeight: 600, fontSize: 15 }}>
                🔒 Mot de passe
              </div>
              <div style={{ color: T.textDim, fontSize: 12, marginTop: 4 }}>
                Protéger l'accès à la room
              </div>
            </div>
            <Toggle value={usePassword} onChange={() => setUsePassword(!usePassword)} />
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: T.border }} />

          {/* Streamer mode toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}>
            <div>
              <div style={{ color: T.text, fontWeight: 600, fontSize: 15 }}>
                📺 Mode streamer
              </div>
              <div style={{ color: T.textDim, fontSize: 12, marginTop: 4 }}>
                Cache le mot de passe par défaut
              </div>
            </div>
            <Toggle value={streamerMode} onChange={() => setStreamerMode(!streamerMode)} />
          </div>

          {/* Info if both are on */}
          {usePassword && streamerMode && (
            <div style={{
              background: 'rgba(156,39,176,0.1)',
              border: '1px solid rgba(156,39,176,0.3)',
              borderRadius: 10,
              padding: '10px 14px',
              color: '#ce93d8',
              fontSize: 12,
              lineHeight: 1.5,
            }}>
              Le mot de passe sera flouté dans l'interface admin. Clique dessus pour le révéler temporairement.
            </div>
          )}
        </div>

        <button
          onClick={() => onRoomCreated({ usePassword, streamerMode })}
          style={{
            width: '100%',
            padding: '16px 32px',
            borderRadius: 12,
            border: 'none',
            background: `linear-gradient(135deg, ${T.accent}, ${T.accentDim})`,
            color: '#fff',
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: 1,
            cursor: 'pointer',
            boxShadow: `0 4px 24px ${T.accentGlow}`,
            textTransform: 'uppercase',
          }}
        >⚡ Créer</button>
      </div>
    </div>
  );
}
