const socket = io();

// Get user IDs
const currentUserId = document.getElementById("currentUserId")?.value;
const recipientUserId = document.getElementById("recipientUserId")?.value;

// Join personal room (for private chat)
if (currentUserId) {
    socket.emit("join", {
        userId: currentUserId,
        chatRoomIds: [], // Add group chat room IDs if needed
    });
}

// Load previous messages
socket.emit("loadMessages", {
    sender: currentUserId,
    recipient: recipientUserId,
    isGroup: false,
});

// Send message on Enter
document.getElementById("textarea1").addEventListener("keypress", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const message = this.value.trim();
        if (message !== "") {
            socket.emit("message", {
                sender: currentUserId,
                recipient: recipientUserId,
                message,
                isGroup: false,
            });
            this.value = "";
        }
    }
});

// Listen for new messages
socket.on("message", (data) => {
    const isMine = data.senderId === currentUserId;
    const html = `
        <li class="chat-item ${isMine ? "odd" : ""} list-style-none mt-3">
            ${
                !isMine
                    ? `<div class="chat-img d-inline-block">
                        <img src="/assets/images/users/2.jpg" class="rounded-circle" width="45" />
                    </div>`
                    : ""
            }
            <div class="chat-content ${
                isMine ? "text-end" : ""
            } d-inline-block ps-3">
                <div class="box msg p-2 d-inline-block mb-1">${
                    data.message
                }</div>
            </div>
            <div class="chat-time ${
                isMine ? "text-end" : ""
            } d-block font-10 mt-1 mr-0 mb-3">
                ${new Date(data.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                })}
            </div>
        </li>
    `;
    document.querySelector(".chat-list").insertAdjacentHTML("beforeend", html);
    document.querySelector(".chat-box").scrollTop =
        document.querySelector(".chat-box").scrollHeight;
});

// Load previous messages
socket.on("previousMessages", (messages) => {
    messages.forEach((data) => {
        const isMine = data.senderId === currentUserId;
        const html = `
            <li class="chat-item ${isMine ? "odd" : ""} list-style-none mt-3">
                ${
                    !isMine
                        ? `<div class="chat-img d-inline-block">
                            <img src="/assets/images/users/2.jpg" class="rounded-circle" width="45" />
                        </div>`
                        : ""
                }
                <div class="chat-content ${
                    isMine ? "text-end" : ""
                } d-inline-block ps-3">
                    <div class="box msg p-2 d-inline-block mb-1">${
                        data.message
                    }</div>
                </div>
                <div class="chat-time ${
                    isMine ? "text-end" : ""
                } d-block font-10 mt-1 mr-0 mb-3">
                    ${new Date(data.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </div>
            </li>
        `;
        document
            .querySelector(".chat-list")
            .insertAdjacentHTML("beforeend", html);
    });

    // Auto scroll to bottom after loading
    document.querySelector(".chat-box").scrollTop =
        document.querySelector(".chat-box").scrollHeight;
});
