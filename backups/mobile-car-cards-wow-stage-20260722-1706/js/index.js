(() => {
  const cars = Array.isArray(window.TABANJI_CARS) ? window.TABANJI_CARS : [];
  const grid = document.querySelector('#carsGrid');
  const brandSelect = document.querySelector('#brand');
  const modelSelect = document.querySelector('#model');
  const yearSelect = document.querySelector('#year');
  const priceSelect = document.querySelector('#price');
  const searchResult = document.querySelector('.search__result');
  const favoritesButton = document.querySelector('#favoritesShortcut');
  const t = (key, vars) => window.tabanjiI18n?.t(key, vars) ?? key;
  const statusLabels = {
    available: 'Available',
    new: 'New Arrival',
    exclusive: 'Exclusive',
    reserved: 'Reserved',
    sold: 'Sold',
    on_request: 'On Request'
  };
  const technicalLabels = {
    '\u0411\u0435\u043d\u0437\u0438\u043d': 'petrol',
    '\u0414\u0438\u0437\u0435\u043b\u044c': 'diesel',
    '\u0413\u0456\u0431\u0440\u0438\u0434': 'hybrid',
    '\u0415\u043b\u0435\u043a\u0442\u0440\u043e': 'electric'
  };
  let activeBrand = '';

  function formatPrice(car) {
    return `${new Intl.NumberFormat('en-GB').format(car.price)} €`;
  }

  function getFavorites() {
    const stored = window.tabanjiStorage.read('tabanjiFavorites', []);
    return Array.isArray(stored) ? stored.filter((id) => typeof id === 'string') : [];
  }

  function updateFavoriteCount() {
    document.querySelector('.favorite-count').textContent = getFavorites().length;
  }

  function carTemplate(car) {
    const isFavorite = getFavorites().includes(car.id);

    return `
      <article class="car-card reveal visible">
        <div class="car-card__media">
          <a class="car-card__image-link" href="car.html?id=${encodeURIComponent(car.id)}" aria-label="${car.brand} ${car.model}"><img
            src="${car.image}"
            alt="${car.brand} ${car.model}, ${car.year}"
            loading="lazy"
          ></a>
          <span class="status status--${car.status}">${t(`ui.${car.status}`)}</span>
          <button
            class="fav ${isFavorite ? 'active' : ''}"
            data-id="${car.id}"
            aria-label="${t(isFavorite ? 'ui.removeFavourite' : 'ui.addFavourite', { model: car.model })}"
            aria-pressed="${isFavorite}"
          ><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"/></svg></button>
        </div>
        <div class="car-card__body">
          <span class="car-card__brand">${car.brand} · ${car.year}</span>
          <h3><a href="car.html?id=${encodeURIComponent(car.id)}">${car.model}</a></h3>
          <div class="car-card__meta">
            <span>${car.mileage.toLocaleString('en-GB')} km</span>
            <span>${car.power} HP</span>
            <span>${technicalLabels[car.fuel] ? t(`ui.${technicalLabels[car.fuel]}`) : car.fuel}</span>
          </div>
          <div class="car-card__bottom">
            <strong class="car-card__price">${formatPrice(car)}</strong>
            <a class="text-link" href="car.html?id=${encodeURIComponent(car.id)}">${t('ui.viewDetails')} <span aria-hidden="true">→</span></a>
          </div>
        </div>
      </article>
    `;
  }

  function attachCardEvents() {
    grid.querySelectorAll('.fav').forEach((button) => {
      button.addEventListener('click', () => {
        const current = getFavorites();
        const isFavorite = current.includes(button.dataset.id);
        const updated = isFavorite
          ? current.filter((id) => id !== button.dataset.id)
          : [...current, button.dataset.id];

        if (!window.tabanjiStorage.write('tabanjiFavorites', updated)) {
          searchResult.textContent = t('ui.storageError');
          return;
        }

        button.classList.toggle('active', !isFavorite);
        button.setAttribute('aria-pressed', String(!isFavorite));
        button.setAttribute(
          'aria-label',
          `${isFavorite ? 'Add' : 'Remove'} vehicle ${isFavorite ? 'to' : 'from'} favourites`
        );
        updateFavoriteCount();
      });
    });
  }

  function renderCars(list) {
    grid.innerHTML = list.length
      ? list.map(carTemplate).join('')
      : `
        <div class="empty">
          ${t('ui.empty')}
        </div>
      `;
    attachCardEvents();
    attachImageFallbacks();
  }

  function populateFilters() {
    [...new Set(cars.map((car) => car.brand))]
      .sort()
      .forEach((brand) => brandSelect.add(new Option(brand, brand)));

    [...new Set(cars.map((car) => car.year))]
      .sort((a, b) => b - a)
      .forEach((year) => yearSelect.add(new Option(year, year)));
  }

  function populateModels() {
    modelSelect.innerHTML = `<option value="">${t('ui.allModels')}</option>`;
    cars
      .filter((car) => !brandSelect.value || car.brand === brandSelect.value)
      .forEach((car) => modelSelect.add(new Option(car.model, car.model)));
  }

  function filterCars() {
    const selectedBrand = activeBrand || brandSelect.value;
    const list = cars.filter((car) => (
      (!selectedBrand || car.brand === selectedBrand)
      && (!modelSelect.value || car.model === modelSelect.value)
      && (!yearSelect.value || car.year >= Number(yearSelect.value))
      && (!priceSelect.value || car.price <= Number(priceSelect.value))
    ));

    renderCars(list);
    searchResult.textContent = t('ui.found', { count: list.length, vehicles: t(list.length === 1 ? 'ui.vehicle' : 'ui.vehicles') });
    window.tabanjiScrollIntoView(document.querySelector('#collection'));
  }

  function attachImageFallbacks() {
    document.querySelectorAll('img:not(#heroImage)').forEach((image) => {
      image.addEventListener('error', () => {
        image.removeAttribute('src');
        image.alt += ` — ${t('ui.unavailable')}`;
        image.parentElement.classList.add('fallback');
      }, { once: true });
    });
  }

  brandSelect.addEventListener('change', populateModels);

  document.querySelector('#searchForm').addEventListener('submit', (event) => {
    event.preventDefault();
    activeBrand = '';
    filterCars();
  });

  favoritesButton.addEventListener('click', () => {
    const favoriteIds = getFavorites();
    const favoriteCars = cars.filter((car) => favoriteIds.includes(car.id));
    renderCars(favoriteCars);
    searchResult.textContent = favoriteIds.length
      ? t('ui.favourites', { count: favoriteCars.length })
      : t('ui.noFavourites');
    window.tabanjiScrollIntoView(document.querySelector('#collection'));
  });

  const statisticsObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting || entry.target.dataset.done) {
        return;
      }

      entry.target.dataset.done = 'true';
      const target = Number(entry.target.dataset.value);

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        entry.target.textContent = target + (entry.target.dataset.suffix || '');
        statisticsObserver.unobserve(entry.target);
        return;
      }

      const duration = 1200;
      const startedAt = performance.now();

      function tick(timestamp) {
        const progress = Math.min((timestamp - startedAt) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        entry.target.textContent = Math.round(target * eased)
          + (entry.target.dataset.suffix || '');

        if (progress < 1) {
          requestAnimationFrame(tick);
        }
      }

      requestAnimationFrame(tick);
      statisticsObserver.unobserve(entry.target);
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('[data-value]').forEach((element) => {
    statisticsObserver.observe(element);
  });

  populateFilters();
  renderCars(cars.filter((car) => car.featured));
  updateFavoriteCount();
  window.addEventListener('tabanji:languagechange', () => {
    const selectedModel = modelSelect.value;
    populateModels();
    modelSelect.value = selectedModel;
    renderCars(cars.filter((car) => car.featured));
  });
})();
