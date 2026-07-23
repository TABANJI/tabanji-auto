(() => {
  const root = document.querySelector('#carPlaceholder');
  const lightbox = document.querySelector('#vehicleLightbox');
  const cars = Array.isArray(window.TABANJI_CARS) ? window.TABANJI_CARS : [];
  const t = (key, vars) => window.tabanjiI18n?.t(key, vars) ?? key;
  const language = () => window.tabanjiI18n?.getLanguage() || 'en';
  const id = new URLSearchParams(window.location.search).get('id') || '';
  const car = cars.find((item) => item.id === id);
  const fuelKeys = { 'Бензин':'petrol', 'Дизель':'diesel', 'Гібрид':'hybrid', 'Електро':'electric' };
  const valueMaps = {
    en: { 'Задній':'Rear-wheel drive', 'Повний':'All-wheel drive', 'Передній':'Front-wheel drive', 'Купе':'Coupe', 'Фастбек':'Fastback', 'Чорний':'Black', 'Сірий':'Grey', 'Жовтий':'Yellow', 'Червоний':'Red', 'Білий':'White' },
    ar: { 'Задній':'دفع خلفي', 'Повний':'دفع رباعي', 'Передній':'دفع أمامي', 'Купе':'كوبيه', 'Фастбек':'فاستباك', 'Чорний':'أسود', 'Сірий':'رمادي', 'Жовтий':'أصفر', 'Червоний':'أحمر', 'Білий':'أبيض' }
  };
  let activeIndex = 0;
  let lightboxIndex = 0;
  let lightboxOpener = null;

  const translateValue = (value) => valueMaps[language()]?.[value] || value;
  const fuel = (value) => fuelKeys[value] ? t(`ui.${fuelKeys[value]}`) : translateValue(value);
  const money = (value, currency = 'EUR') => new Intl.NumberFormat(language() === 'ar' ? 'ar-LB' : 'en-GB', {
    style:'currency', currency, maximumFractionDigits:0
  }).format(value);
  const favorites = () => {
    const stored = window.tabanjiStorage.read('tabanjiFavorites', []);
    return Array.isArray(stored) ? stored : [];
  };
  const description = () => car.description?.[language()] || car.description?.en || '';

  function updateFavoriteCount() {
    document.querySelector('.favorite-count').textContent = favorites().length;
  }

  function setSeo() {
    const title = `${car.brand} ${car.model} — TABANJI AUTO`;
    const summary = description();
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', summary);
    const pageUrl = `https://tabanji.github.io/tabanji-auto/car.html?id=${encodeURIComponent(car.id)}`;
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', pageUrl);
    document.querySelector('link[hreflang="en"]')?.setAttribute('href', `${pageUrl}&lang=en`);
    document.querySelector('link[hreflang="ar"]')?.setAttribute('href', `${pageUrl}&lang=ar`);
    document.querySelector('link[hreflang="x-default"]')?.setAttribute('href', pageUrl);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', summary);
    document.querySelector('meta[property="og:image"]')?.setAttribute('content', car.gallery[0]);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', title);
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', summary);
    document.querySelector('meta[name="twitter:image"]')?.setAttribute('content', car.gallery[0]);
    const data = {
      '@context':'https://schema.org', '@type':'Vehicle', name:`${car.brand} ${car.model}`,
      brand:{ '@type':'Brand', name:car.brand }, model:car.model, vehicleModelDate:String(car.year),
      mileageFromOdometer:{ '@type':'QuantitativeValue', value:car.mileage, unitCode:'KMT' },
      fuelType:fuel(car.fuel), vehicleTransmission:car.transmission, color:translateValue(car.color),
      image:car.gallery, description:summary,
      offers:{ '@type':'Offer', price:car.price, priceCurrency:car.currency || 'EUR',
        availability:car.status === 'sold' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock', url:pageUrl }
    };
    document.querySelector('#vehicleStructuredData').textContent = JSON.stringify(data);
  }

  function renderNotFound() {
    document.title = `${t('ui.vehicleNotFound')} — TABANJI AUTO`;
    root.innerHTML = `<section class="vehicle-not-found"><div class="container"><span class="eyebrow">TABANJI AUTO</span><h1>${t('ui.vehicleNotFound')}</h1><p>${t('ui.vehicleNotFoundCopy')}</p><div class="vehicle-not-found__actions"><a class="btn" href="cars.html">${t('ui.backToCollection')}</a><button class="btn btn--ghost" type="button" data-modal="${t('ui.contactConcierge')}">${t('ui.contactConcierge')}</button></div></div></section>`;
    lightbox.hidden = true;
  }

  function spec(label, value) {
    return `<div class="vehicle-key-spec"><span>${label}</span><strong dir="ltr">${value}</strong></div>`;
  }

  function similarVehicles() {
    return cars.filter((item) => item.id !== car.id).map((item) => ({
      item,
      score:(item.brand === car.brand ? 5 : 0) + (item.bodyType === car.bodyType ? 3 : 0)
        + (Math.abs(item.price - car.price) <= car.price * .3 ? 2 : 0)
        + (Math.abs(item.power - car.power) <= car.power * .25 ? 1 : 0)
    })).sort((a,b) => b.score - a.score).slice(0,3).map(({ item }) => `
      <article class="similar-card">
        <img src="${item.image}" alt="${item.brand} ${item.model}, ${item.year}" loading="lazy" decoding="async">
        <div><span dir="ltr">${item.brand} · ${item.year}</span><h3 dir="ltr">${item.model}</h3><strong dir="ltr">${money(item.price,item.currency)}</strong></div>
        <a href="car.html?id=${encodeURIComponent(item.id)}" aria-label="${t('ui.openVehicleDetails',{model:`${item.brand} ${item.model}`})}"></a>
        <button class="similar-fav" type="button" data-similar-fav="${item.id}" aria-pressed="${favorites().includes(item.id)}" aria-label="${t(favorites().includes(item.id) ? 'ui.removeFavourite':'ui.addFavourite',{model:item.model})}">♡</button>
      </article>`).join('');
  }

  function render() {
    const gallery = car.gallery?.length ? car.gallery : [car.image];
    const isFavorite = favorites().includes(car.id);
    root.innerHTML = `
      <div class="car-detail container">
        <nav class="vehicle-breadcrumb" aria-label="Breadcrumb"><a href="cars.html">${t('ui.backToCollection')}</a><span aria-hidden="true">/</span><span dir="ltr">${car.brand} ${car.model}</span></nav>
        <section class="vehicle-hero">
          <div class="vehicle-gallery ${gallery.length < 2 ? 'vehicle-gallery--single':''}" aria-label="${t('ui.vehicleGallery')}">
            <div class="vehicle-gallery__viewport" tabindex="0">
              <div class="vehicle-gallery__track">${gallery.map((src,index) => `<button class="vehicle-gallery__slide" type="button" data-gallery-open="${index}" aria-label="${t('ui.openFullscreen')}"><img src="${src}" alt="${car.brand} ${car.model}, ${t('ui.image')} ${index+1}" ${index === 0 ? 'loading="eager" fetchpriority="high"':'loading="lazy"'} decoding="async" width="1600" height="1200"></button>`).join('')}</div>
            </div>
            <button class="gallery-arrow gallery-arrow--prev" type="button" aria-label="${t('ui.previousImage')}">←</button>
            <button class="gallery-arrow gallery-arrow--next" type="button" aria-label="${t('ui.nextImage')}">→</button>
            <output class="gallery-counter" aria-live="polite" dir="ltr">1 / ${gallery.length}</output>
            <div class="gallery-dots">${gallery.map((_,index) => `<button type="button" data-gallery-dot="${index}" aria-label="${t('ui.imageOf',{x:index+1,y:gallery.length})}"></button>`).join('')}</div>
            <div class="gallery-thumbnails">${gallery.map((src,index) => `<button type="button" data-gallery-thumb="${index}" aria-label="${t('ui.imageOf',{x:index+1,y:gallery.length})}"><img src="${src}" alt="" loading="lazy" decoding="async"></button>`).join('')}</div>
          </div>
          <div class="vehicle-info-panel">
            <span class="eyebrow" dir="ltr">${car.brand} · ${car.year}</span>
            <h1 dir="ltr">${car.model}</h1>
            <span class="vehicle-status vehicle-status--${car.status}">${t(`ui.${car.status}`)}</span>
            <div class="vehicle-reference"><span>${t('ui.stockNumber')} <b dir="ltr">${car.stockNumber}</b></span><span>${t('ui.location')} <b>${car.location}</b></span></div>
            <strong class="vehicle-price" dir="ltr">${money(car.price,car.currency)}</strong>
            <div class="vehicle-description"><p>${description()}</p><button type="button" data-read-more aria-expanded="false">${t('ui.readMore')}</button></div>
            <div class="vehicle-key-specs">
              ${spec(t('ui.mileage'),`${car.mileage.toLocaleString('en-GB')} km`)}
              ${spec(t('ui.power'),`${car.power} HP`)}
              ${spec(t('ui.fuel'),fuel(car.fuel))}
              ${spec(t('ui.transmission'),car.transmission)}
              ${spec(t('ui.acceleration'),`${car.acceleration} s`)}
              ${spec(t('ui.drive'),translateValue(car.drive))}
              ${spec(t('ui.year'),car.year)}
              ${spec(t('ui.engine'),car.engine)}
              ${spec(t('ui.exterior'),translateValue(car.exteriorColor))}
              ${spec(t('ui.interior'),car.interiorColor || t('ui.availableOnRequest'))}
              ${spec(t('ui.topSpeed'),`${car.topSpeed} km/h`)}
            </div>
            <button class="btn vehicle-request" type="button" data-request-type="private-viewing" data-modal="${t('ui.bookPrivateViewing')}">${t('ui.bookPrivateViewing')} <span aria-hidden="true">→</span></button>
            <div class="vehicle-concierge-actions">
              <button type="button" data-request-type="video-tour" data-modal="${t('ui.requestVideoTour')}">${t('ui.requestVideoTour')}</button>
              <button type="button" data-request-type="concierge" data-modal="${t('ui.contactConcierge')}">${t('ui.contactConcierge')}</button>
              <button type="button" data-request-type="whatsapp" data-modal="${t('ui.whatsappUnavailable')}">${t('ui.whatsappConcierge')}</button>
            </div>
            <div class="vehicle-secondary-actions">
              <button type="button" data-detail-fav aria-pressed="${isFavorite}">${isFavorite ? t('ui.removeFromFavourites'):t('ui.addToFavourites')}</button>
              <button type="button" data-share>${t('ui.share')}</button>
              <a href="cars.html">${t('ui.backToCollection')}</a>
            </div>
          </div>
        </section>

        <section class="vehicle-section vehicle-overview"><span class="eyebrow">TABANJI AUTO</span><h2>${t('ui.vehicleOverview')}</h2><div class="vehicle-overview__copy"><p>${description()}</p><p>${t('ui.overviewSupport')}</p></div></section>
        <section class="vehicle-section"><span class="eyebrow">${t('ui.vehicleDetails')}</span><h2>${t('ui.vehicleSpecifications')}</h2>
          <div class="vehicle-accordions">
            <details open><summary>${t('ui.performance')}</summary><div>${spec(t('ui.power'),`${car.power} HP`)}${spec(t('ui.acceleration'),`${car.acceleration} s`)}${spec(t('ui.topSpeed'),`${car.topSpeed} km/h`)}</div></details>
            <details><summary>${t('ui.engine')}</summary><div>${spec(t('ui.engine'),car.engine)}${spec(t('ui.transmission'),car.transmission)}${spec(t('ui.fuel'),fuel(car.fuel))}${spec(t('ui.drive'),translateValue(car.drive))}</div></details>
            <details><summary>${t('ui.ownershipLocation')}</summary><div>${spec(t('ui.mileage'),`${car.mileage.toLocaleString('en-GB')} km`)}${spec(t('ui.bodyType'),translateValue(car.bodyType))}${spec(t('ui.colour'),translateValue(car.color))}${spec(t('ui.location'),car.location)}${spec(t('ui.doors'),car.doors)}${spec(t('ui.seats'),car.seats)}</div></details>
          </div>
        </section>

        <section class="vehicle-section"><span class="eyebrow">TABANJI STANDARD</span><h2>${t('ui.selectedEquipment')}</h2><ul class="vehicle-features">${(car.features?.[language()] || car.features?.en || []).map((feature) => `<li>${translateValue(feature)}</li>`).join('')}</ul></section>
        <section class="vehicle-section"><span class="eyebrow">TABANJI STANDARD</span><h2>${t('ui.provenanceHistory')}</h2><ul class="vehicle-history">${(car.history?.[language()] || car.history?.en || []).map((item) => `<li>${item}</li>`).join('')}</ul></section>
        <section class="tabanji-standard-compact"><div><b>01</b><span>${t('ui.independentInspection')}</span></div><div><b>02</b><span>${t('ui.verifiedDocumentation')}</span></div><div><b>03</b><span>${t('ui.privateTransaction')}</span></div><div><b>04</b><span>${t('ui.enclosedDelivery')}</span></div></section>
        <section class="vehicle-consultation"><div><span class="eyebrow">TABANJI AUTO</span><h2>${t('ui.privateConsultation')}</h2><p>${description()}</p></div><button class="btn" type="button" data-modal="${t('ui.requestThisVehicle')}">${t('ui.requestThisVehicle')}</button></section>
        <section class="vehicle-section vehicle-similar"><span class="eyebrow">TABANJI COLLECTION</span><h2>${t('ui.similarVehicles')}</h2><div class="vehicle-similar__track">${similarVehicles()}</div></section>
      </div>
      <div class="vehicle-sticky" aria-hidden="true"><strong dir="ltr">${money(car.price,car.currency)}</strong><button class="btn" type="button" data-request-type="private-viewing" data-modal="${t('ui.bookPrivateViewing')}">${t('ui.request')}</button></div>
      <div class="vehicle-toast" role="status" aria-live="polite"></div>`;
    configureConsultation();
    setSeo();
    wireGallery(gallery);
    wireActions();
  }

  function configureConsultation() {
    const form = document.querySelector('#leadForm');
    ['vehicleId','vehicleName','vehiclePrice'].forEach((name) => form.querySelector(`[name="${name}"]`)?.remove());
    const values = { vehicleId:car.id, vehicleName:`${car.brand} ${car.model} (${car.year})`, vehiclePrice:money(car.price,car.currency), stockNumber:car.stockNumber, requestType:'private-viewing' };
    Object.entries(values).forEach(([name,value]) => {
      const input = document.createElement('input'); input.type='hidden'; input.name=name; input.value=value; form.append(input);
    });
    const message = form.elements.message;
    if (message && !message.value.trim()) message.value = `${car.brand} ${car.model} · ${car.year} · ${car.id}`;
    root.querySelectorAll('[data-request-type]').forEach((button) => button.addEventListener('click',() => {
      form.elements.requestType.value=button.dataset.requestType;
      message.value=`${button.dataset.requestType} · ${car.brand} ${car.model} · ${car.year} · ${car.stockNumber}`;
    }));
  }

  function wireGallery(gallery) {
    const viewport = root.querySelector('.vehicle-gallery__viewport');
    const slides = [...root.querySelectorAll('.vehicle-gallery__slide')];
    const dots = [...root.querySelectorAll('[data-gallery-dot]')];
    const thumbs = [...root.querySelectorAll('[data-gallery-thumb]')];
    const counter = root.querySelector('.gallery-counter');
    const prev = root.querySelector('.gallery-arrow--prev');
    const next = root.querySelector('.gallery-arrow--next');
    const go = (index, behavior='smooth') => slides[Math.max(0,Math.min(index,slides.length-1))].scrollIntoView({ behavior, block:'nearest', inline:'start' });
    const setActive = (index) => {
      activeIndex=index; counter.value=`${index+1} / ${slides.length}`;
      dots.forEach((dot,i) => dot.classList.toggle('active',i===index));
      thumbs.forEach((thumb,i) => thumb.classList.toggle('active',i===index));
      thumbs[index]?.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' });
      prev.disabled=index===0; next.disabled=index===slides.length-1;
    };
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting && entry.intersectionRatio > .65) setActive(slides.indexOf(entry.target));
    }), { root:viewport, threshold:[.65,.85] });
    slides.forEach((slide) => observer.observe(slide));
    prev.addEventListener('click',()=>go(activeIndex-1)); next.addEventListener('click',()=>go(activeIndex+1));
    dots.forEach((dot) => dot.addEventListener('click',()=>go(Number(dot.dataset.galleryDot))));
    thumbs.forEach((thumb) => thumb.addEventListener('click',()=>go(Number(thumb.dataset.galleryThumb))));
    slides.forEach((slide,index) => slide.addEventListener('click',() => openLightbox(index,gallery,slide)));
    if (gallery.length > 1 && matchMedia('(pointer:fine)').matches) {
      let startX=0, startScroll=0, dragged=false;
      viewport.addEventListener('pointerdown',(event)=>{startX=event.clientX;startScroll=viewport.scrollLeft;dragged=false;viewport.setPointerCapture(event.pointerId);viewport.classList.add('is-dragging');});
      viewport.addEventListener('pointermove',(event)=>{if(!viewport.hasPointerCapture(event.pointerId))return;const delta=event.clientX-startX;if(Math.abs(delta)>5)dragged=true;viewport.scrollLeft=startScroll-delta;});
      viewport.addEventListener('pointerup',(event)=>{viewport.releasePointerCapture(event.pointerId);viewport.classList.remove('is-dragging');if(dragged)go(Math.round(viewport.scrollLeft/viewport.clientWidth));});
      slides.forEach((slide)=>slide.addEventListener('click',(event)=>{if(dragged){event.preventDefault();event.stopImmediatePropagation();dragged=false;}},true));
    }
    setActive(0);
  }

  function openLightbox(index, gallery, opener) {
    lightboxIndex=index; lightboxOpener=opener;
    lightbox.innerHTML = `<div class="vehicle-lightbox__viewport"><div class="vehicle-lightbox__track">${gallery.map((src,i)=>`<img src="${src}" alt="${car.brand} ${car.model}, ${t('ui.image')} ${i+1}" ${i===index?'loading="eager"':'loading="lazy"'}>`).join('')}</div></div><button class="vehicle-lightbox__close" type="button" aria-label="${t('ui.closeGallery')}">×</button><button class="vehicle-lightbox__prev" type="button" aria-label="${t('ui.previousImage')}">←</button><button class="vehicle-lightbox__next" type="button" aria-label="${t('ui.nextImage')}">→</button><output class="vehicle-lightbox__count" dir="ltr">${index+1} / ${gallery.length}</output>`;
    lightbox.hidden=false; lightbox.classList.add('open'); lightbox.setAttribute('aria-hidden','false'); document.body.classList.add('locked');
    const viewport=lightbox.querySelector('.vehicle-lightbox__viewport'); const images=[...lightbox.querySelectorAll('.vehicle-lightbox__track img')];
    const show=(next) => { lightboxIndex=Math.max(0,Math.min(next,images.length-1));images[lightboxIndex].scrollIntoView({behavior:'smooth',block:'nearest',inline:'start'});lightbox.querySelector('.vehicle-lightbox__count').value=`${lightboxIndex+1} / ${images.length}`;lightbox.querySelector('.vehicle-lightbox__prev').disabled=lightboxIndex===0;lightbox.querySelector('.vehicle-lightbox__next').disabled=lightboxIndex===images.length-1; };
    lightbox.querySelector('.vehicle-lightbox__close').addEventListener('click',closeLightbox);lightbox.querySelector('.vehicle-lightbox__prev').addEventListener('click',()=>show(lightboxIndex-1));lightbox.querySelector('.vehicle-lightbox__next').addEventListener('click',()=>show(lightboxIndex+1));
    const observer=new IntersectionObserver((entries)=>entries.forEach((entry)=>{if(entry.isIntersecting&&entry.intersectionRatio>.65){lightboxIndex=images.indexOf(entry.target);lightbox.querySelector('.vehicle-lightbox__count').value=`${lightboxIndex+1} / ${images.length}`;lightbox.querySelector('.vehicle-lightbox__prev').disabled=lightboxIndex===0;lightbox.querySelector('.vehicle-lightbox__next').disabled=lightboxIndex===images.length-1;}}),{root:viewport,threshold:.65});images.forEach((image)=>observer.observe(image));
    requestAnimationFrame(()=>{show(index);lightbox.querySelector('.vehicle-lightbox__close').focus();});
  }

  function closeLightbox() { lightbox.classList.remove('open');lightbox.hidden=true;lightbox.setAttribute('aria-hidden','true');document.body.classList.remove('locked');lightboxOpener?.focus(); }

  function wireActions() {
    root.querySelector('[data-read-more]').addEventListener('click',(event)=>{const expanded=event.currentTarget.getAttribute('aria-expanded')==='true';event.currentTarget.setAttribute('aria-expanded',String(!expanded));event.currentTarget.textContent=t(expanded?'ui.readMore':'ui.showLess');event.currentTarget.closest('.vehicle-description').classList.toggle('expanded',!expanded);});
    root.querySelector('[data-detail-fav]').addEventListener('click',(event)=>toggleFavourite(car.id,event.currentTarget));
    root.querySelectorAll('[data-similar-fav]').forEach((button)=>button.addEventListener('click',(event)=>{event.preventDefault();event.stopPropagation();toggleFavourite(button.dataset.similarFav,button);}));
    root.querySelector('[data-share]').addEventListener('click',shareVehicle);
    const sticky=root.querySelector('.vehicle-sticky');const primary=root.querySelector('.vehicle-request');const footer=document.querySelector('.footer');
    const state={primary:true,footer:false};const sync=()=>{const show=!state.primary&&!state.footer;sticky.classList.toggle('visible',show);sticky.setAttribute('aria-hidden',String(!show));sticky.inert=!show;};
    new IntersectionObserver(([entry])=>{state.primary=entry.isIntersecting;sync();},{threshold:.2}).observe(primary);
    new IntersectionObserver(([entry])=>{state.footer=entry.isIntersecting;sync();},{threshold:.05}).observe(footer);
  }

  function toggleFavourite(vehicleId, button) {
    const current=favorites();const active=current.includes(vehicleId);const updated=active?current.filter((item)=>item!==vehicleId):[...current,vehicleId];window.tabanjiStorage.write('tabanjiFavorites',updated);updateFavoriteCount();button.setAttribute('aria-pressed',String(!active));
    if(button.matches('[data-detail-fav]')) button.textContent=t(active?'ui.addToFavourites':'ui.removeFromFavourites');else button.textContent=active?'♡':'♥';
  }

  async function shareVehicle() {
    const payload={title:`${car.brand} ${car.model}`,text:description(),url:location.href};
    try { if(navigator.share) await navigator.share(payload);else { await navigator.clipboard.writeText(location.href);showToast(t('ui.linkCopied')); } } catch(error) { if(error.name!=='AbortError') showToast(t('ui.shareUnavailable')); }
  }
  function showToast(message){const toast=root.querySelector('.vehicle-toast');toast.textContent=message;toast.classList.add('visible');setTimeout(()=>toast.classList.remove('visible'),2400);}

  document.addEventListener('keydown',(event)=>{
    if(!lightbox.classList.contains('open')) return;
    if(event.key==='Escape') closeLightbox();
    if(event.key==='ArrowLeft') lightbox.querySelector(language()==='ar'?'.vehicle-lightbox__next':'.vehicle-lightbox__prev')?.click();
    if(event.key==='ArrowRight') lightbox.querySelector(language()==='ar'?'.vehicle-lightbox__prev':'.vehicle-lightbox__next')?.click();
    if(event.key==='Tab'){const controls=[...lightbox.querySelectorAll('button:not(:disabled)')];const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
  });

  updateFavoriteCount();
  document.querySelector('#favoritesShortcut').addEventListener('click',()=>{location.href='cars.html?favorites=1';});
  if (!car) { renderNotFound(); return; }
  render();
  window.addEventListener('tabanji:languagechange',()=>location.reload());
})();
