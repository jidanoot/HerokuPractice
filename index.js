const express = require('express');
const socketio = require('socket.io');
const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.render('pages/index');
});

const server = app.listen(process.env.PORT || 3000, () => {
    console.log("server is running")
});
const io = socketio(server);


var connected = [];
var list = []
var answers_status = [];
var answers_ranking = [];
var point = [];


// http.listen(3000, () => {
//     console.log('listening on *:3000');
// });

// function Register(username, socketid) {

// }


// for socket
io.on('connection', (socket) => {
    console.log('a user connected');
    connected.push(socket.id);
    answers_status.push(0);
    point.push(0);
    io.sockets.emit('connect_room', { connected: connected, answers_status: answers_status, answers_ranking: answers_ranking });
    // console.log('connect list ' + connected);
    // console.log(socket.id + 'Client connected..');

    socket.on('send_answer', (score) => {
        // update score
        let index = connected.indexOf(socket.id);
        answers_status[index] = 1;
        point[index] = score;
        let existing = answers_ranking.indexOf(socket.id);
        if (existing > -1) {
            answers_ranking.splice(existing, 1);
            answers_ranking.push(socket.id);
        } else {
            answers_ranking.push(socket.id);
        }
        io.sockets.emit('send_answer', { connected: connected, answers_status: answers_status, answers_ranking: answers_ranking });
        console.log(socket.id + 'score input: ' + score);
    });

    socket.on('reset', () => {
        for (index in connected) {
            answers_status[index] = 0;
            point[index] = 0;
        }
        answers_ranking = [];
        io.sockets.emit('reset', { connected: connected, answers_status: answers_status, answers_ranking: answers_ranking });
        console.log('reset data');
    });

    socket.on('disconnect', () => {
        console.log(socket.id + 'disconnect');
        let index_connect = connected.indexOf(socket.id);
        if (index_connect > -1) {
            connected.splice(index_connect, 1);
            answers_status.splice(index_connect, 1);
            point.splice(index_connect, 1);
        }
        let index_ranking = answers_ranking.indexOf(socket.id);
        if (index_ranking > -1) {
            answers_ranking.splice(index_ranking, 1);
        }

        io.sockets.emit('connect_room', { connected: connected, answers_status: answers_status, answers_ranking: answers_ranking });
    });


});