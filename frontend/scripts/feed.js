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
