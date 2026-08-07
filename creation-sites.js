(() => {
  document.documentElement.classList.add("js");
  const navToggle = document.querySelector(".nav-toggle");
  const siteNav = document.querySelector(".site-nav");
  if (navToggle && siteNav) {
    navToggle.addEventListener("click", () => {
      const isOpen = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!isOpen));
      siteNav.classList.toggle("is-open", !isOpen);
    });
    siteNav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
      navToggle.setAttribute("aria-expanded", "false");
      siteNav.classList.remove("is-open");
    }));
  }
  const isEnglish = document.documentElement.lang === "en";
  document.querySelectorAll("[data-cookie-manage]").forEach((button) => button.addEventListener("click", () => {
    window.localStorage.removeItem("pc32_google_map_consent");
    window.localStorage.removeItem("pc32_analytics_consent");
    window.location.href = `${isEnglish ? "index-en.html" : "index.html"}#contact`;
  }));
  const labels = isEnglish
    ? {
        close: "Close this presentation",
        cta: "Talk about your project",
        demo: "View the detailed animation for",
        steps: {
          brief: ["We listen", "We organise", "We agree the direction"],
          design: ["We create the layout", "We adapt it for mobile", "We refine it together"],
          launch: ["We test every page", "We secure the essentials", "We launch with confidence"],
          editor: ["We prepare your workspace", "You update your content", "You publish independently"],
          ownership: ["We register your domain", "Your contract stays in your name", "We keep costs under control"],
        },
      }
    : {
        close: "Fermer cette présentation",
        cta: "Parler de votre projet",
        demo: "Voir l’animation détaillée de",
        steps: {
          brief: ["Nous vous écoutons", "Nous organisons les priorités", "Nous validons la direction"],
          design: ["Nous créons la structure", "Nous adaptons au mobile", "Nous affinons avec vous"],
          launch: ["Nous testons chaque page", "Nous sécurisons l’essentiel", "Nous lançons sereinement"],
          editor: ["Nous préparons votre espace", "Vous modifiez vos contenus", "Vous publiez en autonomie"],
          ownership: ["Nous réservons votre domaine", "Le contrat reste à votre nom", "Nous maîtrisons les coûts"],
        },
      };

  const interactiveVisuals = [
    [".site-step__visual--brief", "brief"],
    [".site-step__visual--design", "design"],
    [".site-step__visual--launch", "launch"],
    [".commitment-visual--editor", "editor"],
    [".commitment-visual--ownership", "ownership"],
  ];

  const modal = document.createElement("div");
  modal.className = "creation-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="creation-modal__backdrop" data-creation-close></div>
    <section class="creation-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="creation-modal-title">
      <button class="creation-modal__close" type="button" data-creation-close aria-label="${labels.close}">×</button>
      <div class="creation-modal__scene" data-creation-scene aria-hidden="true"></div>
      <div class="creation-modal__content">
        <p class="eyebrow" data-creation-kicker></p>
        <h2 id="creation-modal-title" data-creation-title></h2>
        <ol class="creation-modal__steps" data-creation-steps></ol>
        <a class="button button--primary" href="${isEnglish ? "index-en.html#contact" : "index.html#contact"}">${labels.cta} <span aria-hidden="true">→</span></a>
      </div>
    </section>`;
  document.body.append(modal);

  const scene = modal.querySelector("[data-creation-scene]");
  const title = modal.querySelector("[data-creation-title]");
  const kicker = modal.querySelector("[data-creation-kicker]");
  const steps = modal.querySelector("[data-creation-steps]");
  let lastTrigger = null;

  function makeScene(key) {
    const glyphs = {
      brief: ["●", "≡", "✓"],
      design: ["▦", "▯", "✦"],
      launch: ["✓", "⌁", "↗"],
      editor: ["✎", "⌨", "✓"],
      ownership: ["◎", "⌁", "✓"],
    };
    return `<div class="creation-modal__timeline creation-modal__timeline--${key}">
      <span class="creation-modal__line"></span>
      ${glyphs[key].map((glyph, index) => `<span class="creation-modal__node creation-modal__node--${index + 1}"><i>${glyph}</i><b>0${index + 1}</b></span>`).join("")}
    </div>`;
  }

  function openDemo(key, trigger) {
    const card = trigger.closest("article");
    const heading = card?.querySelector("h3")?.textContent?.trim() || "";
    const number = card?.querySelector(".site-step__number, .site-creation__commitment-icon")?.textContent?.trim() || "";
    const items = labels.steps[key];
    if (!items) return;

    lastTrigger = trigger;
    title.textContent = heading;
    kicker.textContent = number;
    scene.className = `creation-modal__scene creation-modal__scene--${key}`;
    scene.innerHTML = makeScene(key);
    steps.replaceChildren(...items.map((item, index) => {
      const entry = document.createElement("li");
      entry.innerHTML = `<span>0${index + 1}</span><strong>${item}</strong>`;
      return entry;
    }));
    modal.hidden = false;
    document.body.classList.add("creation-modal-open");
    window.requestAnimationFrame(() => modal.querySelector(".creation-modal__close")?.focus());
  }

  function closeDemo() {
    if (modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove("creation-modal-open");
    scene.replaceChildren();
    lastTrigger?.focus();
  }

  interactiveVisuals.forEach(([selector, key]) => {
    document.querySelectorAll(selector).forEach((visual) => {
      const cardHeading = visual.closest("article")?.querySelector("h3")?.textContent?.trim() || "";
      visual.classList.add("creation-demo");
      visual.setAttribute("role", "button");
      visual.setAttribute("tabindex", "0");
      visual.setAttribute("aria-label", `${labels.demo} ${cardHeading}`);
      visual.addEventListener("click", () => openDemo(key, visual));
      visual.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openDemo(key, visual);
        }
      });
    });
  });

  const revealTargets = document.querySelectorAll(
    ".site-creation .section-heading, .site-step, .site-creation__commitments article, .site-creation__references .section-heading, .site-creation__links a, .site-creation__price"
  );
  revealTargets.forEach((element) => element.classList.add("creation-reveal"));
  if (window.matchMedia("(min-width: 861px) and (prefers-reduced-motion: no-preference)").matches && "IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }),
      { threshold: 0.12, rootMargin: "0px 0px -40px" }
    );
    revealTargets.forEach((element) => revealObserver.observe(element));
  } else {
    revealTargets.forEach((element) => element.classList.add("is-visible"));
  }

  modal.querySelectorAll("[data-creation-close]").forEach((element) => element.addEventListener("click", closeDemo));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closeDemo();
  });
})();
