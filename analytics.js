/* ------------------------------------------------------------------
   Mesure d'audience — Google Analytics 4

   Ce fichier est charge sur toutes les pages du site. Rien n'est envoye
   a Google tant que le visiteur n'a pas accepte explicitement, et aucun
   script Google n'est telecharge avant ce consentement.

   POUR ACTIVER LA MESURE : remplacer la valeur de analyticsId ci-dessous
   par l'identifiant fourni par Google Analytics (format G-XXXXXXXXXX).
   Tant que la valeur d'exemple est en place, la mesure reste inactive.
------------------------------------------------------------------- */
(() => {
  const analyticsId = "G-W2NGWMG66W";
  const analyticsConfigured = /^G-[A-Z0-9]{6,}$/.test(analyticsId) && !analyticsId.includes("XXXX");

  const analyticsKey = "pc32_analytics_consent";
  const mapKey = "pc32_google_map_consent";
  const consentLifetime = 1000 * 60 * 60 * 24 * 180;

  let analyticsLoaded = false;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  function readConsent(key) {
    try {
      const stored = JSON.parse(window.localStorage.getItem(key) || "null");
      if (!stored || !["accepted", "refused"].includes(stored.value) || stored.expires < Date.now()) {
        window.localStorage.removeItem(key);
        return null;
      }
      return stored.value;
    } catch {
      return null;
    }
  }

  function saveConsent(key, value) {
    try {
      window.localStorage.setItem(
        key,
        JSON.stringify({ value, expires: Date.now() + consentLifetime })
      );
    } catch {
      // Le choix reste valable pour la page en cours si le stockage est indisponible.
    }
  }

  function loadAnalytics() {
    if (analyticsLoaded || !analyticsConfigured) return;
    analyticsLoaded = true;

    const tag = document.createElement("script");
    tag.async = true;
    tag.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(analyticsId);
    document.head.appendChild(tag);

    gtag("js", new Date());
    gtag("config", analyticsId, { anonymize_ip: true });
  }

  /* Enregistre une conversion. Sans consentement, l'appel ne fait rien.
     Expose globalement pour que script.js puisse signaler l'envoi du formulaire. */
  window.pc32Track = function (name, params) {
    if (!analyticsLoaded) return;
    gtag("event", name, params || {});
  };

  /* Les appels telephoniques sont la conversion principale du site :
     sept liens tel: sur l'accueil contre un seul formulaire. */
  document.addEventListener("click", (event) => {
    const link = event.target.closest?.('a[href^="tel:"]');
    if (!link) return;
    window.pc32Track("contact_telephone", {
      method: "telephone",
      page: window.location.pathname,
    });
  });

  /* Le meme couple de boutons vaut pour les deux finalites : mesure
     d'audience et carte Google. script.js gere la carte de son cote. */
  document.querySelectorAll("[data-cookie-accept], [data-map-accept]").forEach((button) => {
    button.addEventListener("click", () => {
      saveConsent(analyticsKey, "accepted");
      saveConsent(mapKey, "accepted");
      loadAnalytics();
      const panel = document.querySelector("[data-cookie-panel]");
      if (panel) panel.hidden = true;
    });
  });

  document.querySelectorAll("[data-cookie-reject]").forEach((button) => {
    button.addEventListener("click", () => {
      saveConsent(analyticsKey, "refused");
      saveConsent(mapKey, "refused");
      const panel = document.querySelector("[data-cookie-panel]");
      if (panel) panel.hidden = true;
    });
  });

  const preference = readConsent(analyticsKey);
  if (preference === "accepted") {
    loadAnalytics();
  } else if (preference === null) {
    const panel = document.querySelector("[data-cookie-panel]");
    if (panel) panel.hidden = false;
  }
})();
