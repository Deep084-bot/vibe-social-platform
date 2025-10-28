document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('feedContainer');
  const form = document.getElementById('createPostForm');
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  let page = 1;
  const limit = 10;

  container.innerHTML = 'Loading feed...';

  async function renderPosts(reset=false) {
    try {
      if (reset) { container.innerHTML = ''; page = 1; }
      const res = await fetch(`/api/posts?page=${page}&limit=${limit}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load');

      const posts = data.posts || [];
      if (posts.length === 0 && page === 1) {
        container.innerHTML = '<p>No posts yet. Start vibing! 🚀</p>';
        return;
      }

      posts.forEach(p => {
        const el = document.createElement('div');
        el.className = 'feature-card';
        el.style.marginBottom = '1rem';
        el.innerHTML = `
          <div style="display:flex;gap:12px;align-items:center">
            <img src="${p.author.profile?.avatar || ''}" style="width:48px;height:48px;border-radius:12px;object-fit:cover">
            <div>
              <strong>${p.author.username}</strong>
              <div style="color:#bbb">${new Date(p.createdAt).toLocaleString()}</div>
            </div>
          </div>
          <p style="margin-top:8px">${p.content?.text || ''}</p>
          <div style="margin-top:8px;display:flex;gap:12px;align-items:center">
            <button data-postid="${p._id}" class="like-btn">👍 <span class="like-count">${p.stats?.likesCount||0}</span></button>
            <button data-postid="${p._id}" class="comment-toggle-btn">💬 Comments (${p.stats?.commentsCount||0})</button>
          </div>
        `;
        // if media present, render first media item
        if (p.content?.media && p.content.media.length) {
          const m = p.content.media[0];
          if (m.type === 'image') {
            const img = document.createElement('img');
            img.src = m.url;
            img.style.maxWidth = '100%';
            img.style.marginTop = '8px';
            el.appendChild(img);
          }
        }
        container.appendChild(el);
        // attach like handler
        const likeBtn = el.querySelector('.like-btn');
        const commentToggle = el.querySelector('.comment-toggle-btn');
        if (likeBtn) {
          likeBtn.addEventListener('click', async (ev) => {
            const postId = likeBtn.getAttribute('data-postid');
            const token = localStorage.getItem('token');
            if (!token) { alert('Please log in to like posts'); return; }

            // optimistic UI
            const countEl = likeBtn.querySelector('.like-count');
            const prev = parseInt(countEl.textContent || '0');
            countEl.textContent = prev + 1;

            try {
              const res = await fetch(`/api/posts/${postId}/like`, { method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } });
              const data = await res.json();
              if (!res.ok) {
                countEl.textContent = prev; // revert
                alert(data.message || 'Failed to like');
                return;
              }
              countEl.textContent = data.likesCount;
            } catch (err) {
              console.error(err);
              countEl.textContent = prev;
            }
          });
        }

        if (commentToggle) {
          commentToggle.addEventListener('click', async () => {
            const postId = commentToggle.getAttribute('data-postid');
            // find or create comment container
            let commentContainer = el.querySelector('.comments-container');
            if (commentContainer) { commentContainer.remove(); return; }
            commentContainer = document.createElement('div');
            commentContainer.className = 'comments-container';
            commentContainer.style.marginTop = '8px';
            commentContainer.innerHTML = '<div>Loading comments...</div>';
            el.appendChild(commentContainer);

            try {
              const res = await fetch(`/api/posts/${postId}/comments`);
              const data = await res.json();
              if (!res.ok) throw new Error(data.message || 'Failed to load comments');
              const list = data.comments || [];
              commentContainer.innerHTML = '';
              const listEl = document.createElement('div');
              list.forEach(c => {
                const cEl = document.createElement('div');
                cEl.style.borderTop = '1px solid #eee';
                cEl.style.paddingTop = '6px';
                cEl.innerHTML = `<strong>${c.author.username}</strong> <div style="color:#888;font-size:12px">${new Date(c.createdAt).toLocaleString()}</div><div>${c.content.text}</div>`;
                listEl.appendChild(cEl);
              });
              commentContainer.appendChild(listEl);

              // add form
              const form = document.createElement('form');
              form.style.marginTop = '8px';
              form.innerHTML = `<input name="text" placeholder="Write a comment..." style="width:72%"> <button type="submit">Reply</button>`;
              commentContainer.appendChild(form);
              form.addEventListener('submit', async (ev) => {
                ev.preventDefault();
                const text = form.elements['text'].value.trim();
                const token = localStorage.getItem('token');
                if (!token) { alert('Please log in to comment'); return; }
                if (!text) return;
                const res = await fetch(`/api/posts/${postId}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ text }) });
                const payload = await res.json();
                if (!res.ok) { alert(payload.message || 'Failed to post comment'); return; }
                // append new comment
                const newC = payload.comment;
                const newEl = document.createElement('div');
                newEl.style.borderTop = '1px solid #eee';
                newEl.style.paddingTop = '6px';
                newEl.innerHTML = `<strong>${newC.author.username}</strong> <div style="color:#888;font-size:12px">${new Date(newC.createdAt).toLocaleString()}</div><div>${newC.content.text}</div>`;
                listEl.appendChild(newEl);
                // update comments count in button
                const currentText = commentToggle.textContent || '';
                const m = currentText.match(/Comments \((\d+)\)/);
                if (m) {
                  const num = parseInt(m[1]) + 1;
                  commentToggle.textContent = `💬 Comments (${num})`;
                }
                form.reset();
              });

            } catch (err) {
              console.error(err);
              commentContainer.innerHTML = '<div>Error loading comments.</div>';
            }
          });
        }
      });

      // if we've received fewer than limit, hide load more
      if (!data.posts || data.posts.length < limit) loadMoreBtn.style.display = 'none'; else loadMoreBtn.style.display = 'inline-block';
    } catch (err) {
      console.error(err);
      container.innerHTML = '<p>Error loading feed.</p>';
    }
  }

  // initial load
  await renderPosts(true);

  loadMoreBtn.addEventListener('click', async () => {
    page += 1;
    await renderPosts(false);
  });

  // create post handling
  if (form) {
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const text = document.getElementById('postText').value.trim();
      const imgFile = document.getElementById('postImage').files[0];

      const token = localStorage.getItem('token');
      if (!token) { alert('Please log in to post'); return; }

      let media = null;
      if (imgFile) {
        const fd = new FormData();
        fd.append('avatar', imgFile); // uploads endpoint accepts 'avatar' or 'coverImage', reuse 'avatar'
        const up = await fetch('/api/uploads', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd });
        const upData = await up.json();
        if (!up.ok) { alert(upData.message || 'Upload failed'); return; }
        const url = upData.files && (upData.files.avatar || upData.files.coverImage);
        if (url) media = [{ type: 'image', url }];
      }

      const payload = { content: { text, media } };
      const res = await fetch('/api/posts', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { alert(data.message || 'Failed to create post'); return; }
      // prepend new post
      container.insertAdjacentHTML('afterbegin', `<div class="feature-card" style="margin-bottom:1rem"><div style="display:flex;gap:12px;align-items:center"><img src="${data.post.author.profile.avatar||''}" style="width:48px;height:48px;border-radius:12px;object-fit:cover"><div><strong>${data.post.author.username}</strong><div style="color:#bbb">${new Date(data.post.createdAt).toLocaleString()}</div></div></div><p style="margin-top:8px">${data.post.content?.text||''}</p></div>`);
      form.reset();
    });
  }
});
