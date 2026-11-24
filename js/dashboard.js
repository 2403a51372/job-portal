/* ==========================================================================
   CareerBridge - Candidate Dashboard Controller (Protected)
   ========================================================================== */

(() => {
  'use strict';

  const CB = (window.CB = window.CB || {});

  function calculateProfileCompletion(user, resume) {
    const checks = [
      { label: 'Full Name & Email', done: Boolean(user.fullName && user.email) },
      { label: 'Professional Headline & Bio', done: Boolean(user.headline && user.bio && user.bio.length > 20) },
      { label: 'Location & Phone', done: Boolean(user.location && user.phone) },
      { label: 'Skills (3+ added)', done: Array.isArray(user.skills) && user.skills.length >= 3 },
      { label: 'Education Details', done: Array.isArray(user.education) && user.education.length > 0 },
      { label: 'Work Experience', done: Array.isArray(user.experience) && user.experience.length > 0 },
      { label: 'Resume Builder Completed', done: Boolean(resume?.personal?.summary && resume?.experience?.length > 0) }
    ];
    const doneCount = checks.filter((c) => c.done).length;
    const percent = Math.round((doneCount / checks.length) * 100);
    return { percent, checks };
  }

  function initDashboard() {
    const root = document.getElementById('dashboardRoot');
    if (!root) return;
    if (!CB.auth.requireAuth()) return;

    const user = CB.auth.getCurrentUser();
    const jobs = CB.storage.get('jobs', []);
    const companies = Object.fromEntries(CB.storage.get('companies', []).map((c) => [c.id, c]));
    const apps = CB.storage.get('applications', []).filter((a) => a.userId === user.id);
    const saved = CB.storage.get('savedJobs', []).filter((s) => s.userId === user.id);
    const notifications = CB.storage.get('notifications', []);
    const unreadNotifs = notifications.filter((n) => !n.read);
    const resume = CB.storage.get('resume', {});

    const interviewsCount = apps.filter((a) => a.status === 'Interview').length;
    const { percent, checks } = calculateProfileCompletion(user, resume);

    // Greeting
    const greetingEl = document.getElementById('dashGreeting');
    if (greetingEl) greetingEl.textContent = `Welcome back, ${user.fullName.split(' ')[0]}!`;

    // KPI Cards
    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    setText('kpiAppliedCount', apps.length);
    setText('kpiSavedCount', saved.length);
    setText('kpiInterviewCount', interviewsCount);
    setText('kpiNotifCount', unreadNotifs.length);

    // Profile Completion Donut & Checklist
    const donut = document.getElementById('profileDonutRing');
    const donutPct = document.getElementById('profileDonutPercent');
    const checklistEl = document.getElementById('profileChecklist');
    if (donut && donutPct) {
      const deg = Math.round((percent / 100) * 360);
      donut.style.background = `conic-gradient(var(--primary) 0deg, var(--accent) ${deg}deg, var(--bg-alt) ${deg}deg)`;
      donutPct.textContent = `${percent}%`;
    }
    if (checklistEl) {
      checklistEl.innerHTML = checks
        .map(
          (c) => `
            <div class="flex-between" style="font-size:0.84rem; padding:6px 0;">
              <span class="flex gap-1" style="align-items:center;">
                <i class="bi ${c.done ? 'bi-check-circle-fill text-success' : 'bi-circle text-muted'}"></i>
                ${CB.format.escapeHTML(c.label)}
              </span>
              <span class="badge ${c.done ? 'badge-success' : 'badge-neutral'}">${c.done ? 'Done' : 'Pending'}</span>
            </div>
          `
        )
        .join('');
    }

    // CSS-Only Weekly Activity Bar Chart
    const barChart = document.getElementById('weeklyActivityChart');
    if (barChart) {
      const days = [
        { label: 'Mon', val: 38 },
        { label: 'Tue', val: 65 },
        { label: 'Wed', val: 52 },
        { label: 'Thu', val: 88 },
        { label: 'Fri', val: 74 },
        { label: 'Sat', val: 45 },
        { label: 'Sun', val: 60 }
      ];
      barChart.innerHTML = days
        .map(
          (d) => `
            <div class="css-bar-col">
              <div class="css-bar-track" title="${d.val}% activity score">
                <div class="css-bar-fill" style="height:${d.val}%;"></div>
              </div>
              <span class="css-bar-label">${d.label}</span>
            </div>
          `
        )
        .join('');
    }

    // CSS-Only Application Pipeline Breakdown Bars
    const pipelineEl = document.getElementById('pipelineBreakdown');
    if (pipelineEl) {
      const total = Math.max(1, apps.length);
      const statuses = [
        { label: 'Applied', count: apps.filter((a) => a.status === 'Applied').length, color: 'var(--primary)' },
        { label: 'Interview', count: apps.filter((a) => a.status === 'Interview').length, color: 'var(--secondary)' },
        { label: 'Accepted', count: apps.filter((a) => a.status === 'Accepted').length, color: 'var(--success)' },
        { label: 'Rejected / Withdrawn', count: apps.filter((a) => a.status === 'Rejected' || a.status === 'Withdrawn').length, color: 'var(--text-muted)' }
      ];
      pipelineEl.innerHTML = statuses
        .map((s) => {
          const w = Math.round((s.count / total) * 100);
          return `
            <div class="mb-2">
              <div class="flex-between" style="font-size:0.84rem; margin-bottom:5px;">
                <span>${s.label}</span>
                <strong>${s.count} (${w}%)</strong>
              </div>
              <div class="progress-track">
                <div class="progress-fill" style="width:${w}%; background:${s.color};"></div>
              </div>
            </div>
          `;
        })
        .join('');
    }

    // Recent Activity Feed
    const activityEl = document.getElementById('recentActivityFeed');
    if (activityEl) {
      const feed = [
        ...apps.slice(0, 3).map((a) => {
          const j = jobs.find((x) => x.id === a.jobId);
          const comp = companies[j?.companyId];
          return {
            title: `Applied to ${j?.title || 'Role'} at ${comp?.name || 'Company'}`,
            meta: `Status: ${a.status} • ${CB.format.relativeDate(a.appliedAt)}`
          };
        }),
        ...notifications.slice(0, 2).map((n) => ({
          title: n.title,
          meta: CB.format.relativeDate(n.createdAt)
        }))
      ].slice(0, 5);

      activityEl.innerHTML = feed.length
        ? feed
            .map(
              (item) => `
                <div class="activity-item">
                  <span class="activity-dot"></span>
                  <div>
                    <strong style="display:block; font-size:0.88rem;">${CB.format.escapeHTML(item.title)}</strong>
                    <small class="text-muted">${CB.format.escapeHTML(item.meta)}</small>
                  </div>
                </div>
              `
            )
            .join('')
        : `<p class="text-muted">No recent activity yet. Start exploring jobs!</p>`;
    }

    // Recommended Jobs
    const recGrid = document.getElementById('dashRecommendedJobs');
    if (recGrid && CB.jobsUI) {
      recGrid.innerHTML = jobs.slice(0, 2).map((j) => CB.jobsUI.renderJobCard(j)).join('');
      CB.jobsUI.bindJobCardActions(recGrid);
    }
  }

  document.addEventListener('DOMContentLoaded', initDashboard);
})();
