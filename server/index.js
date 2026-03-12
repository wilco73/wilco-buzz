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

// ─── In-memory room store ───────────────────────────────────────────────────
const rooms = new Map();
const roomTimers = new Map(); // roomCode -> setTimeout id for countdown

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

function getRoomPublicState(room) {
  const players = {};
  for (const [id, p] of Object.entries(room.players)) {
    if (!p.kicked) {
      players[id] = {
        pseudo: p.pseudo,
        avatar: p.avatar,
        buzzerDisabled: p.buzzerDisabled,
      };
    }
  }
  return {
    code: room.code,
    hasPassword: !!room.password,
    buzzerEnabled: room.buzzerEnabled,
    buzzMode: room.buzzMode,
    // Timer state
    timerRunning: room.timerRunning,
    timerStart: room.timerStart,
    timerElapsed: room.timerElapsed,
    timerDuration: room.timerDuration, // 0 = stopwatch (count up), >0 = countdown in seconds
    timerExpired: room.timerExpired,
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

// Clear any running countdown timeout for a room
function clearCountdown(code) {
  if (roomTimers.has(code)) {
    clearTimeout(roomTimers.get(code));
    roomTimers.delete(code);
  }
}

// Schedule countdown expiry
function scheduleCountdown(room) {
  clearCountdown(room.code);
  if (!room.timerRunning || room.timerDuration <= 0) return;

  // How much time remains?
  const totalMs = room.timerDuration * 1000;
  const alreadyElapsed = room.timerElapsed; // from previous pause/resume cycles
  const remaining = totalMs - alreadyElapsed;

  if (remaining <= 0) {
    onTimerExpired(room);
    return;
  }

  const timeout = setTimeout(() => {
    onTimerExpired(room);
  }, remaining);

  roomTimers.set(room.code, timeout);
}

function onTimerExpired(room) {
  clearCountdown(room.code);
  // Freeze the timer at exactly the duration
  room.timerElapsed = room.timerDuration * 1000;
  room.timerRunning = false;
  room.timerStart = null;
  room.timerExpired = true;
  // Disable all buzzers
  room.buzzerEnabled = false;
  for (const p of Object.values(room.players)) {
    if (!p.kicked) p.buzzerDisabled = true;
  }
  broadcast(room);
}

// ─── Socket.io ──────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  let currentRoom = null;
  let currentPlayerId = null;
  let isAdmin = false;

  // ─── CREATE ROOM ───
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
      timerDuration: 0, // 0 = stopwatch, >0 = countdown seconds
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

  // ─── CHECK ROOM ───
  socket.on('check-room', ({ code }, callback) => {
    const room = rooms.get(code);
    if (!room) return callback({ ok: false, error: 'Room introuvable' });
    callback({ ok: true, hasPassword: !!room.password });
  });

  // ─── JOIN ROOM (player) ───
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

  // ─── JOIN OVERLAY ───
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
        playerId: currentPlayerId,
        pseudo: player.pseudo,
        avatar: player.avatar,
        time: buzzTime,
        relativeTime,
      });
    } else if (room.buzzMode === 'exclusive') {
      if (room.buzzes.length > 0) {
        return callback?.({ ok: false, error: 'Quelqu\'un a déjà buzzé' });
      }
      room.buzzes.push({
        playerId: currentPlayerId,
        pseudo: player.pseudo,
        avatar: player.avatar,
        time: buzzTime,
        relativeTime,
      });
      for (const p of Object.values(room.players)) {
        if (!p.kicked) p.buzzerDisabled = true;
      }
    } else {
      // Standard
      if (room.buzzes.find((b) => b.playerId === currentPlayerId)) {
        return callback?.({ ok: false, error: 'Déjà buzzé' });
      }
      room.buzzes.push({
        playerId: currentPlayerId,
        pseudo: player.pseudo,
        avatar: player.avatar,
        time: buzzTime,
        relativeTime,
      });
      player.buzzerDisabled = true;
    }

    room.buzzes.sort((a, b) => a.time - b.time);
    broadcast(room);
    callback?.({ ok: true });
  });

  // ─── ADMIN ACTIONS ───

  socket.on('admin:toggle-buzzer', () => {
    if (!currentRoom || !isAdmin) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    room.buzzerEnabled = !room.buzzerEnabled;
    broadcast(room);
  });

  // Change buzz mode — also resets buzzes and re-enables all buzzers
  socket.on('admin:set-buzz-mode', ({ mode }) => {
    if (!currentRoom || !isAdmin) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    if (!['standard', 'exclusive', 'rebuzz'].includes(mode)) return;
    room.buzzMode = mode;
    // Reset state so the new mode starts clean
    room.buzzes = [];
    for (const p of Object.values(room.players)) {
      if (!p.kicked) p.buzzerDisabled = false;
    }
    broadcast(room);
  });

  // Set timer duration (0 = stopwatch, >0 = countdown seconds)
  socket.on('admin:set-timer-duration', ({ duration }) => {
    if (!currentRoom || !isAdmin) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    room.timerDuration = Math.max(0, Math.floor(duration));
    broadcast(room);
  });

  // Timer: start (resets to 0 and starts)
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

  // Timer: pause
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

  // Timer: resume
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

  // Timer: stop (reset to 0)
  socket.on('admin:timer-stop', () => {
    if (!currentRoom || !isAdmin) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    clearCountdown(room.code);
    room.timerRunning = false;
    room.timerStart = null;
    room.timerElapsed = 0;
    room.timerExpired = false;
    broadcast(room);
  });

  // New round
  socket.on('admin:new-round', ({ withTimer }) => {
    if (!currentRoom || !isAdmin) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    clearCountdown(room.code);
    room.buzzes = [];
    room.buzzerEnabled = true;
    room.timerExpired = false;
    for (const p of Object.values(room.players)) {
      if (!p.kicked) p.buzzerDisabled = false;
    }
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
    for (const p of Object.values(room.players)) {
      if (!p.kicked) p.buzzerDisabled = false;
    }
    broadcast(room);
  });

  // Clear buzzes only
  socket.on('admin:clear-buzzes', () => {
    if (!currentRoom || !isAdmin) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    room.buzzes = [];
    for (const p of Object.values(room.players)) {
      if (!p.kicked) p.buzzerDisabled = false;
    }
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

  socket.on('admin:toggle-player-buzzer', ({ playerId }) => {
    if (!currentRoom || !isAdmin) return;
    const room = rooms.get(currentRoom);
    if (!room || !room.players[playerId]) return;
    room.players[playerId].buzzerDisabled = !room.players[playerId].buzzerDisabled;
    broadcast(room);
  });

  socket.on('admin:enable-all-buzzers', () => {
    if (!currentRoom || !isAdmin) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    for (const p of Object.values(room.players)) {
      if (!p.kicked) p.buzzerDisabled = false;
    }
    broadcast(room);
  });

  socket.on('admin:disable-all-buzzers', () => {
    if (!currentRoom || !isAdmin) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    for (const p of Object.values(room.players)) {
      if (!p.kicked) p.buzzerDisabled = true;
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

  // ─── DISCONNECT ───
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

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🔴 Wilco's Buzz server running on port ${PORT}`);
});
