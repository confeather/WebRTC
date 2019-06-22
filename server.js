//获取WebSocket库
var WebSocketServer = require("ws").Server;
//监听端口
var wss = new WebSocketServer({ port: 3000 }),
    users = {};
//监听服务器端connection事件
wss.on("connection", function (connection) {
    //console.log("user connected");
    //识别用户
    connection.on("message", function (message) {
        var data;
        //console.log("got message:", message);
        //接受json消息
        try {
            data = JSON.parse(message);
        } catch (e) {
            console.log("Error parsing JSON");
            data = {};
        }
        //用户动作
        switch (data.type) {
            //试图登陆
            case "login":
                console.log("User logged in as:", data.name);
                if (users[data.name]) {

                    sendTo(connection, { type: "login", success: false });

                } else {
                    users[data.name] = connection;
                    connection.name = data.name;
                    // console.log("users:",users)
                    sendTo(connection, {
                        type: "login",
                        success: true
                    });
                }
                break;
            //呼叫
            case "offer":
                console.log("Sending offer to:", data.name);
                var conn = users[data.name];      //呼叫用户的connection对象

                if (conn != null) {
                    connection.othername = data.name;     //添加othername，方便获取
                    sendTo(conn, {
                        type: "offer",
                        offer: data.offer,
                        name: connection.name
                    });
                }
                break;
            //呼叫应答
            case "answer":
                console.log("Sending answer to:", data.name);
                var conn = users[data.name];

                if (conn != null) {
                    connection.otherName = data.name;
                    sendTo(conn, {
                        type: "answer",
                        answer: data.answer
                    });
                }
                break;
            //处理ICE候选路径
            case "candidate":
                console.log("sending candidate to", data.name);
                var conn = users[data.name];
                if (conn != null) {
                    sendTo(conn, {
                        type: "candidate",
                        candidate: data.candidate
                    });
                }
                break;
            //呼叫挂断
            case "leave":
                console.log("Disconnecting user from", data.name);
                conn = users[data.name];
                conn.otherName = null;

                if (conn != null) {
                    sendTo(conn, {
                        type: "leave"
                    });
                }
                break;
            //登陆失败
            default:
                sendTo(connection, {
                    type: "error",
                    message: "Unrecognized commend:" + data.type
                });
                break;
        }
    });
    //删除用户
    connection.on('close', function () {
        if (connection.name) {
            delete users[connection.name];
            if (connection.otherName) {
                console.log("Disconnecting user from", connection.otherName)

                var conn = users[connection.otherName];
                conn.otherName = null;

                if (conn != null) {
                    sendTo(conn, {
                        type: "leave"
                    });
                }
            }
        }
    });
});

//帮助向连接发送json消息
function sendTo(conn,message){
    conn.send(JSON.stringify(message))
}

wss.on('listening', function () {
    console.log("Server started...");
});