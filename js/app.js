/* ==========================================================================
   CareerBridge - Global App Shell, Theme, Navigation & Public Pages
   ========================================================================== */

(() => {
  'use strict';

  const CB = (window.CB = window.CB || {});

  // Apply persisted theme immediately to avoid flash
  function applyTheme(theme) {
    const resolved = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', resolved);
    const settings = CB.storage.get('settings', { theme: 'light', language: 'en', privacy: {} });
    settings.theme = resolved;
    CB.storage.set('settings', settings);

    document.querySelectorAll('[data-theme-toggle] i').forEach((icon) => {
      icon.className = resolved === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
    });
    const settingToggle = document.getElementById('settingDarkMode');
    if (settingToggle) settingToggle.checked = resolved === 'dark';
  }

  const initialSettings = CB.storage.get('settings', { theme: 'light' });
  applyTheme(initialSettings.theme);

  CB.theme = {
    get() {
      return document.documentElement.getAttribute('data-theme') || 'light';
    },
    toggle() {
      applyTheme(this.get() === 'dark' ? 'light' : 'dark');
      CB.toast.show(`Switched to ${this.get()} mode.`, 'info', 'Theme Updated');
    },
    set(mode) {
      applyTheme(mode);
    }
  };

  // --------------------------------------------------------------------------
  // Shared Header & Footer Hydration
  // --------------------------------------------------------------------------
  function getCurrentPageName() {
    return window.location.pathname.split('/').pop() || 'index.html';
  }

  function renderNavbar() {
    const mount = document.getElementById('appNavbar');
    if (!mount) return;

    const currentPage = getCurrentPageName();
    const user = CB.auth ? CB.auth.getCurrentUser() : null;
    const notifications = CB.storage.get('notifications', []);
    const unreadCount = notifications.filter((n) => !n.read).length;

    const navItems = [
      { href: 'index.html', label: 'Home' },
      { href: 'jobs.html', label: 'Find Jobs' },
      { href: 'companies.html', label: 'Companies' },
      { href: 'about.html', label: 'About' },
      { href: 'contact.html', label: 'Contact' }
    ];

    const linksHTML = navItems
      .map(
        (item) =>
          `<a href="${item.href}" class="nav-link ${currentPage === item.href ? 'active' : ''}">${item.label}</a>`
      )
      .join('');

    const authActionsHTML = user
      ? `
        <a href="notifications.html" class="nav-icon-btn" aria-label="Notifications">
          <i class="bi bi-bell"></i>
          ${unreadCount > 0 ? `<span class="nav-badge" data-unread-badge>${unreadCount}</span>` : '<span class="nav-badge hidden" data-unread-badge>0</span>'}
        </a>
        <div class="nav-user-menu">
          <button type="button" class="nav-user-trigger" id="navUserMenuBtn" aria-expanded="false" aria-haspopup="true">
            <img src="${CB.format.escapeHTML(user.avatar || 'assets/images/avatar-default.svg')}" alt="${CB.format.escapeHTML(user.fullName)}" class="nav-avatar">
            <span class="nav-user-name">${CB.format.escapeHTML(user.fullName.split(' ')[0])}</span>
            <i class="bi bi-chevron-down"></i>
          </button>
          <div class="nav-dropdown" id="navUserDropdown" role="menu">
            <div class="nav-dropdown-header">
              <strong>${CB.format.escapeHTML(user.fullName)}</strong>
              <small>${CB.format.escapeHTML(user.email)}</small>
            </div>
            <a href="dashboard.html" class="nav-dropdown-item"><i class="bi bi-speedometer2"></i> Dashboard</a>
            <a href="applications.html" class="nav-dropdown-item"><i class="bi bi-send-check"></i> Applications</a>
            <a href="saved-jobs.html" class="nav-dropdown-item"><i class="bi bi-bookmark-heart"></i> Saved Jobs</a>
            <a href="resume-builder.html" class="nav-dropdown-item"><i class="bi bi-file-earmark-person"></i> Resume Builder</a>
            <a href="profile.html" class="nav-dropdown-item"><i class="bi bi-person-circle"></i> Profile</a>
            <a href="settings.html" class="nav-dropdown-item"><i class="bi bi-gear"></i> Settings</a>
            <button type="button" class="nav-dropdown-item danger" data-logout-btn><i class="bi bi-box-arrow-right"></i> Logout</button>
          </div>
        </div>
      `
      : `
        <a href="login.html" class="btn btn-secondary btn-sm">Sign In</a>
        <a href="register.html" class="btn btn-primary btn-sm">Get Started</a>
      `;

    mount.innerHTML = `
      <header class="navbar" id="mainHeader">
        <div class="container navbar-inner">
          <div class="flex" style="align-items:center; gap:12px;">
            ${
              document.getElementById('workspaceSidebar')
                ? `<button type="button" class="nav-icon-btn" id="sidebarToggleBtn" aria-label="Toggle workspace sidebar"><i class="bi bi-layout-sidebar-inset"></i></button>`
                : ''
            }
            <a href="index.html" class="brand" aria-label="CareerBridge Home">
              <span class="brand-logo"><i class="bi bi-briefcase-fill"></i></span>
              <span>Career<span class="brand-accent">Bridge</span></span>
            </a>
          </div>

          <nav class="nav-links" aria-label="Main navigation">${linksHTML}</nav>

          <div class="nav-actions">
            <button type="button" class="nav-icon-btn" data-theme-toggle aria-label="Toggle dark mode" title="Toggle Dark/Light Mode">
              <i class="bi ${CB.theme.get() === 'dark' ? 'bi-sun-fill' : 'bi-moon-stars-fill'}"></i>
            </button>
            ${authActionsHTML}
            <button type="button" class="mobile-menu-toggle" id="mobileMenuBtn" aria-label="Toggle mobile menu" aria-expanded="false">
              <i class="bi bi-list"></i>
            </button>
          </div>
        </div>
      </header>
      <div class="mobile-drawer" id="mobileDrawer" aria-label="Mobile navigation">
        <div class="flex" style="flex-direction:column; gap:8px;">
          ${navItems
            .map(
              (item) =>
                `<a href="${item.href}" class="nav-link ${currentPage === item.href ? 'active' : ''}">${item.label}</a>`
            )
            .join('')}
          <hr style="border:none; border-top:1px solid var(--border); margin:10px 0;">
          ${
            user
              ? `
                <a href="dashboard.html" class="nav-link"><i class="bi bi-speedometer2"></i> Dashboard</a>
                <a href="saved-jobs.html" class="nav-link"><i class="bi bi-bookmark-heart"></i> Saved Jobs</a>
                <a href="applications.html" class="nav-link"><i class="bi bi-send-check"></i> Applications</a>
                <a href="resume-builder.html" class="nav-link"><i class="bi bi-file-earmark-person"></i> Resume Builder</a>
                <a href="notifications.html" class="nav-link"><i class="bi bi-bell"></i> Notifications (${unreadCount})</a>
                <a href="profile.html" class="nav-link"><i class="bi bi-person-circle"></i> Profile</a>
                <a href="settings.html" class="nav-link"><i class="bi bi-gear"></i> Settings</a>
                <button type="button" class="btn btn-danger btn-block mt-1" data-logout-btn>Logout</button>
              `
              : `
                <a href="login.html" class="btn btn-secondary btn-block">Sign In</a>
                <a href="register.html" class="btn btn-primary btn-block">Create Account</a>
              `
          }
        </div>
      </div>
    `;

    // Bind navbar interactions
    mount.querySelectorAll('[data-theme-toggle]').forEach((btn) =>
      btn.addEventListener('click', () => CB.theme.toggle())
    );
    mount.querySelectorAll('[data-logout-btn]').forEach((btn) =>
      btn.addEventListener('click', () => CB.auth.logout())
    );

    const userMenuBtn = document.getElementById('navUserMenuBtn');
    const userDropdown = document.getElementById('navUserDropdown');
    if (userMenuBtn && userDropdown) {
      userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = userDropdown.classList.toggle('open');
        userMenuBtn.setAttribute('aria-expanded', String(isOpen));
      });
      document.addEventListener('click', () => {
        userDropdown.classList.remove('open');
        userMenuBtn.setAttribute('aria-expanded', 'false');
      });
    }

    const mobileBtn = document.getElementById('mobileMenuBtn');
    const mobileDrawer = document.getElementById('mobileDrawer');
    if (mobileBtn && mobileDrawer) {
      mobileBtn.addEventListener('click', () => {
        const open = mobileDrawer.classList.toggle('open');
        mobileBtn.setAttribute('aria-expanded', String(open));
        mobileBtn.innerHTML = open ? '<i class="bi bi-x-lg"></i>' : '<i class="bi bi-list"></i>';
      });
    }

    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const sidebar = document.getElementById('workspaceSidebar');
    const shell = document.querySelector('.workspace-shell');
    if (sidebarToggleBtn && sidebar) {
      sidebarToggleBtn.addEventListener('click', () => {
        if (window.innerWidth <= 992) {
          sidebar.classList.toggle('mobile-open');
        } else {
          sidebar.classList.toggle('collapsed');
          if (shell) shell.classList.toggle('sidebar-collapsed');
        }
      });
    }
  }

  function renderWorkspaceSidebar() {
    const sidebar = document.getElementById('workspaceSidebar');
    if (!sidebar) return;

    const user = CB.auth.getCurrentUser();
    if (!user) return;

    const currentPage = getCurrentPageName();
    const notifications = CB.storage.get('notifications', []);
    const unread = notifications.filter((n) => !n.read).length;

    const links = [
      { href: 'dashboard.html', icon: 'bi-speedometer2', label: 'Dashboard' },
      { href: 'jobs.html', icon: 'bi-search', label: 'Browse Jobs' },
      { href: 'applications.html', icon: 'bi-send-check', label: 'Applications' },
      { href: 'saved-jobs.html', icon: 'bi-bookmark-heart', label: 'Saved Jobs' },
      { href: 'resume-builder.html', icon: 'bi-file-earmark-person', label: 'Resume Builder' },
      { href: 'notifications.html', icon: 'bi-bell', label: 'Notifications', badge: unread },
      { href: 'profile.html', icon: 'bi-person-badge', label: 'My Profile' },
      { href: 'settings.html', icon: 'bi-gear', label: 'Settings' }
    ];

    sidebar.innerHTML = `
      <div class="sidebar-user-card">
        <img src="${CB.format.escapeHTML(user.avatar || 'assets/images/avatar-default.svg')}" alt="${CB.format.escapeHTML(user.fullName)}" class="nav-avatar" style="width:42px;height:42px;">
        <div class="sidebar-user-meta" style="min-width:0;">
          <strong style="display:block; font-size:0.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${CB.format.escapeHTML(user.fullName)}</strong>
          <small class="text-muted" style="display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${CB.format.escapeHTML(user.headline || 'Candidate')}</small>
        </div>
      </div>

      <div>
        <div class="sidebar-section-title">Workspace</div>
        <nav class="sidebar-nav" aria-label="Dashboard navigation">
          ${links
            .map(
              (l) => `
                <a href="${l.href}" class="sidebar-link ${currentPage === l.href ? 'active' : ''}">
                  <i class="bi ${l.icon}"></i>
                  <span class="sidebar-label">${l.label}</span>
                  ${l.badge ? `<span class="badge badge-primary sidebar-label" data-unread-badge>${l.badge}</span>` : ''}
                </a>
              `
            )
            .join('')}
        </nav>
      </div>

      <div style="margin-top:auto;">
        <button type="button" class="sidebar-link text-danger" style="width:100%;" data-sidebar-logout>
          <i class="bi bi-box-arrow-right"></i>
          <span class="sidebar-label">Logout</span>
        </button>
      </div>
    `;

    sidebar.querySelector('[data-sidebar-logout]').addEventListener('click', () => CB.auth.logout());
  }

  function renderFooter() {
    const mount = document.getElementById('appFooter');
    if (!mount) return;

    mount.innerHTML = `
      <footer class="footer">
        <div class="container">
          <div class="footer-grid">
            <div>
              <a href="index.html" class="brand mb-2">
                <span class="brand-logo"><i class="bi bi-briefcase-fill"></i></span>
                <span>Career<span class="brand-accent">Bridge</span></span>
              </a>
              <p class="text-secondary" style="font-size:0.9rem; max-width:300px;">
                Smart career discovery connecting top talent with transparent, fast-growing technology and enterprise teams worldwide.
              </p>
              <div class="social-links mt-2">
                <a href="about.html" class="social-link" aria-label="LinkedIn"><i class="bi bi-linkedin"></i></a>
                <a href="about.html" class="social-link" aria-label="Twitter"><i class="bi bi-twitter-x"></i></a>
                <a href="about.html" class="social-link" aria-label="GitHub"><i class="bi bi-github"></i></a>
                <a href="contact.html" class="social-link" aria-label="Email"><i class="bi bi-envelope"></i></a>
              </div>
            </div>

            <div>
              <h4 class="footer-title">For Candidates</h4>
              <div class="footer-links">
                <a href="jobs.html">Browse Jobs</a>
                <a href="companies.html">Explore Companies</a>
                <a href="resume-builder.html">Resume Builder</a>
                <a href="saved-jobs.html">Saved Jobs</a>
                <a href="dashboard.html">Candidate Dashboard</a>
              </div>
            </div>

            <div>
              <h4 class="footer-title">Platform</h4>
              <div class="footer-links">
                <a href="about.html">About CareerBridge</a>
                <a href="contact.html">Contact & FAQ</a>
                <a href="login.html">Sign In</a>
                <a href="register.html">Create Account</a>
                <a href="settings.html">Privacy & Settings</a>
              </div>
            </div>

            <div>
              <h4 class="footer-title">Weekly Job Digest</h4>
              <p class="text-secondary" style="font-size:0.86rem;">
                Get hand-picked remote and hybrid openings delivered every Monday.
              </p>
              <form class="footer-newsletter-form" id="footerNewsletterForm" novalidate>
                <input type="email" id="newsletterEmail" placeholder="Enter your email" aria-label="Newsletter email" required>
                <button type="submit" class="btn btn-primary btn-sm">Subscribe</button>
              </form>
            </div>
          </div>

          <div class="footer-bottom">
            <span>&copy; 2026 CareerBridge Smart Job Portal. All rights reserved.</span>
            <span>Built with HTML5, CSS3 & Vanilla ES6</span>
          </div>
        </div>
      </footer>
    `;

    const nlForm = document.getElementById('footerNewsletterForm');
    if (nlForm) {
      nlForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('newsletterEmail');
        if (!CB.validators.email(emailInput.value)) {
          CB.toast.show('Please enter a valid email address.', 'error', 'Invalid Email');
          return;
        }
        CB.storage.update('cb_newsletter', (list) => {
          const email = emailInput.value.trim().toLowerCase();
          return list.includes(email) ? list : [...list, email];
        });
        emailInput.value = '';
        CB.toast.show('Subscribed to the Weekly Job Digest!', 'success', 'Newsletter');
      });
    }
  }

  // --------------------------------------------------------------------------
  // Home Page Hydration (index.html)
  // --------------------------------------------------------------------------
  function initHomePage() {
    const heroSearchForm = document.getElementById('heroSearchForm');
    if (!heroSearchForm) return;

    heroSearchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = document.getElementById('heroSearchQuery')?.value.trim() || '';
      const loc = document.getElementById('heroSearchLocation')?.value.trim() || '';
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (loc) params.set('loc', loc);
      window.location.href = `jobs.html${params.toString() ? '?' + params.toString() : ''}`;
    });

    // Render Featured Companies (6)
    const compGrid = document.getElementById('homeFeaturedCompanies');
    if (compGrid) {
      const companies = CB.storage.get('companies', []).slice(0, 6);
      const jobs = CB.storage.get('jobs', []);
      compGrid.innerHTML = companies
        .map((c) => {
          const openJobs = jobs.filter((j) => j.companyId === c.id).length;
          return `
            <a href="company-profile.html?id=${c.id}" class="company-card">
              <div class="flex-between">
                <div class="company-logo-box"><img src="${c.logo}" alt="${CB.format.escapeHTML(c.name)} logo"></div>
                <span class="rating-pill"><i class="bi bi-star-fill"></i> ${c.rating}</span>
              </div>
              <div>
                <h3 style="font-size:1.04rem; font-weight:600;">${CB.format.escapeHTML(c.name)}</h3>
                <p class="text-muted" style="font-size:0.84rem;">${CB.format.escapeHTML(c.industry)} &bull; ${CB.format.escapeHTML(c.location)}</p>
              </div>
              <div class="flex-between" style="margin-top:auto; padding-top:10px; border-top:1px solid var(--border); font-size:0.84rem;">
                <span class="badge badge-primary">${openJobs} Open Roles</span>
                <span class="text-primary" style="font-weight:600;">View Profile <i class="bi bi-arrow-right"></i></span>
              </div>
            </a>
          `;
        })
        .join('');
    }

    // Render Popular Categories (15)
    const catGrid = document.getElementById('homeCategoriesGrid');
    if (catGrid) {
      const cats = CB.storage.get('cb_categories', []);
      catGrid.innerHTML = cats
        .map(
          (cat) => `
            <a href="jobs.html?category=${encodeURIComponent(cat.name)}" class="category-card">
              <div class="category-icon"><i class="bi ${cat.icon}"></i></div>
              <div>
                <h3 style="font-size:0.96rem; font-weight:600;">${CB.format.escapeHTML(cat.name)}</h3>
                <span class="text-muted" style="font-size:0.82rem;">${cat.openCount}+ open positions</span>
              </div>
            </a>
          `
        )
        .join('');
    }

    // Render Latest Jobs (6)
    const latestGrid = document.getElementById('homeLatestJobs');
    if (latestGrid && CB.jobsUI) {
      const latest = CB.storage.get('jobs', []).slice(0, 6);
      latestGrid.innerHTML = latest.map((job) => CB.jobsUI.renderJobCard(job)).join('');
      CB.jobsUI.bindJobCardActions(latestGrid);
    }

    // Render Testimonials (5)
    const testGrid = document.getElementById('homeTestimonialsGrid');
    if (testGrid) {
      const testimonials = CB.storage.get('cb_testimonials', []);
      testGrid.innerHTML = testimonials
        .map(
          (t) => `
            <article class="testimonial-card">
              <div class="flex" style="gap:4px; color:#F59E0B;">
                ${'<i class="bi bi-star-fill"></i>'.repeat(t.rating)}
              </div>
              <p class="testimonial-quote">"${CB.format.escapeHTML(t.quote)}"</p>
              <div class="testimonial-author">
                <div class="avatar-circle">${CB.format.initials(t.name)}</div>
                <div>
                  <strong style="display:block; font-size:0.9rem;">${CB.format.escapeHTML(t.name)}</strong>
                  <small class="text-muted">${CB.format.escapeHTML(t.role)}</small>
                </div>
              </div>
            </article>
          `
        )
        .join('');
    }
  }

  // --------------------------------------------------------------------------
  // Contact & About Pages
  // --------------------------------------------------------------------------
  function initContactAndAbout() {
    // FAQ Accordion
    document.querySelectorAll('.accordion-trigger').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.accordion-item');
        const wasOpen = item.classList.contains('open');
        item.parentElement.querySelectorAll('.accordion-item').forEach((el) => el.classList.remove('open'));
        if (!wasOpen) item.classList.add('open');
      });
    });

    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
      contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('contactName');
        const email = document.getElementById('contactEmail');
        const subject = document.getElementById('contactSubject');
        const message = document.getElementById('contactMessage');

        if (!CB.validators.required(name.value) || !CB.validators.email(email.value) || !CB.validators.required(message.value)) {
          CB.toast.show('Please fill out your name, a valid email, and your message.', 'error', 'Validation Error');
          return;
        }

        CB.storage.update('cb_contacts', (list) => [
          {
            id: 'msg_' + Date.now(),
            name: name.value.trim(),
            email: email.value.trim(),
            subject: subject.value.trim(),
            message: message.value.trim(),
            sentAt: new Date().toISOString()
          },
          ...list
        ]);

        contactForm.reset();
        CB.toast.show('Thank you! Our support team will reply within 24 hours.', 'success', 'Message Sent');
      });
    }
  }

  // Sticky navbar shadow on scroll
  window.addEventListener('scroll', () => {
    const header = document.getElementById('mainHeader');
    if (header) {
      header.classList.toggle('scrolled', window.scrollY > 12);
    }
  });

  // Expose helper to refresh unread badges across UI
  CB.refreshUnreadBadges = function () {
    const unread = CB.storage.get('notifications', []).filter((n) => !n.read).length;
    document.querySelectorAll('[data-unread-badge]').forEach((el) => {
      el.textContent = unread;
      el.classList.toggle('hidden', unread === 0);
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    renderWorkspaceSidebar();
    renderNavbar();
    renderFooter();
    initHomePage();
    initContactAndAbout();
  });
})();
