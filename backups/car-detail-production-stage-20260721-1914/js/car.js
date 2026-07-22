(() => {
  const root = document.querySelector('#carPlaceholder');
  const cars = Array.isArray(window.TABANJI_CARS) ? window.TABANJI_CARS : [];
  const id = new URLSearchParams(window.location.search).get('id') || '';
  const car = cars.find((item) => item.id === id);
  const favorites = window.tabanjiStorage.read('tabanjiFavorites', []);
  document.querySelector('.favorite-count').textContent = Array.isArray(favorites) ? favorites.length : 0;
  document.querySelector('#favoritesShortcut').addEventListener('click', () => {
    window.location.href = 'cars.html?favorites=1';
  });
  if (!car) {
    document.title = 'Vehicle Not Found — TABANJI AUTO';
    root.innerHTML = `
      <section class="car-placeholder__empty">
        <div class="container">
          <span class="eyebrow">TABANJI Private Collection</span>
          <h1 class="display">Vehicle Not Found</h1>
          <p>The link does not contain a valid vehicle ID or this vehicle is no longer available.</p>
          <a class="btn" href="cars.html">Return to Collection</a>
        </div>
      </section>`;
    return;
  }

  document.title = `${car.brand} ${car.model} — TABANJI AUTO`;
  root.innerHTML = `
    <section class="car-placeholder__hero">
      <img src="${car.image}" alt="${car.brand} ${car.model}, ${car.year}">
      <div class="container car-placeholder__content">
        <a class="breadcrumb" href="cars.html">← Back to Collection</a>
        <span class="eyebrow">${car.year} · ${car.location}</span>
        <h1 class="display" dir="ltr">${car.brand} ${car.model}</h1>
        <strong dir="ltr">${new Intl.NumberFormat(window.tabanjiI18n?.getLanguage() === 'ar' ? 'ar-LB' : 'en-GB').format(car.price)} €</strong>
        <p>Contact TABANJI AUTO for verified specifications, provenance and availability.</p>
        <div class="quick-specs car-detail__specs">
          <span><b>Year</b><i dir="ltr">${car.year}</i></span>
          <span><b>Mileage</b><i dir="ltr">${car.mileage.toLocaleString('en-GB')} km</i></span>
          <span><b>Power</b><i dir="ltr">${car.power} HP</i></span>
          <span><b>Engine</b><i dir="ltr">${car.engine}</i></span>
          <span><b>Transmission</b><i dir="ltr">${car.transmission}</i></span>
          <span><b>Acceleration</b><i dir="ltr">${car.acceleration} s</i></span>
          <span><b>Top Speed</b><i dir="ltr">${car.topSpeed} km/h</i></span>
          <span><b>Doors</b><i dir="ltr">${car.doors}</i></span>
          <span><b>Seats</b><i dir="ltr">${car.seats}</i></span>
        </div>
        <div class="car-placeholder__actions">
          <a class="btn" href="cars.html">Back to Collection</a>
          <button class="btn btn--ghost" data-modal="Enquiry about ${car.brand} ${car.model}">Request a Private Consultation</button>
        </div>
      </div>
    </section>`;
  window.tabanjiAccentHeadings(root);
  window.tabanjiI18n?.translate(root);
  window.addEventListener('tabanji:languagechange', () => window.location.reload());
})();
