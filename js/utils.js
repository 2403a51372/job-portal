/* ==========================================================================
   CareerBridge - Utilities, LocalStorage CRUD & Sample Database Seeder
   ========================================================================== */

(() => {
  'use strict';

  const CB = (window.CB = window.CB || {});

  // --------------------------------------------------------------------------
  // LocalStorage CRUD Helper
  // --------------------------------------------------------------------------
  CB.storage = {
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem(key);
        return raw !== null ? JSON.parse(raw) : fallback;
      } catch (err) {
        console.error(`Storage read error [${key}]:`, err);
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (err) {
        console.error(`Storage write error [${key}]:`, err);
        return false;
      }
    },
    remove(key) {
      localStorage.removeItem(key);
    },
    update(key, updaterFn, fallback = []) {
      const current = this.get(key, fallback);
      const next = updaterFn(current);
      this.set(key, next);
      return next;
    }
  };

  // --------------------------------------------------------------------------
  // Formatting & Security Helpers
  // --------------------------------------------------------------------------
  CB.format = {
    escapeHTML(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },
    salary(min, max, currency = '$') {
      const fmt = (n) => `${currency}${Math.round(n / 1000)}k`;
      if (min && max) return `${fmt(min)} - ${fmt(max)}`;
      if (min) return `From ${fmt(min)}`;
      return 'Competitive';
    },
    relativeDate(isoDate) {
      const diffMs = Date.now() - new Date(isoDate).getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 60) return `${Math.max(1, mins)}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      if (days === 1) return '1 day ago';
      if (days < 30) return `${days} days ago`;
      return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },
    getParam(name) {
      return new URLSearchParams(window.location.search).get(name);
    },
    initials(name = 'User') {
      return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() || '')
        .join('') || 'U';
    }
  };

  // --------------------------------------------------------------------------
  // Form Validators
  // --------------------------------------------------------------------------
  CB.validators = {
    email(val) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(val).trim());
    },
    passwordStrength(val) {
      const pwd = String(val || '');
      let score = 0;
      if (pwd.length >= 8) score += 1;
      if (/[A-Z]/.test(pwd)) score += 1;
      if (/[0-9]/.test(pwd)) score += 1;
      if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
      const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Excellent'];
      const colors = ['#EF4444', '#F97316', '#F59E0B', '#0EA5E9', '#10B981'];
      return {
        score,
        percent: (score / 4) * 100,
        label: labels[score],
        color: colors[score],
        valid: pwd.length >= 8 && /[A-Za-z]/.test(pwd) && /[0-9]/.test(pwd)
      };
    },
    required(val) {
      return String(val || '').trim().length > 0;
    },
    phone(val) {
      if (!val) return true;
      return /^[+\d\s()-]{7,20}$/.test(String(val).trim());
    },
    url(val) {
      if (!val) return true;
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    }
  };

  // --------------------------------------------------------------------------
  // Toast Notification Manager
  // --------------------------------------------------------------------------
  CB.toast = {
    ensureContainer() {
      let el = document.getElementById('cbToastContainer');
      if (!el) {
        el = document.createElement('div');
        el.id = 'cbToastContainer';
        el.className = 'toast-container';
        el.setAttribute('aria-live', 'polite');
        document.body.appendChild(el);
      }
      return el;
    },
    show(message, type = 'info', title = '') {
      const container = this.ensureContainer();
      const icons = {
        success: 'bi-check-circle-fill',
        error: 'bi-x-circle-fill',
        warning: 'bi-exclamation-triangle-fill',
        info: 'bi-info-circle-fill'
      };
      const titles = {
        success: 'Success',
        error: 'Error',
        warning: 'Notice',
        info: 'Info'
      };
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.innerHTML = `
        <i class="bi ${icons[type] || icons.info} toast-icon"></i>
        <div class="toast-content">
          <div class="toast-title">${CB.format.escapeHTML(title || titles[type] || 'Notification')}</div>
          <div>${CB.format.escapeHTML(message)}</div>
        </div>
        <button type="button" class="toast-close" aria-label="Close notification">
          <i class="bi bi-x-lg"></i>
        </button>
      `;
      const remove = () => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(8px)';
        setTimeout(() => toast.remove(), 200);
      };
      toast.querySelector('.toast-close').addEventListener('click', remove);
      container.appendChild(toast);
      setTimeout(remove, 4200);
    }
  };

  // --------------------------------------------------------------------------
  // Reusable Modal Popup Manager
  // --------------------------------------------------------------------------
  CB.modal = {
    open({ title, bodyHTML, footerHTML = '', large = false, onMount = null }) {
      this.close();
      const backdrop = document.createElement('div');
      backdrop.id = 'cbActiveModal';
      backdrop.className = 'modal-backdrop open';
      backdrop.setAttribute('role', 'dialog');
      backdrop.setAttribute('aria-modal', 'true');
      backdrop.innerHTML = `
        <div class="modal-dialog ${large ? 'modal-lg' : ''}">
          <div class="modal-header">
            <h3>${CB.format.escapeHTML(title)}</h3>
            <button type="button" class="modal-close" aria-label="Close modal">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-body">${bodyHTML}</div>
          ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
        </div>
      `;
      const closeBtn = backdrop.querySelector('.modal-close');
      closeBtn.addEventListener('click', () => this.close());
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.close();
      });
      document.body.appendChild(backdrop);
      if (typeof onMount === 'function') onMount(backdrop);
      return backdrop;
    },
    close() {
      const existing = document.getElementById('cbActiveModal');
      if (existing) existing.remove();
    },
    confirm({ title, message, confirmText = 'Confirm', danger = false, onConfirm }) {
      const modal = this.open({
        title,
        bodyHTML: `<p class="text-secondary">${CB.format.escapeHTML(message)}</p>`,
        footerHTML: `
          <button type="button" class="btn btn-secondary" data-modal-cancel>Cancel</button>
          <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-modal-confirm>${CB.format.escapeHTML(confirmText)}</button>
        `
      });
      modal.querySelector('[data-modal-cancel]').addEventListener('click', () => this.close());
      modal.querySelector('[data-modal-confirm]').addEventListener('click', () => {
        this.close();
        if (typeof onConfirm === 'function') onConfirm();
      });
    }
  };

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') CB.modal.close();
  });

  // --------------------------------------------------------------------------
  // Ripple Effect Delegation
  // --------------------------------------------------------------------------
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if (!btn) return;
    const circle = document.createElement('span');
    const diameter = Math.max(btn.clientWidth, btn.clientHeight);
    const radius = diameter / 2;
    const rect = btn.getBoundingClientRect();
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - rect.left - radius}px`;
    circle.style.top = `${e.clientY - rect.top - radius}px`;
    circle.classList.add('ripple-effect');
    const prev = btn.querySelector('.ripple-effect');
    if (prev) prev.remove();
    btn.appendChild(circle);
    setTimeout(() => circle.remove(), 600);
  });

  // --------------------------------------------------------------------------
  // Seed Database (15 Companies, 30 Jobs, 15 Categories, 5 Testimonials, 10 Notifications)
  // --------------------------------------------------------------------------
  const daysAgoISO = (d) => new Date(Date.now() - d * 86400000).toISOString();

  const SAMPLE_COMPANIES = [
    { id: 'c1', name: 'NovaTech Systems', industry: 'Cloud & SaaS', location: 'San Francisco, CA', size: '1,200+ employees', founded: 2016, rating: 4.8, reviewsCount: 342, logo: 'assets/logos/logo-1.svg', website: 'https://novatech.example.com', about: 'NovaTech Systems builds developer-first observability and distributed cloud infrastructure powering modern engineering teams worldwide.', culture: 'High-autonomy squads, async-first collaboration, quarterly innovation hackathons, and transparent engineering ladders.', benefits: ['Remote-first stipend', 'Comprehensive health & dental', '$3,000 annual learning budget', 'Equity & 401(k) match'] },
    { id: 'c2', name: 'PulseHealth AI', industry: 'HealthTech', location: 'Boston, MA', size: '500+ employees', founded: 2019, rating: 4.7, reviewsCount: 198, logo: 'assets/logos/logo-2.svg', website: 'https://pulsehealth.example.com', about: 'PulseHealth AI accelerates clinical diagnostics with HIPAA-compliant multimodal machine learning pipelines.', culture: 'Mission-driven clinicians and engineers working side by side to improve patient outcomes.', benefits: ['Zero-deductible healthcare', 'Flexible hybrid hours', 'Parental leave 20 weeks', 'Wellness allowance'] },
    { id: 'c3', name: 'FinFlow Global', industry: 'FinTech', location: 'New York, NY', size: '2,500+ employees', founded: 2014, rating: 4.6, reviewsCount: 510, logo: 'assets/logos/logo-3.svg', website: 'https://finflow.example.com', about: 'FinFlow Global powers real-time cross-border treasury, payment orchestration, and automated compliance.', culture: 'Data-informed decision making, blameless postmortems, and mentorship across global hubs.', benefits: ['Performance bonus', 'Stock options', 'Commuter & meal credits', 'Sabbatical every 4 years'] },
    { id: 'c4', name: 'Aether Robotics', industry: 'Robotics & AI', location: 'Austin, TX', size: '420+ employees', founded: 2020, rating: 4.9, reviewsCount: 124, logo: 'assets/logos/logo-4.svg', website: 'https://aetherrobotics.example.com', about: 'Aether builds autonomous warehouse navigation software and fleet intelligence for next-gen logistics.', culture: 'Hands-on hardware/software labs, open curiosity, and rapid prototyping.', benefits: ['On-site lab access', 'Relocation assistance', 'Full health coverage', 'Patent bonuses'] },
    { id: 'c5', name: 'BrightLearn Studio', industry: 'EdTech', location: 'Seattle, WA', size: '310+ employees', founded: 2018, rating: 4.5, reviewsCount: 165, logo: 'assets/logos/logo-5.svg', website: 'https://brightlearn.example.com', about: 'BrightLearn Studio creates interactive STEM learning environments used by 8M+ learners across 40 countries.', culture: 'Inclusive, empathetic, and focused on lifelong learning with 4-day summer Fridays.', benefits: ['Unlimited PTO', 'Home office grant', 'Education reimbursement', '401(k) match'] },
    { id: 'c6', name: 'Verdant Energy', industry: 'CleanTech', location: 'Denver, CO', size: '800+ employees', founded: 2017, rating: 4.7, reviewsCount: 214, logo: 'assets/logos/logo-6.svg', website: 'https://verdantenergy.example.com', about: 'Verdant Energy optimizes smart grid storage and renewable microgrids using predictive telemetry.', culture: 'Sustainability at our core with collaborative field & cloud engineering teams.', benefits: ['EV charging & transit pass', 'Climate impact days', 'Comprehensive medical', 'Annual profit share'] },
    { id: 'c7', name: 'ShieldGuard Cyber', industry: 'Cybersecurity', location: 'Reston, VA', size: '950+ employees', founded: 2015, rating: 4.6, reviewsCount: 289, logo: 'assets/logos/logo-7.svg', website: 'https://shieldguard.example.com', about: 'ShieldGuard Cyber delivers zero-trust identity protection and automated threat hunting for Fortune 500 enterprises.', culture: 'Security excellence, continuous red-team learning, and strong work-life boundaries.', benefits: ['Certs & conference budget', '100% remote option', 'Top-tier medical', 'Equity grants'] },
    { id: 'c8', name: 'CartCraft Commerce', industry: 'E-Commerce', location: 'Chicago, IL', size: '1,600+ employees', founded: 2013, rating: 4.4, reviewsCount: 405, logo: 'assets/logos/logo-8.svg', website: 'https://cartcraft.example.com', about: 'CartCraft empowers independent retail brands with headless storefronts, fulfillment APIs, and conversion analytics.', culture: 'Customer-obsessed builders who ship weekly and celebrate merchant milestones.', benefits: ['Merchant discount perks', 'Hybrid flexibility', 'Mental health support', 'Paid volunteer leave'] },
    { id: 'c9', name: 'PixelForge Design', industry: 'Design & Media', location: 'Los Angeles, CA', size: '220+ employees', founded: 2021, rating: 4.8, reviewsCount: 92, logo: 'assets/logos/logo-9.svg', website: 'https://pixelforge.example.com', about: 'PixelForge builds real-time collaborative prototyping and 3D web motion tools for product teams.', culture: 'Craft-obsessed designers and creative technologists who value polish and speed.', benefits: ['Latest MacBook & display', 'Creative studio stipend', 'Flexible PTO', 'Health & vision'] },
    { id: 'c10', name: 'OrbitLogistics', industry: 'Supply Chain', location: 'Atlanta, GA', size: '1,100+ employees', founded: 2016, rating: 4.3, reviewsCount: 176, logo: 'assets/logos/logo-10.svg', website: 'https://orbitlogistics.example.com', about: 'OrbitLogistics digitizes freight visibility, route optimization, and customs automation worldwide.', culture: 'Practical problem solving, transparent OKRs, and rapid career mobility.', benefits: ['401(k) 5% match', 'Hybrid workweek', 'Health savings account', 'Annual bonus'] },
    { id: 'c11', name: 'QuantumData Labs', industry: 'Data & Analytics', location: 'San Jose, CA', size: '640+ employees', founded: 2018, rating: 4.7, reviewsCount: 230, logo: 'assets/logos/logo-11.svg', website: 'https://quantumdata.example.com', about: 'QuantumData Labs provides streaming lakehouse engines and real-time BI dashboards at petabyte scale.', culture: 'Deep technical rigor paired with approachable mentorship and open-source contributions.', benefits: ['Open-source Fridays', 'RSU refreshers', 'Catered lunches', 'Family healthcare'] },
    { id: 'c12', name: 'Skyline PropTech', industry: 'Real Estate Tech', location: 'Miami, FL', size: '380+ employees', founded: 2020, rating: 4.5, reviewsCount: 118, logo: 'assets/logos/logo-12.svg', website: 'https://skylineproptech.example.com', about: 'Skyline modernizes commercial leasing, digital twins, and smart building energy analytics.', culture: 'Fast-moving, entrepreneurial teams with high ownership from day one.', benefits: ['Housing & wellness perk', 'Remote flexibility', 'Competitive equity', 'Paid Sabbatical'] },
    { id: 'c13', name: 'VoxStream Media', industry: 'Streaming & Audio', location: 'London, UK', size: '700+ employees', founded: 2015, rating: 4.6, reviewsCount: 267, logo: 'assets/logos/logo-13.svg', website: 'https://voxstream.example.com', about: 'VoxStream delivers ultra-low-latency audio and live creator broadcasting across mobile and connected TVs.', culture: 'Vibrant creative energy, global collaboration, and inclusive engineering pods.', benefits: ['28 days holiday', 'Audio gear allowance', 'Private healthcare', 'Hybrid London/Remote'] },
    { id: 'c14', name: 'BioSynth Genomics', industry: 'Biotech', location: 'San Diego, CA', size: '480+ employees', founded: 2017, rating: 4.8, reviewsCount: 141, logo: 'assets/logos/logo-14.svg', website: 'https://biosynth.example.com', about: 'BioSynth combines computational biology and lab automation to accelerate personalized therapeutics.', culture: 'Respectful scientific rigor, cross-disciplinary pairing, and long-term impact.', benefits: ['Comprehensive insurance', 'Research publication bonuses', 'Flexible schedules', '401(k) match'] },
    { id: 'c15', name: 'NexaCloud Solutions', industry: 'Enterprise IT', location: 'Toronto, Canada', size: '1,900+ employees', founded: 2012, rating: 4.5, reviewsCount: 388, logo: 'assets/logos/logo-15.svg', website: 'https://nexacloud.example.com', about: 'NexaCloud helps global enterprises modernize legacy platforms onto resilient Kubernetes and serverless architectures.', culture: 'Continuous certification support, diverse global teams, and structured growth paths.', benefits: ['Cloud cert bonuses', 'Remote-friendly', 'Extended health & dental', 'Stock purchase plan'] }
  ];

  const SAMPLE_CATEGORIES = [
    { id: 'cat1', name: 'Software Engineering', icon: 'bi-code-slash', openCount: 420 },
    { id: 'cat2', name: 'Product Design & UX', icon: 'bi-palette', openCount: 185 },
    { id: 'cat3', name: 'Data Science & AI', icon: 'bi-cpu', openCount: 260 },
    { id: 'cat4', name: 'Cloud & DevOps', icon: 'bi-cloud-check', openCount: 195 },
    { id: 'cat5', name: 'Cybersecurity', icon: 'bi-shield-lock', openCount: 140 },
    { id: 'cat6', name: 'Product Management', icon: 'bi-kanban', openCount: 155 },
    { id: 'cat7', name: 'Digital Marketing', icon: 'bi-megaphone', openCount: 210 },
    { id: 'cat8', name: 'Finance & FinTech', icon: 'bi-graph-up-arrow', openCount: 130 },
    { id: 'cat9', name: 'Mobile Development', icon: 'bi-phone', openCount: 165 },
    { id: 'cat10', name: 'QA & Automation', icon: 'bi-bug', openCount: 112 },
    { id: 'cat11', name: 'Customer Success', icon: 'bi-headset', openCount: 174 },
    { id: 'cat12', name: 'HR & People Ops', icon: 'bi-people', openCount: 98 },
    { id: 'cat13', name: 'Sales & Partnerships', icon: 'bi-briefcase', openCount: 230 },
    { id: 'cat14', name: 'Content & Technical Writing', icon: 'bi-pen', openCount: 84 },
    { id: 'cat15', name: 'Operations & Supply Chain', icon: 'bi-truck', openCount: 119 }
  ];

  const SAMPLE_JOBS = [
    { id: 'j1', title: 'Senior Frontend Engineer', companyId: 'c1', category: 'Software Engineering', location: 'San Francisco, CA', remote: true, type: 'Full-Time', experience: 'Senior (5+ yrs)', salaryMin: 145000, salaryMax: 185000, skills: ['JavaScript', 'TypeScript', 'CSS3', 'Web Performance', 'Accessibility'], postedAt: daysAgoISO(1), description: 'Lead the architecture of NovaTech’s real-time telemetry dashboards and design system components used by thousands of SREs daily.', responsibilities: ['Architect modular UI components with zero-lag rendering', 'Partner with product designers to elevate UX consistency', 'Mentor mid-level engineers via thorough code reviews', 'Drive accessibility (WCAG AA) and Core Web Vitals optimization'], requirements: ['5+ years building complex production web apps', 'Deep mastery of modern ES6+, HTML5, CSS3, and state management', 'Strong eye for responsive design and micro-interactions'], benefits: ['Full remote flexibility', 'Equity package', '$3,000 learning stipend', 'Comprehensive medical & dental'] },
    { id: 'j2', title: 'Product Designer (Design Systems)', companyId: 'c9', category: 'Product Design & UX', location: 'Los Angeles, CA', remote: true, type: 'Full-Time', experience: 'Mid-Level (2-5 yrs)', salaryMin: 120000, salaryMax: 155000, skills: ['Figma', 'Design Systems', 'Prototyping', 'UI/UX', 'User Research'], postedAt: daysAgoISO(2), description: 'Shape the visual language and multi-platform component tokens across PixelForge’s creative suite.', responsibilities: ['Maintain scalable Figma component libraries and tokens', 'Conduct usability sessions with designers and developers', 'Collaborate with frontend engineers on motion specs'], requirements: ['3+ years in product or systems design', 'Portfolio demonstrating clean, accessible interfaces', 'Fluency in Figma variables and auto-layout'], benefits: ['Top-spec Apple hardware', 'Unlimited PTO', 'Creative studio stipend'] },
    { id: 'j3', title: 'Machine Learning Engineer', companyId: 'c2', category: 'Data Science & AI', location: 'Boston, MA', remote: false, type: 'Full-Time', experience: 'Senior (5+ yrs)', salaryMin: 160000, salaryMax: 205000, skills: ['Python', 'PyTorch', 'NLP', 'MLOps', 'SQL'], postedAt: daysAgoISO(1), description: 'Build and deploy clinical natural language models that summarize patient intake notes accurately and safely.', responsibilities: ['Train, evaluate, and quantize transformer models', 'Build reproducible evaluation harnesses with clinicians', 'Optimize inference latency on GPU clusters'], requirements: ['4+ years production ML experience', 'Strong Python and PyTorch fundamentals', 'Experience with healthcare or regulated data pipelines'], benefits: ['Zero-deductible medical', '20 weeks parental leave', 'Annual bonus'] },
    { id: 'j4', title: 'Cloud Infrastructure Architect', companyId: 'c15', category: 'Cloud & DevOps', location: 'Toronto, Canada', remote: true, type: 'Full-Time', experience: 'Lead / Principal', salaryMin: 165000, salaryMax: 210000, skills: ['AWS', 'Kubernetes', 'Terraform', 'Docker', 'CI/CD'], postedAt: daysAgoISO(3), description: 'Design multi-region cloud foundations and automated GitOps platforms for enterprise clients.', responsibilities: ['Author reusable Terraform modules and security guardrails', 'Lead Kubernetes cluster federation and disaster recovery drills', 'Advise CTOs on FinOps and cloud migration roadmaps'], requirements: ['7+ years in cloud engineering or SRE', 'Production Kubernetes & Terraform expertise', 'Strong communication with enterprise stakeholders'], benefits: ['Certification bonuses', 'Remote-first culture', 'Stock purchase plan'] },
    { id: 'j5', title: 'Security Operations Analyst', companyId: 'c7', category: 'Cybersecurity', location: 'Reston, VA', remote: true, type: 'Full-Time', experience: 'Mid-Level (2-5 yrs)', salaryMin: 110000, salaryMax: 140000, skills: ['SIEM', 'Incident Response', 'Threat Hunting', 'Python', 'Zero Trust'], postedAt: daysAgoISO(2), description: 'Monitor, triage, and neutralize sophisticated identity threats across global enterprise tenants.', responsibilities: ['Investigate SIEM alerts and craft custom detection rules', 'Automate enrichment playbooks in Python', 'Collaborate on post-incident hardening reports'], requirements: ['2+ years in SOC or incident response', 'Familiarity with MITRE ATT&CK framework', 'Scripting ability in Python or PowerShell'], benefits: ['Paid security certifications', '100% remote option', 'Full healthcare'] },
    { id: 'j6', title: 'Full Stack JavaScript Developer', companyId: 'c8', category: 'Software Engineering', location: 'Chicago, IL', remote: true, type: 'Full-Time', experience: 'Mid-Level (2-5 yrs)', salaryMin: 115000, salaryMax: 148000, skills: ['JavaScript', 'Node.js', 'PostgreSQL', 'REST APIs', 'HTML5'], postedAt: daysAgoISO(4), description: 'Build merchant analytics dashboards and high-throughput checkout microservices for CartCraft.', responsibilities: ['Develop clean frontend views and RESTful APIs', 'Optimize PostgreSQL queries for high-volume stores', 'Write automated unit and integration tests'], requirements: ['3+ years full-stack JS experience', 'Solid SQL and API security fundamentals', 'Pragmatic product mindset'], benefits: ['Merchant perks', 'Hybrid or remote work', 'Mental health support'] },
    { id: 'j7', title: 'Technical Product Manager', companyId: 'c3', category: 'Product Management', location: 'New York, NY', remote: false, type: 'Full-Time', experience: 'Senior (5+ yrs)', salaryMin: 150000, salaryMax: 190000, skills: ['Product Strategy', 'FinTech', 'APIs', 'SQL', 'Agile'], postedAt: daysAgoISO(3), description: 'Own FinFlow’s instant settlement API roadmap and partner with banking networks across 25 currencies.', responsibilities: ['Define quarterly product specs and success KPIs', 'Run customer discovery with enterprise treasurers', 'Coordinate compliance, risk, and engineering launches'], requirements: ['5+ years in B2B SaaS or FinTech PM roles', 'Fluency with API documentation and data analysis'], benefits: ['Performance bonus', 'Stock options', 'Commuter credits'] },
    { id: 'j8', title: 'Data Analytics Engineer', companyId: 'c11', category: 'Data Science & AI', location: 'San Jose, CA', remote: true, type: 'Full-Time', experience: 'Mid-Level (2-5 yrs)', salaryMin: 125000, salaryMax: 158000, skills: ['SQL', 'dbt', 'Python', 'Snowflake', 'Data Modeling'], postedAt: daysAgoISO(5), description: 'Transform raw event streams into trustworthy self-serve datasets for product and revenue teams.', responsibilities: ['Design dimensional models in dbt and Snowflake', 'Implement automated data quality assertions', 'Partner with stakeholders on executive metrics'], requirements: ['3+ years analytics engineering', 'Expert SQL and Git workflows'], benefits: ['Open-source Fridays', 'RSU grants', 'Family medical'] },
    { id: 'j9', title: 'Junior UI/UX Engineer', companyId: 'c5', category: 'Product Design & UX', location: 'Seattle, WA', remote: true, type: 'Full-Time', experience: 'Entry Level (0-2 yrs)', salaryMin: 78000, salaryMax: 96000, skills: ['HTML5', 'CSS3', 'JavaScript', 'Figma', 'Accessibility'], postedAt: daysAgoISO(1), description: 'Craft joyful, accessible interactive learning games and student dashboards at BrightLearn Studio.', responsibilities: ['Translate Figma prototypes into responsive HTML/CSS/JS', 'Build keyboard-accessible UI widgets', 'Test across mobile tablets and desktop browsers'], requirements: ['1+ year or strong portfolio of frontend UI work', 'Passion for accessible education technology'], benefits: ['Unlimited PTO', 'Home office stipend', 'Mentorship program'] },
    { id: 'j10', title: 'Growth Marketing Manager', companyId: 'c8', category: 'Digital Marketing', location: 'Chicago, IL', remote: true, type: 'Full-Time', experience: 'Mid-Level (2-5 yrs)', salaryMin: 95000, salaryMax: 125000, skills: ['SEO', 'Performance Marketing', 'Analytics', 'Copywriting', 'A/B Testing'], postedAt: daysAgoISO(6), description: 'Scale merchant acquisition across paid search, lifecycle email, and conversion rate optimization.', responsibilities: ['Own multi-channel CAC and ROAS targets', 'Design landing page experiments and funnel tests', 'Collaborate with content creators on launch campaigns'], requirements: ['3+ years B2B SaaS growth marketing', 'Proficiency with GA4 and attribution modeling'], benefits: ['Hybrid flexibility', 'Annual bonus', 'Wellness stipend'] },
    { id: 'j11', title: 'Robotics Software Engineer', companyId: 'c4', category: 'Software Engineering', location: 'Austin, TX', remote: false, type: 'Full-Time', experience: 'Mid-Level (2-5 yrs)', salaryMin: 135000, salaryMax: 170000, skills: ['C++', 'Python', 'ROS2', 'Linux', 'Algorithms'], postedAt: daysAgoISO(4), description: 'Develop motion planning and real-time sensor fusion modules for autonomous warehouse robots.', responsibilities: ['Write low-latency C++ navigation nodes', 'Simulate fleet scenarios before live lab deployment', 'Debug edge telemetry issues'], requirements: ['3+ years C++/Python robotics experience', 'Hands-on ROS2 and Linux systems skills'], benefits: ['On-site robotics lab', 'Relocation bonus', 'Patent awards'] },
    { id: 'j12', title: 'iOS Mobile Engineer', companyId: 'c13', category: 'Mobile Development', location: 'London, UK', remote: true, type: 'Full-Time', experience: 'Senior (5+ yrs)', salaryMin: 120000, salaryMax: 152000, skills: ['Swift', 'SwiftUI', 'AVFoundation', 'REST APIs', 'Testing'], postedAt: daysAgoISO(2), description: 'Deliver studio-grade low-latency live audio streaming experiences to millions of VoxStream listeners.', responsibilities: ['Architect SwiftUI player views and offline caching', 'Reduce startup time and battery consumption', 'Lead App Store release quality'], requirements: ['4+ years native iOS development', 'Deep knowledge of Swift concurrency and audio APIs'], benefits: ['28 days vacation', 'Audio gear budget', 'Hybrid remote'] },
    { id: 'j13', title: 'QA Automation Engineer', companyId: 'c1', category: 'QA & Automation', location: 'San Francisco, CA', remote: true, type: 'Full-Time', experience: 'Mid-Level (2-5 yrs)', salaryMin: 105000, salaryMax: 135000, skills: ['Playwright', 'JavaScript', 'CI/CD', 'API Testing', 'Performance'], postedAt: daysAgoISO(7), description: 'Build resilient end-to-end browser and API test suites that keep NovaTech releases rock solid.', responsibilities: ['Author Playwright end-to-end tests in CI pipelines', 'Identify flaky test root causes and performance regressions', 'Champion quality metrics across feature squads'], requirements: ['2+ years test automation in JS/TS', 'Experience with GitHub Actions or similar CI'], benefits: ['Remote-first', 'Learning budget', '401(k) match'] },
    { id: 'j14', title: 'Smart Grid Energy Analyst', companyId: 'c6', category: 'Finance & FinTech', location: 'Denver, CO', remote: false, type: 'Full-Time', experience: 'Mid-Level (2-5 yrs)', salaryMin: 98000, salaryMax: 128000, skills: ['Python', 'Financial Modeling', 'SQL', 'Energy Markets', 'Excel'], postedAt: daysAgoISO(5), description: 'Model renewable battery dispatch economics and forecast regional grid pricing.', responsibilities: ['Build dispatch optimization models in Python', 'Present market forecasts to utility partners', 'Track regulatory incentives'], requirements: ['3+ years quantitative energy or finance analysis', 'Strong SQL and Python'], benefits: ['EV charging', 'Impact days', 'Profit sharing'] },
    { id: 'j15', title: 'Customer Success Lead', companyId: 'c5', category: 'Customer Success', location: 'Seattle, WA', remote: true, type: 'Full-Time', experience: 'Mid-Level (2-5 yrs)', salaryMin: 85000, salaryMax: 110000, skills: ['Account Management', 'Onboarding', 'SaaS', 'CRM', 'Communication'], postedAt: daysAgoISO(8), description: 'Guide school districts and enterprise training teams from onboarding to 98%+ annual renewal.', responsibilities: ['Lead quarterly business reviews with key accounts', 'Build scalable onboarding playbooks', 'Surface customer feedback to product squads'], requirements: ['3+ years B2B SaaS customer success', 'Empathetic communicator and data-oriented planner'], benefits: ['Unlimited PTO', 'Home office grant', '401(k) match'] },
    { id: 'j16', title: 'DevOps & Site Reliability Engineer', companyId: 'c3', category: 'Cloud & DevOps', location: 'New York, NY', remote: true, type: 'Full-Time', experience: 'Senior (5+ yrs)', salaryMin: 150000, salaryMax: 188000, skills: ['Kubernetes', 'Go', 'Terraform', 'Prometheus', 'AWS'], postedAt: daysAgoISO(3), description: 'Maintain 99.995% uptime for high-volume global financial settlement services.', responsibilities: ['Automate observability, SLO alerting, and chaos testing', 'Eliminate manual operational toil with Go tooling', 'Participate in balanced on-call rotation'], requirements: ['5+ years SRE or platform engineering', 'Strong Linux, networking, and Kubernetes skills'], benefits: ['Bonus & equity', 'Health & wellness', 'Sabbatical program'] },
    { id: 'j17', title: 'UX Researcher', companyId: 'c9', category: 'Product Design & UX', location: 'Los Angeles, CA', remote: true, type: 'Contract', experience: 'Mid-Level (2-5 yrs)', salaryMin: 95000, salaryMax: 120000, skills: ['User Interviews', 'Usability Testing', 'Survey Design', 'Synthesis', 'Figma'], postedAt: daysAgoISO(9), description: 'Partner with design leads to validate next-generation collaborative canvas workflows.', responsibilities: ['Plan and moderate generative and evaluative studies', 'Synthesize actionable insights into product priorities', 'Maintain research repository'], requirements: ['3+ years mixed-methods UX research', 'Strong storytelling and stakeholder alignment'], benefits: ['Flexible schedule', 'Remote contract renewal option'] },
    { id: 'j18', title: 'Technical Writer (Developer Docs)', companyId: 'c11', category: 'Content & Technical Writing', location: 'San Jose, CA', remote: true, type: 'Full-Time', experience: 'Mid-Level (2-5 yrs)', salaryMin: 92000, salaryMax: 118000, skills: ['Technical Writing', 'Markdown', 'OpenAPI', 'SQL', 'Git'], postedAt: daysAgoISO(6), description: 'Author crisp guides, API references, and interactive tutorials for QuantumData developers.', responsibilities: ['Write and maintain REST & SQL reference documentation', 'Test code samples directly against staging APIs', 'Partner with Developer Relations on launch blogs'], requirements: ['2+ years documenting developer APIs or cloud tools', 'Comfortable with Git and docs-as-code workflows'], benefits: ['Remote flexibility', 'Learning budget', 'Full benefits'] },
    { id: 'j19', title: 'Supply Chain Data Specialist', companyId: 'c10', category: 'Operations & Supply Chain', location: 'Atlanta, GA', remote: false, type: 'Full-Time', experience: 'Entry Level (0-2 yrs)', salaryMin: 72000, salaryMax: 90000, skills: ['SQL', 'Tableau', 'Logistics', 'Excel', 'Forecasting'], postedAt: daysAgoISO(10), description: 'Analyze carrier transit bottlenecks and surface cost-saving routing insights for OrbitLogistics.', responsibilities: ['Build weekly carrier SLA dashboards', 'Audit freight billing anomalies', 'Support operations managers with ad-hoc queries'], requirements: ['1+ year supply chain or data operations', 'Strong Excel and SQL fundamentals'], benefits: ['401(k) match', 'Hybrid schedule', 'Annual bonus'] },
    { id: 'j20', title: 'People Operations Partner', companyId: 'c12', category: 'HR & People Ops', location: 'Miami, FL', remote: false, type: 'Full-Time', experience: 'Mid-Level (2-5 yrs)', salaryMin: 82000, salaryMax: 105000, skills: ['HRIS', 'Talent Onboarding', 'Employee Relations', 'Compliance', 'Culture'], postedAt: daysAgoISO(7), description: 'Scale Skyline PropTech’s talent onboarding, performance cycles, and inclusive workplace programs.', responsibilities: ['Manage end-to-end onboarding and engagement surveys', 'Coach managers on performance reviews and growth plans', 'Ensure multi-state HR compliance'], requirements: ['3+ years People Ops in fast-growing tech companies'], benefits: ['Wellness perk', 'Hybrid work', 'Equity package'] },
    { id: 'j21', title: 'Enterprise Account Executive', companyId: 'c7', category: 'Sales & Partnerships', location: 'New York, NY', remote: true, type: 'Full-Time', experience: 'Senior (5+ yrs)', salaryMin: 140000, salaryMax: 210000, skills: ['Enterprise Sales', 'Cybersecurity', 'Negotiation', 'MEDDPICC', 'SaaS'], postedAt: daysAgoISO(4), description: 'Lead strategic cybersecurity deals with CISO buyers across the Northeast territory.', responsibilities: ['Manage full-cycle enterprise sales from discovery to close', 'Partner with Solutions Architects on technical POCs', 'Exceed quarterly ARR quotas'], requirements: ['5+ years enterprise B2B SaaS closing experience'], benefits: ['Uncapped commission', 'Equity', 'Remote flexibility'] },
    { id: 'j22', title: 'Bioinformatics Software Engineer', companyId: 'c14', category: 'Data Science & AI', location: 'San Diego, CA', remote: false, type: 'Full-Time', experience: 'Senior (5+ yrs)', salaryMin: 145000, salaryMax: 182000, skills: ['Python', 'Nextflow', 'Genomics', 'AWS', 'Docker'], postedAt: daysAgoISO(5), description: 'Build scalable genomic sequence pipelines powering BioSynth’s therapeutic discovery platform.', responsibilities: ['Optimize Nextflow workflows on AWS Batch', 'Collaborate with wet-lab scientists on QC dashboards', 'Ensure reproducible, versioned pipeline runs'], requirements: ['4+ years bioinformatics or scientific computing'], benefits: ['Publication bonuses', 'Flexible hours', 'Full health'] },
    { id: 'j23', title: 'Frontend Engineering Intern', companyId: 'c1', category: 'Software Engineering', location: 'San Francisco, CA', remote: true, type: 'Internship', experience: 'Entry Level (0-2 yrs)', salaryMin: 55000, salaryMax: 68000, skills: ['HTML5', 'CSS3', 'JavaScript', 'Git', 'Responsive Design'], postedAt: daysAgoISO(2), description: 'Join NovaTech’s UI platform team for a 12-week paid internship shipping real customer-facing features.', responsibilities: ['Implement accessible UI components with mentor guidance', 'Write unit tests and participate in sprint demos'], requirements: ['Pursuing BS/MS in CS or equivalent portfolio projects', 'Solid HTML, CSS, and JavaScript foundation'], benefits: ['Paid mentorship', 'Return offer track', 'Remote equipment kit'] },
    { id: 'j24', title: 'Android Kotlin Developer', companyId: 'c13', category: 'Mobile Development', location: 'London, UK', remote: true, type: 'Full-Time', experience: 'Mid-Level (2-5 yrs)', salaryMin: 108000, salaryMax: 138000, skills: ['Kotlin', 'Jetpack Compose', 'Coroutines', 'REST APIs', 'ExoPlayer'], postedAt: daysAgoISO(6), description: 'Build sleek Jetpack Compose experiences for VoxStream’s Android mobile and Auto apps.', responsibilities: ['Develop modular Kotlin features with clean architecture', 'Optimize media playback stability across devices'], requirements: ['3+ years Android development with Kotlin'], benefits: ['28 days holiday', 'Hybrid remote', 'Audio gear stipend'] },
    { id: 'j25', title: 'FinTech Compliance & Risk Analyst', companyId: 'c3', category: 'Finance & FinTech', location: 'New York, NY', remote: false, type: 'Full-Time', experience: 'Mid-Level (2-5 yrs)', salaryMin: 102000, salaryMax: 130000, skills: ['AML/KYC', 'Risk Modeling', 'SQL', 'Regulatory Compliance', 'Payments'], postedAt: daysAgoISO(11), description: 'Safeguard global payment rails by refining automated fraud and AML monitoring rules.', responsibilities: ['Review escalated transaction alerts', 'Calibrate risk thresholds using SQL analysis'], requirements: ['2+ years FinTech risk or compliance experience'], benefits: ['Annual bonus', '401(k)', 'Commuter credits'] },
    { id: 'j26', title: 'Solutions Architect', companyId: 'c15', category: 'Cloud & DevOps', location: 'Toronto, Canada', remote: true, type: 'Full-Time', experience: 'Senior (5+ yrs)', salaryMin: 140000, salaryMax: 175000, skills: ['Azure', 'AWS', 'Microservices', 'Security', 'Architecture'], postedAt: daysAgoISO(8), description: 'Partner with enterprise customers to blueprint resilient multi-cloud transformations.', responsibilities: ['Lead technical architecture workshops', 'Draft reference architectures and migration estimates'], requirements: ['5+ years cloud architecture or pre-sales engineering'], benefits: ['Cert bonuses', 'Remote friendly', 'Stock plan'] },
    { id: 'j27', title: 'Part-Time Social Media Strategist', companyId: 'c5', category: 'Digital Marketing', location: 'Seattle, WA', remote: true, type: 'Part-Time', experience: 'Entry Level (0-2 yrs)', salaryMin: 48000, salaryMax: 62000, skills: ['Social Media', 'Content Creation', 'Community', 'Analytics', 'Canva'], postedAt: daysAgoISO(4), description: 'Grow BrightLearn’s educator and student communities across LinkedIn, YouTube, and TikTok.', responsibilities: ['Plan weekly editorial calendars and short-form clips', 'Track engagement metrics and community feedback'], requirements: ['1+ year social media management', 'Strong visual storytelling'], benefits: ['Flexible 25 hrs/week', '100% remote'] },
    { id: 'j28', title: 'Backend Python Engineer', companyId: 'c6', category: 'Software Engineering', location: 'Denver, CO', remote: true, type: 'Full-Time', experience: 'Mid-Level (2-5 yrs)', salaryMin: 122000, salaryMax: 154000, skills: ['Python', 'FastAPI', 'PostgreSQL', 'Redis', 'Docker'], postedAt: daysAgoISO(3), description: 'Build high-throughput IoT ingestion APIs connecting thousands of solar and battery inverters.', responsibilities: ['Design clean async Python services with FastAPI', 'Scale time-series telemetry storage'], requirements: ['3+ years backend Python engineering'], benefits: ['Climate impact leave', 'Remote flexibility', 'Profit share'] },
    { id: 'j29', title: 'Lead Product Manager (PropTech)', companyId: 'c12', category: 'Product Management', location: 'Miami, FL', remote: false, type: 'Full-Time', experience: 'Lead / Principal', salaryMin: 155000, salaryMax: 195000, skills: ['Product Vision', 'B2B SaaS', 'Roadmapping', 'UX Strategy', 'Data'], postedAt: daysAgoISO(5), description: 'Lead Skyline’s flagship smart-building analytics suite from Series B expansion to market leadership.', responsibilities: ['Own multi-product strategy and executive roadmap', 'Mentor a team of 3 product managers'], requirements: ['6+ years SaaS product leadership'], benefits: ['Competitive equity', 'Housing perk', 'Sabbatical'] },
    { id: 'j30', title: 'Hardware-in-the-Loop QA Engineer', companyId: 'c4', category: 'QA & Automation', location: 'Austin, TX', remote: false, type: 'Contract', experience: 'Mid-Level (2-5 yrs)', salaryMin: 100000, salaryMax: 128000, skills: ['Python', 'Automated Testing', 'Linux', 'Robotics', 'CI/CD'], postedAt: daysAgoISO(9), description: 'Validate autonomous robot firmware releases on automated physical test rigs.', responsibilities: ['Maintain hardware-in-the-loop regression benches', 'Automate telemetry pass/fail reports'], requirements: ['2+ years embedded or robotics QA'], benefits: ['On-site lab', 'Competitive hourly/annualized rate'] }
  ];

  const SAMPLE_TESTIMONIALS = [
    { id: 't1', name: 'Priya Nair', role: 'Senior Frontend Engineer at NovaTech', quote: 'CareerBridge matched me with three remote engineering roles in my first week. The built-in resume builder and status tracker made the entire search effortless.', rating: 5 },
    { id: 't2', name: 'Marcus Vance', role: 'Product Designer at PixelForge', quote: 'Cleanest job portal UI I have ever used. Being able to explore company culture, salary transparency, and apply in under a minute saved me hours.', rating: 5 },
    { id: 't3', name: 'Elena Rostova', role: 'ML Engineer at PulseHealth AI', quote: 'The skills filter and real-time job alerts helped me discover PulseHealth before the role was even trending elsewhere. Landed my dream offer in 18 days!', rating: 5 },
    { id: 't4', name: 'Daniel Okafor', role: 'Cloud Architect at NexaCloud', quote: 'Having my resume preview, saved jobs, and interview notifications inside one unified dashboard kept me organized through four concurrent interview loops.', rating: 5 },
    { id: 't5', name: 'Hannah Kim', role: 'Technical PM at FinFlow Global', quote: 'Transparent salary bands and verified company reviews gave me confidence going into every negotiation. Highly recommend CareerBridge.', rating: 5 }
  ];

  const SAMPLE_NOTIFICATIONS = [
    { id: 'n1', type: 'interview', title: 'Interview Scheduled with NovaTech Systems', message: 'Your technical screen for Senior Frontend Engineer is confirmed for Thursday at 11:00 AM.', createdAt: daysAgoISO(0), read: false, link: 'applications.html' },
    { id: 'n2', type: 'job_alert', title: '5 New Remote JavaScript Jobs Match Your Profile', message: 'Fresh roles from PixelForge Design, CartCraft Commerce, and NovaTech Systems just went live.', createdAt: daysAgoISO(0), read: false, link: 'jobs.html?q=JavaScript&remote=true' },
    { id: 'n3', type: 'message', title: 'Message from Talent Team at PulseHealth AI', message: 'Hi Alex! We reviewed your portfolio and would love to chat about our UI & ML tooling team.', createdAt: daysAgoISO(1), read: false, link: 'applications.html' },
    { id: 'n4', type: 'job_alert', title: 'Salary Benchmark Updated for Frontend Engineers', message: 'Senior Frontend roles in your target locations now average $155k - $185k.', createdAt: daysAgoISO(2), read: true, link: 'jobs.html' },
    { id: 'n5', type: 'interview', title: 'Application Viewed by PixelForge Design', message: 'The hiring manager at PixelForge Design opened your resume for Product Designer.', createdAt: daysAgoISO(3), read: false, link: 'applications.html' },
    { id: 'n6', type: 'message', title: 'Resume Score Reached 92%', message: 'Great job! Adding measurable metrics to your experience boosted your profile match rate.', createdAt: daysAgoISO(4), read: true, link: 'resume-builder.html' },
    { id: 'n7', type: 'job_alert', title: 'Saved Job Closing Soon: Full Stack JS Developer', message: 'CartCraft Commerce is wrapping up first-round interviews this Friday.', createdAt: daysAgoISO(5), read: true, link: 'saved-jobs.html' },
    { id: 'n8', type: 'message', title: 'Weekly Career Digest Ready', message: '14 companies viewed your profile this week. Keep your skills up to date.', createdAt: daysAgoISO(6), read: true, link: 'dashboard.html' },
    { id: 'n9', type: 'interview', title: 'Prep Checklist for Technical Interviews', message: 'Review system design & accessibility topics before your upcoming NovaTech call.', createdAt: daysAgoISO(7), read: true, link: 'dashboard.html' },
    { id: 'n10', type: 'job_alert', title: 'Welcome to CareerBridge Smart Portal', message: 'Complete your profile and build your printable resume to stand out to top employers.', createdAt: daysAgoISO(10), read: true, link: 'profile.html' }
  ];

  const DEFAULT_USER = {
    id: 'u_demo',
    fullName: 'Alex Rivera',
    email: 'alex@careerbridge.io',
    password: 'Password@123',
    phone: '+1 (415) 890-4312',
    headline: 'Senior Frontend & UI/UX Engineer',
    location: 'San Francisco, CA',
    bio: 'Product-focused frontend engineer with 6+ years crafting accessible, high-performance web applications, design systems, and interactive dashboards.',
    avatar: 'assets/images/avatar-default.svg',
    skills: ['JavaScript (ES6+)', 'HTML5 & CSS3', 'TypeScript', 'UI/UX Design', 'Accessibility (WCAG)', 'Design Systems', 'REST APIs'],
    education: [
      { degree: 'B.S. in Computer Science', school: 'University of California, Davis', year: '2016 - 2020' }
    ],
    experience: [
      { role: 'Senior UI Engineer', company: 'CloudScale Studio', period: '2023 - Present', summary: 'Led redesign of enterprise analytics suite, improving Lighthouse score from 74 to 98.' },
      { role: 'Frontend Developer', company: 'WebPulse Interactive', period: '2020 - 2023', summary: 'Built reusable component library and interactive client portals in vanilla JS and CSS.' }
    ],
    social: {
      linkedin: 'https://linkedin.com/in/alexrivera-dev',
      github: 'https://github.com/alexrivera-dev',
      portfolio: 'https://alexrivera.dev'
    },
    createdAt: daysAgoISO(30)
  };

  const DEFAULT_RESUME = {
    accentColor: '#2563EB',
    personal: {
      fullName: 'Alex Rivera',
      title: 'Senior Frontend & UI/UX Engineer',
      email: 'alex@careerbridge.io',
      phone: '+1 (415) 890-4312',
      location: 'San Francisco, CA',
      website: 'https://alexrivera.dev',
      summary: 'Results-driven Frontend & UI/UX Engineer with 6+ years of experience designing and engineering responsive web applications, scalable design systems, and data-rich dashboards.'
    },
    education: [
      { degree: 'B.S. in Computer Science', institution: 'University of California, Davis', period: '2016 - 2020', gpa: '3.85 / 4.0' }
    ],
    experience: [
      { title: 'Senior UI Engineer', company: 'CloudScale Studio', period: '2023 - Present', description: 'Architected modular design system across 4 web products; reduced bundle size by 38% and improved WCAG AA compliance.' },
      { title: 'Frontend Developer', company: 'WebPulse Interactive', period: '2020 - 2023', description: 'Developed responsive SaaS dashboards and interactive visualization tools serving 120k+ monthly active users.' }
    ],
    projects: [
      { name: 'CareerBridge Design System', tech: 'HTML5, CSS3 Variables, Vanilla ES6', link: 'https://github.com/alexrivera-dev', description: 'Zero-dependency accessible UI token & component toolkit supporting instant dark/light theming.' }
    ],
    skills: ['JavaScript (ES6+)', 'HTML5', 'CSS3', 'Design Systems', 'WCAG Accessibility', 'Web Performance', 'Figma', 'Git'],
    certificates: [
      { name: 'Google UX Design Professional Certificate', issuer: 'Coursera / Google', year: '2023' },
      { name: 'AWS Certified Cloud Practitioner', issuer: 'Amazon Web Services', year: '2024' }
    ],
    languages: [
      { name: 'English', level: 'Native' },
      { name: 'Spanish', level: 'Professional' }
    ],
    achievements: [
      'Winner of CloudScale Annual Innovation Hackathon (2024)',
      'Speaker at Bay Area Web Accessibility Meetup (2025)'
    ]
  };

  const DEFAULT_SETTINGS = {
    theme: 'light',
    language: 'en',
    privacy: {
      profileVisible: true,
      showEmailToRecruiters: false,
      jobAlertEmails: true,
      recruiterMessages: true,
      twoFactorHint: true
    }
  };

  CB.seed = {
    init() {
      if (!CB.storage.get('companies')) CB.storage.set('companies', SAMPLE_COMPANIES);
      if (!CB.storage.get('jobs')) CB.storage.set('jobs', SAMPLE_JOBS);
      if (!CB.storage.get('cb_categories')) CB.storage.set('cb_categories', SAMPLE_CATEGORIES);
      if (!CB.storage.get('cb_testimonials')) CB.storage.set('cb_testimonials', SAMPLE_TESTIMONIALS);

      const users = CB.storage.get('users');
      if (!users || !Array.isArray(users) || users.length === 0) {
        CB.storage.set('users', [DEFAULT_USER]);
      }

      if (!CB.storage.get('notifications')) {
        CB.storage.set('notifications', SAMPLE_NOTIFICATIONS);
      }

      if (!CB.storage.get('savedJobs')) {
        CB.storage.set('savedJobs', [
          { jobId: 'j1', userId: 'u_demo', savedAt: daysAgoISO(1) },
          { jobId: 'j2', userId: 'u_demo', savedAt: daysAgoISO(2) },
          { jobId: 'j6', userId: 'u_demo', savedAt: daysAgoISO(4) }
        ]);
      }

      if (!CB.storage.get('applications')) {
        CB.storage.set('applications', [
          { id: 'app1', jobId: 'j1', userId: 'u_demo', status: 'Interview', appliedAt: daysAgoISO(5), coverNote: 'Excited to bring 6+ years of UI architecture and WCAG accessibility experience to NovaTech.' },
          { id: 'app2', jobId: 'j2', userId: 'u_demo', status: 'Applied', appliedAt: daysAgoISO(3), coverNote: 'Design systems specialist passionate about Figma tokens and crisp motion.' },
          { id: 'app3', jobId: 'j9', userId: 'u_demo', status: 'Accepted', appliedAt: daysAgoISO(12), coverNote: 'Passionate about inclusive EdTech web interfaces.' },
          { id: 'app4', jobId: 'j13', userId: 'u_demo', status: 'Rejected', appliedAt: daysAgoISO(18), coverNote: 'Playwright automation and CI/CD experience.' }
        ]);
      }

      if (!CB.storage.get('resume')) {
        CB.storage.set('resume', DEFAULT_RESUME);
      }

      if (!CB.storage.get('settings')) {
        CB.storage.set('settings', DEFAULT_SETTINGS);
      }
    },
    getDefaultResume() {
      return JSON.parse(JSON.stringify(DEFAULT_RESUME));
    }
  };

  CB.seed.init();
})();
