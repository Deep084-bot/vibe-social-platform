// Simple chat client that uses Socket.IO and persists messages via REST
let socket;
let currentChatId = null;

document.addEventListener('DOMContentLoaded', () => {
  const joinBtn = document.getElementById('joinBtn');
  const msgForm = document.getElementById('msgForm');

  joinBtn.addEventListener('click', async () => {
    const chatId = document.getElementById('chatIdInput').value.trim();
    if (!chatId) return alert('Enter a chat id');
    await joinChat(chatId);
  });

  msgForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('msgInput');
    const text = input.value.trim();
    if (!text || !currentChatId) return;

    const token = localStorage.getItem('token');
    try {
      // Persist message via API
      const res = await fetch(`/api/chat/${encodeURIComponent(currentChatId)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? 'Bearer ' + token : '' },
        body: JSON.stringify({ content: text })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send');

      // Emit via socket for real-time
      socket.emit('send-message', { chatId: currentChatId, message: data.message });
      input.value = '';
    } catch (err) {
      console.error(err);
      alert('Failed to send message');
    }
  });
});

async function joinChat(chatId) {
  currentChatId = chatId;
  if (!socket) {
    const token = localStorage.getItem('token');
    socket = io({ auth: { token } });

    socket.on('connect', () => {
      console.log('Socket connected', socket.id);
      // notify server of online status if authenticated
      if (token) socket.emit('user-online', getLocalUserId());
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connect error', err);
      // optionally show error to user
    });
    socket.on('new-message', (data) => {
      if (data.chatId !== currentChatId) return;
      appendMessage(data.message, data.message.sender === getLocalUserId() ? 'me' : 'other');
    });
  }

  socket.emit('join-chat', chatId);

  // Load history
  const messagesEl = document.getElementById('messages');
  messagesEl.innerHTML = 'Loading messages...';
  try {
    const res = await fetch(`/api/chat/${encodeURIComponent(chatId)}/messages`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load messages');

    messagesEl.innerHTML = '';
    (data.messages || []).forEach(m => appendMessage(m));
  } catch (err) {
    messagesEl.innerHTML = '<p>Error loading messages</p>';
  }
}

function appendMessage(m, cls) {
  const messagesEl = document.getElementById('messages');
  const div = document.createElement('div');
  div.className = 'message ' + (cls || (m.sender === getLocalUserId() ? 'me' : 'other'));
  div.innerHTML = `<div style="font-size:0.9rem;color:#ccc">${m.senderUsername || m.sender}</div><div>${m.content}</div><div style="font-size:0.8rem;color:#777">${new Date(m.createdAt).toLocaleTimeString()}</div>`;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function getLocalUserId() {
  try { return JSON.parse(localStorage.getItem('user'))?.id; } catch (e) { return null; }
}
