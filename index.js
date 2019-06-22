var connection = new WebSocket('ws://localhost:3000'),
//var connection = new WebSocket('ws://192.168.199.179:3000'),
    name = "";

var loginPage = document.querySelector('#login-page'),
    usernameInput = document.querySelector('#userName'),
    loginButton = document.querySelector('#login'),
    callPage = document.querySelector('#call-page'),
    otherUsernameInput = document.querySelector('#otherName'),
    callButton = document.querySelector('#call'),
    hangUpButton = document.querySelector('#hang-up');

var localConnection;
var connectedUser;
var stream;
var localVideo = document.querySelector('#localVideo');
var otherVideo = document.querySelector('#remoteVideo');

callPage.style.display = "none";

//单击按钮登陆
loginButton.addEventListener("click", function (event) {
    name = usernameInput.value;
    if (name.length > 0) {
        send({
            type: "login",
            name: name
        });
    }
});

connection.onopen = function () {
    console.log("connected");
};
//通过回调函数处理所有的消息
connection.onmessage = function (message) {
    console.log("Got message", message.data);
    var data = JSON.parse(message.data);

    switch (data.type) {
        case "login":
            onLogin(data.success);
            break;
        case "offer":
            onOffer(data.offer, data.name);
            break;
        case "answer":
            onAnswer(data.answer);
            break;
        case "candidate":
            onCandidate(data.candidate);
            break;
        case "leave":
            onLeave();
            break;
        default:
            break;
    }
};

connection.onerror = function (err) {
    console.log("Got error", err);
};



// Alias 以json格式发送消息
function send(message) {
    if (connectedUser) {
        message.name = connectedUser;
    }
    connection.send(JSON.stringify(message));
};
//用户登陆
function onLogin(success) {
    if (success === false) {
        alert("Login unsuccessful, please try a different name.");
    } else {
        loginPage.style.display = "none";
        callPage.style.display = "block";

        //准备通话通道
        startConnection();
    }
};
//单击呼叫按钮
callButton.addEventListener("click", function () {
    var otherUsername = otherUsernameInput.value;
    if (otherUsername.length > 0) {
        startPeerConnection(otherUsername);
    }
});
//单击挂断按钮
hangUpButton.addEventListener("click", function () {
    send({
        type: "leave"
    });

    onLeave();
});

//发送offer
function onOffer(offer, name) {
    connectedUser = name;
    localConnection.setRemoteDescription(new RTCSessionDescription(offer));
    localConnection.createAnswer(function (answer) {
        localConnection.setLocalDescription(answer);
        send({
            type: "answer",
            answer: answer
        });
    }, function (error) {
        alert("An error has occurred");
    });
}
//发送answer
function onAnswer(answer) {
    localConnection.setRemoteDescription(new RTCSessionDescription(answer));
}
//交换ICE候选
function onCandidate(candidate) {
    localConnection.addIceCandidate(new RTCIceCandidate(candidate));
}

//用户离开
function onLeave() {
    connectedUser = null;
    otherVideo.srcObject = null;
    localConnection.close();
    localConnection.onicecandidate = null;
    localConnection.onaddstream = null;
    setupPeerConnection(stream);
}
//判断可以获取本地摄像头视频流
function hasUserMedia() {
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    return !!navigator.getUserMedia;
}
//判断浏览器支持WebRTC
function hasRTCPeerConnection() {
    window.RTCPeerConnection = window.RTCPeerConnection ||
        window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    window.RTCSessionDescription = window.RTCSessionDescription ||
        window.webkitRTCSessionDescription || window.mozRTCSessionDescription;
    window.RTCIceCandidate = window.RTCIceCandidate ||
        window.webkitRTCIceCandidate || window.mozRTCIceCandidate;
    return !!window.RTCPeerConnection;
}
//开始尝试连接
function startConnection() {
    if (hasUserMedia()) {
        navigator.getUserMedia({
            video: true, audio: false
        }, function (myStream) {
            stream = myStream;
            //localVideo.src = window.URL.createObjectURL(stream);
            localVideo.srcObject = stream;
            if (hasRTCPeerConnection()) {
                setupPeerConnection(stream);
            } else {
                alert("sorry,your browser does not support webRTC");
            }
        }, function (error) {
            console.log(error);
        });
    } else {
        alert("sorry, your browser does not support webRTC");
    }
}
//创建RTCPeerConnection
function setupPeerConnection(stream) {
    var configuration = {
        "iceServers": [{ "url": "stun:stun.1.google.com:19302" }]
    };

    localConnection = new RTCPeerConnection(configuration);
    //设置流的监听
    localConnection.addStream(stream);
    localConnection.onaddstream = function (e) {
        //otherVideo.src = window.URL.createObjectURL(e.stream);
        otherVideo.srcObject = e.stream;
    };

    //设置ice处理事件
    localConnection.onicecandidate = function (event) {
        if (event.candidate) {
            send({
                type: "candidate",
                candidate: event.candidate
            });
        }
    };
}

function startPeerConnection(user) {
    connectedUser = user;
    //开始创建offer
    localConnection.createOffer(function (offer) {
        send({
            type: "offer",
            offer: offer
        });
        localConnection.setLocalDescription(offer);
    }, function (error) {
        alert("an error has occurred");
    });
};