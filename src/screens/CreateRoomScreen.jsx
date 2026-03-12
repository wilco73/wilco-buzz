import { useState } from 'react';
import { T } from '../theme.js';

export default function CreateRoomScreen({ onRoomCreated, onBack }) {
  const [usePassword, setUsePassword] = useState(false);

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

        <div style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ color: T.text, fontWeight: 600, fontSize: 15 }}>
                🔒 Mot de passe
              </div>
              <div style={{ color: T.textDim, fontSize: 12, marginTop: 4 }}>
                Protéger l'accès à la room
              </div>
            </div>
            <button
              onClick={() => setUsePassword(!usePassword)}
              style={{
                width: 52, height: 28, borderRadius: 14,
                border: 'none',
                background: usePassword ? T.green : T.border,
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.3s',
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: '#fff',
                position: 'absolute',
                top: 3,
                left: usePassword ? 27 : 3,
                transition: 'left 0.3s',
              }} />
            </button>
          </div>
        </div>

        <button
          onClick={() => onRoomCreated(usePassword)}
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
