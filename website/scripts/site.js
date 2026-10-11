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
    var closeMenu = function (returnFocus) {
      header.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
      if (returnFocus) toggle.focus();
    };
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && header.classList.contains("open")) closeMenu(true);
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
  // Evidence Atlas (home): highlight the principles a project emphasizes on hover or keyboard focus.
  // Progressive enhancement only: the map and the project links are fully usable without it.
  var atlas = document.querySelector(".atlas");
  if (atlas) {
    var clearAtlas = function () {
      atlas.classList.remove("has-active");
      atlas.querySelectorAll(".on").forEach(function (n) { n.classList.remove("on"); });
    };
    var setAtlas = function (a) {
      clearAtlas();
      var node = a.getAttribute("data-node");
      var links = (a.getAttribute("data-links") || "").split(" ");
      atlas.classList.add("has-active");
      var n = atlas.querySelector('[data-node="' + node + '"]'); if (n) n.classList.add("on");
      links.forEach(function (k) {
        var pr = atlas.querySelector('[data-principle="' + k + '"]'); if (pr) pr.classList.add("on");
        var ed = atlas.querySelector('[data-edge="' + node + "-" + k + '"]'); if (ed) ed.classList.add("on");
      });
    };
    atlas.querySelectorAll(".atlas-list a").forEach(function (a) {
      ["mouseenter", "focus"].forEach(function (ev) { a.addEventListener(ev, function () { setAtlas(a); }); });
      ["mouseleave", "blur"].forEach(function (ev) { a.addEventListener(ev, clearAtlas); });
    });
  }

  // Contact form: static site, so it posts to Web3Forms, which emails the lab.
  // The access key is public by design (it can only deliver to the registered inbox).
  // A mailto: link is offered on failure but is never opened automatically and is never
  // presented as a sent message.
  var WEB3FORMS_KEY = "4e91ba09-fefa-4514-bbff-a6e6b35fe61d";
  var CONTACT_EMAIL = "contact@responsiblesystemslab.org";
  var SEND_TIMEOUT_MS = 15000;
  var cf = document.getElementById("contactForm");
  if (cf) {
    var status = document.getElementById("cfStatus");
    var btn = cf.querySelector("button[type=submit]");
    var say = function (t, ok) { status.textContent = t; status.className = "form-note " + (ok ? "form-ok" : "form-err"); };
    var fail = function (reason, f) {
      // Keep what the visitor typed, explain plainly, and offer an explicit way out.
      status.className = "form-note form-err";
      status.textContent = reason + " Your message was not sent. You can try again, or ";
      var a = document.createElement("a");
      a.href = "mailto:" + CONTACT_EMAIL + "?subject=" + encodeURIComponent("[RSL] Message from " + f.name) +
        "&body=" + encodeURIComponent(f.message + "\n\n--\n" + f.name + " <" + f.email + ">");
      a.textContent = "email " + CONTACT_EMAIL + " directly";
      status.appendChild(a);
      status.appendChild(document.createTextNode(" (this opens your own email app; nothing is sent until you send it)."));
      btn.disabled = false;
    };
    cf.addEventListener("submit", function (e) {
      e.preventDefault();
      if (document.getElementById("cf-website").value) return; // honeypot: humans never see it
      var topicEl = cf.querySelector('input[name="topic"]:checked');
      var f = {
        name: document.getElementById("cf-name").value.trim(),
        email: document.getElementById("cf-email").value.trim(),
        message: document.getElementById("cf-msg").value.trim(),
        topic: topicEl ? topicEl.value : "General question"
      };
      if (!f.name || !f.email || !f.message) { say("Please fill in your name, email and message.", false); return; }
      btn.disabled = true; say("Sending…", true);
      var ctl = typeof AbortController === "function" ? new AbortController() : null;
      var timer = ctl ? setTimeout(function () { ctl.abort(); }, SEND_TIMEOUT_MS) : null;
      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        signal: ctl ? ctl.signal : undefined,
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: "[RSL] " + f.topic + " — message from " + f.name,
          from_name: "Responsible Systems Lab website",
          name: f.name, email: f.email, topic: f.topic, message: f.message
        })
      })
        .then(function (r) {
          if (r.status >= 500) { throw new Error("server"); }
          return r.json().catch(function () { throw new Error("format"); });
        })
        .then(function (j) {
          if (timer) clearTimeout(timer);
          if (j && j.success) { cf.reset(); btn.disabled = false; say("Thank you — your message was sent.", true); }
          else { fail("The message service did not accept it.", f); }
        })
        .catch(function (err) {
          if (timer) clearTimeout(timer);
          var offline = typeof navigator !== "undefined" && navigator.onLine === false;
          fail(offline ? "You appear to be offline." : (err && err.name === "AbortError" ? "The request timed out." : "We could not reach the message service."), f);
        });
    });
  }
})();
