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
     0. CONTENT LOADER
     Cards that used to be hand-copied HTML blocks are now stored as JSON
     under /data/ and edited through the CMS at /admin (see README.md).
     Each render* function fetches its page's JSON and injects markup into
     the existing container using the exact same classes the static HTML
     used to have — the container itself (with its id) still lives in the
     page; only the repeated child cards are now built here.

     PAGE_EVENTS is filled in by renderEvents() and read by initCalendar()
     further down, so the calendar no longer carries its own hard-coded
     event list.
     ------------------------------------------------------------------------ */
  var PAGE_EVENTS = [];

  function fetchJSON(path) {
    return fetch(path).then(function (res) {
      if (!res.ok) throw new Error("Failed to load " + path);
      return res.json();
    });
  }

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderEvents() {
    var recentList = document.getElementById("recent-events-list");
    var calendarRoot = document.getElementById("events-calendar");
    if (!recentList && !calendarRoot) return Promise.resolve();

    return fetchJSON("data/events.json").then(function (data) {
      PAGE_EVENTS = data.upcoming_events || [];

      if (recentList) {
        recentList.innerHTML = (data.recent_events || []).map(function (ev) {
          return (
            '<article class="card reveal">' +
              '<div class="card-media">' +
                '<span class="tag">' + escapeHTML(ev.tag) + "</span>" +
                '<img src="' + escapeHTML(ev.image) + '" alt="' + escapeHTML(ev.alt) + '">' +
              "</div>" +
              '<div class="card-body">' +
                "<h3>" + escapeHTML(ev.title) + "</h3>" +
                "<p>" + escapeHTML(ev.description) + "</p>" +
                '<a class="link-arrow" href="' + escapeHTML(ev.link_href) + '">' + escapeHTML(ev.link_text) + "</a>" +
              "</div>" +
            "</article>"
          );
        }).join("");
      }
    }).catch(function (err) { console.error(err); });
  }

  function renderNews() {
    var featured = document.getElementById("featured-post");
    var list = document.getElementById("news-list");
    if (!featured && !list) return Promise.resolve();

    return fetchJSON("data/news.json").then(function (data) {
      if (featured && data.featured) {
        var f = data.featured;
        featured.innerHTML =
          '<img src="' + escapeHTML(f.image) + '" alt="' + escapeHTML(f.alt) + '">' +
          '<div class="card-body">' +
            '<div class="post-meta">' +
              '<span class="tag">' + escapeHTML(f.tag) + "</span>" +
              "<span>" + escapeHTML(f.date) + "</span>" +
              "<span>By " + escapeHTML(f.author) + "</span>" +
            "</div>" +
            '<h3 style="font-size:clamp(1.3rem,1.1rem+1vw,1.75rem);">' + escapeHTML(f.title) + "</h3>" +
            "<p>" + escapeHTML(f.summary) + "</p>" +
            '<a class="link-arrow" href="' + escapeHTML(f.link_href) + '">' + escapeHTML(f.link_text) + "</a>" +
          "</div>";
      }

      if (list) {
        list.innerHTML = (data.posts || []).map(function (post) {
          return (
            '<article class="card reveal">' +
              '<div class="card-media">' +
                '<span class="tag">' + escapeHTML(post.tag) + "</span>" +
                '<img src="' + escapeHTML(post.image) + '" alt="' + escapeHTML(post.alt) + '">' +
              "</div>" +
              '<div class="card-body">' +
                '<div class="post-meta"><span>' + escapeHTML(post.date) + "</span></div>" +
                "<h3>" + escapeHTML(post.title) + "</h3>" +
                "<p>" + escapeHTML(post.summary) + "</p>" +
                '<a class="link-arrow" href="' + escapeHTML(post.link_href) + '">' + escapeHTML(post.link_text) + "</a>" +
              "</div>" +
            "</article>"
          );
        }).join("");
      }
    }).catch(function (err) { console.error(err); });
  }

  function renderGallery() {
    var photoList = document.getElementById("gallery-list");
    var videoList = document.getElementById("video-list");
    if (!photoList && !videoList) return Promise.resolve();

    return fetchJSON("data/gallery.json").then(function (data) {
      if (photoList) {
        photoList.innerHTML = (data.photos || []).map(function (p) {
          return (
            '<button class="gallery-item reveal" data-category="' + escapeHTML(p.category) + '"' +
                    ' data-full="' + escapeHTML(p.image) + '" data-caption="' + escapeHTML(p.caption) + '">' +
              '<img src="' + escapeHTML(p.image) + '" alt="' + escapeHTML(p.alt) + '" loading="lazy">' +
              '<span class="cap">' + escapeHTML(p.caption) + "</span>" +
            "</button>"
          );
        }).join("");
      }

      if (videoList) {
        videoList.innerHTML = (data.videos || []).map(function (v) {
          return (
            '<article class="card reveal">' +
              '<div class="card-media">' +
                '<span class="tag">' + escapeHTML(v.tag) + "</span>" +
                '<img src="' + escapeHTML(v.image) + '" alt="' + escapeHTML(v.alt) + '">' +
              "</div>" +
              '<div class="card-body">' +
                "<h3>" + escapeHTML(v.title) + "</h3>" +
                "<p>" + escapeHTML(v.description) + "</p>" +
              "</div>" +
            "</article>"
          );
        }).join("");
      }
    }).catch(function (err) { console.error(err); });
  }

  function renderProjects() {
    var list = document.getElementById("project-list");
    if (!list) return Promise.resolve();

    return fetchJSON("data/projects.json").then(function (data) {
      list.innerHTML = (data.projects || []).map(function (p) {
        var outcomes = (p.outcomes || []).map(function (o) {
          return '<span class="outcome">' + escapeHTML(o) + "</span>";
        }).join("");

        return (
          '<article class="card reveal" data-category="' + escapeHTML(p.category) + '">' +
            '<div class="card-media">' +
              '<span class="tag">' + escapeHTML(p.tag) + "</span>" +
              '<img src="' + escapeHTML(p.image) + '" alt="' + escapeHTML(p.alt) + '">' +
            "</div>" +
            '<div class="card-body">' +
              "<h3>" + escapeHTML(p.title) + "</h3>" +
              "<p>" + escapeHTML(p.description) + "</p>" +
              '<div class="outcomes">' + outcomes + "</div>" +
            "</div>" +
          "</article>"
        );
      }).join("");
    }).catch(function (err) { console.error(err); });
  }

  function renderMembers() {
    var list = document.getElementById("board-list");
    if (!list) return Promise.resolve();

    return fetchJSON("data/members.json").then(function (data) {
      list.innerHTML = (data.members || []).map(function (m) {
        return (
          '<article class="member member-lead reveal">' +
            '<img src="' + escapeHTML(m.image) + '" alt="' + escapeHTML(m.alt) + '">' +
            "<h3>" + escapeHTML(m.name) + "</h3>" +
            '<div class="role">' + escapeHTML(m.role) + "</div>" +
          "</article>"
        );
      }).join("");
    }).catch(function (err) { console.error(err); });
  }

  function loadContent() {
    return Promise.all([
      renderEvents(),
      renderNews(),
      renderGallery(),
      renderProjects(),
      renderMembers()
    ]);
  }

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
     9. EVENTS CALENDAR
     A small monthly calendar with no external library. Event data comes
     from PAGE_EVENTS (filled in by renderEvents() from /data/events.json,
     see section 0 above) — each entry needs a "date" in YYYY-MM-DD form.
     Add, edit or remove events through the CMS, or by editing that JSON
     file directly; the grid, weekday alignment and leap years are all
     calculated, not hard-coded.
     ------------------------------------------------------------------------ */
  function initCalendar() {
    var root = document.getElementById("events-calendar");
    if (!root) return;

    var grid = document.getElementById("cal-grid");
    var titleEl = document.getElementById("cal-title");
    var detail = document.getElementById("cal-detail");
    var prevBtn = document.getElementById("cal-prev");
    var nextBtn = document.getElementById("cal-next");
    var monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];

    function pad(n) { return n < 10 ? "0" + n : "" + n; }

    var now = new Date();

    var eventsByDate = {};
    PAGE_EVENTS.forEach(function (ev) {
      (eventsByDate[ev.date] = eventsByDate[ev.date] || []).push(ev);
    });

    var todayISO = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
    var view = new Date();
    view.setDate(1);

    function render() {
      grid.innerHTML = "";
      detail.hidden = true;
      detail.innerHTML = "";

      var year = view.getFullYear();
      var month = view.getMonth();
      titleEl.textContent = monthNames[month] + " " + year;

      var firstWeekday = new Date(year, month, 1).getDay();
      var daysInMonth = new Date(year, month + 1, 0).getDate();
      var daysInPrevMonth = new Date(year, month, 0).getDate();

      var cells = [];
      for (var i = 0; i < firstWeekday; i++) {
        cells.push({ day: daysInPrevMonth - firstWeekday + 1 + i, muted: true });
      }
      for (var d = 1; d <= daysInMonth; d++) {
        cells.push({ day: d, muted: false, iso: year + "-" + pad(month + 1) + "-" + pad(d) });
      }
      var trailing = 1;
      while (cells.length % 7 !== 0) {
        cells.push({ day: trailing++, muted: true });
      }

      cells.forEach(function (cell) {
        var isInteractive = !cell.muted;
        var el = document.createElement(isInteractive ? "button" : "div");
        el.className = "cal-cell" + (cell.muted ? " is-muted" : "");

        var dayNum = document.createElement("span");
        dayNum.className = "cal-daynum";
        dayNum.textContent = cell.day;
        el.appendChild(dayNum);

        if (!isInteractive) {
          el.setAttribute("aria-hidden", "true");
          grid.appendChild(el);
          return;
        }

        el.type = "button";
        if (cell.iso === todayISO) el.classList.add("is-today");

        var dayEvents = eventsByDate[cell.iso];
        if (dayEvents && dayEvents.length) {
          el.classList.add("has-events");
          var wrap = document.createElement("span");
          wrap.className = "cal-events";
          dayEvents.forEach(function (ev) {
            var pill = document.createElement("span");
            pill.className = "cal-event-pill";
            pill.textContent = ev.title;
            wrap.appendChild(pill);
          });
          el.appendChild(wrap);
          el.setAttribute("aria-label",
            monthNames[month] + " " + cell.day + ", " + dayEvents.length +
            (dayEvents.length > 1 ? " events: " : " event: ") +
            dayEvents.map(function (e) { return e.title; }).join(", "));
          el.addEventListener("click", function () { showDetail(dayEvents, cell.iso); });
        } else {
          el.setAttribute("aria-label", monthNames[month] + " " + cell.day + ", no events");
        }

        grid.appendChild(el);
      });
    }

    function showDetail(dayEvents, iso) {
      var dateObj = new Date(iso + "T00:00:00");
      var heading = dateObj.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

      var html = '<p class="cal-detail-date">' + heading + "</p>";
      html += dayEvents.map(function (ev) {
        return (
          '<article class="cal-detail-card">' +
            '<span class="tag tag-outline">' + ev.tag + "</span>" +
            "<h3>" + ev.title + "</h3>" +
            '<div class="event-meta"><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> ' + ev.time + '</span><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> ' + ev.location + "</span></div>" +
            "<p>" + ev.description + "</p>" +
          "</article>"
        );
      }).join("");

      detail.innerHTML = html;
      detail.hidden = false;
      detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    prevBtn.addEventListener("click", function () { view.setMonth(view.getMonth() - 1); render(); });
    nextBtn.addEventListener("click", function () { view.setMonth(view.getMonth() + 1); render(); });

    render();
  }

  /* ------------------------------------------------------------------------
     10. HEADER SCROLL STATE
     Adds a small shadow to the sticky header once the page has scrolled,
     so it reads as "lifted" above the content rather than always floating.
     ------------------------------------------------------------------------ */
  function initHeaderScroll() {
    var header = document.querySelector(".site-header");
    if (!header) return;

    function update() {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  /* ------------------------------------------------------------------------
     Boot
     Content is loaded first (it injects the cards that filters, the
     lightbox and reveal-on-scroll all need to find in the DOM), then
     everything else wires up once that's settled.
     ------------------------------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", function () {
    initMobileMenu();
    initSubmenu();
    initForms();
    initYear();
    initHeaderScroll();

    loadContent().then(function () {
      initReveal();
      initCounters();
      initFilters();
      initLightbox();
      initCalendar();
    });
  });
})();
