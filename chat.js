const { Chirp, toAscii } = ChirpConnectSDK;
const key = '847AE335BabB1EFDB9Ca0507c'; // Your key from Chirp.io.
var sdk;

var newChannel = ""; // Stores new channel names when detected with Chirp.
var channel = ""; // Stores current chat channel.

pubnub = new PubNub({ // Your PubNub keys here. Get them from https://dashboard.pubnub.com.
    publishKey : 'demo',
    subscribeKey : 'demo'
});

msgList = $('.msg-group');
inputBox = $('#input-box');
sendButton = $('#send-button');
joinButton = $('#join-button');
hostButton = $('#host-button');
chirpButton = $('#chirp-button'); // Button to play chip sound for current channel.
welcomeModal = $('#welcomeModal'); // Modal for connection instructions.
newChatModal = $('#newChatModal'); // Modal for when a new channel is detected.

class chatControl { // Formats messages.
    publishMessage(name, msg) {
        msgList.append(this.msg(name, msg, 'right', 'primary'));
        this.scrollToBottom(); 
    }
    receiveMessage(name, msg) {
        msgList.append(this.msg(name, msg, 'left', 'secondary'));
        this.scrollToBottom(); 
    }
    msg(name, msg, side, style) {
        var msgTemp = `
            <div class="card text-white bg-${style}">
                 <div class="card-body">
                     <h6 class="card-subtitle mb-2 text-${side}">${name}</h6>
                     <p class="card-text float-${side}">${msg}</p>
                 </div>
            </div>
            `;
        return msgTemp;
    }
    scrollToBottom() {
        msgList.scrollTop(msgList[0].scrollHeight);
    }
}
var chat = new chatControl();

pubnub.addListener({
    status: function(statusEvent) {
        if (statusEvent.category === "PNConnectedCategory") { // Hide modals and show welcome message.
            welcomeModal.modal('hide');
            newChatModal.modal('hide');
            chat.receiveMessage('Welcome', "You're connected to the chat! Press 'Chirp' to share your chat with a nearby device.");
        }
    },
    message: function(msg) {
    	console.log(msg);
        if (msg.publisher == pubnub.getUUID()) { // Check who sent the message.
            chat.publishMessage('You', msg.message);
        } else {
            chat.receiveMessage('Guest', msg.message);
        }
    },
});

function publishMessage() { // Send messages with PubNub.
	var msg = inputBox.val().trim().replace(/(?:\r\n|\r|\n)/g, '<br>'); // Format message.
	inputBox.val('');
    if (msg != '') {
        var publishConfig = {
            channel: channel,
            message: msg
        };
        pubnub.publish(publishConfig, function(status, response) { // Publish message to current channel.
            console.log(status, response);
        });
    }
};
sendButton.on('click', publishMessage.bind());
inputBox.keyup(function (e) {
    if(e.keyCode == 13 && !e.shiftKey) {
        publishMessage();
    }
    if (e.keyCode === 27) {
        inputBox.blur();
    }
})

Chirp({
    key: key,
    onReceived: data => {
        if (data.length > 0) {
            newChannel = toAscii(data);
            console.log("Channel detected: "+toAscii(newChannel));
            if (channel == "") { // First time connecting to chat. 
                channel = newChannel;
                pubnub.subscribe({
                    channels: [channel]
                });
            } else if (channel != newChannel) { // Ask if the user wants to connect to the new channel.
                newChatModal.modal('show');
            }
        }   
    }
})
.then(_sdk => {
    sdk = _sdk;
})
.catch(console.warn);

function chripSend() { // Chirp current channel name.
    if (channel != "") {
        const payload = new TextEncoder('utf-8').encode(channel);
        sdk.send(payload);
    }
};
chirpButton.on('click', chripSend.bind());  

function hostChat() { // Join a chat with the last 8 characters of the users UUID as the channel name.
    if (channel == "") {
        channel = pubnub.getUUID().slice(-8);
        pubnub.subscribe({
            channels: [channel]
        });
    }
};
hostButton.on('click', hostChat.bind());

function joinChat() { // Join a channel that was detected from a chirp.
	pubnub.unsubscribe({ // Unsubscribe from old channel.
	    channels: [channel]
	});
    channel = newChannel; // Switch to new channel.
    inputBox.val('');
    msgList.html(''); // Clear messages from old channel.
    pubnub.subscribe({
        channels: [channel] // Join new channel.
    });
};
joinButton.on('click', joinChat.bind());

welcomeModal.modal({ // Show welcome modal.
    backdrop: 'static',
    keyboard: false
});