// Site interactions: sticky-header state, mobile nav, scroll reveals, active link.
(function () {
  "use strict";

  // Mark JS active so .reveal elements start hidden (content stays visible if JS fails).
  document.documentElement.classList.add("js");

  var header = document.getElementById("header");
  var toggle = document.getElementById("navToggle");

  // Sticky header border on scroll
  var onScroll = function () {
    if (window.scrollY > 12) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Mobile menu
  if (toggle) {
    toggle.addEventListener("click", function () {
      var expanded = header.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(expanded));
      toggle.setAttribute("aria-label", expanded ? "Close menu" : "Open menu");
    });
    header.querySelectorAll(".nav-links a").forEach(function (a) {
      a.addEventListener("click", function () {
        header.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
      });
    });
  }

  // Scroll reveal
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });

    // The observer only fires when an element ENTERS the viewport, so anything the
    // user is already past never reveals and stays invisible for good. That happens
    // on browser scroll restoration (reload or back button) and when landing on an
    // #anchor. Reveal those immediately — no animation, they were never going to be
    // seen arriving anyway. Runs on load too, since restoration can land after this.
    var revealPassed = function () {
      reveals.forEach(function (el) {
        if (el.classList.contains("in")) return;
        if (el.getBoundingClientRect().bottom < 0) {
          el.classList.add("in");
          io.unobserve(el);
        }
      });
    };
    revealPassed();
    window.addEventListener("load", revealPassed);
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  // Active nav link by current page (multi-page site).
  var links = Array.prototype.slice.call(document.querySelectorAll(".nav-links a"));
  var current = location.pathname.split("/").pop() || "index.html";
  if (current === "") current = "index.html";
  links.forEach(function (l) {
    var target = (l.getAttribute("href") || "").split("#")[0].split("/").pop();
    if (target === current) l.classList.add("active");
  });
  // Contact form: POST to /api/contact (emails the lab). If that fails, fall back to mailto:.
  var cf = document.getElementById("contactForm");
  if (cf) {
    var status = document.getElementById("cfStatus");
    var btn = cf.querySelector("button[type=submit]");
    var say = function (t, ok) { status.textContent = t; status.className = "form-note " + (ok ? "form-ok" : "form-err"); };
    cf.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = {
        name: document.getElementById("cf-name").value.trim(),
        email: document.getElementById("cf-email").value.trim(),
        message: document.getElementById("cf-msg").value.trim(),
        website: document.getElementById("cf-website").value
      };
      btn.disabled = true; say("Sending…", true);
      fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok && j.ok, j: j }; }); })
        .then(function (res) {
          if (res.ok) { cf.reset(); say("Thank you — your message was sent.", true); }
          else { say((res.j && res.j.error) || "Could not send.", false); btn.disabled = false; }
        })
        .catch(function () {
          say("Could not send. Opening your email app instead…", false); btn.disabled = false;
          window.location.href = "mailto:contact@responsiblesystemslab.org?subject=" +
            encodeURIComponent("[RSL] Message from " + f.name) +
            "&body=" + encodeURIComponent(f.message + "\n\n--\n" + f.name + " <" + f.email + ">");
        });
    });
  }
})();
