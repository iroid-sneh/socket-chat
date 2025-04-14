const socket = io();

const senderId = document.getElementById("currentUserId").value;
const recipientId = document.getElementById("recipientUserId").value;
const chatInput = document.getElementById("textarea1");
const chatBox = document.querySelector(".chat-box");
const isGroupChat = document.getElementById("isGroup")?.value === "true";
const fileInput = document.getElementById("fileInput");
const selectedFileName = document.getElementById("selectedFileName");
const sendBtn = document.getElementById("sendBtn");

socket.emit("join", { userId: senderId });

$("#textarea1").keypress(function (e) {
    if (e.keyCode === 13 && !e.shiftKey) {
        e.preventDefault();
        const msg = $(this).val().trim();
        if (msg !== "") {
            socket.emit("message", {
                sender: senderId,
                recipient: recipientId,
                message: msg,
                isGroup: isGroupChat,
            });
            $(this).val("");

            socket.emit("stopTyping", {
                sender: senderId,
                recipient: recipientId,
            });
            isTyping = false;
        }
    }
});

socket.on("message", (msg) => {
    const isSelf = msg.senderId === senderId;
    const alignment = isSelf ? "odd text-end" : "";
    const bgClass = isSelf ? "bg-primary text-white" : "bg-light";

    let content;

    if (msg.message?.match(/\.(jpg|jpeg|png|gif)$/i)) {
        content = `<img src="${msg.message}" style="max-width:200px; max-height:200px;">`;
    } else if (msg.isVideo || msg.message?.match(/\.(mp4|webm|ogg)$/i)) {
        content = `<video controls src="${msg.message}" width="250" style="max-height: 200px;"></video>`;
    } else if (msg.isAudio || msg.message?.match(/\.(mp3|wav|ogg)$/i)) {
        content = `<audio controls src="${msg.message}" style="width: 250px;"></audio>`;
    } else if (msg.message?.startsWith("/media/")) {
        content = `<a href="${msg.message}" download>📎 ${msg.message
            .split("/")
            .pop()}</a>`;
    } else {
        content = msg.message;
    }

    let nameTag = "";
    if (isGroupChat && !isSelf && msg.senderName) {
        nameTag = `<div class="fw-semibold mb-1">${msg.senderName}</div>`;
    }

    const chatItem = `
                        <li class="chat-item ${alignment} list-style-none mt-3">
                            <div class="chat-content d-inline-block ps-3">
                                                ${nameTag}
                                <div class="box msg p-2 d-inline-block mb-1 ${bgClass} rounded">
                                        ${content}
                                </div>
                            </div>
                            <div class="chat-time d-block font-10 mt-1 mr-0 mb-2">
                                ${new Date(msg.createdAt).toLocaleTimeString(
                                    [],
                                    {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    }
                                )}
                            </div>
                        </li>`;

    $("#chat-list").append(chatItem);
    chatBox.scrollTop = chatBox.scrollHeight;
});

function setRecipient(id, name) {
    document.getElementById("recipientUserId").value = id;
    $("#chat-list").html("");
}

socket.on("onlineUsers", (onlineUserIds) => {
    const dot = document.getElementById("onlineStatusDot");
    if (onlineUserIds.includes(recipientId)) {
        dot.style.backgroundColor = "limegreen";
    } else {
        dot.style.backgroundColor = "gray";
    }
});

const typingStatus = document.getElementById("typing-status");
let typingTimeout;
let isTyping = false;

chatInput.addEventListener("input", () => {
    if (!isTyping) {
        socket.emit("typing", { sender: senderId, recipient: recipientId });
        isTyping = true;
    }

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit("stopTyping", { sender: senderId, recipient: recipientId });
        isTyping = false;
    }, 2000);
});

socket.on("typing", ({ sender }) => {
    if (sender === recipientId) {
        if (!document.getElementById("typing-indicator")) {
            const typingBubble = document.createElement("li");
            typingBubble.id = "typing-indicator";
            typingBubble.className = "chat-item list-style-none mt-3";

            typingBubble.innerHTML = `
                      <div class="chat-content d-inline-block ps-3">
                          <div class="box msg p-2 d-inline-block mb-1 bg-light rounded">
                              <i>Typing...</i>
                          </div>
                      </div>
                  `;

            document.getElementById("chat-list").appendChild(typingBubble);
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    }
});

socket.on("stopTyping", ({ sender }) => {
    if (sender === recipientId) {
        const typingBubble = document.getElementById("typing-indicator");
        if (typingBubble) typingBubble.remove();
    }
});

fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    socket.emit("file", {
        sender: senderId,
        recipient: recipientId,
        fileName: file.name,
        fileBuffer: [...fileBuffer],
    });
    e.target.value = "";
    selectedFileName.textContent = "";
    selectedFileName.style.display = "none";
});

function toggleUserSelection(userId) {
    const checkbox = document.getElementById("user_" + userId);
    checkbox.checked = !checkbox.checked;
    checkbox
        .closest(".user")
        .classList.toggle("bg-success-subtle", checkbox.checked);
}

document
    .getElementById("createGroupForm")
    .addEventListener("submit", async function (e) {
        e.preventDefault();

        const name = document.getElementById("groupName").value.trim();
        const checkboxes = document.querySelectorAll(
            "input[name='groupMembers']:checked"
        );
        const members = Array.from(checkboxes).map((cb) => cb.value);
        const senderId = document.getElementById("currentUserId")?.value;

        if (!name || members.length === 0) {
            alert("Please enter a group name and select at least one member.");
            return;
        }

        if (senderId) members.push(senderId);

        try {
            const res = await fetch("/api/v1/chat/group", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, members }),
            });

            const data = await res.json();
            if (data.success) {
                window.location.href = `/api/v1/chat/group/${data.groupId}`;
            } else {
                alert(data.message || "Failed to create group.");
            }
        } catch (err) {
            console.error("Group creation failed:", err);
            alert("An error occurred.");
        }
    });

const groupId = "<%= groups && groups._id %>";
const currentChatId = "<%= recipientId %>";
const recipientName = "<%= recipientName %>";

document.getElementById("chatHeader").addEventListener("click", () => {
    if (groupId && currentChatId === groupId) {
        const groupModal = new bootstrap.Modal(
            document.getElementById("dark-header-modal")
        );
        groupModal.show();
    }
});
