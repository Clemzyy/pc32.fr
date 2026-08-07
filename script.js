// La classe permet d'animer les blocs uniquement quand JavaScript est disponible.
document.documentElement.classList.add("js");

const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");

// L'ordre visuel suit le parcours naturel : services, tarifs, interventions, matériel puis présentation locale.
const servicesSection = document.querySelector("#services");
const pricingSection = document.querySelector("#tarifs");
const interventionsSection = document.querySelector("#interventions");
const equipmentSection = document.querySelector("#materiel");
const aboutSection = document.querySelector("#a-propos");

if (servicesSection && pricingSection && interventionsSection) {
  servicesSection.after(pricingSection);
  pricingSection.after(interventionsSection);
}

if (equipmentSection && aboutSection) {
  equipmentSection.after(aboutSection);
}
const toast = document.querySelector("#toast");

function closeMenu() {
  if (!navToggle || !siteNav) return;
  navToggle.setAttribute("aria-expanded", "false");
  siteNav.classList.remove("is-open");
  document.body.classList.remove("nav-open");
}

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const willOpen = navToggle.getAttribute("aria-expanded") !== "true";
    navToggle.setAttribute("aria-expanded", String(willOpen));
    siteNav.classList.toggle("is-open", willOpen);
    document.body.classList.toggle("nav-open", willOpen);
  });

  siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
}

const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealItems = document.querySelectorAll(".reveal");
const mobileCall = document.querySelector(".mobile-call");
const heroSection = document.querySelector(".hero");
const contactSection = document.querySelector("#contact");
const scrollTopButton = document.querySelector(".scroll-top");

if (scrollTopButton) {
  const scrollTopProgress = scrollTopButton.querySelector(".scroll-top__progress");
  const ringCircumference = 113.1;

  const updateScrollTop = () => {
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollableHeight > 0
      ? Math.min(1, Math.max(0, window.scrollY / scrollableHeight))
      : 0;
    const offset = ringCircumference * (1 - progress);

    scrollTopProgress?.style.setProperty("stroke-dashoffset", `${offset}px`);
    scrollTopButton.classList.toggle("is-visible", window.scrollY > window.innerHeight * 0.45);
  };

  scrollTopButton.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "auto" });
  });

  window.addEventListener("scroll", updateScrollTop, { passive: true });
  window.addEventListener("resize", updateScrollTop);
  updateScrollTop();
}

if (mobileCall) {
  const updateMobileCall = () => {
    const showAfter = heroSection
      ? heroSection.offsetTop + heroSection.offsetHeight * 0.8
      : 600;
    const contactRect = contactSection?.getBoundingClientRect();
    const contactIsVisible = contactRect
      ? contactRect.top < window.innerHeight && contactRect.bottom > 0
      : false;
    mobileCall.classList.toggle(
      "is-visible",
      window.scrollY > showAfter && !contactIsVisible
    );
  };

  window.addEventListener("scroll", updateMobileCall, { passive: true });
  window.addEventListener("resize", updateMobileCall);
  updateMobileCall();
}

