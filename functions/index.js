const { onValueWritten } = require("firebase-functions/v2/database");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");

initializeApp();

exports.markRoomClosed = onValueWritten(
  {
    ref: "/rooms/{roomCode}/gameState",
    region: "us-central1",
    instance: "whoami-game-f9e1c-default-rtdb",
  },
  async (event) => {
    const newState = event.data.after.val();
    const roomCode = event.params.roomCode;
    if (newState === "leaderboard") {
      const db = getDatabase();
      await db.ref(`rooms/${roomCode}/closedAt`).set(Date.now());
    }
  }
);

exports.cleanupEmptyRoom = onValueWritten(
  {
    ref: "/rooms/{roomCode}/players/{playerId}",
    region: "us-central1",
    instance: "whoami-game-f9e1c-default-rtdb",
  },
  async (event) => {
    if (event.data.after.exists()) return; // sadece bir oyuncu silindiğinde çalış
    const db = getDatabase();
    const playersSnap = await db
      .ref(`rooms/${event.params.roomCode}/players`)
      .once("value");
    if (!playersSnap.exists()) {
      await db.ref(`rooms/${event.params.roomCode}`).remove();
    }
  }
);

exports.cleanupOldRooms = onSchedule(
  {
    schedule: "0 3 * * *",
    timeZone: "Europe/Istanbul",
    region: "us-central1",
  },
  async () => {
    const db = getDatabase();
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const snap = await db.ref("rooms").once("value");
    if (!snap.exists()) return;
    const rooms = snap.val();
    const deletePromises = [];
    for (const [code, room] of Object.entries(rooms)) {
      const shouldDelete =
        (room.closedAt && room.closedAt < cutoff) ||
        (room.gameState === "lobby" && room.createdAt && room.createdAt < cutoff);
      if (shouldDelete) {
        deletePromises.push(db.ref(`rooms/${code}`).remove());
      }
    }
    await Promise.all(deletePromises);
    console.log(`Temizlendi: ${deletePromises.length} oda silindi.`);
  }
);