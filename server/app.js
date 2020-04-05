const http = require('http');
const fs = require('fs');
var util = require('util');
// var log_file = fs.createWriteStream(__dirname + '/public/debug.log', {flags : 'w'});
// var log_stdout = process.stdout;

/*console.log = function(d) { //
  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
};*/

const server = http.createServer();
const io = require('socket.io')(server);

const chatroom = [];
const snakeroom = [];
const mouseroom = [];
const limit = {};
const lastMsgs = [];

function addMsg(msg) {
	lastMsgs.push(msg);
	if (lastMsgs.length > 10)
		lastMsgs.splice(0, lastMsgs.length - 10);
}

function broadcast(event, data) {
    chatroom.forEach(function(socket) {
        socket.emit(event, data);
    })
}

io.on('connection', function(socket){
	
	let authenticated = false

    socket.on('disconnect', function(){
		if (limit[socket.id]) delete(limit[socket.id]);
		
		if (chatroom.indexOf(socket) > -1)	{
        	chatroom.splice(chatroom.indexOf(socket), 1);
			chatroom.forEach(function(other) {
				if (!other.disconnected)
					other.emit('data', {
						action: 'left',
						id: socket.id
					})
			});
		}
		
		if (snakeroom.indexOf(socket) > -1)	{
        	snakeroom.splice(snakeroom.indexOf(socket), 1);
			snakeroom.forEach(function(other) {
				if (!other.disconnected)
					other.emit('snake', {
						action: 'left',
						id: socket.id
					})
			});
		}
		
		if (mouseroom.indexOf(socket) > -1)	{
        	mouseroom.splice(mouseroom.indexOf(socket), 1);
			mouseroom.forEach(function(other) {
				if (!other.disconnected)
					other.emit('mouse', {
						action: 'left',
						id: socket.id
					})
			});
		}
		
        broadcast('users', chatroom.length);
		
		authenticated = false
    });

    socket.on('msg', function(data) {
		var now = Date.now();
		var sId = 's'+socket.id;
        if (!limit[sId] || now-1000 > limit[sId]) {
            limit[sId] = now;
			addMsg(data);
            data.id = socket.id;
            broadcast('msg', data);
        }
    });
	
	socket.on('mouse', function(data) {
		var now = Date.now();
		var sId = 's'+socket.id;
        if (!limit[sId] || now-100 > limit[sId]) {
            limit[sId] = now;
            data.id = socket.id;
			mouseroom.forEach(function(other) {
				if (other.id !== socket.id && !other.disconnected) other.emit('mouse', data)
			})
        }
    });
	
	socket.on('token', function(token) {
		if (token === 'snake') {
			authenticated = true
			snakeroom.push(socket)
			socket.emit('info', 'Authenticated ' + snakeroom.length);
		} else if (token === 'qwerty') {
			authenticated = true
												 
			chatroom.push(socket);
			broadcast('users', chatroom.length);
			
			socket.emit('info', 'Authenticated ' + chatroom.length);
		} else if (typeof token === 'object' && token.t === 'mouse') {
			authenticated = true
			socket.name = token.n
			mouseroom.push(socket)
			mouseroom.forEach(function(other) {
				if (other.id !== socket.id && !other.disconnected) {
					socket.emit('mouse', {
						action: 'join',
						name: other.name,
						id: other.id
					})
					other.emit('mouse', {
						action: 'join',
						name: socket.name,
						id: socket.id
					})
				}
			})
			socket.emit('info', 'Authenticated ' + mouseroom.length);
		} else {
			socket.disconnect()
		}
	});
	
	socket.on('snake', function(data) {
		if (data && data.action) {
			data.id = socket.id
			if (data.action === 'player') {
				snakeroom.forEach(function(other) {
					if (other.id !== socket.id && !other.disconnected) {
						if (other._inGame) socket.emit('snake', other._inGame)
						other.emit('snake', data)
					}
				});
				socket._inGame = data;
			}
			if (data.action === 'update') {
				socket._inGame.x = data.x;
				socket._inGame.y = data.y;
				socket._inGame.d = data.d;
				snakeroom.forEach(function(other) {
					if (other.id !== socket.id && !other.disconnected) other.emit('snake', data)
				})
			}
		}
	});
	
	socket.on('data', function(data) {
		if (data && data.action) {
			data.id = socket.id
			if (data.action === 'player') {
				chatroom.forEach(function(other) {
					if (other.id !== socket.id && other._inGame && !other.disconnected) socket.emit('data', other._inGame)
				});
				socket._inGame = data;
			}
			chatroom.forEach(function(other) {
				if (other.id !== socket.id) other.emit('data', data);
			})
		} else socket.emit('info', 'Not authenticated');
	});
	
	socket.on('username', function(username) {
		if (username && !tokens[username]) {
			authenticated = username;
			tokens[username] = socket;
		}
	});

	lastMsgs.forEach(function(msg) {
		socket.emit('msg', msg);
	});
});

setInterval(function() {
	var disconnected = false;
	for (var i=0; chatroom.length > i; i++) {
		if (chatroom[i].client.conn.readyState == 'closed') {
			chatroom.splice(i--, 1);
			disconnected = true;
		}
	}

	if (disconnected) broadcast('users', chatroom.length);
}, 5000);

const PORT = process.env.PORT || 8080;
server.listen(PORT);
console.log('Open http://localhost:'+PORT);