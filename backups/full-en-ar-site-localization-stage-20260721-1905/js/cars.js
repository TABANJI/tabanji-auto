(() => {
  const t = (key, vars) => window.tabanjiI18n?.t(key, vars) ?? key;
  const cars = Array.isArray(window.TABANJI_CARS) ? window.TABANJI_CARS : [];
  const form = document.querySelector('#filterForm');
  const grid = document.querySelector('#catalogGrid');
  const sort = document.querySelector('#sort');
  const filters = document.querySelector('#filters');
  const overlay = document.querySelector('#filterOverlay');
  const openButton = document.querySelector('#filterOpen');
  const closeButton = document.querySelector('#filterClose');
  const quickView = document.querySelector('#quickView');
  const quickPanel = document.querySelector('.quick-view__panel');
  const quickContent = document.querySelector('#quickContent');
  const chips = document.querySelector('#activeChips');
  const resultCount = document.querySelector('#resultCount');
  const drawerCount = document.querySelector('#drawerCount');
  const shownCount = document.querySelector('#shownCount');
  const loadMore = document.querySelector('#loadMore');
  const toolbarReset = document.querySelector('#toolbarReset');
  const filterReset = document.querySelector('#filterReset');
  const filterBadge = document.querySelector('#filterBadge');
  const viewButtons = [...document.querySelectorAll('[data-view]')];
  const favoriteHeader = document.querySelector('#favoritesShortcut');
  const mobileFilters = window.matchMedia('(max-width: 1100px)');
  const focusSearchRequest = new URLSearchParams(window.location.search).get('focus') === 'search';
  const filterNames = [
    'q', 'brand', 'model', 'status', 'yearMin', 'yearMax',
    'priceMin', 'priceMax', 'mileageMax', 'fuel',
    'transmission', 'bodyType', 'drive', 'powerMin'
  ];
  const labels = {
    q: 'Search', brand: 'Brand', model: 'Model', status: 'Status',
    yearMin: 'Year from', yearMax: 'Year to', priceMin: 'Price from',
    priceMax: 'Price to', mileageMax: 'Maximum mileage', fuel: 'Fuel',
    transmission: 'Transmission', bodyType: 'Body type', drive: 'Drive',
    powerMin: 'Minimum power'
  };
  const statusLabels = {
    available: 'Available', new: 'New Arrival', exclusive: 'Exclusive',
    reserved: 'Reserved', sold: 'Sold', on_request: 'On Request'
  };
  let visibleLimit = 8;
  let currentResults = [];
  let drawerOpener = null;
  let quickOpener = null;

  const money = (value) => `${new Intl.NumberFormat(window.tabanjiI18n?.getLanguage() === 'ar' ? 'ar-LB' : 'en-GB').format(value)} €`;

  function getFavorites() {
    const value = window.tabanjiStorage.read('tabanjiFavorites', []);
    return Array.isArray(value) ? value.filter((id) => typeof id === 'string') : [];
  }

  function updateFavoriteCount() {
    document.querySelector('.favorite-count').textContent = getFavorites().length;
  }

  function uniqueValues(key) {
    return [...new Set(cars.map((car) => car[key]).filter(Boolean))]
      .sort((a, b) => String(a).localeCompare(String(b), 'uk'));
  }

  function populateSelect(name, values, labelMap = {}) {
    const select = form.elements[name];
    values.forEach((value) => {
      select.add(new Option(labelMap[value] || value, value));
    });
  }

  function populateModels() {
    const selected = form.elements.model.value;
    const brand = form.elements.brand.value;
    const models = cars
      .filter((car) => !brand || car.brand === brand)
      .map((car) => car.model)
      .sort();
    form.elements.model.innerHTML = '<option value="">All models</option>';
    models.forEach((model) => form.elements.model.add(new Option(model, model)));
    form.elements.model.value = models.includes(selected) ? selected : '';
  }

  function initializeFilters() {
    populateSelect('brand', uniqueValues('brand'));
    populateSelect('status', Object.keys(statusLabels), statusLabels);
    populateSelect('fuel', uniqueValues('fuel'));
    populateSelect('transmission', uniqueValues('transmission'));
    populateSelect('bodyType', uniqueValues('bodyType'));
    populateSelect('drive', uniqueValues('drive'));
    populateModels();
  }

  function readUrl() {
    const params = new URLSearchParams(window.location.search);
    filterNames.forEach((name) => {
      if (params.has(name) && form.elements[name]) {
        form.elements[name].value = params.get(name).slice(0, 100);
      }
    });
    if (params.has('sort')) sort.value = params.get('sort');
    if (params.get('favorites') === '1') favoriteHeader.dataset.active = 'true';
    populateModels();
  }

  function writeUrl() {
    const params = new URLSearchParams();
    filterNames.forEach((name) => {
      const value = form.elements[name]?.value.trim();
      if (value) params.set(name, value);
    });
    if (sort.value !== 'featured') params.set('sort', sort.value);
    if (favoriteHeader.dataset.active === 'true') params.set('favorites', '1');
    const query = params.toString();
    history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}`);
  }

  function filterCars() {
    const values = Object.fromEntries(new FormData(form));
    const query = values.q.toLowerCase().trim();
    let list = cars.filter((car) => {
      const searchable = `${car.brand} ${car.model}`.toLowerCase();
      return (!query || searchable.includes(query))
        && (!values.brand || car.brand === values.brand)
        && (!values.model || car.model === values.model)
        && (!values.status || car.status === values.status)
        && (!values.yearMin || car.year >= Number(values.yearMin))
        && (!values.yearMax || car.year <= Number(values.yearMax))
        && (!values.priceMin || car.price >= Number(values.priceMin))
        && (!values.priceMax || car.price <= Number(values.priceMax))
        && (!values.mileageMax || car.mileage <= Number(values.mileageMax))
        && (!values.fuel || car.fuel === values.fuel)
        && (!values.transmission || car.transmission === values.transmission)
        && (!values.bodyType || car.bodyType === values.bodyType)
        && (!values.drive || car.drive === values.drive)
        && (!values.powerMin || car.power >= Number(values.powerMin));
    });

    if (favoriteHeader.dataset.active === 'true') {
      const favorites = getFavorites();
      list = list.filter((car) => favorites.includes(car.id));
    }

    const sorters = {
      featured: (a, b) => Number(b.featured) - Number(a.featured),
      new: (a, b) => Number(b.status === 'new') - Number(a.status === 'new'),
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      'year-desc': (a, b) => b.year - a.year,
      'mileage-asc': (a, b) => a.mileage - b.mileage,
      'power-desc': (a, b) => b.power - a.power
    };
    return [...list].sort(sorters[sort.value] || sorters.featured);
  }

  function cardTemplate(car) {
    const favorite = getFavorites().includes(car.id);
    const sold = car.status === 'sold';
    const primaryText = sold ? 'Find Similar' : 'Details';
    const primaryHref = sold
      ? `cars.html?brand=${encodeURIComponent(car.brand)}`
      : `car.html?id=${encodeURIComponent(car.id)}`;
    return `
      <article class="catalog-card ${sold ? 'sold' : ''}">
        <div class="catalog-card__media">
          <img src="${car.image}" alt="${car.brand} ${car.model}, ${car.year}" loading="lazy">
          <span class="catalog-status catalog-status--${car.status}">${statusLabels[car.status] || car.status}</span>
          <button class="catalog-fav ${favorite ? 'active' : ''}" type="button"
            data-favorite="${car.id}" aria-pressed="${favorite}"
            aria-label="${favorite ? 'Remove from favourites' : 'Add to favourites'}: ${car.brand} ${car.model}">♡</button>
        </div>
        <div class="catalog-card__body">
          <span class="catalog-card__brand" dir="ltr">${car.brand} · ${car.year}</span>
          <h3 dir="ltr">${car.model}</h3>
          <div class="catalog-card__specs" dir="ltr">
            <span>${car.mileage.toLocaleString('en-GB')} km</span>
            <span>${car.power} HP</span>
            <span>${car.fuel}</span>
          </div>
          <p class="catalog-card__location">${car.location} · ${car.bodyType}</p>
          <p class="catalog-card__description">${car.description}</p>
          <div class="catalog-card__footer">
            <strong class="catalog-card__price">${money(car.price)}</strong>
            <div class="card-actions">
              <button class="quick-button" type="button" data-quick="${car.id}">Quick View</button>
              <button class="quick-button list-consult" type="button"
                data-modal="Enquiry about ${car.brand} ${car.model}">Private Consultation</button>
              <a class="text-link" href="${primaryHref}">${primaryText} →</a>
            </div>
          </div>
        </div>
      </article>`;
  }

  function emptyTemplate() {
    const favoritesOnly = favoriteHeader.dataset.active === 'true';
    const title = favoritesOnly ? 'No favourites yet' : 'No vehicles found';
    const message = favoritesOnly
      ? 'Add vehicles to your favourites to see them here.'
      : 'Try adjusting or resetting the filters.';
    return `
      <div class="empty-state">
        <span class="eyebrow">Private Collection</span>
        <h3>${title}</h3>
        <p>${message}</p>
        <button class="btn" type="button" data-reset-all>Reset Filters</button>
      </div>`;
  }

  function render({ resetLimit = false } = {}) {
    if (resetLimit) visibleLimit = 8;
    currentResults = filterCars();
    const visible = currentResults.slice(0, visibleLimit);
    grid.innerHTML = visible.length ? visible.map(cardTemplate).join('') : emptyTemplate();
    resultCount.textContent = currentResults.length;
    drawerCount.textContent = currentResults.length;
    shownCount.textContent = t('ui.showing', { shown: visible.length, total: currentResults.length });
    loadMore.hidden = visible.length >= currentResults.length;
    renderChips();
    writeUrl();
    attachImageFallbacks();
    window.tabanjiI18n?.translate(grid);
  }

  function activeFilters() {
    return filterNames
      .map((name) => ({ name, value: form.elements[name]?.value.trim() }))
      .filter((item) => item.value);
  }

  function renderChips() {
    const active = activeFilters();
    if (favoriteHeader.dataset.active === 'true') active.push({ name: 'favorites', value: 'Favourites' });
    chips.innerHTML = active.map((item) => `
      <button class="chip" type="button" data-remove-filter="${item.name}">
        ${labels[item.name] || 'Mode'}: ${item.value} ×
      </button>`).join('');
    filterBadge.textContent = active.length ? `(${active.length})` : '';
    toolbarReset.hidden = active.length === 0;
  }

  function resetAll() {
    form.reset();
    sort.value = 'featured';
    favoriteHeader.dataset.active = 'false';
    populateModels();
    render({ resetLimit: true });
  }

  function toggleFavorite(id) {
    const current = getFavorites();
    const updated = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    window.tabanjiStorage.write('tabanjiFavorites', updated);
    updateFavoriteCount();
    render();
  }

  function closeDrawer({ restoreFocus = false } = {}) {
    filters.classList.remove('open');
    overlay.classList.remove('open');
    openButton.setAttribute('aria-expanded', 'false');
    if (mobileFilters.matches) {
      filters.inert = true;
      filters.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('locked');
    if (restoreFocus) drawerOpener?.focus();
  }

  function openDrawer() {
    closeQuick();
    drawerOpener = document.activeElement;
    filters.classList.add('open');
    overlay.classList.add('open');
    openButton.setAttribute('aria-expanded', 'true');
    filters.inert = false;
    filters.setAttribute('aria-hidden', 'false');
    document.body.classList.add('locked');
    closeButton.focus();
  }

  function openQuick(id, opener) {
    closeDrawer();
    const car = cars.find((item) => item.id === id);
    if (!car) return;
    quickOpener = opener;
    quickContent.innerHTML = `
      <div class="quick-layout">
        <img src="${car.image}" alt="${car.brand} ${car.model}">
        <div class="quick-layout__body">
          <span class="eyebrow">${statusLabels[car.status]}</span>
          <h2 class="display" id="quickTitle">${car.brand} ${car.model}</h2>
          <p class="quick-price">${money(car.price)}</p>
          <div class="quick-specs">
            <span dir="ltr">${car.year}</span>
            <span dir="ltr">${car.mileage.toLocaleString('en-GB')} km</span>
            <span dir="ltr">${car.power} HP</span>
            <span>${car.engine}</span>
            <span>${car.transmission}</span>
            <span>${car.drive}</span>
          </div>
          <p>${car.description}</p>
          <div class="card-actions">
            <a class="btn" href="car.html?id=${encodeURIComponent(car.id)}">Details</a>
            <button class="btn btn--ghost" type="button" id="quickConsult">Private Consultation</button>
          </div>
        </div>
      </div>`;
    window.tabanjiI18n?.translate(quickContent);
    window.tabanjiAccentHeadings(quickContent);
    quickView.classList.add('open');
    quickView.setAttribute('aria-hidden', 'false');
    document.body.classList.add('locked');
    quickView.querySelector('.quick-close').focus();
    quickView.querySelector('#quickConsult').addEventListener('click', () => {
      closeQuick();
      document.querySelector('.header [data-modal]').click();
    });
    attachImageFallbacks();
  }

  function closeQuick({ restoreFocus = false } = {}) {
    if (!quickView.classList.contains('open')) return;
    quickView.classList.remove('open');
    quickView.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('locked');
    if (restoreFocus) quickOpener?.focus();
  }

  function trapFocus(event, container) {
    const focusable = [...container.querySelectorAll('button, a[href], input, select, textarea')]
      .filter((element) => !element.disabled);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function attachImageFallbacks() {
    grid.querySelectorAll('img:not([data-fallback-ready]), #quickContent img:not([data-fallback-ready])').forEach((image) => {
      image.dataset.fallbackReady = 'true';
      image.addEventListener('error', () => {
        image.removeAttribute('src');
        image.parentElement.classList.add('fallback');
      }, { once: true });
    });
  }

  form.addEventListener('input', (event) => {
    if (event.target.name === 'brand') populateModels();
    render({ resetLimit: true });
  });
  sort.addEventListener('change', () => render({ resetLimit: true }));
  openButton.addEventListener('click', openDrawer);
  closeButton.addEventListener('click', () => closeDrawer({ restoreFocus: true }));
  overlay.addEventListener('click', () => closeDrawer({ restoreFocus: true }));
  document.querySelector('#filterApply').addEventListener('click', () => closeDrawer({ restoreFocus: true }));
  filterReset.addEventListener('click', resetAll);
  toolbarReset.addEventListener('click', resetAll);
  loadMore.addEventListener('click', () => { visibleLimit += 8; render(); });
  favoriteHeader.addEventListener('click', () => {
    favoriteHeader.dataset.active = favoriteHeader.dataset.active === 'true' ? 'false' : 'true';
    render({ resetLimit: true });
  });
  viewButtons.forEach((button) => button.addEventListener('click', () => {
    const view = button.dataset.view;
    grid.classList.toggle('list', view === 'list');
    viewButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    window.tabanjiStorage.write('tabanji_auto_catalog_view', view);
  }));
  grid.addEventListener('click', (event) => {
    const favorite = event.target.closest('[data-favorite]');
    const quick = event.target.closest('[data-quick]');
    const reset = event.target.closest('[data-reset-all]');
    if (favorite) toggleFavorite(favorite.dataset.favorite);
    if (quick) openQuick(quick.dataset.quick, quick);
    if (reset) resetAll();
  });
  chips.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-filter]');
    if (!button) return;
    if (button.dataset.removeFilter === 'favorites') favoriteHeader.dataset.active = 'false';
    else form.elements[button.dataset.removeFilter].value = '';
    if (button.dataset.removeFilter === 'brand') populateModels();
    render({ resetLimit: true });
  });
  quickView.querySelector('.quick-close').addEventListener('click', () => closeQuick({ restoreFocus: true }));
  quickView.addEventListener('click', (event) => { if (event.target === quickView) closeQuick({ restoreFocus: true }); });
  document.addEventListener('click', (event) => { if (event.target.closest('[data-modal]')) closeDrawer(); }, true);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (quickView.classList.contains('open')) closeQuick({ restoreFocus: true });
      else if (filters.classList.contains('open')) closeDrawer({ restoreFocus: true });
    }
    if (event.key === 'Tab' && quickView.classList.contains('open')) trapFocus(event, quickPanel);
    if (event.key === 'Tab' && filters.classList.contains('open')) trapFocus(event, filters);
  });

  function syncFilterAccessibility() {
    const isClosedMobile = mobileFilters.matches && !filters.classList.contains('open');
    filters.inert = isClosedMobile;
    if (isClosedMobile) filters.setAttribute('aria-hidden', 'true');
    else filters.removeAttribute('aria-hidden');
  }

  mobileFilters.addEventListener('change', syncFilterAccessibility);

  initializeFilters();
  syncFilterAccessibility();
  readUrl();
  const storedView = window.tabanjiStorage.read('tabanji_auto_catalog_view', 'grid');
  const initialView = storedView === 'list' ? 'list' : 'grid';
  grid.classList.toggle('list', initialView === 'list');
  viewButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.view === initialView)));
  updateFavoriteCount();
  document.querySelector('#heroCount').textContent = cars.length;
  render();
  if (focusSearchRequest) {
    window.requestAnimationFrame(() => document.querySelector('#searchShortcut')?.click());
  }
  window.addEventListener('tabanji:languagechange', () => render());
})();