if (reducedMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver(
    (entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        currentObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px" }
  );

  revealItems.forEach((item) => observer.observe(item));
}

const servicePresentations = {
  repair: {
    kicker: "Dépannage & réparation",
    title: "Votre ordinateur retrouve un fonctionnement fiable",
    description: "Nous allons à l’origine de la panne, puis nous validons ensemble une solution claire avant toute intervention.",
    need: "Dépannage ou réparation",
    steps: [
      ["Nous diagnostiquons", "La panne est analysée précisément pour éviter les réparations inutiles."],
      ["Nous réparons", "Windows est remis en état ou la pièce défaillante est remplacée avec votre accord."],
      ["Nous vérifions avec vous", "Le résultat est testé et nous vous expliquons simplement ce qui a été fait."],
    ],
  },
  website: {
    kicker: "Création de sites internet",
    title: "Un site clair, utile et pensé pour votre activité",
    description: "Nous concevons des sites rapides et faciles à utiliser, avec une identité qui vous ressemble et une base solide pour évoluer.",
    need: "Création ou refonte de site internet",
    page: "creation-sites.html",
    steps: [
      ["Nous clarifions votre projet", "Objectifs, contenus et clients sont définis pour construire un site vraiment utile."],
      ["Nous créons une expérience simple", "La structure, le design et la version mobile sont pensés pour guider vos visiteurs."],
      ["Nous mettons votre site en ligne", "Le site est optimisé, sécurisé et livré avec les repères nécessaires pour le faire vivre."],
    ],
  },
  security: {
    kicker: "Sécurité & nettoyage",
    title: "Un PC propre, protégé et plus serein à utiliser",
    description: "L’objectif n’est pas seulement de supprimer les menaces, mais aussi de vous aider à éviter qu’elles reviennent.",
    need: "Virus, sécurité ou publicités",
    steps: [
      ["Nous analysons votre PC", "Virus, publicités et logiciels indésirables sont recherchés en profondeur."],
      ["Nous supprimons les problèmes", "Les menaces sont neutralisées et les réglages à risque sont corrigés."],
      ["Nous renforçons votre autonomie", "Vous repartez avec une protection adaptée et des conseils simples et efficaces."],
    ],
  },
  network: {
    kicker: "Internet, réseau & Wi-Fi",
    title: "Une connexion stable dans les pièces où vous en avez besoin",
    description: "Nous identifions la vraie cause des coupures ou lenteurs avant de régler et sécuriser votre installation.",
    need: "Internet, réseau ou Wi-Fi",
    steps: [
      ["Nous mesurons le réseau", "Le débit, la couverture Wi-Fi et les équipements connectés sont contrôlés."],
      ["Nous reconnectons vos appareils", "Box, ordinateurs, imprimantes et prises réseau sont configurés correctement."],
      ["Nous stabilisons l’ensemble", "La couverture et la sécurité sont optimisées pour un usage quotidien fiable."],
    ],
  },
  data: {
    kicker: "Sauvegarde & données",
    title: "Vos fichiers importants sont récupérés puis mieux protégés",
    description: "Nous intervenons avec prudence sur vos supports et mettons en place une sauvegarde adaptée à vos habitudes.",
    need: "Sauvegarde ou récupération de données",
    steps: [
      ["Nous évaluons la situation", "Le support et les fichiers sont examinés sans aggraver une éventuelle panne."],
      ["Nous récupérons le possible", "Photos, documents et dossiers sont restaurés lorsque leur état le permet."],
      ["Nous préparons la suite", "Une sauvegarde simple, automatique et vérifiable est mise en place avec vous."],
    ],
  },
  hardware: {
    kicker: "Matériel neuf & occasion",
    title: "Un ordinateur choisi pour vous et prêt à travailler",
    description: "Pas de puissance inutile : chaque composant est sélectionné selon votre usage, votre budget et la durée de vie recherchée.",
    need: "Achat et installation de matériel",
    steps: [
      ["Nous définissons vos besoins", "Bureautique, photos, entreprise ou jeu : nous partons de votre usage réel."],
      ["Nous préparons le matériel", "L’ordinateur est sélectionné, testé, mis à jour et configuré à l’atelier."],
      ["Nous vous le remettons prêt", "Vos données et logiciels sont installés pour une prise en main immédiate."],
    ],
  },
  guidance: {
    kicker: "Conseil & accompagnement",
    title: "Des explications à votre rythme pour devenir autonome",
    description: "Nous adaptons chaque séance à votre niveau, avec des mots simples et des exemples directement utiles.",
    need: "Conseil ou formation",
    steps: [
      ["Nous partons de vos usages", "Vos besoins et les points qui vous bloquent sont identifiés sans jargon."],
      ["Nous avançons pas à pas", "Chaque manipulation est montrée puis refaite ensemble sur votre matériel."],
      ["Vous gardez les bons repères", "Des méthodes simples vous permettent de continuer seul et en confiance."],
    ],
  },
};

if (document.documentElement.lang === "en") {
  Object.assign(servicePresentations, {
    website: {
      kicker: "Website creation",
      title: "A clear, useful website built around your business",
      description: "We create fast, easy-to-use websites with an identity that feels like you and a solid foundation for future growth.",
      need: "Website creation or redesign",
      page: "creation-sites-en.html",
      steps: [
        ["We clarify your project", "We define your goals, content and audience to build a genuinely useful website."],
        ["We create a simple experience", "The structure, design and mobile version are shaped to guide your visitors."],
        ["We put your site online", "Your website is optimised, secured and delivered with the guidance needed to keep it alive."],
      ],
    },
    repair: {
      kicker: "Troubleshooting & repairs",
      title: "A reliable computer you can count on",
      description: "We find the root cause, then agree a clear solution with you before any work begins.",
      need: "Troubleshooting or repairs",
      steps: [
        ["We diagnose the fault", "We identify the problem precisely so you avoid unnecessary repairs."],
        ["We fix what is needed", "We restore Windows or replace the faulty part with your approval."],
        ["We check everything with you", "We test the result and explain clearly what has been done."],
      ],
    },
    security: {
      kicker: "Security & clean-up",
      title: "A clean, protected PC that feels safer to use",
      description: "The goal is not only to remove threats, but also to help you prevent them from coming back.",
      need: "Viruses, security or pop-ups",
      steps: [
        ["We scan your PC", "We look thoroughly for viruses, pop-ups and unwanted software."],
        ["We remove the problems", "We neutralise threats and correct risky settings."],
        ["We strengthen your confidence", "You leave with suitable protection and simple, practical advice."],
      ],
    },
    network: {
      kicker: "Internet, networks & Wi-Fi",
      title: "A stable connection wherever you need it",
      description: "We identify the real cause of slowdowns or drop-outs before securing and adjusting your set-up.",
      need: "Internet, network or Wi-Fi",
      steps: [
        ["We measure the network", "We check speed, Wi-Fi coverage and connected equipment."],
        ["We reconnect your devices", "Routers, computers, printers and network sockets are configured properly."],
        ["We make it reliable", "Coverage and security are optimised for everyday use."],
      ],
    },
    data: {
      kicker: "Backups & data",
      title: "Your important files recovered and better protected",
      description: "We work carefully on your storage devices and put a backup plan in place that fits your habits.",
      need: "Data backup or recovery",
      steps: [
        ["We assess the situation", "We examine the device and files without making a possible fault worse."],
        ["We recover what we can", "Photos, documents and folders are restored whenever their condition allows."],
        ["We prepare the next step", "We set up a simple, automatic and checkable backup with you."],
      ],
    },
    hardware: {
      kicker: "New & refurbished equipment",
      title: "A computer chosen for you and ready to work",
      description: "No unnecessary power: every component is selected for your needs, budget and expected lifespan.",
      need: "Equipment purchase and installation",
      steps: [
        ["We define your needs", "Office work, photos, business or gaming: we start with how you really use it."],
        ["We prepare the equipment", "The computer is selected, tested, updated and configured in our workshop."],
        ["We hand it over ready", "Your data and software are installed so you can get started straight away."],
      ],
    },
    guidance: {
      kicker: "Advice & guidance",
      title: "Clear explanations at your pace",
      description: "We adapt each session to your level, using plain language and examples that are useful to you.",
      need: "Advice or training",
      steps: [
        ["We start with your habits", "We identify what you need and what is holding you back, without jargon."],
        ["We move forward step by step", "Each action is shown and then practised together on your equipment."],
        ["You keep the right habits", "Simple methods help you continue independently and confidently."],
      ],
    },
  });
}

const serviceModal = document.querySelector("#service-modal");
const serviceDialog = serviceModal?.querySelector(".service-modal__dialog");
const serviceVisual = serviceModal?.querySelector("[data-service-visual]");
const serviceTitle = serviceModal?.querySelector("[data-service-title]");
const serviceKicker = serviceModal?.querySelector("[data-service-kicker]");
const serviceDescription = serviceModal?.querySelector("[data-service-description]");
const serviceSteps = serviceModal?.querySelector("[data-service-steps]");
const serviceCta = serviceModal?.querySelector("[data-service-cta]");
const servicePageLink = serviceModal?.querySelector("[data-service-page-link]");
let serviceModalTrigger = null;
let selectedServiceNeed = "";

function createServiceStep(step, index) {
  const item = document.createElement("li");
  const number = document.createElement("span");
  const copy = document.createElement("div");
  const title = document.createElement("strong");
  const description = document.createElement("p");

  item.className = "service-modal__step";
  number.className = "service-modal__step-number";
  number.textContent = `0${index + 1}`;
  title.textContent = step[0];
  description.textContent = step[1];
  copy.append(title, description);
  item.append(number, copy);
  return item;
}

function createWebsitePortfolio() {
  const english = document.documentElement.lang === "en";
  const projects = [
    {
      href: "https://location-vacances-lebigourdan.fr",
      image: "assets/portfolio/domaine-du-bigourdan-apercu.jpg",
      title: "Domaine du Bigourdan",
      alt: english ? "Preview of the Domaine du Bigourdan website" : "Aperçu du site Domaine du Bigourdan",
    },
    {
      href: "https://milleans.fr",
      image: "assets/portfolio/milleans-apercu.png",
      title: "Milleans",
      alt: english ? "Preview of the Milleans website" : "Aperçu du site Milleans",
    },
    {
      href: "https://terreblanche.fr",
      image: "assets/portfolio/terre-blanche-apercu.png",
      title: "Terre Blanche",
      alt: english ? "Preview of the Terre Blanche website" : "Aperçu du site Terre Blanche",
    },
  ];

  return `<div class="service-portfolio" aria-label="${english ? "Website examples" : "Exemples de sites internet"}">
    ${projects.map((project, index) => `<a class="service-portfolio__card${index === 0 ? " service-portfolio__card--primary" : ""}" href="${project.href}" target="_blank" rel="noopener noreferrer">
      <span class="service-portfolio__preview"><img src="${project.image}" alt="${project.alt}" loading="lazy"><span class="service-portfolio__arrow" aria-hidden="true">→</span></span>
      <span class="service-portfolio__label">${project.title}</span>
    </a>`).join("")}
  </div>`;
}

function openServicePresentation(serviceKey, trigger) {
  const presentation = servicePresentations[serviceKey];
  const animationTemplate = document.querySelector(`#service-animation-${serviceKey}`);
  if (!serviceModal || !serviceDialog || !presentation || !animationTemplate) return;

  serviceModalTrigger = trigger;
  selectedServiceNeed = presentation.need;
  if (serviceKicker) serviceKicker.textContent = presentation.kicker;
  if (serviceTitle) serviceTitle.textContent = presentation.title;
  if (serviceDescription) serviceDescription.textContent = presentation.description;
  if (servicePageLink) {
    servicePageLink.hidden = !presentation.page;
    if (presentation.page) servicePageLink.href = presentation.page;
  }
  if (serviceVisual) {
    serviceVisual.classList.toggle("service-modal__visual--portfolio", serviceKey === "website");
    if (serviceKey === "website") {
      serviceVisual.removeAttribute("aria-hidden");
      serviceVisual.innerHTML = createWebsitePortfolio();
    } else {
      serviceVisual.setAttribute("aria-hidden", "true");
      serviceVisual.replaceChildren(animationTemplate.content.cloneNode(true));
    }
  }
  if (serviceSteps) {
    serviceSteps.replaceChildren(...presentation.steps.map(createServiceStep));
  }

  serviceModal.hidden = false;
  document.body.classList.add("modal-open");
  window.requestAnimationFrame(() => {
    serviceModal.querySelector(".service-modal__close")?.focus();
  });
}

function closeServicePresentation({ restoreFocus = true } = {}) {
  if (!serviceModal || serviceModal.hidden) return;
  serviceModal.hidden = true;
  document.body.classList.remove("modal-open");
  serviceVisual?.replaceChildren();
  serviceVisual?.classList.remove("service-modal__visual--portfolio");
  serviceVisual?.setAttribute("aria-hidden", "true");
  if (restoreFocus) serviceModalTrigger?.focus();
}

document.querySelectorAll("[data-service-demo]").forEach((button) => {
  button.addEventListener("click", () => {
    openServicePresentation(button.dataset.serviceDemo, button);
  });
});

document.querySelectorAll("[data-service-card]").forEach((card) => {
  card.addEventListener("click", (event) => {
    if (event.target.closest("button, a, input, select, textarea")) return;
    card.querySelector("[data-service-demo]")?.click();
  });
});

serviceModal?.querySelectorAll("[data-service-close]").forEach((button) => {
  button.addEventListener("click", () => closeServicePresentation());
});

serviceCta?.addEventListener("click", () => {
  const needSelect = document.querySelector('#contact-form select[name="besoin"]');
  if (needSelect && selectedServiceNeed) {
    const matchingOption = Array.from(needSelect.options).find(
      (option) => option.textContent.trim() === selectedServiceNeed
    );
    if (matchingOption) needSelect.value = matchingOption.value;
  }
  closeServicePresentation({ restoreFocus: false });
  window.setTimeout(() => needSelect?.focus({ preventScroll: true }), reducedMotion ? 0 : 500);
});

document.addEventListener("keydown", (event) => {
  if (!serviceModal || serviceModal.hidden || !serviceDialog) return;

  if (event.key === "Escape") {
    event.preventDefault();
    closeServicePresentation();
    return;
  }

  if (event.key !== "Tab") return;
  const focusableItems = Array.from(
    serviceDialog.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
  );
  if (!focusableItems.length) return;
  const firstItem = focusableItems[0];
  const lastItem = focusableItems[focusableItems.length - 1];

  if (event.shiftKey && document.activeElement === firstItem) {
    event.preventDefault();
    lastItem.focus();
  } else if (!event.shiftKey && document.activeElement === lastItem) {
    event.preventDefault();
    firstItem.focus();
  }
});

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 3800);
}

