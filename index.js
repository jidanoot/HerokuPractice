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
var reveal_status = false;
var disconnect_flag = false;


function Register(username, socketid) {
    if (online.length != 0) {
        let existing_name = GetUserIndex(username);
        if (existing_name > -1) {
            online[existing_name][2].push(socketid);
        } else {
            let new_user = [username, false, [socketid]];
            online.push(new_user);
        }
    } else {
        let new_user = [username, false, [socketid]];
        online.push(new_user);
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
    return existing_regis;
}

function UpdateScore(user_socket, score) {
    let check_user_socket = GetUserIndexBySocket(user_socket);
    if (check_user_socket > -1) {
        online[check_user_socket][1] = true;
        let existing = answers_ranking.indexOf(online[check_user_socket][0]);
        if (existing > -1) {
            answers_ranking.splice(existing, 1);
            answers_ranking.push(online[check_user_socket][0]);
            curr_point.splice(existing, 1);
            curr_point.push(score);
        } else {
            answers_ranking.push(online[check_user_socket][0]);
            curr_point.push(score);
        }
    }
}

function ResetBoard() {
    for (index in online) {
        online[index][1] = false;
    }
    answers_ranking = [];
    curr_point = [];
    reveal_status = false;
}

function Reveal() {
    let count_online = online.length;
    let count_ranking = answers_ranking.length;
    if (count_online === count_ranking) {
        reveal_status = true;
    } else {
        reveal_status = false;
    }
    return reveal_status;
}

function Disconnect(user_socketid) {
    for (var i = online.length - 1; i >= 0; i--) {
        let index_user = GetUserIndexBySocket(user_socketid);
        if (index_user > -1) {
            for (j in online[index_user][2]) {
                let index_socket = online[index_user][2].indexOf(user_socketid);
                if (index_socket > -1) {
                    online[index_user][2].splice(index_socket, 1);
                } else { break; }
            }
            if (online[index_user][2].length < 1) {
                let index_ranking = answers_ranking.indexOf(online[index_user][0]);
                online.splice(index_user, 3);
                disconnect_flag = true;
                if (index_ranking > -1) {
                    answers_ranking.splice(index_ranking, 1);
                    curr_point.splice(index_ranking, 1);
                }
            }
        }
    }
}

io.on('connection', socket => {
    socket.on('regist', (username) => {
        Register(username, socket.id);
        Reveal();
        io.sockets.emit('connect_room', { online: online, answers_ranking: answers_ranking });
        io.sockets.emit('reveal_answer', { answers_ranking: answers_ranking, curr_point: curr_point, reveal_status: reveal_status });
    });

    socket.on('send_answer', (score) => {
        UpdateScore(socket.id, score);
        io.sockets.emit('send_answer', { online: online, answers_ranking: answers_ranking });
        Reveal();
        io.sockets.emit('reveal_answer', { answers_ranking: answers_ranking, curr_point: curr_point, reveal_status: reveal_status });
    });

    socket.on('reset', () => {
        ResetBoard();
        io.sockets.emit('reset', { online: online, answers_ranking: answers_ranking });
    });

    socket.on('reveal', (password_admin) => {
        if (process.env.ADMIN == password_admin) {
            reveal_status = true;
            io.sockets.emit('reveal_answer', { answers_ranking: answers_ranking, curr_point: curr_point, reveal_status: reveal_status });
        }
    });


    socket.on('disconnect', () => {
        let disconnect_id = GetUserIndexBySocket(socket.id);
        // console.log(socket.id);
        // console.log(disconnect_id);
        if (disconnect_id > -1) {
            let disconnect_name = online[disconnect_id][0];
            Disconnect(socket.id);
            if (disconnect_flag) {
                io.sockets.emit('user_disconnect', { disconnect_name: disconnect_name });
                disconnect_flag = false;
            }
            Reveal();
            // console.log(reveal_status);
            // console.log(answers_ranking);
            io.sockets.emit('reveal_answer', { answers_ranking: answers_ranking, curr_point: curr_point, reveal_status: reveal_status });
            // console.log(online);
            // console.log(answers_ranking);

        }
    });

});