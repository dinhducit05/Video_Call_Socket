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
        // Lấy danh sách người đã có trong phòng trước khi người mới join
        const existingUsers = room ? [...room] : [];

        socket.join(roomCode);
        // Lưu thông tin vào socket để dùng khi disconnect
        socket.data.roomCode = roomCode;
        socket.data.user = user;

        // Bao cho nguoi cu biet co nguoi moi vao
        socket.to(roomCode).emit("user-joined", {
            socketId: socket.id,
            user: user
        });

        // Gui danh sach hien co cho nguoi moi vua vao
        socket.emit('existing-users', {
            users: existingUsers
        });

        const usersInRoom = io.sockets.adapter.rooms.get(roomCode);
        io.to(roomCode).emit("room-users-count", {
            total: usersInRoom ? usersInRoom.size : 0
        });
        console.log(`${user.name} joined room ${roomCode}`);
    });

    // A gửi offer cho B
    socket.on("offer", ({ targetSocketId, offer }) => {
        io.to(targetSocketId).emit("offer", {
            offer: offer,
            callerSocketId: socket.id
        });
    });

    // B gửi answer cho A
    socket.on("answer", ({ targetSocketId, answer }) => {
        io.to(targetSocketId).emit("answer", {
            answer: answer,
            answerSocketId: socket.id
        });
    });

    // Chuyển ICE candidate giữa 2 trình duyệt
    socket.on("ice-candidate", ({ targetSocketId, candidate }) => {
        io.to(targetSocketId).emit("ice-candidate", {
            candidate: candidate,
            senderSocketId: socket.id
        });
    });

    // Leave room
    socket.on("leave-room", ({ roomCode, user }) => {
        socket.leave(roomCode);

        socket.to(roomCode).emit("user-left", {
            socketId: socket.id,
            user: user
        });

        const usersInRoom = io.sockets.adapter.rooms.get(roomCode);

        io.to(roomCode).emit("room-users-count", {
            total: usersInRoom ? usersInRoom.size : 0
        });

        // Xóa thông tin phòng đã lưu
        socket.data.roomCode = null;
        socket.data.user = null;
    });

    // Gui tin nhan.
    socket.on("send-message", ({ roomCode, message }) => {
        io.to(roomCode).emit("new-message", message);
    });

    // Tự chạy khi đóng tab, mất mạng, tắt trình duyệt...
    socket.on("disconnecting", (reason) => {
        const roomCode = socket.data.roomCode;
        const user = socket.data.user;

        if (!roomCode) return;
        // Dùng "disconnecting" thay vì "disconnect":
        // thời điểm này socket vẫn còn nằm trong room.
        socket.to(roomCode).emit("user-left", {
            socketId: socket.id,
            user
        });
        // Báo số lượng sau khi socket rời phòng.
        // Cần đợi Socket.IO tự xóa socket khỏi room.
        setTimeout(() => {
            const usersInRoom = io.sockets.adapter.rooms.get(roomCode);

            io.to(roomCode).emit("room-users-count", {
                total: usersInRoom ? usersInRoom.size : 0
            });
        }, 0);

        console.log(`Client ${socket.id} disconnected: ${reason}`);
    });
});

httpServer.listen(process.env.PORT, () => {
    console.log(`Socket server running at http://localhost:${process.env.PORT}`);
});