const mapFrame = document.querySelector("[data-google-map]");
const mapPlaceholder = document.querySelector("[data-map-placeholder]");
const cookiePanel = document.querySelector("[data-cookie-panel]");
const cookiePreferenceKey = "pc32_google_map_consent";
const cookiePreferenceLifetime = 1000 * 60 * 60 * 24 * 180;

function readMapPreference() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(cookiePreferenceKey) || "null");
    if (!stored || !["accepted", "refused"].includes(stored.value) || stored.expires < Date.now()) {
      window.localStorage.removeItem(cookiePreferenceKey);
      return null;
    }
    return stored.value;
  } catch {
    return null;
  }
}

function saveMapPreference(value) {
  try {
    window.localStorage.setItem(
      cookiePreferenceKey,
      JSON.stringify({ value, expires: Date.now() + cookiePreferenceLifetime })
    );
  } catch {
    // Le choix reste valable pour la page en cours si le stockage est indisponible.
  }
}

function loadGoogleMap() {
  if (!mapFrame) return;
  if (!mapFrame.src) mapFrame.src = mapFrame.dataset.src || "";
  mapFrame.hidden = false;
  if (mapPlaceholder) mapPlaceholder.hidden = true;
}

function blockGoogleMap() {
  if (!mapFrame) return;
  mapFrame.removeAttribute("src");
  mapFrame.hidden = true;
  if (mapPlaceholder) mapPlaceholder.hidden = false;
}

