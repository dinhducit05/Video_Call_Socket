require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(cors({
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"]
}));

const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL,
        methods: ["GET", "POST"]
    }
});

app.get("/", (req, res) => {
    res.json({ message: "Socket server is running" });
});

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Join room
    socket.on("join-room", ({roomCode, user}) => {
        socket.join(roomCode);
        socket.to(roomCode).emit("user-joined", {
            socketId: socket.id,
            user: user
        });

        const usersInRoom = io.sockets.adapter.rooms.get(roomCode);
        io.to(roomCode).emit("room-users-count", {
            total: usersInRoom ? usersInRoom.size : 0
        });

        // console.log(`${socket.id} joined ${roomCode}`);
    });

    // Leave room
    socket.on("leave-room", ({ roomCode, user }) => {
        socket.leave(roomCode);

        socket.to(roomCode).emit("user-left", {
            socketId: socket.id,
            user: user
        });
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

httpServer.listen(process.env.PORT, () => {
    console.log(`Socket server running at http://localhost:${process.env.PORT}`);
});