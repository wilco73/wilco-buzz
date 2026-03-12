import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { nanoid } from 'nanoid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingInterval: 10000,
  pingTimeout: 5000,
});

const rooms = new Map();
const roomTimers = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  if (rooms.has(code)) return generateRoomCode();
  return code;
}

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pw = '';
  for (let i = 0; i < 6; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

/**
 * Player flags:
 *   manuallyBlocked: boolean — set by admin "Bloquer" button, survives new-round
 *   buzzerDisabled: boolean  — computed = manuallyBlocked OR systemBlocked
 *
 * We store manuallyBlocked on the player object.
 * buzzerDisabled is derived: true if manuallyBlocked, or if the system
 * blocked them (post-buzz in standard/exclusive mode, timer expired, etc.)
 *
 * For simplicity we keep buzzerDisabled as the single flag sent to clients,
 * but we use manuallyBlocked to know what to preserve across rounds.
 */

function getRoomPublicState(room) {
  const players = {};
  for (const [id, p] of Object.entries(room.players)) {
    if (!p.kicked) {
      players[id] = {
        pseudo: p.pseudo,
        avatar: p.avatar,
        buzzerDisabled: p.buzzerDisabled,
        manuallyBlocked: p.manuallyBlocked || false,
      };
    }
  }
  return {
    code: room.code,
    hasPassword: !!room.password,
    buzzerEnabled: room.buzzerEnabled,
    buzzMode: room.buzzMode,
    timerRunning: room.timerRunning,
    timerStart: room.timerStart,
    timerElapsed: room.timerElapsed,
    timerDuration: room.timerDuration,
    timerExpired: room.timerExpired,
    serverTime: Date.now(),
    players,
    buzzes: room.buzzes,
  };
}

function getRoomAdminState(room) {
  return {
    ...getRoomPublicState(room),
    password: room.password,
  };
}

function broadcast(room) {
  io.to(`room:${room.code}`).emit('room-update', getRoomPublicState(room));
  io.to(`admin:${room.code}`).emit('room-update', getRoomAdminState(room));
  io.to(`overlay:${room.code}`).emit('room-update', getRoomPublicState(room));
}

function clearCountdown(code) {
  if (roomTimers.has(code)) {
    clearTimeout(roomTimers.get(code));
    roomTimers.delete(code);
  }
}

function scheduleCountdown(room) {
  clearCountdown(room.code);
  if (!room.timerRunning || room.timerDuration <= 0) return;
  const totalMs = room.timerDuration * 1000;
  const remaining = totalMs - room.timerElapsed;
  if (remaining <= 0) { onTimerExpired(room); return; }
  roomTimers.set(room.code, setTimeout(() => onTimerExpired(room), remaining));
}

function onTimerExpired(room) {
  clearCountdown(room.code);
  room.timerElapsed = room.timerDuration * 1000;
  room.timerRunning = false;
  room.timerStart = null;
  room.timerExpired = true;
  room.buzzerEnabled = false;
  for (const p of Object.values(room.players)) {
    if (!p.kicked) p.buzzerDisabled = true;
  }
  broadcast(room);
}

// Helper: re-enable all non-manually-blocked players
function enableSystemPlayers(room) {
  for (const p of Object.values(room.players)) {
    if (!p.kicked) {
      p.buzzerDisabled = p.manuallyBlocked || false;
    }
  }
}

// Helper: disable all players
function disableAllPlayers(room) {
  for (const p of Object.values(room.players)) {
    if (!p.kicked) p.buzzerDisabled = true;
  }
}

// ─── Socket.io ──────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  let currentRoom = null;
  let currentPlayerId = null;
  let isAdmin = false;

  socket.on('create-room', ({ usePassword }, callback) => {
    const code = generateRoomCode();
    const room = {
      code,
      password: usePassword ? generatePassword() : null,
      adminSocketId: socket.id,
      buzzerEnabled: false,
      buzzMode: 'standard',
      timerRunning: false,
      timerStart: null,
      timerElapsed: 0,
      timerDuration: 0,
      timerExpired: false,
      players: {},
      buzzes: [],
      createdAt: Date.now(),
    };
    rooms.set(code, room);
    currentRoom = code;
    isAdmin = true;
    socket.join(`room:${code}`);
    socket.join(`admin:${code}`);
    callback({ ok: true, room: getRoomAdminState(room) });
  });

  socket.on('check-room', ({ code }, callback) => {
    const room = rooms.get(code);
    if (!room) return callback({ ok: false, error: 'Room introuvable' });
    callback({ ok: true, hasPassword: !!room.password });
  });

  socket.on('join-room', ({ code, pseudo, avatar, password }, callback) => {
    const room = rooms.get(code);
    if (!room) return callback({ ok: false, error: 'Room introuvable' });
    if (room.password && password !== room.password) {
      return callback({ ok: false, error: 'Mot de passe incorrect' });
    }
    const pseudoTaken = Object.values(room.players).some(
      (p) => !p.kicked && p.pseudo.toLowerCase() === pseudo.toLowerCase()
    );
    if (pseudoTaken) return callback({ ok: false, error: 'Ce pseudo est déjà pris !' });

    const playerId = nanoid(8);
    room.players[playerId] = {
      pseudo, avatar,
      buzzerDisabled: false,
      manuallyBlocked: false,
      kicked: false,
      socketId: socket.id,
      joinedAt: Date.now(),
    };

    currentRoom = code;
    currentPlayerId = playerId;
    isAdmin = false;
    socket.join(`room:${code}`);
    io.to(`admin:${code}`).emit('room-update', getRoomAdminState(room));
    io.to(`overlay:${code}`).emit('room-update', getRoomPublicState(room));
    callback({ ok: true, playerId, room: getRoomPublicState(room) });
  });

  socket.on('join-overlay', ({ code }, callback) => {
    const room = rooms.get(code);
    if (!room) return callback({ ok: false, error: 'Room introuvable' });
    currentRoom = code;
    socket.join(`room:${code}`);
    socket.join(`overlay:${code}`);
    callback({ ok: true, room: getRoomPublicState(room) });
  });

  // ─── BUZZ ───
  socket.on('buzz', (_, callback) => {
    if (!currentRoom || !currentPlayerId) return callback?.({ ok: false });
    const room = rooms.get(currentRoom);
    if (!room) return callback?.({ ok: false });
    const player = room.players[currentPlayerId];
    if (!player || player.kicked || player.buzzerDisabled) return callback?.({ ok: false });
    if (!room.buzzerEnabled) return callback?.({ ok: false });

    const buzzTime = Date.now();
    let relativeTime = 0;
    if (room.timerStart) {
      relativeTime = room.timerElapsed + (buzzTime - room.timerStart);
    }

    if (room.buzzMode === 'rebuzz') {
      room.buzzes.push({
        playerId: currentPlayerId, pseudo: player.pseudo,
        avatar: player.avatar, time: buzzTime, relativeTime,
      });
    } else if (room.buzzMode === 'exclusive') {
      if (room.buzzes.length > 0) return callback?.({ ok: false });
      room.buzzes.push({
        playerId: currentPlayerId, pseudo: player.pseudo,
        avatar: player.avatar, time: buzzTime, relativeTime,
      });
      // Lock ALL players (system block)
      disableAllPlayers(room);
    } else {
      // Standard
      if (room.buzzes.find((b) => b.playerId === currentPlayerId)) {
        return callback?.({ ok: false });
      }
      room.buzzes.push({
        playerId: currentPlayerId, pseudo: player.pseudo,
        avatar: player.avatar, time: buzzTime, relativeTime,
      });
      player.buzzerDisabled = true; // system block after buzzing
    }

    room.buzzes.sort((a, b) => a.time - b.time);
    broadcast(room);
    callback?.({ ok: true });
  });

  // ─── ADMIN ACTIONS ───

  // Toggle buzzers globally
  socket.on('admin:toggle-buzzer', () => {
    if (!currentRoom || !isAdmin) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    room.buzzerEnabled = !room.buzzerEnabled;
    if (room.buzzerEnabled) {
      // Re-enable everyone except manually blocked
      enableSystemPlayers(room);
    }
    broadcast(room);
  });

  // Change buzz mode — resets buzzes, re-enables non-manually-blocked
  socket.on('admin:set-buzz-mode', ({ mode }) => {
    if (!currentRoom || !isAdmin) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    if (!['standard', 'exclusive', 'rebuzz'].includes(mode)) return;
    room.buzzMode = mode;
    room.buzzes = [];
    enableSystemPlayers(room);
    broadcast(room);
  });

  // Set timer duration — resets timer
  socket.on('admin:set-timer-duration', ({ duration }) => {
    if (!currentRoom || !isAdmin) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    clearCountdown(room.code);
    room.timerDuration = Math.max(0, Math.floor(duration));
    room.timerRunning = false;
    room.timerStart = null;
    room.timerElapsed = 0;
    room.timerExpired = false;
    broadcast(room);
  });

  socket.on('admin:timer-start', () => {
    if (!currentRoom || !isAdmin) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    room.timerRunning = true;
    room.timerStart = Date.now();
    room.timerElapsed = 0;
    room.timerExpired = false;
    scheduleCountdown(room);
    broadcast(room);
  });

  socket.on('admin:timer-pause', () => {
    if (!currentRoom || !isAdmin) return;
    const room = rooms.get(currentRoom);
    if (!room || !room.timerRunning) return;
    clearCountdown(room.code);
    room.timerElapsed += Date.now() - room.timerStart;
    room.timerRunning = false;
    room.timerStart = null;
    broadcast(room);
  });

  socket.on('admin:timer-resume', () => {
    if (!currentRoom || !isAdmin) return;
    const room = rooms.get(currentRoom);
    if (!room || room.timerRunning) return;
    room.timerRunning = true;
    room.timerStart = Date.now();
    room.timerExpired = false;
    scheduleCountdown(room);
    broadcast(room);
  });

  // Stop timer = end the round: disable buzzers
  socket.on('admin:timer-stop', () => {
    if (!currentRoom || !isAdmin) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    clearCountdown(room.code);
    room.timerRunning = false;
    room.timerStart = null;
    room.timerElapsed = 0;
    room.timerExpired = false;
    room.buzzerEnabled = false;
    broadcast(room);
  });

  // New round: clear buzzes, activate buzzers, re-enable non-manually-blocked
  socket.on('admin:new-round', ({ withTimer }) => {
    if (!currentRoom || !isAdmin) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    clearCountdown(room.code);
    room.buzzes = [];
    room.buzzerEnabled = true;
    room.timerExpired = false;
    enableSystemPlayers(room); // re-enable all except manuallyBlocked
    if (withTimer) {
      room.timerRunning = true;
      room.timerStart = Date.now();
      room.timerElapsed = 0;
      scheduleCountdown(room);
    }
    broadcast(room);
  });

  // Full reset
  socket.on('admin:reset', () => {
    if (!currentRoom || !isAdmin) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    clearCountdown(room.code);
    room.buzzes = [];
    room.timerRunning = false;
    room.timerStart = null;
    room.timerElapsed = 0;
    room.timerExpired = false;
    room.buzzerEnabled = false;
    // Full reset clears manual blocks too
    for (const p of Object.values(room.players)) {
      if (!p.kicked) {
        p.buzzerDisabled = false;
        p.manuallyBlocked = false;
      }
    }
    broadcast(room);
  });

  // Clear buzzes only
  socket.on('admin:clear-buzzes', () => {
    if (!currentRoom || !isAdmin) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    room.buzzes = [];
    enableSystemPlayers(room);
    broadcast(room);
  });

  socket.on('admin:kick', ({ playerId }) => {
    if (!currentRoom || !isAdmin) return;
    const room = rooms.get(currentRoom);
    if (!room || !room.players[playerId]) return;
    room.players[playerId].kicked = true;
    room.buzzes = room.buzzes.filter((b) => b.playerId !== playerId);
    const kickedSocket = room.players[playerId].socketId;
    if (kickedSocket) io.to(kickedSocket).emit('kicked');
    broadcast(room);
  });

  // Manual block/unblock — this is the admin "Bloquer"/"Débloquer" button
  socket.on('admin:toggle-player-buzzer', ({ playerId }) => {
    if (!currentRoom || !isAdmin) return;
    const room = rooms.get(currentRoom);
    if (!room || !room.players[playerId]) return;
    const p = room.players[playerId];
    p.manuallyBlocked = !p.manuallyBlocked;
    p.buzzerDisabled = p.manuallyBlocked;
    broadcast(room);
  });

  socket.on('admin:enable-all-buzzers', () => {
    if (!currentRoom || !isAdmin) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    for (const p of Object.values(room.players)) {
      if (!p.kicked) {
        p.buzzerDisabled = false;
        p.manuallyBlocked = false;
      }
    }
    broadcast(room);
  });

  socket.on('admin:disable-all-buzzers', () => {
    if (!currentRoom || !isAdmin) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    for (const p of Object.values(room.players)) {
      if (!p.kicked) {
        p.buzzerDisabled = true;
        p.manuallyBlocked = true;
      }
    }
    broadcast(room);
  });

  socket.on('admin:update-password', ({ password }) => {
    if (!currentRoom || !isAdmin) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    room.password = password || null;
    io.to(`admin:${currentRoom}`).emit('room-update', getRoomAdminState(room));
  });

  socket.on('disconnect', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    if (isAdmin) {
      clearCountdown(currentRoom);
      io.to(`room:${currentRoom}`).emit('room-closed');
      rooms.delete(currentRoom);
    } else if (currentPlayerId) {
      delete room.players[currentPlayerId];
      room.buzzes = room.buzzes.filter((b) => b.playerId !== currentPlayerId);
      broadcast(room);
    }
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🔴 Wilco's Buzz server running on port ${PORT}`);
});
