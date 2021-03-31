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

var online = [];
var answers_ranking = [];
var curr_point = [];

function Register(username, socketid) {
    if (online.length != 0) {
        let existing_name = GetUserIndex(username);
        if (existing_name > -1) {
            online[existing_name][2].push(socketid);
            curr_point.push(0);
        } else {
            let new_user = [username, 0, [socketid]];
            online.push(new_user);
            curr_point.push(0);
        }
    } else {
        let new_user = [username, 0, [socketid]];
        online.push(new_user);
        curr_point.push(0);
    }
}

function GetUserIndex(username) {
    let existing_regis = -1;
    for (index in online) {
        existing_regis = online[index].indexOf(username)
        if (existing_regis != -1) {
            return index;
        }
    }
    return existing_regis;
}

function GetUserIndexBySocket(user_socket) {
    let existing_regis = -1;
    for (index in online) {
        existing_regis = online[index][2].indexOf(user_socket)
        if (existing_regis != -1) {
            return index;
        }
    }
}

function UpdateScore(user_socket, score) {
    let check_user_socket = GetUserIndexBySocket(user_socket);
    online[check_user_socket][1] = 1;
    curr_point[check_user_socket] = score;
    let existing = answers_ranking.indexOf(online[check_user_socket][0]);
    if (existing > -1) {
        answers_ranking.splice(existing, 1);
        answers_ranking.push(online[check_user_socket][0]);
    } else {
        answers_ranking.push(online[check_user_socket][0]);
    }
}

function ResetBoard() {
    for (index in online) {
        online[index][1] = 0;
        curr_point[index] = 0;
    }
    answers_ranking = [];
}

function Disconnect(user_socketid) {
    if (online.length > 0) {
        let check = GetUserIndexBySocket(user_socketid);
        if (check > -1) {
            let index_user = GetUserIndexBySocket(user_socketid);
            let index_socket = online[index_user][2].indexOf(user_socketid);
            let index_ranking = answers_ranking.indexOf(online[index_user][0]);
            if (index_ranking > -1) {
                answers_ranking.splice(index_ranking, 1);
            }
            online[index_user][2].splice(index_socket, 1);
            if (online[index_user][2].length < 1) {
                online.splice(index_user, 3);
            }
        }
    }
}

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('regist', (username) => {
        Register(username, socket.id);
        io.sockets.emit('connect_room', { online: online, answers_ranking: answers_ranking });
    });

    socket.on('send_answer', (score) => {
        UpdateScore(socket.id, score);
        io.sockets.emit('send_answer', { online: online, answers_ranking: answers_ranking });
    });

    socket.on('reset', () => {
        ResetBoard();
        io.sockets.emit('reset', { online: online, answers_ranking: answers_ranking });
    });

    socket.on('disconnect', () => {
        Disconnect(socket.id);
        io.sockets.emit('connect_room', { online: online, answers_ranking: answers_ranking });
    });

});