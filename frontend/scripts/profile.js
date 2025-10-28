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
  const saveBtn = document.getElementById('saveProfile');
  const spinner = document.getElementById('spinner');
  const toast = document.getElementById('profileToast');
  const displayNameErrorEl = document.getElementById('displayNameError');
  const websiteErrorEl = document.getElementById('websiteError');
  const avatarErrorEl = document.getElementById('avatarError');
  const coverErrorEl = document.getElementById('coverError');
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
    // Clear previous inline errors
    [displayNameErrorEl, websiteErrorEl, avatarErrorEl, coverErrorEl].forEach(el => { if (el) { el.style.display = 'none'; el.textContent = ''; } });

    // Client-side validation
    const displayNameVal = form.elements['displayName'].value.trim();
    if (!displayNameVal) {
      if (displayNameErrorEl) { displayNameErrorEl.textContent = 'Display name is required'; displayNameErrorEl.style.display = 'block'; }
      return;
    }
    if (displayNameVal.length > 50) {
      if (displayNameErrorEl) { displayNameErrorEl.textContent = 'Display name must be 50 characters or less'; displayNameErrorEl.style.display = 'block'; }
      return;
    }

    const websiteVal = form.elements['website'].value.trim();
    if (websiteVal && !/^https?:\/\/.+/.test(websiteVal)) {
      if (websiteErrorEl) { websiteErrorEl.textContent = 'Website must be a valid URL (include http:// or https://)'; websiteErrorEl.style.display = 'block'; }
      return;
    }

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
    let avatarPublicId = null;
    let coverImagePublicId = null;

    try {
      // disable save and show spinner
      if (saveBtn) saveBtn.disabled = true;
      if (spinner) spinner.style.display = 'inline-block';

      const avatarFile = form.elements['avatarFile']?.files?.[0];
      const coverFile = form.elements['coverFile']?.files?.[0];
      if (avatarFile) {
        const up = await uploadFile(avatarFile, 'avatar');
        if (up && up.success && up.files && up.files.avatar) {
          avatarUrl = up.files.avatar;
          // include public id if Cloudinary used
          if (up.files.avatarPublicId) avatarPublicId = up.files.avatarPublicId;
        } else {
          if (avatarErrorEl) { avatarErrorEl.textContent = up.message || 'Upload failed'; avatarErrorEl.style.display = 'block'; }
          throw new Error('avatar upload failed');
        }
      }
      if (coverFile) {
        const up = await uploadFile(coverFile, 'coverImage');
        if (up && up.success && up.files && up.files.coverImage) {
          coverUrl = up.files.coverImage;
          if (up.files.coverImagePublicId) coverImagePublicId = up.files.coverImagePublicId;
        } else {
          if (coverErrorEl) { coverErrorEl.textContent = up.message || 'Upload failed'; coverErrorEl.style.display = 'block'; }
          throw new Error('cover upload failed');
        }
      }
    } catch (e) {
      console.error('Upload failed', e);
      msg.textContent = 'Image upload failed';
      if (saveBtn) saveBtn.disabled = false;
      if (spinner) spinner.style.display = 'none';
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

    if (avatarPublicId) payload.avatarPublicId = avatarPublicId;
    if (coverImagePublicId) payload.coverImagePublicId = coverImagePublicId;

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
