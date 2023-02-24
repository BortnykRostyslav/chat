require('module-alias/register');
const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');
require('dotenv').config({path: path.join(__dirname, 'env', `.env.${process.env.NODE_ENV || 'local'}`)});
global.rootPath = __dirname;

const { PORT } = require('./configs/variables');
const socketUtils = require('./socket/user-socket.util');
const app = express();

const server = http.createServer(app);

const io = socketIO(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
    socket.on('joinRoom', (roomData) => {
        socket.join(roomData.room);

        socketUtils.userJoinRoom(socket.id, roomData.username, roomData.room);

        io
            .to(roomData.room)
            .emit('userList', {
                chatName: roomData.room,
                members: socketUtils.getChatMembers()
            });


        socket.broadcast
            .to(roomData.room)
            .emit('message', {
                message: `${roomData.username} join room `,
                senderName: 'System'
            });
    });

    socket.on('chatMessages', (message) => {
        const user = socketUtils.findUserBySocketId(socket.id);

        if(!user){
            return;
        }

        io
            .to(user.roomName)
            .emit('message', { message, senderName: user.userName });
    });

    socket.on('disconnect', () => {
        const user = socketUtils.findUserBySocketId(socket.id);

        socketUtils.userLeaveRoom(socket.id);
        socket.leave(user.roomName);

        io
            .to(user.roomName)
            .emit('userList', {
                chatName: user.roomName,
                members: socketUtils.getChatMembers()
            });
    })
});

app.use(express.json());
app.use(express.urlencoded({extended: true}));

server.listen(PORT, () => {
    console.log('Listen', PORT);
});