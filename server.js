var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
let called = 0;
let clients = 0;
app.get('/', (req, res) => {
	res.sendFile('hello there');
});

io.on('connection', (socket) => {
	socket.on('disconnect', () => {
		console.log(socket, 'left the room');
	});
	// console.log('a user connected');

	socket.on('frontPose', (data) => {
		console.log(data);
		// let now = new Date();
		// console.log(now);
		console.log(socket.id);
		socket.broadcast.emit('backPose', data);
	});
});

http.listen(3000, () => {
	console.log('listening on *:3000');
});
console.log();
