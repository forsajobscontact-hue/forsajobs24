(function () {
  const state = window.__forsaJobsLoader || (window.__forsaJobsLoader = { loaded: false });
  if (state.loaded) return;
  state.loaded = true;

  const LANGS = ['ar', 'fr', 'en'];

  function ensureGlobals() {
    if (!window.dict) window.dict = {};
    if (!window.jobDetails) window.jobDetails = {};
    if (!window.currentLang) window.currentLang = 'ar';
    if (!window.dict.applyBtn) {
      window.dict.applyBtn = { ar: 'التفاصيل والتسجيل', fr: 'Détails et inscription', en: 'Details & Register' };
    }
  }

  function textFor(obj, lang) {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    if (obj[lang]) return obj[lang];
    for (const key of LANGS) {
      if (obj[key]) return obj[key];
    }
    return obj.ar || obj.fr || obj.en || '';
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function getGridByCategory(category) {
    if (category === 'private') return document.querySelector('#private .grid');
    return document.querySelector('#listings .grid');
  }

  function getSavedList() {
    try {
      return JSON.parse(localStorage.getItem('jm_saved') || '[]');
    } catch (error) {
      return [];
    }
  }

  function saveList(list) {
    try {
      localStorage.setItem('jm_saved', JSON.stringify(list));
    } catch (error) {
      // ignore localStorage issues
    }
  }

  function buildDefaultDetails(job) {
    const detail = {
      ar: { sections: [
        { h: 'نبذة', p: textFor(job.description, 'ar') || 'إعلان جديد أضيف حديثاً.' },
        { h: 'آخر الأجل', p: textFor(job.deadline, 'ar') || 'راجع المصدر الرسمي.' }
      ] },
      fr: { sections: [
        { h: 'Aperçu', p: textFor(job.description, 'fr') || 'Nouvelle annonce ajoutée.' },
        { h: 'Date limite', p: textFor(job.deadline, 'fr') || 'Voir la source officielle.' }
      ] },
      en: { sections: [
        { h: 'Overview', p: textFor(job.description, 'en') || 'New listing added.' },
        { h: 'Deadline', p: textFor(job.deadline, 'en') || 'Please check official source.' }
      ] }
    };

    if (job.details) {
      for (const lang of LANGS) {
        if (job.details[lang]) detail[lang] = job.details[lang];
      }
    }

    return detail;
  }

  function buildCard(job) {
    const lang = window.currentLang || 'ar';
    const article = document.createElement('article');
    article.className = 'card reveal';
    article.setAttribute('data-job-id', job.id);
    article.setAttribute('data-category', job.category || 'public');
    article.setAttribute('data-posted', job.posted || new Date().toISOString().slice(0,10));
    if (job.countdown) article.setAttribute('data-countdown', job.countdown);

    const isPrivate = job.category === 'private';
    const badgeStyle = isPrivate ? 'background:var(--green);border-color:var(--gold);' : '';
    const badgeChar = isPrivate ? '$' : '✓';
    const tagStyle = isPrivate ? 'color:var(--red);background:rgba(193,39,45,.08);border-color:rgba(193,39,45,.25);' : '';

    const title = textFor(job.title, lang);
    const tag = textFor(job.tag, lang);
    const meta = textFor(job.meta, lang);
    const desc = textFor(job.description, lang);
    const deadline = textFor(job.deadline, lang);

    article.innerHTML = `
      <button type="button" class="save-btn" data-save-btn data-job-id="${job.id}" aria-label="save">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.2L5 21V4.5a1 1 0 0 1 1-1z"/></svg>
      </button>
      <div class="badge" style="${badgeStyle}">${badgeChar}</div>
      <div class="tag-row"><span class="tag" style="${tagStyle}">${escapeHtml(tag)}</span></div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(desc)}</p>
      <span class="meta">${escapeHtml(meta)}</span>
      <div class="perforation"></div>
      <div class="card-foot">
        <span class="deadline">${deadline}</span>
        <a href="#" class="apply-btn">${escapeHtml(textFor(window.dict.applyBtn, lang))}</a>
      </div>
    `;

    const saveBtn = article.querySelector('[data-save-btn]');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const id = saveBtn.getAttribute('data-job-id');
        let saved = getSavedList();
        if (saved.includes(id)) {
          saved = saved.filter((item) => item !== id);
        } else {
          saved.push(id);
        }
        saveList(saved);
        if (typeof window.refreshSaveUI === 'function') window.refreshSaveUI();
        if (typeof window.renderSavedList === 'function') window.renderSavedList();
      });
    }

    const applyBtn = article.querySelector('.apply-btn');
    if (applyBtn) {
      applyBtn.addEventListener('click', (event) => {
        event.preventDefault();
        if (typeof window.openJobDetail === 'function') {
          window.openJobDetail(job.id);
        }
      });
    }

    return article;
  }

  function appendJobs(jobs) {
    for (const job of jobs) {
      const id = job.id;
      if (!id) continue;

      if (!window.dict[id + 'title']) window.dict[id + 'title'] = job.title || {};
      if (!window.dict[id + 'tag']) window.dict[id + 'tag'] = job.tag || {};
      if (!window.dict[id + 'meta']) window.dict[id + 'meta'] = job.meta || {};
      if (!window.dict[id + 'deadline']) window.dict[id + 'deadline'] = job.deadline || {};
      if (!window.dict[id + 'desc']) window.dict[id + 'desc'] = job.description || {};
      if (!window.jobDetails[id]) window.jobDetails[id] = buildDefaultDetails(job);

      const grid = getGridByCategory(job.category === 'private' ? 'private' : 'public');
      if (!grid) continue;

      const alreadyExists = grid.querySelector(`.card[data-job-id="${CSS.escape(id)}"]`);
      if (alreadyExists) continue;

      const card = buildCard(job);
      const emptyMsg = grid.querySelector('.filter-empty-msg');
      if (emptyMsg) {
        emptyMsg.parentNode.insertBefore(card, emptyMsg);
      } else {
        grid.appendChild(card);
      }
    }

    if (typeof window.setLang === 'function') window.setLang(window.currentLang || 'ar');
    if (typeof window.applyFilters === 'function') window.applyFilters();
    if (typeof window.refreshSaveUI === 'function') window.refreshSaveUI();
    if (typeof window.renderSavedList === 'function') window.renderSavedList();
    if (typeof window.renderUpdatesList === 'function') window.renderUpdatesList();
    if (typeof window.initCountdown === 'function') window.initCountdown();
    if (typeof window.updateJobCounts === 'function') window.updateJobCounts();
  }

  async function loadJobs() {
    ensureGlobals();
    try {
      const response = await fetch('./jobs-data.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('jobs-data.json not found');
      const data = await response.json();
      const jobs = Array.isArray(data.jobs) ? data.jobs : [];
      if (jobs.length) appendJobs(jobs);
    } catch (error) {
      console.warn('jobs-loader: could not load jobs-data.json', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadJobs, { once: true });
  } else {
    loadJobs();
  }
})();
