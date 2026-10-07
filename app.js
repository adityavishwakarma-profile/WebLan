const socket = io();

let username = "";


const loginScreen =
    document.getElementById("login-screen");

const chatApp =
    document.getElementById("chat-app");

const usernameInput =
    document.getElementById("username-input");

const joinButton =
    document.getElementById("join-button");

const messageInput =
    document.getElementById("message-input");

const sendButton =
    document.getElementById("send-button");

const fileInput =
    document.getElementById("file-input");

const fileButton =
    document.getElementById("file-button");

const messages =
    document.getElementById("messages");

const usersList =
    document.getElementById("users-list");

const userCount =
    document.getElementById("user-count");

const statusDot =
    document.getElementById("status-dot");

const statusText =
    document.getElementById("status-text");


socket.on("connect", function () {

    statusDot.style.background = "#22c55e";

    statusText.textContent =
        "LAN Connected";

});


socket.on("disconnect", function () {

    statusDot.style.background = "#ef4444";

    statusText.textContent =
        "Disconnected";

});



function joinChat() {

    const name =
        usernameInput.value.trim();


    if (name === "") {

        usernameInput.focus();

        return;

    }


    username = name.substring(0, 20);


    socket.emit("join", username);


    loginScreen.classList.add("hidden");

    chatApp.classList.remove("hidden");


    messageInput.focus();

}


joinButton.addEventListener(
    "click",
    joinChat
);


usernameInput.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Enter") {

            joinChat();

        }

    }
);



socket.on(
    "user_list",
    function (users) {

        usersList.innerHTML = "";

        userCount.textContent =
            users.length;


        users.forEach(function (user) {

            const userElement =
                document.createElement("div");

            userElement.className =
                "user-item";


            const dot =
                document.createElement("span");

            dot.className =
                "user-dot";


            const name =
                document.createElement("span");

            name.className =
                "user-name";

            name.textContent = user;


            userElement.appendChild(dot);

            userElement.appendChild(name);

            usersList.appendChild(
                userElement
            );

        });

    }
);




socket.on(
    "message",
    function (data) {

        if (data.type === "system") {

            addSystemMessage(
                data.message
            );

            return;

        }


        addChatMessage(
            data.username,
            data.message
        );

    }
);



function addChatMessage(
    sender,
    message
) {

    const messageElement =
        document.createElement("div");


    messageElement.className =
        "message";


    if (sender === username) {

        messageElement.classList.add("own");

    }


    const userElement =
        document.createElement("div");

    userElement.className =
        "message-user";

    userElement.textContent =
        sender;


    const textElement =
        document.createElement("div");

    textElement.className =
        "message-text";

    textElement.textContent =
        message;


    messageElement.appendChild(
        userElement
    );

    messageElement.appendChild(
        textElement
    );


    messages.appendChild(
        messageElement
    );


    scrollToBottom();

}




function addSystemMessage(message) {

    const element =
        document.createElement("div");

    element.className =
        "system-message";

    element.textContent =
        "🔔 " + message;


    messages.appendChild(element);


    scrollToBottom();

}


function sendMessage() {

    const message =
        messageInput.value.trim();


    if (message === "") {

        return;

    }


    socket.emit(
        "message",
        {
            message: message
        }
    );


    messageInput.value = "";

    messageInput.focus();

}


sendButton.addEventListener(
    "click",
    sendMessage
);


messageInput.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Enter") {

            sendMessage();

        }

    }
);




function scrollToBottom() {

    messages.scrollTop =
        messages.scrollHeight;

}
// ================= FILE SHARING =================

fileButton.addEventListener("click", function () {
    fileInput.click();
});


fileInput.addEventListener("change", async function () {

    const file = fileInput.files[0];

    if (!file) {
        return;
    }

    // 25 MB limit
    const maxSize = 25 * 1024 * 1024;

    if (file.size > maxSize) {

        alert("File is too large. Maximum size is 25 MB.");

        fileInput.value = "";

        return;
    }

    const formData = new FormData();

    formData.append("file", file);
    formData.append("username", username);
    try {

        const response = await fetch("/upload", {
            method: "POST",
            body: formData
        });


        const result = await response.json();


        if (!result.success) {

            alert(
                result.error || "File upload failed."
            );

            return;
        }





    } catch (error) {

        console.error(
            "File upload error:",
            error
        );

        alert(
            "Could not upload the file."
        );
    }


    fileInput.value = "";
});
function addFileMessage(
    sender,
    filename,
    downloadUrl
) {

    const element =
        document.createElement("div");

    element.className = "message file-message";


    const userElement =
        document.createElement("div");

    userElement.className =
        "message-user";

    userElement.textContent =
        sender;


    const fileElement =
        document.createElement("div");

    fileElement.className =
        "file-card";


    fileElement.innerHTML = `
        <div class="file-icon">📁</div>

        <div class="file-info">
            <div class="file-name">
                ${filename}
            </div>

            <a
                href="${downloadUrl}"
                class="download-button"
                download
            >
                Download
            </a>
        </div>
    `;


    element.appendChild(userElement);

    element.appendChild(fileElement);

    messages.appendChild(element);

    scrollToBottom();
}
// ================= FILE RECEIVED =================

socket.on("file_shared", function (data) {

    addFileMessage(
        data.username,
        data.filename,
        data.download_url
    );

});