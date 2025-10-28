document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('discoverContainer');
  if (!container) return;
  container.innerHTML = 'Loading trending posts...';

  try {
    const res = await fetch('/api/posts?limit=50');
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load');

    let posts = data.posts || [];
    // prefer posts with trendScore, otherwise recent
    posts.sort((a, b) => (b.trends?.trendScore || 0) - (a.trends?.trendScore || 0) || new Date(b.createdAt) - new Date(a.createdAt));

    if (posts.length === 0) {
      container.innerHTML = '<p>No trending posts yet. Check back later!</p>';
      return;
    }

    const list = document.createElement('div');
    list.style.display = 'grid';
    list.style.gridTemplateColumns = '1fr';
    list.style.gap = '12px';

    posts.slice(0, 20).forEach(p => {
      const el = document.createElement('div');
      el.className = 'feature-card';
      el.style.padding = '12px';
      el.innerHTML = `
        <div style="display:flex;gap:12px;align-items:center">
          <img src="${p.author?.profile?.avatar || ''}" style="width:48px;height:48px;border-radius:12px;object-fit:cover">
          <div>
            <strong>${p.author?.username || 'unknown'}</strong>
            <div style="color:#bbb">${new Date(p.createdAt).toLocaleString()}</div>
          </div>
        </div>
        <p style="margin-top:8px">${p.content?.text || ''}</p>
        <div style="font-size:0.85rem;color:#999">Trend score: ${Math.round(p.trends?.trendScore || 0)}</div>
      `;
      list.appendChild(el);
    });

    container.innerHTML = '';
    container.appendChild(list);
  } catch (err) {
    console.error('Discover load error:', err);
    container.innerHTML = '<p>Error loading discover.</p>';
  }
});
