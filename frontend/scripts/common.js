// Common frontend helpers: dynamic navbar, auth helpers (login/logout)
(function(){
  function renderNav() {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    const user = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch(e){ return null; } })();
    const token = localStorage.getItem('token');

    // remove existing user-area if present
    const existing = document.querySelector('.nav-user');
    if (existing) existing.remove();

    // If logged in, show profile link and logout
    const userArea = document.createElement('div');
    userArea.className = 'nav-user';
    userArea.style.display = 'flex';
    userArea.style.alignItems = 'center';
    userArea.style.gap = '8px';

    if (user && token) {
      const avatar = document.createElement('img');
      avatar.src = user.avatar || (user.profile && user.profile.avatar) || '';
      avatar.alt = 'avatar';
      avatar.style.width = '36px';
      avatar.style.height = '36px';
      avatar.style.borderRadius = '8px';
      avatar.style.objectFit = 'cover';

      const nameLink = document.createElement('a');
      nameLink.href = '/profile';
      nameLink.textContent = user.username || (user.profile && user.profile.displayName) || 'You';
      nameLink.className = 'nav-link';
      nameLink.style.fontWeight = '600';

      const logoutBtn = document.createElement('button');
      logoutBtn.textContent = 'Logout';
      logoutBtn.className = 'btn-logout';
      logoutBtn.style.marginLeft = '6px';
      logoutBtn.addEventListener('click', handleLogout);

      userArea.appendChild(avatar);
      userArea.appendChild(nameLink);
      userArea.appendChild(logoutBtn);
    } else {
      // not logged in: ensure login/signup buttons exist (use landing styles)
      const login = document.createElement('button');
      login.className = 'btn-login';
      login.textContent = 'Login';
      login.addEventListener('click', () => window.location.href = '/');

      const signup = document.createElement('button');
      signup.className = 'btn-signup';
      signup.textContent = 'Sign Up';
      signup.addEventListener('click', () => window.location.href = '/');

      userArea.appendChild(login);
      userArea.appendChild(signup);
    }

    navLinks.appendChild(userArea);
  }

  async function handleLogout() {
    const token = localStorage.getItem('token');
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token }
        });
      }
    } catch (e) {
      // ignore errors in logout
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // redirect to landing
    window.location.href = '/';
  }

  // expose for other scripts if needed
  window.vibeAuth = {
    renderNav,
    logout: handleLogout
  };

  document.addEventListener('DOMContentLoaded', renderNav);
})();
