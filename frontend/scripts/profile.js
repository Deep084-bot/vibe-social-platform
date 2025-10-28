document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('profileForm');
  const msg = document.getElementById('profileMsg');
  const token = localStorage.getItem('token');

  async function loadIntoForm() {
    if (!token) return;
    try {
      const res = await fetch('/api/users/me', { headers: { 'Authorization': 'Bearer ' + token } });
      const data = await res.json();
      if (!data.success) return;
      const u = data.user;
      // populate inputs
      form.elements['displayName'].value = u.profile.displayName || '';
      form.elements['bio'].value = u.profile.bio || '';
      form.elements['website'].value = u.profile.website || '';
      form.elements['pronouns'].value = u.profile.pronouns || '';
      form.elements['location'].value = u.profile.location || '';
      form.elements['birthday'].value = u.profile.birthday ? new Date(u.profile.birthday).toISOString().slice(0,10) : '';
      form.elements['avatar'].value = u.profile.avatar || '';
      form.elements['coverImage'].value = u.profile.coverImage || '';
      form.elements['theme'].value = u.profile.theme || 'system';
      // set previews if available
      const avatarPreview = document.getElementById('avatarPreview');
      const coverPreview = document.getElementById('coverPreview');
      if (u.profile.avatar) {
        avatarPreview.src = u.profile.avatar;
        avatarPreview.style.display = 'inline-block';
      }
      if (u.profile.coverImage) {
        coverPreview.src = u.profile.coverImage;
        coverPreview.style.display = 'inline-block';
      }
    } catch (e) {
      console.error('Error loading profile for edit', e);
    }
  }

  // file input previews
  const avatarFileInput = form.elements['avatarFile'];
  const coverFileInput = form.elements['coverFile'];
  const avatarPreviewEl = document.getElementById('avatarPreview');
  const coverPreviewEl = document.getElementById('coverPreview');
  if (avatarFileInput) {
    avatarFileInput.addEventListener('change', (ev) => {
      const f = ev.target.files && ev.target.files[0];
      if (f) {
        avatarPreviewEl.src = URL.createObjectURL(f);
        avatarPreviewEl.style.display = 'inline-block';
      }
    });
  }
  if (coverFileInput) {
    coverFileInput.addEventListener('change', (ev) => {
      const f = ev.target.files && ev.target.files[0];
      if (f) {
        coverPreviewEl.src = URL.createObjectURL(f);
        coverPreviewEl.style.display = 'inline-block';
      }
    });
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    msg.textContent = '';
    if (!token) { msg.textContent = 'Not authenticated'; return; }
    // If files selected, upload them first
    async function uploadFile(file, fieldName) {
      const fd = new FormData();
      // backend expects fields named 'avatar' and 'coverImage'
      fd.append(fieldName, file);
      const r = await fetch('/api/uploads', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
        body: fd
      });
      return r.json();
    }

    let avatarUrl = form.elements['avatar'].value.trim() || null;
    let coverUrl = form.elements['coverImage'].value.trim() || null;

    try {
      const avatarFile = form.elements['avatarFile']?.files?.[0];
      const coverFile = form.elements['coverFile']?.files?.[0];
      if (avatarFile) {
        const up = await uploadFile(avatarFile, 'avatar');
        if (up && up.success && up.files && up.files.avatar) {
          avatarUrl = up.files.avatar;
          // include public id if Cloudinary used
          if (up.files.avatarPublicId) payload.avatarPublicId = up.files.avatarPublicId;
        }
      }
      if (coverFile) {
        const up = await uploadFile(coverFile, 'coverImage');
        if (up && up.success && up.files && up.files.coverImage) {
          coverUrl = up.files.coverImage;
          if (up.files.coverImagePublicId) payload.coverImagePublicId = up.files.coverImagePublicId;
        }
      }
    } catch (e) {
      console.error('Upload failed', e);
      msg.textContent = 'Image upload failed';
      return;
    }

    const payload = {
      displayName: form.elements['displayName'].value.trim(),
      bio: form.elements['bio'].value.trim(),
      website: form.elements['website'].value.trim(),
      pronouns: form.elements['pronouns'].value.trim(),
      location: form.elements['location'].value.trim(),
      birthday: form.elements['birthday'].value || null,
      avatar: avatarUrl,
      coverImage: coverUrl,
      theme: form.elements['theme'].value
    };

    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        msg.textContent = 'Profile updated';
        // refresh displayed profile section if present
        const container = document.getElementById('profileContainer');
        if (container && data.user) {
          const u = data.user;
          container.innerHTML = `
            <div style="display:flex;gap:1rem;align-items:center">
              <img src="${u.profile.avatar}" alt="avatar" style="width:80px;height:80px;border-radius:12px;object-fit:cover">
              <div>
                <h2>${u.username} ${u.profile.isVerified ? '✓' : ''}</h2>
                <div>${u.profile.displayName}</div>
                <div style="color:#bbb">${u.profile.bio || ''}</div>
              </div>
            </div>
          `;
        }
      } else {
        msg.textContent = data.message || 'Update failed';
      }
    } catch (e) {
      console.error('Update failed', e);
      msg.textContent = 'Network error';
    }
  });

  loadIntoForm();
});
