/* ==========================================================================
   CareerBridge - Jobs, Job Details, Saved Jobs, Applications & Companies
   ========================================================================== */

(() => {
  'use strict';

  const CB = (window.CB = window.CB || {});

  function getCompaniesMap() {
    const companies = CB.storage.get('companies', []);
    return Object.fromEntries(companies.map((c) => [c.id, c]));
  }

  function getCurrentUserId() {
    return CB.auth.getCurrentUser()?.id || 'u_demo';
  }

  function isJobSaved(jobId) {
    const uid = getCurrentUserId();
    return CB.storage.get('savedJobs', []).some((s) => s.jobId === jobId && s.userId === uid);
  }

  function hasApplied(jobId) {
    const uid = getCurrentUserId();
    return CB.storage
      .get('applications', [])
      .some((a) => a.jobId === jobId && a.userId === uid && a.status !== 'Withdrawn');
  }

  function toggleBookmark(jobId) {
    if (!CB.auth.isLoggedIn()) {
      CB.toast.show('Sign in to save jobs to your personal shortlist.', 'warning', 'Sign In Required');
      setTimeout(() => {
        window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname.split('/').pop() + window.location.search)}`;
      }, 750);
      return null;
    }
    const uid = getCurrentUserId();
    const list = CB.storage.get('savedJobs', []);
    const exists = list.some((s) => s.jobId === jobId && s.userId === uid);
    let updated;
    if (exists) {
      updated = list.filter((s) => !(s.jobId === jobId && s.userId === uid));
      CB.storage.set('savedJobs', updated);
      CB.toast.show('Job removed from Saved Jobs.', 'info', 'Removed');
      return false;
    } else {
      updated = [{ jobId, userId: uid, savedAt: new Date().toISOString() }, ...list];
      CB.storage.set('savedJobs', updated);
      CB.toast.show('Job saved to your shortlist!', 'success', 'Saved');
      return true;
    }
  }

  function openApplyModal(jobId, onSuccess) {
    if (!CB.auth.isLoggedIn()) {
      CB.toast.show('Please sign in to apply for jobs.', 'warning', 'Authentication Required');
      setTimeout(() => {
        window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname.split('/').pop() + window.location.search)}`;
      }, 700);
      return;
    }
    if (hasApplied(jobId)) {
      CB.toast.show('You have already applied to this position.', 'info', 'Already Applied');
      return;
    }

    const jobs = CB.storage.get('jobs', []);
    const job = jobs.find((j) => j.id === jobId);
    const companiesMap = getCompaniesMap();
    const company = companiesMap[job?.companyId];
    const user = CB.auth.getCurrentUser();
    const resume = CB.storage.get('resume', {});

    if (!job) return;

    const modal = CB.modal.open({
      title: `Apply to ${job.title}`,
      bodyHTML: `
        <div class="flex gap-2 mb-3" style="align-items:center;">
          <div class="company-logo-box"><img src="${company?.logo || 'assets/logos/logo-1.svg'}" alt=""></div>
          <div>
            <strong style="display:block;">${CB.format.escapeHTML(job.title)}</strong>
            <small class="text-muted">${CB.format.escapeHTML(company?.name || '')} &bull; ${CB.format.escapeHTML(job.location)}</small>
          </div>
        </div>
        <form id="applyJobForm">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Applicant Name</label>
              <input type="text" class="form-control" value="${CB.format.escapeHTML(user.fullName)}" readonly>
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" class="form-control" value="${CB.format.escapeHTML(user.email)}" readonly>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Resume Attached</label>
            <div class="flex-between" style="padding:10px 14px; border-radius:10px; border:1px solid var(--border); background:var(--bg);">
              <span><i class="bi bi-file-earmark-check text-primary"></i> ${CB.format.escapeHTML(resume.personal?.fullName || user.fullName)} — CareerBridge Resume</span>
              <a href="resume-builder.html" class="text-primary" style="font-size:0.82rem; font-weight:600;">Edit Resume</a>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="applyCoverNote">Why are you a great fit? <span class="required">*</span></label>
            <textarea id="applyCoverNote" class="form-control" placeholder="Highlight relevant projects, skills, and impact..." required>I am excited to apply for the ${CB.format.escapeHTML(job.title)} role at ${CB.format.escapeHTML(company?.name || '')}. With hands-on experience in ${CB.format.escapeHTML(job.skills.slice(0, 3).join(', '))}, I would love to contribute to your team.</textarea>
          </div>
          <div class="flex-between gap-2">
            <button type="button" class="btn btn-secondary" data-cancel-apply>Cancel</button>
            <button type="submit" class="btn btn-primary"><i class="bi bi-send-fill"></i> Submit Application</button>
          </div>
        </form>
      `
    });

    modal.querySelector('[data-cancel-apply]').addEventListener('click', () => CB.modal.close());
    modal.querySelector('#applyJobForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const note = modal.querySelector('#applyCoverNote').value.trim();
      if (!note) {
        CB.toast.show('Please include a short cover note.', 'error', 'Missing Note');
        return;
      }

      const newApp = {
        id: 'app_' + Date.now(),
        jobId: job.id,
        userId: user.id,
        status: 'Applied',
        appliedAt: new Date().toISOString(),
        coverNote: note
      };

      CB.storage.update('applications', (apps) => [newApp, ...apps]);
      CB.storage.update('notifications', (notifs) => [
        {
          id: 'n_' + Date.now(),
          type: 'interview',
          title: `Application Sent: ${job.title}`,
          message: `Your application to ${company?.name || 'the employer'} has been submitted successfully.`,
          createdAt: new Date().toISOString(),
          read: false,
          link: 'applications.html'
        },
        ...notifs
      ]);
      CB.refreshUnreadBadges();
      CB.modal.close();
      CB.toast.show(`Application submitted to ${company?.name || ''}!`, 'success', 'Applied');
      if (typeof onSuccess === 'function') onSuccess();
    });
  }

  // Reusable Job Card Builder
  CB.jobsUI = {
    renderJobCard(job) {
      const companies = getCompaniesMap();
      const company = companies[job.companyId] || { name: 'Partner Company', logo: 'assets/logos/logo-1.svg' };
      const saved = CB.auth.isLoggedIn() && isJobSaved(job.id);
      const applied = CB.auth.isLoggedIn() && hasApplied(job.id);

      return `
        <article class="job-card animate-slide">
          <div class="job-card-header">
            <div class="job-company-wrap">
              <a href="company-profile.html?id=${company.id}" class="company-logo-box" aria-label="${CB.format.escapeHTML(company.name)}">
                <img src="${company.logo}" alt="${CB.format.escapeHTML(company.name)} logo">
              </a>
              <div>
                <a href="job-details.html?id=${job.id}" class="job-title">${CB.format.escapeHTML(job.title)}</a>
                <div class="job-company-name">
                  <a href="company-profile.html?id=${company.id}">${CB.format.escapeHTML(company.name)}</a>
                  <span>&bull;</span>
                  <span>${CB.format.relativeDate(job.postedAt)}</span>
                </div>
              </div>
            </div>
            <button type="button" class="bookmark-btn ${saved ? 'saved' : ''}" data-save-job="${job.id}" aria-label="${saved ? 'Remove saved job' : 'Save job'}">
              <i class="bi ${saved ? 'bi-bookmark-fill' : 'bi-bookmark'}"></i>
            </button>
          </div>

          <div class="job-meta-list">
            <span class="job-meta-item"><i class="bi bi-geo-alt"></i> ${CB.format.escapeHTML(job.location)}</span>
            <span class="job-meta-item"><i class="bi bi-briefcase"></i> ${CB.format.escapeHTML(job.type)}</span>
            <span class="job-meta-item"><i class="bi bi-award"></i> ${CB.format.escapeHTML(job.experience)}</span>
            ${job.remote ? '<span class="badge badge-accent"><i class="bi bi-wifi"></i> Remote</span>' : ''}
          </div>

          <div class="job-skills">
            ${job.skills.slice(0, 4).map((s) => `<span class="skill-chip">${CB.format.escapeHTML(s)}</span>`).join('')}
          </div>

          <div class="job-card-footer">
            <div class="job-salary">${CB.format.salary(job.salaryMin, job.salaryMax)} <small>/ yr</small></div>
            <div class="flex gap-1">
              <a href="job-details.html?id=${job.id}" class="btn btn-secondary btn-sm">Details</a>
              <button type="button" class="btn ${applied ? 'btn-secondary' : 'btn-primary'} btn-sm" data-apply-job="${job.id}" ${applied ? 'disabled' : ''}>
                ${applied ? '<i class="bi bi-check2"></i> Applied' : 'Apply Now'}
              </button>
            </div>
          </div>
        </article>
      `;
    },

    bindJobCardActions(container, onUpdate) {
      if (!container) return;
      container.querySelectorAll('[data-save-job]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const jobId = btn.getAttribute('data-save-job');
          const res = toggleBookmark(jobId);
          if (res === null) return;
          btn.classList.toggle('saved', res);
          btn.innerHTML = `<i class="bi ${res ? 'bi-bookmark-fill' : 'bi-bookmark'}"></i>`;
          if (typeof onUpdate === 'function') onUpdate();
        });
      });

      container.querySelectorAll('[data-apply-job]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const jobId = btn.getAttribute('data-apply-job');
          openApplyModal(jobId, () => {
            btn.className = 'btn btn-secondary btn-sm';
            btn.disabled = true;
            btn.innerHTML = '<i class="bi bi-check2"></i> Applied';
            if (typeof onUpdate === 'function') onUpdate();
          });
        });
      });
    }
  };

  // --------------------------------------------------------------------------
  // PAGE 1: Jobs Search & Filter Directory (jobs.html)
  // --------------------------------------------------------------------------
  function initJobsPage() {
    const grid = document.getElementById('jobsResultsGrid');
    if (!grid) return;

    const allJobs = CB.storage.get('jobs', []);
    const companiesMap = getCompaniesMap();
    const PER_PAGE = 6;

    const searchInput = document.getElementById('jobsSearchInput');
    const locationInput = document.getElementById('jobsLocationInput');
    const sortSelect = document.getElementById('jobsSortSelect');
    const salaryRange = document.getElementById('filterSalaryRange');
    const salaryDisplay = document.getElementById('filterSalaryDisplay');
    const remoteToggle = document.getElementById('filterRemoteOnly');
    const skillsInput = document.getElementById('filterSkillsInput');
    const categorySelect = document.getElementById('filterCategorySelect');
    const countLabel = document.getElementById('jobsResultCount');
    const paginationEl = document.getElementById('jobsPagination');
    const clearBtn = document.getElementById('clearFiltersBtn');

    // Hydrate category dropdown
    if (categorySelect) {
      const cats = CB.storage.get('cb_categories', []);
      cats.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = c.name;
        categorySelect.appendChild(opt);
      });
    }

    // Read initial URL params
    const initQ = CB.format.getParam('q') || '';
    const initLoc = CB.format.getParam('loc') || '';
    const initCat = CB.format.getParam('category') || '';
    const initRemote = CB.format.getParam('remote') === 'true';

    if (searchInput) searchInput.value = initQ;
    if (locationInput) locationInput.value = initLoc;
    if (categorySelect && initCat) categorySelect.value = initCat;
    if (remoteToggle && initRemote) remoteToggle.checked = true;

    let currentPage = 1;

    function getFilteredJobs() {
      const q = (searchInput?.value || '').trim().toLowerCase();
      const loc = (locationInput?.value || '').trim().toLowerCase();
      const minSal = Number(salaryRange?.value || 0);
      const remoteOnly = Boolean(remoteToggle?.checked);
      const skillQ = (skillsInput?.value || '').trim().toLowerCase();
      const cat = categorySelect?.value || '';

      const selectedTypes = Array.from(document.querySelectorAll('input[name="jobType"]:checked')).map((el) => el.value);
      const selectedExp = Array.from(document.querySelectorAll('input[name="expLevel"]:checked')).map((el) => el.value);

      let filtered = allJobs.filter((job) => {
        const companyName = (companiesMap[job.companyId]?.name || '').toLowerCase();
        const matchesQ =
          !q ||
          job.title.toLowerCase().includes(q) ||
          companyName.includes(q) ||
          job.skills.some((s) => s.toLowerCase().includes(q));
        const matchesLoc = !loc || job.location.toLowerCase().includes(loc);
        const matchesSal = job.salaryMax >= minSal;
        const matchesRemote = !remoteOnly || job.remote;
        const matchesSkill = !skillQ || job.skills.some((s) => s.toLowerCase().includes(skillQ));
        const matchesCat = !cat || job.category === cat;
        const matchesType = selectedTypes.length === 0 || selectedTypes.includes(job.type);
        const matchesExp = selectedExp.length === 0 || selectedExp.includes(job.experience);
        return matchesQ && matchesLoc && matchesSal && matchesRemote && matchesSkill && matchesCat && matchesType && matchesExp;
      });

      const sortVal = sortSelect?.value || 'newest';
      if (sortVal === 'newest') {
        filtered.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
      } else if (sortVal === 'salary_desc') {
        filtered.sort((a, b) => b.salaryMax - a.salaryMax);
      } else if (sortVal === 'salary_asc') {
        filtered.sort((a, b) => a.salaryMin - b.salaryMin);
      }
      return filtered;
    }

    function renderSkeleton() {
      grid.innerHTML = Array.from({ length: 4 })
        .map(
          () => `
            <div class="card">
              <div class="skeleton" style="height:24px; width:65%; margin-bottom:12px;"></div>
              <div class="skeleton" style="height:16px; width:40%; margin-bottom:20px;"></div>
              <div class="skeleton" style="height:40px; width:100%;"></div>
            </div>
          `
        )
        .join('');
    }

    function renderJobs(withSkeleton = false) {
      if (withSkeleton) {
        renderSkeleton();
        setTimeout(() => renderJobs(false), 180);
        return;
      }

      const filtered = getFilteredJobs();
      const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
      if (currentPage > totalPages) currentPage = 1;

      const start = (currentPage - 1) * PER_PAGE;
      const slice = filtered.slice(start, start + PER_PAGE);

      if (countLabel) {
        countLabel.textContent = `Showing ${slice.length} of ${filtered.length} matching jobs`;
      }

      if (slice.length === 0) {
        grid.innerHTML = `
          <div class="empty-state" style="grid-column:1 / -1;">
            <div class="empty-state-icon"><i class="bi bi-search"></i></div>
            <h3>No matching jobs found</h3>
            <p class="text-muted mt-1 mb-3">Try broadening your search keywords, location, or salary threshold.</p>
            <button type="button" class="btn btn-primary" id="emptyResetBtn">Reset All Filters</button>
          </div>
        `;
        document.getElementById('emptyResetBtn')?.addEventListener('click', resetFilters);
        paginationEl.innerHTML = '';
        return;
      }

      grid.innerHTML = slice.map((j) => CB.jobsUI.renderJobCard(j)).join('');
      CB.jobsUI.bindJobCardActions(grid);

      // Pagination
      let pagesHTML = `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}" aria-label="Previous page"><i class="bi bi-chevron-left"></i></button>`;
      for (let i = 1; i <= totalPages; i++) {
        pagesHTML += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
      }
      pagesHTML += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}" aria-label="Next page"><i class="bi bi-chevron-right"></i></button>`;
      paginationEl.innerHTML = totalPages > 1 ? pagesHTML : '';

      paginationEl.querySelectorAll('[data-page]').forEach((btn) => {
        btn.addEventListener('click', () => {
          currentPage = Number(btn.getAttribute('data-page'));
          renderJobs(true);
          window.scrollTo({ top: 160, behavior: 'smooth' });
        });
      });
    }

    function resetFilters() {
      if (searchInput) searchInput.value = '';
      if (locationInput) locationInput.value = '';
      if (skillsInput) skillsInput.value = '';
      if (categorySelect) categorySelect.value = '';
      if (salaryRange) salaryRange.value = 0;
      if (salaryDisplay) salaryDisplay.textContent = '$0k+';
      if (remoteToggle) remoteToggle.checked = false;
      document.querySelectorAll('input[name="jobType"], input[name="expLevel"]').forEach((el) => (el.checked = false));
      currentPage = 1;
      renderJobs(true);
    }

    document.getElementById('jobsSearchForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      currentPage = 1;
      renderJobs(true);
    });

    if (salaryRange && salaryDisplay) {
      salaryRange.addEventListener('input', () => {
        const val = Number(salaryRange.value);
        salaryDisplay.textContent = val > 0 ? `$${Math.round(val / 1000)}k+` : '$0k+';
        currentPage = 1;
        renderJobs(false);
      });
    }

    [sortSelect, remoteToggle, categorySelect, skillsInput].forEach((el) => {
      el?.addEventListener('change', () => {
        currentPage = 1;
        renderJobs(true);
      });
    });

    skillsInput?.addEventListener('input', () => {
      currentPage = 1;
      renderJobs(false);
    });

    document.querySelectorAll('input[name="jobType"], input[name="expLevel"]').forEach((el) => {
      el.addEventListener('change', () => {
        currentPage = 1;
        renderJobs(true);
      });
    });

    clearBtn?.addEventListener('click', resetFilters);
    renderJobs(true);
  }

  // --------------------------------------------------------------------------
  // PAGE 2: Job Details (job-details.html)
  // --------------------------------------------------------------------------
  function initJobDetailsPage() {
    const container = document.getElementById('jobDetailsContainer');
    if (!container) return;

    const jobs = CB.storage.get('jobs', []);
    const companiesMap = getCompaniesMap();
    const jobId = CB.format.getParam('id') || jobs[0]?.id;
    const job = jobs.find((j) => j.id === jobId) || jobs[0];

    if (!job) {
      container.innerHTML = `<div class="empty-state"><h3>Job not found</h3><a href="jobs.html" class="btn btn-primary mt-2">Browse Jobs</a></div>`;
      return;
    }

    const company = companiesMap[job.companyId] || {};
    const saved = CB.auth.isLoggedIn() && isJobSaved(job.id);
    const applied = CB.auth.isLoggedIn() && hasApplied(job.id);

    document.title = `${job.title} at ${company.name || 'CareerBridge'} | CareerBridge`;

    container.innerHTML = `
      <div class="breadcrumb">
        <a href="index.html">Home</a> <i class="bi bi-chevron-right"></i>
        <a href="jobs.html">Jobs</a> <i class="bi bi-chevron-right"></i>
        <span>${CB.format.escapeHTML(job.title)}</span>
      </div>

      <div class="card mb-3">
        <div class="flex-between flex-wrap gap-3">
          <div class="flex gap-2" style="align-items:center;">
            <a href="company-profile.html?id=${company.id}" class="company-logo-box" style="width:72px;height:72px;">
              <img src="${company.logo || 'assets/logos/logo-1.svg'}" alt="${CB.format.escapeHTML(company.name)} logo">
            </a>
            <div>
              <span class="badge badge-primary mb-1">${CB.format.escapeHTML(job.category)}</span>
              <h1 style="font-size:clamp(1.4rem, 2.5vw, 1.95rem); font-weight:700;">${CB.format.escapeHTML(job.title)}</h1>
              <p class="text-secondary">
                <a href="company-profile.html?id=${company.id}" class="text-primary" style="font-weight:600;">${CB.format.escapeHTML(company.name)}</a>
                &bull; ${CB.format.escapeHTML(job.location)} &bull; Posted ${CB.format.relativeDate(job.postedAt)}
              </p>
            </div>
          </div>

          <div class="flex flex-wrap gap-1">
            <button type="button" class="btn btn-secondary" id="detailSaveBtn">
              <i class="bi ${saved ? 'bi-bookmark-fill text-primary' : 'bi-bookmark'}"></i> ${saved ? 'Saved' : 'Save Job'}
            </button>
            <button type="button" class="btn btn-secondary" id="detailShareBtn">
              <i class="bi bi-share"></i> Share
            </button>
            <button type="button" class="btn ${applied ? 'btn-secondary' : 'btn-primary'}" id="detailApplyBtn" ${applied ? 'disabled' : ''}>
              ${applied ? '<i class="bi bi-check2-circle"></i> Applied' : '<i class="bi bi-send-fill"></i> Apply Now'}
            </button>
          </div>
        </div>

        <div class="grid-4 mt-3" style="padding-top:20px; border-top:1px solid var(--border);">
          <div>
            <small class="text-muted">Salary Range</small>
            <strong style="display:block;">${CB.format.salary(job.salaryMin, job.salaryMax)} / yr</strong>
          </div>
          <div>
            <small class="text-muted">Experience</small>
            <strong style="display:block;">${CB.format.escapeHTML(job.experience)}</strong>
          </div>
          <div>
            <small class="text-muted">Job Type</small>
            <strong style="display:block;">${CB.format.escapeHTML(job.type)} ${job.remote ? '(Remote)' : '(On-site / Hybrid)'}</strong>
          </div>
          <div>
            <small class="text-muted">Company Rating</small>
            <strong style="display:block;"><i class="bi bi-star-fill" style="color:#F59E0B;"></i> ${company.rating || 4.7} (${company.reviewsCount || 120} reviews)</strong>
          </div>
        </div>
      </div>

      <div class="jobs-layout" style="grid-template-columns: 1.65fr 1fr;">
        <div class="flex" style="flex-direction:column; gap:24px;">
          <section class="card">
            <h2 style="font-size:1.2rem; margin-bottom:12px;">Job Description</h2>
            <p class="text-secondary">${CB.format.escapeHTML(job.description)}</p>

            <h3 style="font-size:1.05rem; margin:24px 0 10px;">Key Responsibilities</h3>
            <ul class="flex" style="flex-direction:column; gap:8px;">
              ${job.responsibilities.map((r) => `<li class="flex gap-1 text-secondary"><i class="bi bi-check-circle-fill text-primary" style="margin-top:3px;"></i><span>${CB.format.escapeHTML(r)}</span></li>`).join('')}
            </ul>

            <h3 style="font-size:1.05rem; margin:24px 0 10px;">Requirements</h3>
            <ul class="flex" style="flex-direction:column; gap:8px;">
              ${job.requirements.map((r) => `<li class="flex gap-1 text-secondary"><i class="bi bi-dot text-primary" style="font-size:1.3rem;"></i><span>${CB.format.escapeHTML(r)}</span></li>`).join('')}
            </ul>

            <h3 style="font-size:1.05rem; margin:24px 0 10px;">Benefits & Perks</h3>
            <div class="flex flex-wrap gap-1">
              ${job.benefits.map((b) => `<span class="badge badge-accent"><i class="bi bi-gift"></i> ${CB.format.escapeHTML(b)}</span>`).join('')}
            </div>

            <h3 style="font-size:1.05rem; margin:24px 0 10px;">Required Skills</h3>
            <div class="job-skills">
              ${job.skills.map((s) => `<span class="skill-chip">${CB.format.escapeHTML(s)}</span>`).join('')}
            </div>
          </section>
        </div>

        <aside class="flex" style="flex-direction:column; gap:20px;">
          <div class="card">
            <h3 style="font-size:1.08rem; margin-bottom:14px;">Company Overview</h3>
            <div class="flex gap-2 mb-2" style="align-items:center;">
              <div class="company-logo-box"><img src="${company.logo || 'assets/logos/logo-1.svg'}" alt=""></div>
              <div>
                <strong style="display:block;">${CB.format.escapeHTML(company.name)}</strong>
                <small class="text-muted">${CB.format.escapeHTML(company.industry)} &bull; ${CB.format.escapeHTML(company.size)}</small>
              </div>
            </div>
            <p class="text-secondary mb-3" style="font-size:0.88rem;">${CB.format.escapeHTML(company.about)}</p>
            <a href="company-profile.html?id=${company.id}" class="btn btn-outline btn-block">View Company Profile</a>
          </div>

          <div class="card">
            <h3 style="font-size:1.05rem; margin-bottom:14px;">Similar Opportunities</h3>
            <div class="flex" style="flex-direction:column; gap:12px;">
              ${jobs
                .filter((j) => j.id !== job.id && (j.category === job.category || j.companyId === job.companyId))
                .slice(0, 3)
                .map(
                  (rel) => `
                    <a href="job-details.html?id=${rel.id}" style="padding:12px; border-radius:10px; border:1px solid var(--border); display:block;">
                      <strong style="display:block; font-size:0.92rem;">${CB.format.escapeHTML(rel.title)}</strong>
                      <small class="text-muted">${CB.format.escapeHTML(companiesMap[rel.companyId]?.name || '')} &bull; ${CB.format.salary(rel.salaryMin, rel.salaryMax)}</small>
                    </a>
                  `
                )
                .join('')}
            </div>
          </div>
        </aside>
      </div>
    `;

    const saveBtn = document.getElementById('detailSaveBtn');
    saveBtn?.addEventListener('click', () => {
      const state = toggleBookmark(job.id);
      if (state === null) return;
      saveBtn.innerHTML = `<i class="bi ${state ? 'bi-bookmark-fill text-primary' : 'bi-bookmark'}"></i> ${state ? 'Saved' : 'Save Job'}`;
    });

    const applyBtn = document.getElementById('detailApplyBtn');
    applyBtn?.addEventListener('click', () => {
      openApplyModal(job.id, () => {
        applyBtn.className = 'btn btn-secondary';
        applyBtn.disabled = true;
        applyBtn.innerHTML = '<i class="bi bi-check2-circle"></i> Applied';
      });
    });

    document.getElementById('detailShareBtn')?.addEventListener('click', () => {
      const shareUrl = window.location.href;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl).then(() => {
          CB.toast.show('Job link copied to clipboard!', 'success', 'Link Copied');
        });
      } else {
        CB.modal.open({
          title: 'Share Job Link',
          bodyHTML: `<input type="text" class="form-control" value="${CB.format.escapeHTML(shareUrl)}" readonly onclick="this.select()">`
        });
      }
    });
  }

  // --------------------------------------------------------------------------
  // PAGE 6: Saved Jobs (saved-jobs.html)
  // --------------------------------------------------------------------------
  function initSavedJobsPage() {
    const grid = document.getElementById('savedJobsGrid');
    if (!grid) return;
    if (!CB.auth.requireAuth()) return;

    const sortSelect = document.getElementById('savedJobsSort');
    const countEl = document.getElementById('savedJobsCount');

    function render() {
      const uid = getCurrentUserId();
      const savedRecords = CB.storage.get('savedJobs', []).filter((s) => s.userId === uid);
      const jobsMap = Object.fromEntries(CB.storage.get('jobs', []).map((j) => [j.id, j]));

      let items = savedRecords
        .map((s) => ({ ...s, job: jobsMap[s.jobId] }))
        .filter((x) => Boolean(x.job));

      const sortVal = sortSelect?.value || 'recent';
      if (sortVal === 'recent') items.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
      if (sortVal === 'salary_desc') items.sort((a, b) => b.job.salaryMax - a.job.salaryMax);
      if (sortVal === 'title_asc') items.sort((a, b) => a.job.title.localeCompare(b.job.title));

      if (countEl) countEl.textContent = `${items.length} saved position${items.length === 1 ? '' : 's'}`;

      if (items.length === 0) {
        grid.innerHTML = `
          <div class="empty-state" style="grid-column:1 / -1;">
            <div class="empty-state-icon"><i class="bi bi-bookmark-heart"></i></div>
            <h3>No saved jobs yet</h3>
            <p class="text-muted mt-1 mb-3">Bookmark interesting roles while browsing to compare salaries and apply later.</p>
            <a href="jobs.html" class="btn btn-primary">Explore Jobs</a>
          </div>
        `;
        return;
      }

      grid.innerHTML = items.map((item) => CB.jobsUI.renderJobCard(item.job)).join('');
      CB.jobsUI.bindJobCardActions(grid, render);
    }

    sortSelect?.addEventListener('change', render);
    render();
  }

  // --------------------------------------------------------------------------
  // PAGE 5: Applications Tracker (applications.html)
  // --------------------------------------------------------------------------
  function initApplicationsPage() {
    const tbody = document.getElementById('applicationsTableBody');
    if (!tbody) return;
    if (!CB.auth.requireAuth()) return;

    const searchEl = document.getElementById('appsSearchInput');
    const statusEl = document.getElementById('appsStatusFilter');

    function badgeClass(status) {
      if (status === 'Interview') return 'badge-info';
      if (status === 'Accepted') return 'badge-success';
      if (status === 'Rejected') return 'badge-danger';
      if (status === 'Withdrawn') return 'badge-neutral';
      return 'badge-primary';
    }

    function render() {
      const uid = getCurrentUserId();
      const apps = CB.storage.get('applications', []).filter((a) => a.userId === uid);
      const jobsMap = Object.fromEntries(CB.storage.get('jobs', []).map((j) => [j.id, j]));
      const companiesMap = getCompaniesMap();

      const q = (searchEl?.value || '').trim().toLowerCase();
      const statusFilter = statusEl?.value || 'All';

      const filtered = apps.filter((a) => {
        const job = jobsMap[a.jobId];
        if (!job) return false;
        const comp = companiesMap[job.companyId];
        const matchQ =
          !q ||
          job.title.toLowerCase().includes(q) ||
          (comp?.name || '').toLowerCase().includes(q);
        const matchStatus = statusFilter === 'All' || a.status === statusFilter;
        return matchQ && matchStatus;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center" style="padding:40px;">
              <p class="text-muted mb-2">No applications match your filter.</p>
              <a href="jobs.html" class="btn btn-primary btn-sm">Browse Open Roles</a>
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = filtered
        .map((app) => {
          const job = jobsMap[app.jobId];
          const comp = companiesMap[job.companyId] || {};
          return `
            <tr>
              <td>
                <a href="job-details.html?id=${job.id}" style="font-weight:600; color:var(--text);">${CB.format.escapeHTML(job.title)}</a>
                <div class="text-muted" style="font-size:0.78rem;">${CB.format.escapeHTML(job.location)}</div>
              </td>
              <td>
                <a href="company-profile.html?id=${comp.id}" class="flex gap-1" style="align-items:center;">
                  <img src="${comp.logo || 'assets/logos/logo-1.svg'}" alt="" style="width:24px;height:24px;border-radius:6px;">
                  <span>${CB.format.escapeHTML(comp.name || 'Company')}</span>
                </a>
              </td>
              <td>${CB.format.salary(job.salaryMin, job.salaryMax)}</td>
              <td>${CB.format.relativeDate(app.appliedAt)}</td>
              <td><span class="badge ${badgeClass(app.status)}">${CB.format.escapeHTML(app.status)}</span></td>
              <td>
                <div class="flex gap-1">
                  <button type="button" class="btn btn-secondary btn-sm" data-view-app="${app.id}">View</button>
                  ${
                    app.status !== 'Withdrawn' && app.status !== 'Rejected'
                      ? `<button type="button" class="btn btn-ghost btn-sm text-danger" data-withdraw-app="${app.id}">Withdraw</button>`
                      : ''
                  }
                </div>
              </td>
            </tr>
          `;
        })
        .join('');

      tbody.querySelectorAll('[data-view-app]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-view-app');
          const app = apps.find((a) => a.id === id);
          const job = jobsMap[app.jobId];
          const comp = companiesMap[job.companyId];
          CB.modal.open({
            title: `Application: ${job.title}`,
            bodyHTML: `
              <p class="mb-2"><strong>Company:</strong> ${CB.format.escapeHTML(comp?.name || '')}</p>
              <p class="mb-2"><strong>Status:</strong> <span class="badge ${badgeClass(app.status)}">${app.status}</span></p>
              <p class="mb-2"><strong>Submitted:</strong> ${new Date(app.appliedAt).toLocaleString()}</p>
              <div style="background:var(--bg); padding:14px; border-radius:10px; border:1px solid var(--border);">
                <strong style="display:block; margin-bottom:6px;">Your Cover Note</strong>
                <p class="text-secondary" style="font-size:0.9rem;">${CB.format.escapeHTML(app.coverNote)}</p>
              </div>
            `,
            footerHTML: `<a href="job-details.html?id=${job.id}" class="btn btn-primary">View Job Posting</a>`
          });
        });
      });

      tbody.querySelectorAll('[data-withdraw-app]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-withdraw-app');
          CB.modal.confirm({
            title: 'Withdraw Application?',
            message: 'Are you sure you want to withdraw this job application? You can apply again later if the posting remains open.',
            confirmText: 'Withdraw',
            danger: true,
            onConfirm: () => {
              CB.storage.update('applications', (list) =>
                list.map((a) => (a.id === id ? { ...a, status: 'Withdrawn' } : a))
              );
              CB.toast.show('Application status updated to Withdrawn.', 'info', 'Withdrawn');
              render();
            }
          });
        });
      });
    }

    searchEl?.addEventListener('input', render);
    statusEl?.addEventListener('change', render);
    render();
  }

  // --------------------------------------------------------------------------
  // PAGE 7: Companies Directory (companies.html)
  // --------------------------------------------------------------------------
  function initCompaniesPage() {
    const grid = document.getElementById('companiesGrid');
    if (!grid) return;

    const companies = CB.storage.get('companies', []);
    const jobs = CB.storage.get('jobs', []);
    const searchEl = document.getElementById('companySearchInput');
    const industryEl = document.getElementById('companyIndustrySelect');

    if (industryEl) {
      const industries = [...new Set(companies.map((c) => c.industry))].sort();
      industries.forEach((ind) => {
        const opt = document.createElement('option');
        opt.value = ind;
        opt.textContent = ind;
        industryEl.appendChild(opt);
      });
    }

    function render() {
      const q = (searchEl?.value || '').trim().toLowerCase();
      const ind = industryEl?.value || '';

      const filtered = companies.filter((c) => {
        const matchQ = !q || c.name.toLowerCase().includes(q) || c.location.toLowerCase().includes(q) || c.about.toLowerCase().includes(q);
        const matchInd = !ind || c.industry === ind;
        return matchQ && matchInd;
      });

      if (filtered.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><h3>No companies found</h3><p class="text-muted">Try adjusting your search or industry filter.</p></div>`;
        return;
      }

      grid.innerHTML = filtered
        .map((c) => {
          const openCount = jobs.filter((j) => j.companyId === c.id).length;
          return `
            <article class="company-card animate-slide">
              <div class="flex-between">
                <div class="company-logo-box"><img src="${c.logo}" alt="${CB.format.escapeHTML(c.name)} logo"></div>
                <span class="rating-pill"><i class="bi bi-star-fill"></i> ${c.rating} (${c.reviewsCount})</span>
              </div>
              <div>
                <h2 style="font-size:1.1rem; font-weight:600;">${CB.format.escapeHTML(c.name)}</h2>
                <p class="text-muted" style="font-size:0.84rem;">${CB.format.escapeHTML(c.industry)} &bull; ${CB.format.escapeHTML(c.location)}</p>
              </div>
              <p class="text-secondary" style="font-size:0.86rem;">${CB.format.escapeHTML(c.about)}</p>
              <div class="flex-between" style="margin-top:auto; padding-top:12px; border-top:1px solid var(--border);">
                <span class="badge badge-primary">${openCount} Open Jobs</span>
                <a href="company-profile.html?id=${c.id}" class="btn btn-secondary btn-sm">View Profile</a>
              </div>
            </article>
          `;
        })
        .join('');
    }

    searchEl?.addEventListener('input', render);
    industryEl?.addEventListener('change', render);
    render();
  }

  // --------------------------------------------------------------------------
  // PAGE 8: Company Profile (company-profile.html)
  // --------------------------------------------------------------------------
  function initCompanyProfilePage() {
    const root = document.getElementById('companyProfileRoot');
    if (!root) return;

    const companies = CB.storage.get('companies', []);
    const companyId = CB.format.getParam('id') || companies[0]?.id;
    const company = companies.find((c) => c.id === companyId) || companies[0];
    const companyJobs = CB.storage.get('jobs', []).filter((j) => j.companyId === company.id);

    const defaultReviews = [
      { id: 'rev1', companyId: company.id, author: 'Software Engineer', rating: 5, comment: 'Transparent engineering leadership, meaningful ownership, and healthy work-life balance.', date: '2 weeks ago' },
      { id: 'rev2', companyId: company.id, author: 'Product Designer', rating: 4, comment: 'Fast-paced product launches with supportive teammates and great learning stipends.', date: '1 month ago' }
    ];

    function getReviews() {
      const saved = CB.storage.get('cb_reviews', []).filter((r) => r.companyId === company.id);
      return [...saved, ...defaultReviews];
    }

    document.title = `${company.name} | CareerBridge`;

    root.innerHTML = `
      <div class="breadcrumb">
        <a href="index.html">Home</a> <i class="bi bi-chevron-right"></i>
        <a href="companies.html">Companies</a> <i class="bi bi-chevron-right"></i>
        <span>${CB.format.escapeHTML(company.name)}</span>
      </div>

      <div class="company-hero-banner"></div>
      <div class="company-profile-head">
        <div class="company-profile-logo-lg">
          <img src="${company.logo}" alt="${CB.format.escapeHTML(company.name)} logo">
        </div>
        <div class="flex-between flex-wrap gap-2 mt-2">
          <div>
            <h1 style="font-size:1.75rem; font-weight:700;">${CB.format.escapeHTML(company.name)}</h1>
            <p class="text-secondary">${CB.format.escapeHTML(company.industry)} &bull; ${CB.format.escapeHTML(company.location)} &bull; ${CB.format.escapeHTML(company.size)} &bull; Founded ${company.founded}</p>
          </div>
          <div class="flex gap-2" style="align-items:center;">
            <span class="rating-pill" style="font-size:0.92rem; padding:6px 14px;"><i class="bi bi-star-fill"></i> ${company.rating} / 5.0</span>
            <a href="#companyOpenJobs" class="btn btn-primary">${companyJobs.length} Open Jobs</a>
          </div>
        </div>
      </div>

      <div class="jobs-layout" style="grid-template-columns:1.5fr 1fr;">
        <div class="flex" style="flex-direction:column; gap:24px;">
          <section class="card">
            <h2 style="font-size:1.2rem; margin-bottom:10px;">About ${CB.format.escapeHTML(company.name)}</h2>
            <p class="text-secondary">${CB.format.escapeHTML(company.about)}</p>
            <h3 style="font-size:1.05rem; margin:20px 0 8px;">Culture & Values</h3>
            <p class="text-secondary">${CB.format.escapeHTML(company.culture)}</p>
          </section>

          <section class="card" id="companyOpenJobs">
            <h2 style="font-size:1.2rem; margin-bottom:16px;">Open Positions (${companyJobs.length})</h2>
            <div class="grid-2" id="companyJobsGrid">
              ${companyJobs.map((j) => CB.jobsUI.renderJobCard(j)).join('')}
            </div>
          </section>
        </div>

        <aside class="flex" style="flex-direction:column; gap:24px;">
          <section class="card">
            <h3 style="font-size:1.08rem; margin-bottom:12px;">Employee Benefits</h3>
            <ul class="flex" style="flex-direction:column; gap:10px;">
              ${company.benefits.map((b) => `<li class="flex gap-1 text-secondary"><i class="bi bi-check-circle-fill text-accent"></i> <span>${CB.format.escapeHTML(b)}</span></li>`).join('')}
            </ul>
          </section>

          <section class="card">
            <div class="flex-between mb-2">
              <h3 style="font-size:1.08rem;">Employee Reviews</h3>
              <button type="button" class="btn btn-secondary btn-sm" id="addReviewBtn">Write Review</button>
            </div>
            <div id="companyReviewsList" class="flex" style="flex-direction:column; gap:12px;"></div>
          </section>
        </aside>
      </div>
    `;

    CB.jobsUI.bindJobCardActions(document.getElementById('companyJobsGrid'));

    function renderReviews() {
      const list = document.getElementById('companyReviewsList');
      list.innerHTML = getReviews()
        .map(
          (r) => `
            <div style="padding:12px; border-radius:10px; background:var(--bg); border:1px solid var(--border);">
              <div class="flex-between mb-1">
                <strong style="font-size:0.86rem;">${CB.format.escapeHTML(r.author)}</strong>
                <span class="rating-pill"><i class="bi bi-star-fill"></i> ${r.rating}</span>
              </div>
              <p class="text-secondary" style="font-size:0.84rem;">${CB.format.escapeHTML(r.comment)}</p>
              <small class="text-muted">${CB.format.escapeHTML(r.date)}</small>
            </div>
          `
        )
        .join('');
    }
    renderReviews();

    document.getElementById('addReviewBtn')?.addEventListener('click', () => {
      const modal = CB.modal.open({
        title: `Review ${company.name}`,
        bodyHTML: `
          <form id="companyReviewForm">
            <div class="form-group">
              <label class="form-label" for="revRole">Your Role / Title</label>
              <input type="text" id="revRole" class="form-control" placeholder="e.g. Frontend Engineer" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="revRating">Rating</label>
              <select id="revRating" class="form-control">
                <option value="5">5 - Excellent</option>
                <option value="4">4 - Great</option>
                <option value="3">3 - Good</option>
                <option value="2">2 - Fair</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="revComment">Review</label>
              <textarea id="revComment" class="form-control" placeholder="Share your experience..." required></textarea>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Post Review</button>
          </form>
        `
      });
      modal.querySelector('#companyReviewForm').addEventListener('submit', (e) => {
        e.preventDefault();
        CB.storage.update('cb_reviews', (arr) => [
          {
            id: 'rev_' + Date.now(),
            companyId: company.id,
            author: modal.querySelector('#revRole').value.trim(),
            rating: Number(modal.querySelector('#revRating').value),
            comment: modal.querySelector('#revComment').value.trim(),
            date: 'Just now'
          },
          ...arr
        ]);
        CB.modal.close();
        renderReviews();
        CB.toast.show('Thank you for contributing a review!', 'success', 'Review Added');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initJobsPage();
    initJobDetailsPage();
    initSavedJobsPage();
    initApplicationsPage();
    initCompaniesPage();
    initCompanyProfilePage();
  });
})();
