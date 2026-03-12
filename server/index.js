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

// Serve built frontend in production
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

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  // Make sure it's unique
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
    allowRebuzz: room.allowRebuzz,
    timerRunning: room.timerRunning,
    timerStart: room.timerStart,
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
      allowRebuzz: false,
      timerRunning: false,
      timerStart: null,
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

  // ─── CHECK ROOM (before joining) ───
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
    // Check pseudo uniqueness
    const pseudoTaken = Object.values(room.players).some(
      (p) => !p.kicked && p.pseudo.toLowerCase() === pseudo.toLowerCase()
    );
    if (pseudoTaken) return callback({ ok: false, error: 'Ce pseudo est déjà pris !' });

    const playerId = nanoid(8);
    room.players[playerId] = {
      pseudo,
      avatar,
      buzzerDisabled: false,
      kicked: false,
      socketId: socket.id,
      joinedAt: Date.now(),
    };

    currentRoom = code;
    currentPlayerId = playerId;
    isAdmin = false;
    socket.join(`room:${code}`);

    // Notify admin & overlay
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

    // Already buzzed?
    if (room.buzzes.find((b) => b.playerId === currentPlayerId)) {
      return callback?.({ ok: false, error: 'Déjà buzzé' });
    }

    const buzzTime = Date.now();
    const relativeTime = room.timerStart ? buzzTime - room.timerStart : 0;

    room.buzzes.push({
      playerId: currentPlayerId,
      pseudo: player.pseudo,
      avatar: player.avatar,
      time: buzzTime,
      relativeTime,
    });
    room.buzzes.sort((a, b) => a.time - b.time);

    // If no rebuzz, disable this player's buzzer
    if (!room.allowRebuzz) {
      player.buzzerDisabled = true;
    }

    // Broadcast update
    io.to(`room:${currentRoom}`).emit('room-update', getRoomPublicState(room));
    io.to(`admin:${currentRoom}`).emit('room-update', getRoomAdminState(room));
    io.to(`overlay:${currentRoom}`).emit('room-update', getRoomPublicState(room));

    callback?.({ ok: true });
  });

  // ─── ADMIN ACTIONS ───
  socket.on('admin:toggle-buzzer', () => {
    if (!currentRoom || !isAdmin) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    room.buzzerEnabled = !room.buzzerEnabled;
    if (room.buzzerEnabled && !room.timerRunning) {
      room.timerRunning = true;
      room.timerStart = Date.now();
    }
    broadcast(room);
  });

  socket.on('admin:toggle-rebuzz', () => {
    if (!currentRoom || !isAdmin) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    room.allowRebuzz = !room.allowRebuzz;
    broadcast(room);
  });

  socket.on('admin:new-round', () => {
    if (!currentRoom || !isAdmin) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    room.buzzes = [];
    room.timerRunning = true;
    room.timerStart = Date.now();
    room.buzzerEnabled = true;
    for (const p of Object.values(room.players)) {
      p.buzzerDisabled = false;
    }
    broadcast(room);
  });

  socket.on('admin:reset', () => {
    if (!currentRoom || !isAdmin) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    room.buzzes = [];
    room.timerRunning = false;
    room.timerStart = null;
    room.buzzerEnabled = false;
    for (const p of Object.values(room.players)) {
      p.buzzerDisabled = false;
    }
    broadcast(room);
  });

  socket.on('admin:kick', ({ playerId }) => {
    if (!currentRoom || !isAdmin) return;
    const room = rooms.get(currentRoom);
    if (!room || !room.players[playerId]) return;
    room.players[playerId].kicked = true;
    room.buzzes = room.buzzes.filter((b) => b.playerId !== playerId);

    // Notify the kicked player
    const kickedSocket = room.players[playerId].socketId;
    if (kickedSocket) {
      io.to(kickedSocket).emit('kicked');
    }
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
      // Admin left — close the room, notify everyone
      io.to(`room:${currentRoom}`).emit('room-closed');
      rooms.delete(currentRoom);
    } else if (currentPlayerId) {
      // Player left — remove them
      delete room.players[currentPlayerId];
      room.buzzes = room.buzzes.filter((b) => b.playerId !== currentPlayerId);
      broadcast(room);
    }
  });

  function broadcast(room) {
    io.to(`room:${room.code}`).emit('room-update', getRoomPublicState(room));
    io.to(`admin:${room.code}`).emit('room-update', getRoomAdminState(room));
    io.to(`overlay:${room.code}`).emit('room-update', getRoomPublicState(room));
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🔴 Wilco's Buzz server running on port ${PORT}`);
});
