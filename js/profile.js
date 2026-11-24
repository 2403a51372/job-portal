/* ==========================================================================
   CareerBridge - User Profile, Password Change & Settings Controller
   ========================================================================== */

(() => {
  'use strict';

  const CB = (window.CB = window.CB || {});

  function initProfilePage() {
    const profileForm = document.getElementById('profilePersonalForm');
    if (!profileForm) return;
    if (!CB.auth.requireAuth()) return;

    let user = CB.auth.getCurrentUser();

    const avatarImg = document.getElementById('profileAvatarPreview');
    const avatarInput = document.getElementById('profileAvatarInput');
    const nameEl = document.getElementById('profFullName');
    const headlineEl = document.getElementById('profHeadline');
    const emailEl = document.getElementById('profEmail');
    const phoneEl = document.getElementById('profPhone');
    const locEl = document.getElementById('profLocation');
    const bioEl = document.getElementById('profBio');
    const linkedinEl = document.getElementById('profLinkedin');
    const githubEl = document.getElementById('profGithub');
    const portfolioEl = document.getElementById('profPortfolio');

    const skillsWrap = document.getElementById('profSkillsList');
    const skillInput = document.getElementById('profSkillInput');
    const eduListEl = document.getElementById('profEduList');
    const expListEl = document.getElementById('profExpList');

    function hydrate() {
      user = CB.auth.getCurrentUser();
      if (avatarImg) avatarImg.src = user.avatar || 'assets/images/avatar-default.svg';
      if (nameEl) nameEl.value = user.fullName || '';
      if (headlineEl) headlineEl.value = user.headline || '';
      if (emailEl) emailEl.value = user.email || '';
      if (phoneEl) phoneEl.value = user.phone || '';
      if (locEl) locEl.value = user.location || '';
      if (bioEl) bioEl.value = user.bio || '';
      if (linkedinEl) linkedinEl.value = user.social?.linkedin || '';
      if (githubEl) githubEl.value = user.social?.github || '';
      if (portfolioEl) portfolioEl.value = user.social?.portfolio || '';
      renderSkills();
      renderEdu();
      renderExp();
    }

    function renderSkills() {
      if (!skillsWrap) return;
      skillsWrap.innerHTML = (user.skills || [])
        .map(
          (sk, idx) => `
            <span class="tag-pill-remove">
              ${CB.format.escapeHTML(sk)}
              <button type="button" data-remove-skill="${idx}" aria-label="Remove skill"><i class="bi bi-x"></i></button>
            </span>
          `
        )
        .join('');
      skillsWrap.querySelectorAll('[data-remove-skill]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const next = [...user.skills];
          next.splice(Number(btn.getAttribute('data-remove-skill')), 1);
          user = CB.auth.updateUser({ skills: next });
          renderSkills();
        });
      });
    }

    function renderEdu() {
      if (!eduListEl) return;
      const list = user.education || [];
      eduListEl.innerHTML = list.length
        ? list
            .map(
              (ed, idx) => `
                <div class="flex-between mb-1" style="padding:12px; border:1px solid var(--border); border-radius:10px; background:var(--bg);">
                  <div>
                    <strong>${CB.format.escapeHTML(ed.degree)}</strong>
                    <div class="text-muted" style="font-size:0.84rem;">${CB.format.escapeHTML(ed.school)} &bull; ${CB.format.escapeHTML(ed.year)}</div>
                  </div>
                  <button type="button" class="btn btn-ghost btn-sm text-danger" data-del-prof-edu="${idx}"><i class="bi bi-trash"></i></button>
                </div>
              `
            )
            .join('')
        : `<p class="text-muted" style="font-size:0.88rem;">No education entries added yet.</p>`;

      eduListEl.querySelectorAll('[data-del-prof-edu]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const next = [...(user.education || [])];
          next.splice(Number(btn.getAttribute('data-del-prof-edu')), 1);
          user = CB.auth.updateUser({ education: next });
          renderEdu();
        });
      });
    }

    function renderExp() {
      if (!expListEl) return;
      const list = user.experience || [];
      expListEl.innerHTML = list.length
        ? list
            .map(
              (ex, idx) => `
                <div class="flex-between mb-1" style="padding:12px; border:1px solid var(--border); border-radius:10px; background:var(--bg);">
                  <div>
                    <strong>${CB.format.escapeHTML(ex.role)} &mdash; ${CB.format.escapeHTML(ex.company)}</strong>
                    <div class="text-muted" style="font-size:0.82rem;">${CB.format.escapeHTML(ex.period)}</div>
                    <p class="text-secondary" style="font-size:0.84rem;">${CB.format.escapeHTML(ex.summary || '')}</p>
                  </div>
                  <button type="button" class="btn btn-ghost btn-sm text-danger" data-del-prof-exp="${idx}"><i class="bi bi-trash"></i></button>
                </div>
              `
            )
            .join('')
        : `<p class="text-muted" style="font-size:0.88rem;">No work experience added yet.</p>`;

      expListEl.querySelectorAll('[data-del-prof-exp]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const next = [...(user.experience || [])];
          next.splice(Number(btn.getAttribute('data-del-prof-exp')), 1);
          user = CB.auth.updateUser({ experience: next });
          renderExp();
        });
      });
    }

    // Avatar Upload
    avatarInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 1024 * 1024 * 2) {
        CB.toast.show('Please pick an image under 2MB.', 'error', 'File Too Large');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        user = CB.auth.updateUser({ avatar: reader.result });
        avatarImg.src = reader.result;
        CB.toast.show('Profile photo updated!', 'success', 'Avatar Saved');
      };
      reader.readAsDataURL(file);
    });

    // Save Personal & Social Info
    profileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!CB.validators.required(nameEl.value)) {
        CB.toast.show('Full name cannot be empty.', 'error', 'Validation Error');
        return;
      }
      if (!CB.validators.url(linkedinEl.value) || !CB.validators.url(githubEl.value) || !CB.validators.url(portfolioEl.value)) {
        CB.toast.show('Please enter valid URLs (including https://) for social links.', 'error', 'Invalid URL');
        return;
      }
      user = CB.auth.updateUser({
        fullName: nameEl.value.trim(),
        headline: headlineEl.value.trim(),
        phone: phoneEl.value.trim(),
        location: locEl.value.trim(),
        bio: bioEl.value.trim(),
        social: {
          linkedin: linkedinEl.value.trim(),
          github: githubEl.value.trim(),
          portfolio: portfolioEl.value.trim()
        }
      });
      CB.toast.show('Your profile information has been saved.', 'success', 'Profile Updated');
    });

    // Add Skill
    document.getElementById('profAddSkillBtn')?.addEventListener('click', () => {
      const val = (skillInput?.value || '').trim();
      if (!val) return;
      const next = user.skills || [];
      if (!next.includes(val)) {
        user = CB.auth.updateUser({ skills: [...next, val] });
        renderSkills();
      }
      skillInput.value = '';
    });

    // Add Education Modal
    document.getElementById('profAddEduBtn')?.addEventListener('click', () => {
      const modal = CB.modal.open({
        title: 'Add Education',
        bodyHTML: `
          <form id="addProfEduForm">
            <div class="form-group">
              <label class="form-label">Degree / Program</label>
              <input type="text" id="edDegree" class="form-control" placeholder="e.g. M.S. in Computer Science" required>
            </div>
            <div class="form-group">
              <label class="form-label">School / University</label>
              <input type="text" id="edSchool" class="form-control" placeholder="e.g. Stanford University" required>
            </div>
            <div class="form-group">
              <label class="form-label">Year Range</label>
              <input type="text" id="edYear" class="form-control" placeholder="e.g. 2020 - 2022" required>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Add Education</button>
          </form>
        `
      });
      modal.querySelector('#addProfEduForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const next = [
          ...(user.education || []),
          {
            degree: modal.querySelector('#edDegree').value.trim(),
            school: modal.querySelector('#edSchool').value.trim(),
            year: modal.querySelector('#edYear').value.trim()
          }
        ];
        user = CB.auth.updateUser({ education: next });
        CB.modal.close();
        renderEdu();
        CB.toast.show('Education added to your profile.', 'success', 'Updated');
      });
    });

    // Add Experience Modal
    document.getElementById('profAddExpBtn')?.addEventListener('click', () => {
      const modal = CB.modal.open({
        title: 'Add Work Experience',
        bodyHTML: `
          <form id="addProfExpForm">
            <div class="form-group">
              <label class="form-label">Role / Title</label>
              <input type="text" id="exRole" class="form-control" placeholder="e.g. Frontend Engineer" required>
            </div>
            <div class="form-group">
              <label class="form-label">Company</label>
              <input type="text" id="exComp" class="form-control" placeholder="e.g. NovaTech Systems" required>
            </div>
            <div class="form-group">
              <label class="form-label">Period</label>
              <input type="text" id="exPeriod" class="form-control" placeholder="e.g. 2022 - Present" required>
            </div>
            <div class="form-group">
              <label class="form-label">Summary</label>
              <textarea id="exSummary" class="form-control" placeholder="Key achievements..."></textarea>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Add Experience</button>
          </form>
        `
      });
      modal.querySelector('#addProfExpForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const next = [
          ...(user.experience || []),
          {
            role: modal.querySelector('#exRole').value.trim(),
            company: modal.querySelector('#exComp').value.trim(),
            period: modal.querySelector('#exPeriod').value.trim(),
            summary: modal.querySelector('#exSummary').value.trim()
          }
        ];
        user = CB.auth.updateUser({ experience: next });
        CB.modal.close();
        renderExp();
        CB.toast.show('Experience added to your profile.', 'success', 'Updated');
      });
    });

    // Change Password Form
    const pwdForm = document.getElementById('changePasswordForm');
    pwdForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const curr = document.getElementById('currPassword').value;
      const next = document.getElementById('newPassword').value;
      const conf = document.getElementById('confirmNewPassword').value;

      if (curr !== user.password) {
        CB.toast.show('Current password is incorrect.', 'error', 'Password Mismatch');
        return;
      }
      if (!CB.validators.passwordStrength(next).valid) {
        CB.toast.show('New password must be at least 8 characters with letters and numbers.', 'error', 'Weak Password');
        return;
      }
      if (next !== conf) {
        CB.toast.show('New passwords do not match.', 'error', 'Mismatch');
        return;
      }

      user = CB.auth.updateUser({ password: next });
      pwdForm.reset();
      CB.toast.show('Password updated successfully!', 'success', 'Security Updated');
    });

    hydrate();
  }

  // --------------------------------------------------------------------------
  // PAGE 11: Settings Page (settings.html)
  // --------------------------------------------------------------------------
  function initSettingsPage() {
    const root = document.getElementById('settingsRoot');
    if (!root) return;
    if (!CB.auth.requireAuth()) return;

    const settings = CB.storage.get('settings', {
      theme: 'light',
      language: 'en',
      privacy: {
        profileVisible: true,
        showEmailToRecruiters: false,
        jobAlertEmails: true,
        recruiterMessages: true
      }
    });

    const themeToggle = document.getElementById('settingDarkMode');
    const langSelect = document.getElementById('settingLanguage');
    const privProfile = document.getElementById('privProfileVisible');
    const privEmail = document.getElementById('privShowEmail');
    const privAlerts = document.getElementById('privJobAlerts');
    const privMessages = document.getElementById('privRecruiterMsg');

    if (themeToggle) {
      themeToggle.checked = CB.theme.get() === 'dark';
      themeToggle.addEventListener('change', () => {
        CB.theme.set(themeToggle.checked ? 'dark' : 'light');
      });
    }

    if (langSelect) {
      langSelect.value = settings.language || 'en';
      langSelect.addEventListener('change', () => {
        settings.language = langSelect.value;
        CB.storage.set('settings', settings);
        CB.toast.show(`Language preference saved (${langSelect.options[langSelect.selectedIndex].text}).`, 'success', 'Language Updated');
      });
    }

    const bindPrivacyToggle = (el, key) => {
      if (!el) return;
      el.checked = Boolean(settings.privacy?.[key]);
      el.addEventListener('change', () => {
        settings.privacy = settings.privacy || {};
        settings.privacy[key] = el.checked;
        CB.storage.set('settings', settings);
        CB.toast.show('Privacy preference updated.', 'info', 'Saved');
      });
    };

    bindPrivacyToggle(privProfile, 'profileVisible');
    bindPrivacyToggle(privEmail, 'showEmailToRecruiters');
    bindPrivacyToggle(privAlerts, 'jobAlertEmails');
    bindPrivacyToggle(privMessages, 'recruiterMessages');

    // Delete Account UI
    document.getElementById('deleteAccountBtn')?.addEventListener('click', () => {
      const user = CB.auth.getCurrentUser();
      const modal = CB.modal.open({
        title: 'Delete Account Permanently',
        bodyHTML: `
          <p class="text-secondary mb-2">This will permanently remove your profile, applications, and saved jobs from CareerBridge LocalStorage.</p>
          <div class="form-group">
            <label class="form-label">Type <strong>DELETE</strong> to confirm</label>
            <input type="text" id="deleteConfirmInput" class="form-control" placeholder="DELETE">
          </div>
        `,
        footerHTML: `
          <button type="button" class="btn btn-secondary" data-cancel-del>Cancel</button>
          <button type="button" class="btn btn-danger" id="confirmDeleteFinal">Delete Account</button>
        `
      });
      modal.querySelector('[data-cancel-del]').addEventListener('click', () => CB.modal.close());
      modal.querySelector('#confirmDeleteFinal').addEventListener('click', () => {
        const val = modal.querySelector('#deleteConfirmInput').value.trim();
        if (val !== 'DELETE') {
          CB.toast.show('Please type DELETE in uppercase to confirm.', 'error', 'Confirmation Required');
          return;
        }
        CB.storage.update('users', (list) => list.filter((u) => u.id !== user.id));
        CB.storage.remove('cb_session');
        CB.modal.close();
        CB.toast.show('Account deleted.', 'info', 'Account Removed');
        setTimeout(() => {
          window.location.href = 'register.html';
        }, 600);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initProfilePage();
    initSettingsPage();
  });
})();
