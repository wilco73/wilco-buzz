import { useState, useEffect } from 'react';
import { useSocket } from './useSocket.js';
import HomeScreen from './screens/HomeScreen.jsx';
import CreateRoomScreen from './screens/CreateRoomScreen.jsx';
import JoinRoomScreen from './screens/JoinRoomScreen.jsx';
import AdminView from './screens/AdminView.jsx';
import PlayerView from './screens/PlayerView.jsx';
import OverlayView from './screens/OverlayView.jsx';
import EmbedView from './screens/EmbedView.jsx';

function parseHash() {
  const hash = window.location.hash;
  if (!hash) return { mode: 'app' };

  if (hash.startsWith('#overlay-')) {
    const code = hash.replace('#overlay-', '').split('?')[0];
    return { mode: 'overlay', roomCode: code };
  }

  if (hash.startsWith('#embed-')) {
    const [path, queryString] = hash.replace('#embed-', '').split('?');
    const code = path;
    const params = {};
    if (queryString) {
      const searchParams = new URLSearchParams(queryString);
      if (searchParams.get('pseudo')) params.pseudo = decodeURIComponent(searchParams.get('pseudo'));
      if (searchParams.get('avatar')) params.avatar = decodeURIComponent(searchParams.get('avatar'));
      if (searchParams.get('password')) params.password = decodeURIComponent(searchParams.get('password'));
    }
    return { mode: 'embed', roomCode: code, params };
  }

  return { mode: 'app' };
}

export default function App() {
  const socket = useSocket();
  const [screen, setScreen] = useState('home');
  const [roomCode, setRoomCode] = useState('');
  const [roomState, setRoomState] = useState(null);
  const [playerId, setPlayerId] = useState('');
  const [playerInfo, setPlayerInfo] = useState(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [embedParams, setEmbedParams] = useState({});
  const [initialStreamerMode, setInitialStreamerMode] = useState(false);

  // Route on load
  useEffect(() => {
    const { mode, roomCode: code, params } = parseHash();
    if (mode === 'overlay') {
      setRoomCode(code);
      setScreen('overlay');
    } else if (mode === 'embed') {
      setRoomCode(code);
      setEmbedParams(params || {});
      setScreen('embed');
    }
  }, []);

  // Listen for real-time updates
  useEffect(() => {
    const unsub1 = socket.on('room-update', (data) => {
      setRoomState(data);
    });
    const unsub2 = socket.on('kicked', () => {
      if (screen === 'embed') return;
      setScreen('home');
      setRoomCode('');
      setPlayerId('');
      setPlayerInfo(null);
      setRoomState(null);
      alert('Tu as été expulsé de la room.');
    });
    const unsub3 = socket.on('room-closed', () => {
      if (screen === 'embed') return;
      setScreen('home');
      setRoomCode('');
      setPlayerId('');
      setPlayerInfo(null);
      setRoomState(null);
      alert("L'admin a fermé la room.");
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [socket, screen]);

  const goHome = () => {
    setScreen('home');
    setRoomCode('');
    setPlayerId('');
    setPlayerInfo(null);
    setRoomState(null);
    setNeedsPassword(false);
    setInitialStreamerMode(false);
  };

  const handleCreateRoom = async ({ usePassword, streamerMode }) => {
    const res = await socket.emit('create-room', { usePassword });
    if (res.ok) {
      setRoomCode(res.room.code);
      setRoomState(res.room);
      setInitialStreamerMode(streamerMode);
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
    return null;
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

  // Special modes
  if (screen === 'overlay') {
    return <OverlayView room={roomState} />;
  }

  if (screen === 'embed') {
    return (
      <EmbedView
        roomCode={roomCode}
        params={embedParams}
        socket={socket}
      />
    );
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
          initialStreamerMode={initialStreamerMode}
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
