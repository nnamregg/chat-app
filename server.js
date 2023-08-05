import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import formatMessage from './utils/messages.js';
import { userJoin, getCurrentUser, userLeave, getRoomUsers } from './utils/users.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// set static folder
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));

const botName = 'ChatCord Bot';

// run when a client connects
io.on('connection', socket => {
  socket.on('joinRoom', ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);
    
    // Emit message to the new connected user
    socket.emit('msg', formatMessage(botName, 'Welcome to ChatCord!'));

    // Broadcast (to everyone but the user) when a user connects
    socket.broadcast
      .to(user.room)
      .emit("msg", formatMessage(botName, `${user.username} has joined the chat!`));

    // Send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    })
  });

  // Listen for chat msg
  socket.on('chatMsg', (msg) => {
    const user = getCurrentUser(socket.id);
    
    io.to(user.room).emit('msg', formatMessage(user.username, msg));
  });

  // Runs when a client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if(user) {
      io.to(user.room).emit('msg', formatMessage(botName, `${user.username} has left the chat`));

      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    }

  });

})

const PORT = 3000 || process.env.PORT;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
