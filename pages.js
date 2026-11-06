(() => {
  // Menu mobile et gestion des cookies pour les pages Logiciels et CapTure (pages.js, à la racine du site).
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
  const root = window.location.pathname.includes("/capture/") ? "../" : "";
  document.querySelectorAll("[data-cookie-manage]").forEach((button) => button.addEventListener("click", () => {
    window.localStorage.removeItem("pc32_google_map_consent");
    window.localStorage.removeItem("pc32_analytics_consent");
    window.location.href = `${root}index.html#contact`;
  }));
  const year = document.querySelector("#year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
