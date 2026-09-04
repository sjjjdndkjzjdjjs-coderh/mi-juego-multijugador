const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Servidor funcionando. Jugadores conectados: ' + io.engine.clientsCount);
});

io.on('connection', (socket) => {
  io.emit('jugadores', io.engine.clientsCount);
  socket.on('mensaje', (data) => socket.broadcast.emit('mensaje', data));
  socket.on('disconnect', () => io.emit('jugadores', io.engine.clientsCount));
});

server.listen(PORT, () => console.log('Servidor arriba en puerto ' + PORT));
