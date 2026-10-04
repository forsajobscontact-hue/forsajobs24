(function () {
  if (typeof dict === 'undefined' || typeof jobDetails === 'undefined') return;

  const LANGS = ['ar', 'fr', 'en'];

  function textFor(obj, lang) {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[lang] || obj.ar || obj.fr || obj.en || '';
  }

  function ensureDictEntry(id, key, value) {
    if (!dict[key]) dict[key] = {};
    for (const lang of LANGS) {
      if (!dict[key][lang]) dict[key][lang] = value?.[lang] || value?.ar || value?.fr || value?.en || '';
    }
  }

  function buildDefaultDetails(job) {
    const detail = {
      ar: { sections: [
        { h: 'نبذة', p: textFor(job.description, 'ar') || 'إعلان جديد تم إضافته يدويًا.' },
        { h: 'آخر الأجل', p: textFor(job.deadline, 'ar') || 'انظر المصدر الرسمي.' }
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
        if (job.details[lang]) {
          detail[lang] = job.details[lang];
        }
      }
    }

    return detail;
  }

  function getGridForCategory(category) {
    return category === 'private' ? document.querySelector('#private .grid') : document.querySelector('#listings .grid');
  }

  function attachSaveBehavior(button) {
    if (!button) return;
    button.addEventListener('click', () => {
      const id = button.getAttribute('data-job-id');
      let saved = [];
      try { saved = JSON.parse(localStorage.getItem('jm_saved') || '[]'); } catch (e) {}
      if (saved.includes(id)) {
        saved = saved.filter(x => x !== id);
      } else {
        saved.push(id);
      }
      try { localStorage.setItem('jm_saved', JSON.stringify(saved)); } catch (e) {}
      if (typeof refreshSaveUI === 'function') refreshSaveUI();
      if (typeof renderSavedList === 'function') renderSavedList();
    });
  }

  function attachApplyBehavior(button, job) {
    if (!button) return;
    button.addEventListener('click', (e) => {
      if (job.url) {
        window.open(job.url, '_blank', 'noopener');
        return;
      }
      e.preventDefault();
      if (typeof openJobDetail === 'function') {
        openJobDetail(job.id);
      }
    });
  }

  function buildCard(job) {
    const article = document.createElement('article');
    article.className = 'card reveal show';
    article.setAttribute('data-job-id', job.id);
    article.setAttribute('data-category', job.category);
    article.setAttribute('data-posted', job.posted);
    if (job.countdown) article.setAttribute('data-countdown', job.countdown);

    const style = job.category === 'private' ? 'background:var(--green);border-color:var(--gold);' : '';
    const badge = job.category === 'private' ? '$' : '✓';
    const tagText = textFor(job.tag, currentLang);
    const titleText = textFor(job.title, currentLang);
    const metaText = textFor(job.meta, currentLang);
    const deadlineHtml = textFor(job.deadline, currentLang);
    const descText = textFor(job.description, currentLang);

    article.innerHTML = `
      <button type="button" class="save-btn" data-save-btn data-job-id="${job.id}" aria-label="save">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.2L5 21V4.5a1 1 0 0 1 1-1z"></path></svg>
      </button>
      <div class="badge" style="${style}">${badge}</div>
      <div class="tag-row"><span class="tag">${tagText}</span></div>
      <h3>${titleText}</h3>
      <p>${descText}</p>
      <span class="meta">${metaText}</span>
      <div class="perforation"></div>
      <div class="card-foot">
        <span class="deadline">${deadlineHtml}</span>
        <a href="#" class="apply-btn">${textFor(dict.applyBtn, currentLang)}</a>
      </div>
    `;

    attachSaveBehavior(article.querySelector('[data-save-btn]'));
    attachApplyBehavior(article.querySelector('.apply-btn'), job);
    return article;
  }

  function injectJobs(jobs) {
    jobs.forEach((job) => {
      const id = job.id;
      ensureDictEntry(id, id + 'title', job.title);
      ensureDictEntry(id, id + 'tag', job.tag);
      ensureDictEntry(id, id + 'meta', job.meta);
      ensureDictEntry(id, id + 'deadline', job.deadline);
      ensureDictEntry(id, id + 'desc', job.description);
      if (!jobDetails[id]) {
        jobDetails[id] = buildDefaultDetails(job);
      }
      const grid = getGridForCategory(job.category);
      if (grid) {
        const existing = grid.querySelector(`.card[data-job-id="${id}"]`);
        if (!existing) {
          grid.appendChild(buildCard(job));
        }
      }
    });

    if (typeof setLang === 'function') setLang(currentLang);
    if (typeof renderUpdatesList === 'function') renderUpdatesList();
    if (typeof applyFilters === 'function') applyFilters();
    if (typeof refreshSaveUI === 'function') refreshSaveUI();
  }

  fetch('jobs-data.json', { cache: 'no-store' })
    .then((res) => {
      if (!res.ok) throw new Error('jobs-data.json not found');
      return res.json();
    })
    .then((data) => {
      const jobs = Array.isArray(data.jobs) ? data.jobs : [];
      if (jobs.length) injectJobs(jobs);
    })
    .catch(() => {
      // no-op: keep the static cards as they are.
    });
})();
