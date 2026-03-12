import { useState, useEffect } from 'react';
import { useSocket } from './useSocket.js';
import HomeScreen from './screens/HomeScreen.jsx';
import CreateRoomScreen from './screens/CreateRoomScreen.jsx';
import JoinRoomScreen from './screens/JoinRoomScreen.jsx';
import AdminView from './screens/AdminView.jsx';
import PlayerView from './screens/PlayerView.jsx';
import OverlayView from './screens/OverlayView.jsx';

export default function App() {
  const socket = useSocket();
  const [screen, setScreen] = useState('home');
  const [roomCode, setRoomCode] = useState('');
  const [roomState, setRoomState] = useState(null);
  const [playerId, setPlayerId] = useState('');
  const [playerInfo, setPlayerInfo] = useState(null);
  const [needsPassword, setNeedsPassword] = useState(false);

  // Check for overlay hash
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#overlay-')) {
      const code = hash.replace('#overlay-', '');
      setRoomCode(code);
      setScreen('overlay');
    }
  }, []);

  // Listen for real-time updates
  useEffect(() => {
    const unsub1 = socket.on('room-update', (data) => {
      setRoomState(data);
    });
    const unsub2 = socket.on('kicked', () => {
      setScreen('home');
      setRoomCode('');
      setPlayerId('');
      setPlayerInfo(null);
      setRoomState(null);
      alert('Tu as été expulsé de la room.');
    });
    const unsub3 = socket.on('room-closed', () => {
      setScreen('home');
      setRoomCode('');
      setPlayerId('');
      setPlayerInfo(null);
      setRoomState(null);
      alert("L'admin a fermé la room.");
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [socket]);

  const goHome = () => {
    setScreen('home');
    setRoomCode('');
    setPlayerId('');
    setPlayerInfo(null);
    setRoomState(null);
    setNeedsPassword(false);
  };

  const handleCreateRoom = async (usePassword) => {
    const res = await socket.emit('create-room', { usePassword });
    if (res.ok) {
      setRoomCode(res.room.code);
      setRoomState(res.room);
      setScreen('admin');
    }
  };

  const handleCheckRoom = async (code) => {
    const res = await socket.emit('check-room', { code });
    if (!res.ok) {
      alert(res.error || 'Room introuvable');
      return;
    }
    setRoomCode(code);
    setNeedsPassword(res.hasPassword);
    setScreen('join');
  };

  const handleJoinRoom = async ({ pseudo, avatar, password }) => {
    const res = await socket.emit('join-room', {
      code: roomCode,
      pseudo,
      avatar,
      password,
    });
    if (!res.ok) return res.error || 'Erreur';
    setPlayerId(res.playerId);
    setPlayerInfo({ pseudo, avatar });
    setRoomState(res.room);
    setScreen('player');
    return null; // no error
  };

  const handleBuzz = async () => {
    await socket.emit('buzz');
  };

  // Overlay join
  useEffect(() => {
    if (screen === 'overlay' && roomCode && socket.connected) {
      socket.emit('join-overlay', { code: roomCode }).then((res) => {
        if (res.ok) setRoomState(res.room);
      });
    }
  }, [screen, roomCode, socket.connected]);

  if (screen === 'overlay') {
    return <OverlayView room={roomState} />;
  }

  switch (screen) {
    case 'home':
      return (
        <HomeScreen
          connected={socket.connected}
          onCreateRoom={() => setScreen('create')}
          onJoinRoom={handleCheckRoom}
        />
      );
    case 'create':
      return (
        <CreateRoomScreen
          onRoomCreated={handleCreateRoom}
          onBack={goHome}
        />
      );
    case 'join':
      return (
        <JoinRoomScreen
          roomCode={roomCode}
          needsPassword={needsPassword}
          onJoined={handleJoinRoom}
          onBack={goHome}
        />
      );
    case 'admin':
      return (
        <AdminView
          room={roomState}
          socket={socket}
          onLeave={goHome}
        />
      );
    case 'player':
      return (
        <PlayerView
          room={roomState}
          playerId={playerId}
          playerInfo={playerInfo}
          onBuzz={handleBuzz}
          onLeave={goHome}
        />
      );
    default:
      return null;
  }
}
