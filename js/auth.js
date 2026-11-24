/* ==========================================================================
   CareerBridge - Authentication & Session Management (LocalStorage)
   ========================================================================== */

(() => {
  'use strict';

  const CB = (window.CB = window.CB || {});
  const SESSION_KEY = 'cb_session';

  CB.auth = {
    getSession() {
      return CB.storage.get(SESSION_KEY, null);
    },

    isLoggedIn() {
      const session = this.getSession();
      if (!session || !session.userId) return false;
      const users = CB.storage.get('users', []);
      return users.some((u) => u.id === session.userId);
    },

    getCurrentUser() {
      const session = this.getSession();
      if (!session || !session.userId) return null;
      const users = CB.storage.get('users', []);
      return users.find((u) => u.id === session.userId) || null;
    },

    requireAuth() {
      if (!this.isLoggedIn()) {
        const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
        window.location.replace(`login.html?redirect=${encodeURIComponent(currentPage)}`);
        return false;
      }
      return true;
    },

    login(email, password, remember = false) {
      const users = CB.storage.get('users', []);
      const normalized = String(email || '').trim().toLowerCase();
      const user = users.find((u) => u.email.toLowerCase() === normalized);
      if (!user || user.password !== password) {
        return { ok: false, error: 'Invalid email address or password.' };
      }
      CB.storage.set(SESSION_KEY, {
        userId: user.id,
        email: user.email,
        remember: Boolean(remember),
        loggedInAt: new Date().toISOString()
      });
      return { ok: true, user };
    },

    register({ fullName, email, phone, headline, password }) {
      const users = CB.storage.get('users', []);
      const normalized = String(email || '').trim().toLowerCase();
      if (users.some((u) => u.email.toLowerCase() === normalized)) {
        return { ok: false, error: 'An account with this email already exists.' };
      }

      const newUser = {
        id: 'u_' + Date.now(),
        fullName: fullName.trim(),
        email: normalized,
        password,
        phone: (phone || '').trim(),
        headline: (headline || 'Job Seeker').trim(),
        location: 'Remote / Open to Relocation',
        bio: 'Motivated professional exploring impactful opportunities on CareerBridge.',
        avatar: 'assets/images/avatar-default.svg',
        skills: ['Communication', 'Problem Solving'],
        education: [],
        experience: [],
        social: { linkedin: '', github: '', portfolio: '' },
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      CB.storage.set('users', users);

      // Welcome notification
      CB.storage.update('notifications', (list) => [
        {
          id: 'n_' + Date.now(),
          type: 'message',
          title: `Welcome to CareerBridge, ${newUser.fullName}!`,
          message: 'Complete your profile and generate your printable resume to boost recruiter visibility.',
          createdAt: new Date().toISOString(),
          read: false,
          link: 'profile.html'
        },
        ...list
      ]);

      // Auto sign-in
      CB.storage.set(SESSION_KEY, {
        userId: newUser.id,
        email: newUser.email,
        remember: true,
        loggedInAt: new Date().toISOString()
      });

      return { ok: true, user: newUser };
    },

    logout(redirectTo = 'login.html') {
      CB.storage.remove(SESSION_KEY);
      CB.toast.show('You have been logged out safely.', 'info', 'Signed Out');
      setTimeout(() => {
        window.location.href = redirectTo;
      }, 450);
    },

    updateUser(updatedFields) {
      const current = this.getCurrentUser();
      if (!current) return null;
      let updatedUser = null;
      CB.storage.update('users', (users) =>
        users.map((u) => {
          if (u.id === current.id) {
            updatedUser = { ...u, ...updatedFields };
            return updatedUser;
          }
          return u;
        })
      );
      return updatedUser;
    }
  };

  // --------------------------------------------------------------------------
  // Bind Password Show/Hide Toggles Globally
  // --------------------------------------------------------------------------
  function bindPasswordToggles() {
    document.querySelectorAll('[data-toggle-password]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-toggle-password');
        const input = document.getElementById(targetId);
        if (!input) return;
        const isPwd = input.type === 'password';
        input.type = isPwd ? 'text' : 'password';
        btn.setAttribute('aria-label', isPwd ? 'Hide password' : 'Show password');
        const icon = btn.querySelector('i');
        if (icon) {
          icon.className = isPwd ? 'bi bi-eye-slash' : 'bi bi-eye';
        }
      });
    });
  }

  // --------------------------------------------------------------------------
  // Login Page Controller
  // --------------------------------------------------------------------------
  function initLoginPage() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    if (CB.auth.isLoggedIn()) {
      const target = CB.format.getParam('redirect') || 'dashboard.html';
      window.location.replace(target);
      return;
    }

    const emailEl = document.getElementById('loginEmail');
    const pwdEl = document.getElementById('loginPassword');
    const rememberEl = document.getElementById('rememberMe');
    const demoBtn = document.getElementById('demoLoginBtn');
    const forgotBtn = document.getElementById('forgotPasswordBtn');

    // Prefill remembered email if saved
    const rememberedEmail = localStorage.getItem('cb_remembered_email');
    if (rememberedEmail && emailEl) {
      emailEl.value = rememberedEmail;
      if (rememberEl) rememberEl.checked = true;
    }

    if (demoBtn) {
      demoBtn.addEventListener('click', () => {
        emailEl.value = 'alex@careerbridge.io';
        pwdEl.value = 'Password@123';
        if (rememberEl) rememberEl.checked = true;
        CB.toast.show('Demo credentials filled. Signing you in...', 'info', 'Demo Account');
        form.requestSubmit();
      });
    }

    if (forgotBtn) {
      forgotBtn.addEventListener('click', () => {
        const modal = CB.modal.open({
          title: 'Reset Your Password',
          bodyHTML: `
            <p class="text-secondary mb-2">Enter your registered email address to reset your CareerBridge password directly.</p>
            <form id="forgotResetForm" novalidate>
              <div class="form-group">
                <label class="form-label" for="resetEmail">Email Address</label>
                <input type="email" id="resetEmail" class="form-control" placeholder="you@example.com" required>
                <span class="form-error" id="resetEmailErr"></span>
              </div>
              <div class="form-group">
                <label class="form-label" for="resetNewPwd">New Password</label>
                <input type="password" id="resetNewPwd" class="form-control" placeholder="Min 8 chars, letters & numbers" required>
                <span class="form-error" id="resetNewPwdErr"></span>
              </div>
              <button type="submit" class="btn btn-primary btn-block">Update Password</button>
            </form>
          `
        });

        modal.querySelector('#forgotResetForm').addEventListener('submit', (e) => {
          e.preventDefault();
          const rEmail = modal.querySelector('#resetEmail').value.trim().toLowerCase();
          const rPwd = modal.querySelector('#resetNewPwd').value;
          const rEmailErr = modal.querySelector('#resetEmailErr');
          const rPwdErr = modal.querySelector('#resetNewPwdErr');
          rEmailErr.textContent = '';
          rPwdErr.textContent = '';

          if (!CB.validators.email(rEmail)) {
            rEmailErr.textContent = 'Please enter a valid email address.';
            return;
          }
          if (!CB.validators.passwordStrength(rPwd).valid) {
            rPwdErr.textContent = 'Password must be at least 8 characters with letters and numbers.';
            return;
          }

          const users = CB.storage.get('users', []);
          const idx = users.findIndex((u) => u.email.toLowerCase() === rEmail);
          if (idx === -1) {
            rEmailErr.textContent = 'No account found with this email address.';
            return;
          }
          users[idx].password = rPwd;
          CB.storage.set('users', users);
          CB.modal.close();
          CB.toast.show('Password updated! You can now sign in with your new password.', 'success', 'Password Reset');
          if (emailEl) emailEl.value = rEmail;
        });
      });
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailErr = document.getElementById('loginEmailError');
      const pwdErr = document.getElementById('loginPasswordError');
      emailErr.textContent = '';
      pwdErr.textContent = '';

      let hasError = false;
      if (!CB.validators.email(emailEl.value)) {
        emailErr.textContent = 'Please enter a valid email address.';
        emailEl.classList.add('is-invalid');
        hasError = true;
      } else {
        emailEl.classList.remove('is-invalid');
      }

      if (!CB.validators.required(pwdEl.value)) {
        pwdErr.textContent = 'Password is required.';
        pwdEl.classList.add('is-invalid');
        hasError = true;
      } else {
        pwdEl.classList.remove('is-invalid');
      }

      if (hasError) return;

      const result = CB.auth.login(emailEl.value, pwdEl.value, rememberEl?.checked);
      if (!result.ok) {
        pwdErr.textContent = result.error;
        CB.toast.show(result.error, 'error', 'Login Failed');
        return;
      }

      if (rememberEl?.checked) {
        localStorage.setItem('cb_remembered_email', emailEl.value.trim());
      } else {
        localStorage.removeItem('cb_remembered_email');
      }

      CB.toast.show(`Welcome back, ${result.user.fullName}!`, 'success', 'Signed In');
      const redirect = CB.format.getParam('redirect') || 'dashboard.html';
      setTimeout(() => {
        window.location.href = redirect;
      }, 500);
    });
  }

  // --------------------------------------------------------------------------
  // Register Page Controller
  // --------------------------------------------------------------------------
  function initRegisterPage() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    if (CB.auth.isLoggedIn()) {
      window.location.replace('dashboard.html');
      return;
    }

    const nameEl = document.getElementById('regName');
    const emailEl = document.getElementById('regEmail');
    const phoneEl = document.getElementById('regPhone');
    const headlineEl = document.getElementById('regHeadline');
    const pwdEl = document.getElementById('regPassword');
    const confirmEl = document.getElementById('regConfirmPassword');
    const termsEl = document.getElementById('regTerms');
    const strengthBar = document.getElementById('regStrengthBar');
    const strengthLabel = document.getElementById('regStrengthLabel');

    if (pwdEl && strengthBar) {
      pwdEl.addEventListener('input', () => {
        const s = CB.validators.passwordStrength(pwdEl.value);
        strengthBar.style.width = `${s.percent}%`;
        strengthBar.style.backgroundColor = s.color;
        if (strengthLabel) strengthLabel.textContent = pwdEl.value ? `Strength: ${s.label}` : '';
      });
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const setErr = (id, msg) => {
        const el = document.getElementById(id);
        if (el) el.textContent = msg;
      };

      ['regNameError', 'regEmailError', 'regPhoneError', 'regPasswordError', 'regConfirmError', 'regTermsError']
        .forEach((id) => setErr(id, ''));

      let valid = true;
      if (nameEl.value.trim().length < 2) {
        setErr('regNameError', 'Please enter your full name (min 2 characters).');
        valid = false;
      }
      if (!CB.validators.email(emailEl.value)) {
        setErr('regEmailError', 'Please enter a valid email address.');
        valid = false;
      }
      if (!CB.validators.phone(phoneEl.value)) {
        setErr('regPhoneError', 'Please enter a valid phone number.');
        valid = false;
      }
      if (!CB.validators.passwordStrength(pwdEl.value).valid) {
        setErr('regPasswordError', 'Use at least 8 characters including letters and numbers.');
        valid = false;
      }
      if (pwdEl.value !== confirmEl.value) {
        setErr('regConfirmError', 'Passwords do not match.');
        valid = false;
      }
      if (!termsEl.checked) {
        setErr('regTermsError', 'You must accept the Terms of Service.');
        valid = false;
      }

      if (!valid) return;

      const res = CB.auth.register({
        fullName: nameEl.value,
        email: emailEl.value,
        phone: phoneEl.value,
        headline: headlineEl?.value,
        password: pwdEl.value
      });

      if (!res.ok) {
        setErr('regEmailError', res.error);
        CB.toast.show(res.error, 'error', 'Registration Failed');
        return;
      }

      CB.toast.show('Account created! Redirecting to your dashboard...', 'success', 'Welcome Aboard');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 600);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindPasswordToggles();
    initLoginPage();
    initRegisterPage();
  });
})();
