/* ==========================================================================
   CareerBridge - Interactive Resume Builder & Printable Preview
   ========================================================================== */

(() => {
  'use strict';

  const CB = (window.CB = window.CB || {});

  function initResumeBuilder() {
    const root = document.getElementById('resumeBuilderRoot');
    if (!root) return;
    if (!CB.auth.requireAuth()) return;

    let resume = CB.storage.get('resume', CB.seed.getDefaultResume());

    const fields = {
      fullName: document.getElementById('resFullName'),
      title: document.getElementById('resTitle'),
      email: document.getElementById('resEmail'),
      phone: document.getElementById('resPhone'),
      location: document.getElementById('resLocation'),
      website: document.getElementById('resWebsite'),
      summary: document.getElementById('resSummary'),
      accent: document.getElementById('resAccentColor')
    };

    const lists = {
      education: document.getElementById('eduRepeaterList'),
      experience: document.getElementById('expRepeaterList'),
      projects: document.getElementById('projRepeaterList'),
      certificates: document.getElementById('certRepeaterList'),
      languages: document.getElementById('langRepeaterList'),
      achievements: document.getElementById('achRepeaterList'),
      skills: document.getElementById('resSkillsTags')
    };

    const previewEl = document.getElementById('resumePreviewSheet');

    function saveResume() {
      CB.storage.set('resume', resume);
      renderPreview();
    }

    function hydrateInputs() {
      const p = resume.personal || {};
      if (fields.fullName) fields.fullName.value = p.fullName || '';
      if (fields.title) fields.title.value = p.title || '';
      if (fields.email) fields.email.value = p.email || '';
      if (fields.phone) fields.phone.value = p.phone || '';
      if (fields.location) fields.location.value = p.location || '';
      if (fields.website) fields.website.value = p.website || '';
      if (fields.summary) fields.summary.value = p.summary || '';
      if (fields.accent) fields.accent.value = resume.accentColor || '#2563EB';
    }

    function renderRepeaters() {
      // Education
      lists.education.innerHTML = (resume.education || [])
        .map(
          (ed, idx) => `
            <div class="resume-repeater-card">
              <div class="flex-between mb-1">
                <strong>Education #${idx + 1}</strong>
                <button type="button" class="btn btn-ghost btn-sm text-danger" data-del-edu="${idx}"><i class="bi bi-trash"></i></button>
              </div>
              <div class="form-row">
                <input type="text" class="form-control mb-1" placeholder="Degree" value="${CB.format.escapeHTML(ed.degree)}" data-edu="${idx}:degree">
                <input type="text" class="form-control mb-1" placeholder="Institution" value="${CB.format.escapeHTML(ed.institution)}" data-edu="${idx}:institution">
              </div>
              <div class="form-row">
                <input type="text" class="form-control" placeholder="Period (e.g. 2018-2022)" value="${CB.format.escapeHTML(ed.period)}" data-edu="${idx}:period">
                <input type="text" class="form-control" placeholder="GPA / Grade" value="${CB.format.escapeHTML(ed.gpa || '')}" data-edu="${idx}:gpa">
              </div>
            </div>
          `
        )
        .join('');

      // Experience
      lists.experience.innerHTML = (resume.experience || [])
        .map(
          (ex, idx) => `
            <div class="resume-repeater-card">
              <div class="flex-between mb-1">
                <strong>Experience #${idx + 1}</strong>
                <button type="button" class="btn btn-ghost btn-sm text-danger" data-del-exp="${idx}"><i class="bi bi-trash"></i></button>
              </div>
              <div class="form-row">
                <input type="text" class="form-control mb-1" placeholder="Job Title" value="${CB.format.escapeHTML(ex.title)}" data-exp="${idx}:title">
                <input type="text" class="form-control mb-1" placeholder="Company" value="${CB.format.escapeHTML(ex.company)}" data-exp="${idx}:company">
              </div>
              <input type="text" class="form-control mb-1" placeholder="Period (e.g. 2022 - Present)" value="${CB.format.escapeHTML(ex.period)}" data-exp="${idx}:period">
              <textarea class="form-control" rows="2" placeholder="Key accomplishments..." data-exp="${idx}:description">${CB.format.escapeHTML(ex.description)}</textarea>
            </div>
          `
        )
        .join('');

      // Projects
      lists.projects.innerHTML = (resume.projects || [])
        .map(
          (pr, idx) => `
            <div class="resume-repeater-card">
              <div class="flex-between mb-1">
                <strong>Project #${idx + 1}</strong>
                <button type="button" class="btn btn-ghost btn-sm text-danger" data-del-proj="${idx}"><i class="bi bi-trash"></i></button>
              </div>
              <div class="form-row">
                <input type="text" class="form-control mb-1" placeholder="Project Name" value="${CB.format.escapeHTML(pr.name)}" data-proj="${idx}:name">
                <input type="text" class="form-control mb-1" placeholder="Tech Stack" value="${CB.format.escapeHTML(pr.tech)}" data-proj="${idx}:tech">
              </div>
              <textarea class="form-control" rows="2" placeholder="Project impact..." data-proj="${idx}:description">${CB.format.escapeHTML(pr.description)}</textarea>
            </div>
          `
        )
        .join('');

      // Certificates
      lists.certificates.innerHTML = (resume.certificates || [])
        .map(
          (cert, idx) => `
            <div class="resume-repeater-card">
              <div class="flex-between mb-1">
                <strong>Certificate #${idx + 1}</strong>
                <button type="button" class="btn btn-ghost btn-sm text-danger" data-del-cert="${idx}"><i class="bi bi-trash"></i></button>
              </div>
              <div class="form-row">
                <input type="text" class="form-control" placeholder="Certificate Name" value="${CB.format.escapeHTML(cert.name)}" data-cert="${idx}:name">
                <input type="text" class="form-control" placeholder="Issuer & Year" value="${CB.format.escapeHTML(cert.issuer)}" data-cert="${idx}:issuer">
              </div>
            </div>
          `
        )
        .join('');

      // Languages
      lists.languages.innerHTML = (resume.languages || [])
        .map(
          (lang, idx) => `
            <div class="flex gap-1 mb-1">
              <input type="text" class="form-control" placeholder="Language" value="${CB.format.escapeHTML(lang.name)}" data-lang="${idx}:name">
              <input type="text" class="form-control" placeholder="Proficiency" value="${CB.format.escapeHTML(lang.level)}" data-lang="${idx}:level">
              <button type="button" class="btn btn-ghost btn-sm text-danger" data-del-lang="${idx}"><i class="bi bi-trash"></i></button>
            </div>
          `
        )
        .join('');

      // Achievements
      lists.achievements.innerHTML = (resume.achievements || [])
        .map(
          (ach, idx) => `
            <div class="flex gap-1 mb-1">
              <input type="text" class="form-control" placeholder="Achievement" value="${CB.format.escapeHTML(ach)}" data-ach="${idx}">
              <button type="button" class="btn btn-ghost btn-sm text-danger" data-del-ach="${idx}"><i class="bi bi-trash"></i></button>
            </div>
          `
        )
        .join('');

      // Skills tags
      lists.skills.innerHTML = (resume.skills || [])
        .map(
          (sk, idx) => `
            <span class="tag-pill-remove">
              ${CB.format.escapeHTML(sk)}
              <button type="button" data-del-skill="${idx}" aria-label="Remove ${CB.format.escapeHTML(sk)}"><i class="bi bi-x"></i></button>
            </span>
          `
        )
        .join('');

      bindRepeaterEvents();
    }

    function bindRepeaterEvents() {
      root.querySelectorAll('[data-edu]').forEach((el) => {
        el.addEventListener('input', () => {
          const [i, k] = el.getAttribute('data-edu').split(':');
          resume.education[Number(i)][k] = el.value;
          saveResume();
        });
      });
      root.querySelectorAll('[data-del-edu]').forEach((btn) =>
        btn.addEventListener('click', () => {
          resume.education.splice(Number(btn.getAttribute('data-del-edu')), 1);
          renderRepeaters();
          saveResume();
        })
      );

      root.querySelectorAll('[data-exp]').forEach((el) => {
        el.addEventListener('input', () => {
          const [i, k] = el.getAttribute('data-exp').split(':');
          resume.experience[Number(i)][k] = el.value;
          saveResume();
        });
      });
      root.querySelectorAll('[data-del-exp]').forEach((btn) =>
        btn.addEventListener('click', () => {
          resume.experience.splice(Number(btn.getAttribute('data-del-exp')), 1);
          renderRepeaters();
          saveResume();
        })
      );

      root.querySelectorAll('[data-proj]').forEach((el) => {
        el.addEventListener('input', () => {
          const [i, k] = el.getAttribute('data-proj').split(':');
          resume.projects[Number(i)][k] = el.value;
          saveResume();
        });
      });
      root.querySelectorAll('[data-del-proj]').forEach((btn) =>
        btn.addEventListener('click', () => {
          resume.projects.splice(Number(btn.getAttribute('data-del-proj')), 1);
          renderRepeaters();
          saveResume();
        })
      );

      root.querySelectorAll('[data-cert]').forEach((el) => {
        el.addEventListener('input', () => {
          const [i, k] = el.getAttribute('data-cert').split(':');
          resume.certificates[Number(i)][k] = el.value;
          saveResume();
        });
      });
      root.querySelectorAll('[data-del-cert]').forEach((btn) =>
        btn.addEventListener('click', () => {
          resume.certificates.splice(Number(btn.getAttribute('data-del-cert')), 1);
          renderRepeaters();
          saveResume();
        })
      );

      root.querySelectorAll('[data-lang]').forEach((el) => {
        el.addEventListener('input', () => {
          const [i, k] = el.getAttribute('data-lang').split(':');
          resume.languages[Number(i)][k] = el.value;
          saveResume();
        });
      });
      root.querySelectorAll('[data-del-lang]').forEach((btn) =>
        btn.addEventListener('click', () => {
          resume.languages.splice(Number(btn.getAttribute('data-del-lang')), 1);
          renderRepeaters();
          saveResume();
        })
      );

      root.querySelectorAll('[data-ach]').forEach((el) => {
        el.addEventListener('input', () => {
          resume.achievements[Number(el.getAttribute('data-ach'))] = el.value;
          saveResume();
        });
      });
      root.querySelectorAll('[data-del-ach]').forEach((btn) =>
        btn.addEventListener('click', () => {
          resume.achievements.splice(Number(btn.getAttribute('data-del-ach')), 1);
          renderRepeaters();
          saveResume();
        })
      );

      root.querySelectorAll('[data-del-skill]').forEach((btn) =>
        btn.addEventListener('click', () => {
          resume.skills.splice(Number(btn.getAttribute('data-del-skill')), 1);
          renderRepeaters();
          saveResume();
        })
      );
    }

    function buildResumeHTML() {
      const p = resume.personal || {};
      const accent = resume.accentColor || '#2563EB';
      return `
        <div style="--resume-accent:${CB.format.escapeHTML(accent)};">
          <div class="resume-sheet-header">
            <h2>${CB.format.escapeHTML(p.fullName || 'Your Name')}</h2>
            <div style="color:${CB.format.escapeHTML(accent)}; font-weight:600; font-size:1rem;">${CB.format.escapeHTML(p.title || 'Job Title')}</div>
            <div style="font-size:0.8rem; color:#475569; margin-top:6px; display:flex; flex-wrap:wrap; gap:10px;">
              ${p.email ? `<span><i class="bi bi-envelope"></i> ${CB.format.escapeHTML(p.email)}</span>` : ''}
              ${p.phone ? `<span><i class="bi bi-telephone"></i> ${CB.format.escapeHTML(p.phone)}</span>` : ''}
              ${p.location ? `<span><i class="bi bi-geo-alt"></i> ${CB.format.escapeHTML(p.location)}</span>` : ''}
              ${p.website ? `<span><i class="bi bi-globe"></i> ${CB.format.escapeHTML(p.website)}</span>` : ''}
            </div>
          </div>

          ${
            p.summary
              ? `<div class="resume-sheet-section"><h3>Professional Summary</h3><p style="color:#334155;">${CB.format.escapeHTML(p.summary)}</p></div>`
              : ''
          }

          ${
            resume.experience?.length
              ? `
              <div class="resume-sheet-section">
                <h3>Experience</h3>
                ${resume.experience
                  .map(
                    (ex) => `
                    <div class="resume-entry">
                      <div class="resume-entry-top">
                        <span>${CB.format.escapeHTML(ex.title)} &mdash; ${CB.format.escapeHTML(ex.company)}</span>
                        <span style="color:#64748B; font-weight:500;">${CB.format.escapeHTML(ex.period)}</span>
                      </div>
                      <p style="color:#334155;">${CB.format.escapeHTML(ex.description)}</p>
                    </div>`
                  )
                  .join('')}
              </div>`
              : ''
          }

          ${
            resume.projects?.length
              ? `
              <div class="resume-sheet-section">
                <h3>Projects</h3>
                ${resume.projects
                  .map(
                    (pr) => `
                    <div class="resume-entry">
                      <div class="resume-entry-top">
                        <span>${CB.format.escapeHTML(pr.name)}</span>
                        <span style="color:#64748B; font-weight:500;">${CB.format.escapeHTML(pr.tech)}</span>
                      </div>
                      <p style="color:#334155;">${CB.format.escapeHTML(pr.description)}</p>
                    </div>`
                  )
                  .join('')}
              </div>`
              : ''
          }

          ${
            resume.education?.length
              ? `
              <div class="resume-sheet-section">
                <h3>Education</h3>
                ${resume.education
                  .map(
                    (ed) => `
                    <div class="resume-entry">
                      <div class="resume-entry-top">
                        <span>${CB.format.escapeHTML(ed.degree)} &bull; ${CB.format.escapeHTML(ed.institution)}</span>
                        <span style="color:#64748B; font-weight:500;">${CB.format.escapeHTML(ed.period)}</span>
                      </div>
                      ${ed.gpa ? `<div style="color:#475569;">GPA: ${CB.format.escapeHTML(ed.gpa)}</div>` : ''}
                    </div>`
                  )
                  .join('')}
              </div>`
              : ''
          }

          ${
            resume.skills?.length
              ? `
              <div class="resume-sheet-section">
                <h3>Skills</h3>
                <p style="color:#334155;">${resume.skills.map((s) => CB.format.escapeHTML(s)).join(' &bull; ')}</p>
              </div>`
              : ''
          }

          ${
            resume.certificates?.length
              ? `
              <div class="resume-sheet-section">
                <h3>Certifications</h3>
                ${resume.certificates.map((c) => `<div style="color:#334155;"><strong>${CB.format.escapeHTML(c.name)}</strong> &mdash; ${CB.format.escapeHTML(c.issuer)} ${c.year ? `(${CB.format.escapeHTML(c.year)})` : ''}</div>`).join('')}
              </div>`
              : ''
          }

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            ${
              resume.languages?.length
                ? `
                <div class="resume-sheet-section">
                  <h3>Languages</h3>
                  ${resume.languages.map((l) => `<div style="color:#334155;">${CB.format.escapeHTML(l.name)} (${CB.format.escapeHTML(l.level)})</div>`).join('')}
                </div>`
                : ''
            }
            ${
              resume.achievements?.length
                ? `
                <div class="resume-sheet-section">
                  <h3>Achievements</h3>
                  <ul style="padding-left:16px; list-style:disc; color:#334155;">
                    ${resume.achievements.map((a) => `<li>${CB.format.escapeHTML(a)}</li>`).join('')}
                  </ul>
                </div>`
                : ''
            }
          </div>
        </div>
      `;
    }

    function renderPreview() {
      if (previewEl) previewEl.innerHTML = buildResumeHTML();
    }

    // Bind Personal Fields
    Object.entries(fields).forEach(([key, el]) => {
      if (!el) return;
      el.addEventListener('input', () => {
        if (key === 'accent') {
          resume.accentColor = el.value;
        } else {
          resume.personal = resume.personal || {};
          resume.personal[key] = el.value;
        }
        saveResume();
      });
    });

    // Add Item Buttons
    document.getElementById('addEduBtn')?.addEventListener('click', () => {
      resume.education.push({ degree: '', institution: '', period: '', gpa: '' });
      renderRepeaters();
      saveResume();
    });
    document.getElementById('addExpBtn')?.addEventListener('click', () => {
      resume.experience.push({ title: '', company: '', period: '', description: '' });
      renderRepeaters();
      saveResume();
    });
    document.getElementById('addProjBtn')?.addEventListener('click', () => {
      resume.projects.push({ name: '', tech: '', description: '' });
      renderRepeaters();
      saveResume();
    });
    document.getElementById('addCertBtn')?.addEventListener('click', () => {
      resume.certificates.push({ name: '', issuer: '', year: '' });
      renderRepeaters();
      saveResume();
    });
    document.getElementById('addLangBtn')?.addEventListener('click', () => {
      resume.languages.push({ name: '', level: '' });
      renderRepeaters();
      saveResume();
    });
    document.getElementById('addAchBtn')?.addEventListener('click', () => {
      resume.achievements.push('');
      renderRepeaters();
      saveResume();
    });

    const newSkillInput = document.getElementById('newResumeSkillInput');
    document.getElementById('addResumeSkillBtn')?.addEventListener('click', () => {
      const val = (newSkillInput?.value || '').trim();
      if (!val) return;
      if (!resume.skills.includes(val)) resume.skills.push(val);
      newSkillInput.value = '';
      renderRepeaters();
      saveResume();
    });

    document.getElementById('generatePreviewBtn')?.addEventListener('click', () => {
      CB.modal.open({
        title: 'Resume Preview',
        large: true,
        bodyHTML: `<div class="resume-sheet">${buildResumeHTML()}</div>`,
        footerHTML: `<button type="button" class="btn btn-primary" onclick="window.print()"><i class="bi bi-printer"></i> Print / Save as PDF</button>`
      });
    });

    document.getElementById('printResumeBtn')?.addEventListener('click', () => {
      window.print();
    });

    document.getElementById('resetSampleResumeBtn')?.addEventListener('click', () => {
      resume = CB.seed.getDefaultResume();
      hydrateInputs();
      renderRepeaters();
      saveResume();
      CB.toast.show('Sample resume template loaded.', 'info', 'Resume Reset');
    });

    hydrateInputs();
    renderRepeaters();
    renderPreview();
  }

  document.addEventListener('DOMContentLoaded', initResumeBuilder);
})();
