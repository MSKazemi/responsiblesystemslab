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
  // Evidence Atlas: project/principle exploration with genuine source and limitation links.
  // Progressive enhancement: project anchors work normally without JavaScript.
  var atlas = document.querySelector(".atlas");
  if (atlas) {
    var projectLinks = Array.prototype.slice.call(atlas.querySelectorAll(".atlas-list a[data-node]"));
    var inspectButtons = Array.prototype.slice.call(atlas.querySelectorAll(".atlas-inspect"));
    var filterBar = atlas.querySelector("#atlasFilters");
    var filterButtons = filterBar ? Array.prototype.slice.call(filterBar.querySelectorAll(".atlas-filter")) : [];
    var inspector = atlas.querySelector("#atlasDetail");
    var detailBody = inspector ? inspector.querySelector(".atlas-detail-content") : null;
    var results = atlas.querySelector("#atlasResults");
    var announcement = atlas.querySelector("#atlasAnnouncement");
    var selectedNode = null;

    var clearAtlas = function () {
      atlas.classList.remove("has-active");
      atlas.querySelectorAll(".on").forEach(function (n) { n.classList.remove("on"); });
    };
    var showMapFor = function (link) {
      clearAtlas();
      if (!link) return;
      var node = link.getAttribute("data-node");
      var principles = (link.getAttribute("data-links") || "").split(/\s+/).filter(Boolean);
      atlas.classList.add("has-active");
      var svgNode = atlas.querySelector('svg [data-node="' + node + '"]');
      if (svgNode) svgNode.classList.add("on");
      principles.forEach(function (key) {
        var principle = atlas.querySelector('svg [data-principle="' + key + '"]');
        var edge = atlas.querySelector('svg [data-edge="' + node + "-" + key + '"]');
        if (principle) principle.classList.add("on");
        if (edge) edge.classList.add("on");
      });
    };
    var linkFor = function (node) {
      return projectLinks.find(function (a) { return a.getAttribute("data-node") === node; });
    };
    var restoreMap = function () { showMapFor(selectedNode ? linkFor(selectedNode) : null); };

    var selectProject = function (node, shouldAnnounce) {
      var link = linkFor(node);
      var template = document.getElementById("atlas-detail-" + node);
      if (!link || !template || !detailBody) return;
      detailBody.replaceChildren(template.content.cloneNode(true));
      inspector.hidden = false;
      selectedNode = node;
      inspectButtons.forEach(function (button) {
        var active = button.getAttribute("data-node") === node;
        button.setAttribute("aria-pressed", String(active));
        button.closest("li").classList.toggle("is-selected", active);
      });
      showMapFor(link);
      if (shouldAnnounce && announcement) {
        announcement.textContent = "Showing " + link.querySelector("strong").textContent + " evidence and limitations";
      }
    };

    // An anchor always navigates; the separate Inspect button opens the evidence panel.
    projectLinks.concat(inspectButtons).forEach(function (control) {
      var node = control.getAttribute("data-node");
      ["mouseenter", "focus"].forEach(function (eventName) {
        control.addEventListener(eventName, function () { showMapFor(linkFor(node)); });
      });
      ["mouseleave", "blur"].forEach(function (eventName) {
        control.addEventListener(eventName, restoreMap);
      });
    });

    // Only show enhancement controls if all four evidence templates exist.
    var canInspect = inspector && detailBody && results && filterBar &&
      projectLinks.length === 4 && inspectButtons.length === projectLinks.length &&
      projectLinks.every(function (link) { return !!document.getElementById("atlas-detail-" + link.getAttribute("data-node")); });
    if (canInspect) {
      atlas.classList.add("enhanced");
      filterBar.hidden = false;
      inspectButtons.forEach(function (button) {
        button.addEventListener("click", function () {
          selectProject(button.getAttribute("data-node"), true);
        });
      });
      var applyFilter = function (key, announce) {
        var matches = [];
        projectLinks.forEach(function (link) {
          var available = key === "all" ||
            (link.getAttribute("data-links") || "").split(/\s+/).includes(key);
          link.closest("li").hidden = !available;
          if (available) matches.push(link);
        });
        filterButtons.forEach(function (button) {
          button.setAttribute("aria-pressed", String(button.getAttribute("data-filter") === key));
        });
        var labelButton = filterButtons.find(function (button) { return button.getAttribute("data-filter") === key; });
        var label = labelButton ? labelButton.textContent.trim() : "all projects";
        results.hidden = false;
        results.textContent = matches.length + " of " + projectLinks.length +
          " projects shown" + (key === "all" ? "" : " for " + label) +
          ". Select Inspect evidence to read a project's sources and limits.";
        if (!matches.length) {
          selectedNode = null;
          inspector.hidden = true;
          clearAtlas();
        } else if (!selectedNode || !matches.some(function (link) { return link.getAttribute("data-node") === selectedNode; })) {
          selectProject(matches[0].getAttribute("data-node"), false);
        } else {
          restoreMap();
        }
        if (announce && announcement) {
          announcement.textContent = matches.length + " projects match " + label;
        }
      };
      filterButtons.forEach(function (button) {
        button.addEventListener("click", function () { applyFilter(button.getAttribute("data-filter"), true); });
      });
      // Open one useful evidence dossier by default; do not announce unsolicited changes at load.
      selectProject("nova", false);
      applyFilter("all", false);
    }
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
