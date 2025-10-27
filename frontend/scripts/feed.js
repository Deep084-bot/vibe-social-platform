document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('feedContainer');
  container.innerHTML = 'Loading feed...';

  try {
    const res = await fetch('/api/posts');
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load');

    const posts = data.posts || [];
    if (posts.length === 0) {
      container.innerHTML = '<p>No posts yet. Start vibing! 🚀</p>';
      return;
    }

    container.innerHTML = '';
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
      container.appendChild(el);
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p>Error loading feed.</p>';
  }
});
