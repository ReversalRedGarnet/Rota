/* ==========================================================================
   Rotaract Club of Honiara — shared site behaviour
   --------------------------------------------------------------------------
   Plain JavaScript, no libraries, no build step. Each block below is
   independent — if a page doesn't contain the relevant elements, that block
   simply does nothing.
   ========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------------------
     1. MOBILE MENU
     Opens the full-screen drawer, locks background scrolling, closes on
     Escape or when a link is tapped.
     ------------------------------------------------------------------------ */
  function initMobileMenu() {
    var toggle = document.querySelector(".nav-toggle");
    var drawer = document.getElementById("mobile-nav");
    if (!toggle || !drawer) return;

    var closeBtn = drawer.querySelector(".mobile-close");

    function open() {
      drawer.classList.add("open");
      toggle.setAttribute("aria-expanded", "true");
      document.body.classList.add("menu-open");
      if (closeBtn) closeBtn.focus();
    }

    function close() {
      drawer.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("menu-open");
    }

    toggle.addEventListener("click", function () {
      if (drawer.classList.contains("open")) close();
      else open();
    });

    if (closeBtn) closeBtn.addEventListener("click", close);

    drawer.addEventListener("click", function (e) {
      if (e.target.closest("a")) close();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawer.classList.contains("open")) {
        close();
        toggle.focus();
      }
    });
  }

  /* ------------------------------------------------------------------------
     2. DESKTOP "MORE" DROPDOWN
     ------------------------------------------------------------------------ */
  function initSubmenu() {
    var buttons = document.querySelectorAll(".submenu-btn");
    if (!buttons.length) return;

    function closeAll() {
      buttons.forEach(function (btn) {
        btn.setAttribute("aria-expanded", "false");
        var panel = document.getElementById(btn.getAttribute("aria-controls"));
        if (panel) panel.classList.remove("open");
      });
    }

    buttons.forEach(function (btn) {
      var panel = document.getElementById(btn.getAttribute("aria-controls"));
      if (!panel) return;

      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var isOpen = btn.getAttribute("aria-expanded") === "true";
        closeAll();
        if (!isOpen) {
          btn.setAttribute("aria-expanded", "true");
          panel.classList.add("open");
        }
      });
    });

    document.addEventListener("click", closeAll);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeAll();
    });
  }

  /* ------------------------------------------------------------------------
     3. SCROLL-IN ANIMATION
     Any element with class="reveal" fades up as it enters the viewport.
     ------------------------------------------------------------------------ */
  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("in"); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -60px 0px", threshold: 0.08 });

    items.forEach(function (el) { observer.observe(el); });
  }

  /* ------------------------------------------------------------------------
     4. STAT COUNT-UP
     Animates any .stat-num that has a data-count value. Elements without
     data-count (e.g. "00" placeholders) are left exactly as written.
     ------------------------------------------------------------------------ */
  function initCounters() {
    var nums = document.querySelectorAll(".stat-num[data-count]");
    if (!nums.length || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        observer.unobserve(el);

        var target = parseInt(el.getAttribute("data-count"), 10);
        if (isNaN(target)) return;
        var suffix = el.getAttribute("data-suffix") || "";
        var duration = 1100;
        var start = null;

        function tick(timestamp) {
          if (start === null) start = timestamp;
          var progress = Math.min((timestamp - start) / duration, 1);
          // ease-out so it decelerates into the final number
          var eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(target * eased) + suffix;
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });

    nums.forEach(function (el) { observer.observe(el); });
  }

  /* ------------------------------------------------------------------------
     5. FILTER BUTTONS (Projects and Gallery)
     Buttons carry data-filter="value"; items carry data-category="value".
     "all" shows everything.
     ------------------------------------------------------------------------ */
  function initFilters() {
    var groups = document.querySelectorAll("[data-filter-group]");

    groups.forEach(function (group) {
      var targetSelector = group.getAttribute("data-filter-group");
      var container = document.querySelector(targetSelector);
      if (!container) return;

      var buttons = group.querySelectorAll(".filter-btn");
      var items = container.querySelectorAll("[data-category]");

      buttons.forEach(function (btn) {
        btn.addEventListener("click", function () {
          var filter = btn.getAttribute("data-filter");

          buttons.forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
          btn.setAttribute("aria-pressed", "true");

          items.forEach(function (item) {
            var cats = (item.getAttribute("data-category") || "").split(" ");
            var show = filter === "all" || cats.indexOf(filter) !== -1;
            item.hidden = !show;
          });
        });
      });
    });
  }

  /* ------------------------------------------------------------------------
     6. GALLERY LIGHTBOX
     ------------------------------------------------------------------------ */
  function initLightbox() {
    var triggers = document.querySelectorAll(".gallery-item");
    var box = document.getElementById("lightbox");
    if (!triggers.length || !box) return;

    var img = box.querySelector("img");
    var cap = box.querySelector(".lightbox-cap");
    var closeBtn = box.querySelector(".lightbox-close");
    var lastFocused = null;

    function open(src, caption) {
      lastFocused = document.activeElement;
      img.src = src;
      img.alt = caption || "";
      cap.textContent = caption || "";
      box.classList.add("open");
      document.body.classList.add("menu-open");
      closeBtn.focus();
    }

    function close() {
      box.classList.remove("open");
      document.body.classList.remove("menu-open");
      img.src = "";
      if (lastFocused) lastFocused.focus();
    }

    triggers.forEach(function (trigger) {
      trigger.addEventListener("click", function () {
        var full = trigger.getAttribute("data-full");
        var thumb = trigger.querySelector("img");
        var caption = trigger.getAttribute("data-caption") || "";
        open(full || (thumb ? thumb.src : ""), caption);
      });
    });

    closeBtn.addEventListener("click", close);
    box.addEventListener("click", function (e) {
      if (e.target === box) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && box.classList.contains("open")) close();
    });
  }

  /* ------------------------------------------------------------------------
     7. FORMS
     With no server behind a static site, submitting opens the visitor's own
     email app with every answer already filled in, addressed to the club.

     TO SWITCH TO A REAL FORM INBOX LATER (e.g. Formspree, Netlify Forms):
       1. Sign up and paste the endpoint they give you into the form's
          action="" attribute in the HTML.
       2. Add  data-mailto="off"  to the <form> tag.
     The form then posts to that service instead, and this code steps aside.
     ------------------------------------------------------------------------ */
  function initForms() {
    var forms = document.querySelectorAll("form[data-mailto]");

    forms.forEach(function (form) {
      if (form.getAttribute("data-mailto") === "off") return;

      var status = form.querySelector(".form-status");
      var address = form.getAttribute("data-mailto");

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!form.reportValidity()) return;

        var data = new FormData(form);
        var lines = [];
        data.forEach(function (value, key) {
          if (String(value).trim() === "") return;
          var field = form.querySelector('[name="' + key + '"]');
          var labelEl = field ? form.querySelector('label[for="' + field.id + '"]') : null;
          var label = labelEl ? labelEl.textContent.replace("*", "").trim() : key;
          lines.push(label + ": " + value);
        });

        var subject = form.getAttribute("data-subject") || "Website enquiry";
        var body = lines.join("\n\n") + "\n\n— Sent from the Rotaract Club of Honiara website";

        window.location.href =
          "mailto:" + address +
          "?subject=" + encodeURIComponent(subject) +
          "&body=" + encodeURIComponent(body);

        if (status) {
          status.hidden = false;
          status.textContent =
            "Your email app should now be opening with this message ready to send. " +
            "If nothing happened, please email us directly at " + address + ".";
          status.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    });
  }

  /* ------------------------------------------------------------------------
     8. FOOTER YEAR — keeps the copyright date current on its own
     ------------------------------------------------------------------------ */
  function initYear() {
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  /* ------------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", function () {
    initMobileMenu();
    initSubmenu();
    initReveal();
    initCounters();
    initFilters();
    initLightbox();
    initForms();
    initYear();
  });
})();