function closeCookiePanel() {
  if (cookiePanel) cookiePanel.hidden = true;
}

function acceptGoogleMap() {
  saveMapPreference("accepted");
  loadGoogleMap();
  closeCookiePanel();
}

function rejectGoogleMap() {
  saveMapPreference("refused");
  blockGoogleMap();
  closeCookiePanel();
}

if (mapFrame) {
  const preference = readMapPreference();
  if (preference === "accepted") {
    loadGoogleMap();
  } else {
    blockGoogleMap();
    if (preference === null && cookiePanel) cookiePanel.hidden = false;
  }
}

document.querySelectorAll("[data-cookie-accept], [data-map-accept]").forEach((button) => {
  button.addEventListener("click", acceptGoogleMap);
});

document.querySelectorAll("[data-cookie-reject]").forEach((button) => {
  button.addEventListener("click", rejectGoogleMap);
});

document.querySelectorAll("[data-cookie-manage]").forEach((button) => {
  button.addEventListener("click", () => {
    if (!cookiePanel) return;
    cookiePanel.hidden = false;
    cookiePanel.querySelector("[data-cookie-reject]")?.focus();
  });
});

const contactForm = document.querySelector("#contact-form");

if (contactForm) {
  const successPanel = contactForm.querySelector(".form-success");
  const editRequestButton = contactForm.querySelector(".form-success__back");
  const formControls = contactForm.querySelectorAll("input, select, textarea, .form__submit");
  const submitLabel = contactForm.querySelector(".form__submit-label");
  const errorMessage = contactForm.querySelector(".form-error");
  const startedAt = contactForm.querySelector('[name="form_started_at"]');

  const resetStartedAt = () => {
    if (startedAt) startedAt.value = String(Date.now());
  };

  const setFormDisabled = (disabled) => {
    formControls.forEach((control) => {
      control.disabled = disabled;
    });
  };

  const showFormError = (message) => {
    if (!errorMessage) return;
    errorMessage.textContent = message;
    errorMessage.hidden = false;
  };

  resetStartedAt();

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!contactForm.reportValidity()) return;

    if (errorMessage) {
      errorMessage.textContent = "";
      errorMessage.hidden = true;
    }

    const formData = new FormData(contactForm);
    contactForm.classList.add("is-sending");
    setFormDisabled(true);
    if (submitLabel) submitLabel.textContent = "Envoi en cours…";

    try {
      const response = await fetch(contactForm.action, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        throw new Error(result?.message || "L’envoi a échoué. Veuillez réessayer dans quelques instants.");
      }

      contactForm.classList.remove("is-sending");
      contactForm.classList.add("is-sent");
      successPanel?.setAttribute("aria-hidden", "false");
      window.pc32Track?.("demande_contact", { method: "formulaire" });
      contactForm.reset();
      resetStartedAt();

      window.requestAnimationFrame(() => {
        contactForm.scrollIntoView({
          behavior: "auto",
          block: "center",
        });
      });
    } catch (error) {
      contactForm.classList.remove("is-sending");
      setFormDisabled(false);
      if (submitLabel) submitLabel.textContent = "Envoyer ma demande";
      showFormError(error instanceof Error ? error.message : "L’envoi a échoué. Veuillez réessayer.");
    }
  });

  editRequestButton?.addEventListener("click", () => {
    contactForm.classList.remove("is-sent");
    successPanel?.setAttribute("aria-hidden", "true");
    setFormDisabled(false);
    if (submitLabel) submitLabel.textContent = "Envoyer ma demande";
    resetStartedAt();
  });
}

window.addEventListener("load", () => {
  if (!window.location.hash || window.location.hash === "#") return;

  const target = document.querySelector(window.location.hash);
  if (!target) return;

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const previousBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
      target.scrollIntoView({ behavior: "auto", block: "start" });
      document.documentElement.style.scrollBehavior = previousBehavior;
    });
  });
});
