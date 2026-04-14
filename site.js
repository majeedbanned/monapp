(function () {
  "use strict";

  var siteConfig = window.MONELY_SITE || {};
  var ga4MeasurementId = toTrimmedString(siteConfig.ga4MeasurementId);
  var appStoreUrl = toTrimmedString(siteConfig.appStoreUrl);
  var googleSiteVerification = toTrimmedString(siteConfig.googleSiteVerification);
  var siteUrl = toTrimmedString(siteConfig.siteUrl);
  var emailCaptureProvider = toTrimmedString(siteConfig.emailCaptureProvider || "mailchimp").toLowerCase();
  var mailchimpActionUrl = toTrimmedString(siteConfig.mailchimpActionUrl);
  var emailCaptureEndpoint = toTrimmedString(siteConfig.emailCaptureEndpoint);

  function toTrimmedString(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function ensureSearchConsoleVerification() {
    var existingTag = document.querySelector("meta[name='google-site-verification']");

    if (!googleSiteVerification) {
      if (existingTag) {
        existingTag.remove();
      }
      return;
    }

    if (!existingTag) {
      existingTag = document.createElement("meta");
      existingTag.setAttribute("name", "google-site-verification");
      document.head.appendChild(existingTag);
    }

    existingTag.setAttribute("content", googleSiteVerification);
  }

  function ensureCanonicalUrlFromConfig() {
    if (!siteUrl) {
      return;
    }

    var path = window.location.pathname || "/";
    var canonicalUrl = new URL(path, siteUrl).toString();
    var canonicalTag = document.querySelector("link[rel='canonical']");
    var ogUrlTag = document.querySelector("meta[property='og:url']");

    if (canonicalTag) {
      canonicalTag.setAttribute("href", canonicalUrl);
    }

    if (ogUrlTag) {
      ogUrlTag.setAttribute("content", canonicalUrl);
    }
  }

  function initGA4() {
    if (!ga4MeasurementId) {
      return;
    }

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() {
      window.dataLayer.push(arguments);
    };

    if (!document.querySelector("script[data-monely-ga4]")) {
      var gaScript = document.createElement("script");
      gaScript.async = true;
      gaScript.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(ga4MeasurementId);
      gaScript.setAttribute("data-monely-ga4", "true");
      document.head.appendChild(gaScript);
    }

    window.gtag("js", new Date());
    window.gtag("config", ga4MeasurementId, {
      send_page_view: false,
      anonymize_ip: true
    });
  }

  function trackEvent(eventName, eventParams) {
    if (!ga4MeasurementId || typeof window.gtag !== "function") {
      return;
    }

    window.gtag("event", eventName, eventParams || {});
  }

  function trackPageView() {
    trackEvent("page_view", {
      page_title: document.title,
      page_location: window.location.href,
      page_path: window.location.pathname + window.location.search
    });
  }

  function trackHistoryNavigations() {
    var originalPushState = history.pushState;
    var originalReplaceState = history.replaceState;

    history.pushState = function pushState() {
      originalPushState.apply(history, arguments);
      trackPageView();
    };

    history.replaceState = function replaceState() {
      originalReplaceState.apply(history, arguments);
      trackPageView();
    };

    window.addEventListener("popstate", trackPageView);
  }

  function wireAppStoreLinks() {
    var appStoreLinks = document.querySelectorAll("[data-app-store-link]");

    appStoreLinks.forEach(function (link) {
      var ctaLocation = toTrimmedString(link.getAttribute("data-cta-location")) || "unknown";

      if (appStoreUrl) {
        link.setAttribute("href", appStoreUrl);
        link.removeAttribute("aria-disabled");
        link.classList.remove("is-disabled");
      } else {
        link.setAttribute("href", "#");
        link.setAttribute("aria-disabled", "true");
        link.classList.add("is-disabled");
      }

      link.addEventListener("click", function (event) {
        if (!appStoreUrl) {
          event.preventDefault();
          return;
        }

        trackEvent("app_store_click", {
          cta_location: ctaLocation
        });
      });
    });
  }

  function wireDemoTracking() {
    var demoTriggers = document.querySelectorAll("[data-demo-trigger]");

    demoTriggers.forEach(function (trigger) {
      trigger.addEventListener("click", function () {
        trackEvent("demo_play", {
          trigger_location: toTrimmedString(trigger.getAttribute("data-demo-location")) || "unknown"
        });
      });
    });
  }

  function wireFAQTracking() {
    var faqItems = document.querySelectorAll(".faq-item");
    var firedQuestions = new Set();

    faqItems.forEach(function (item) {
      item.addEventListener("toggle", function () {
        if (!item.open) {
          return;
        }

        var summary = item.querySelector("summary");
        var question = summary ? summary.textContent.trim() : "unknown";
        if (firedQuestions.has(question)) {
          return;
        }
        firedQuestions.add(question);

        trackEvent("faq_open", {
          question: question
        });
      });
    });
  }

  function wireSupportClickTracking() {
    document.addEventListener("click", function (event) {
      var supportLink = event.target.closest("a");
      if (!supportLink) {
        return;
      }

      var href = toTrimmedString(supportLink.getAttribute("href"));
      if (!href) {
        return;
      }

      if (href.indexOf("support.html") === -1 && !supportLink.hasAttribute("data-contact-support")) {
        return;
      }

      trackEvent("contact_support_click", {
        link_url: href,
        link_text: supportLink.textContent.trim().slice(0, 120)
      });
    });
  }

  function wireScrollDepthTracking() {
    var firedDepthEvents = {
      scroll_50: false,
      scroll_90: false
    };
    var rafId = null;

    function emitDepthEvents() {
      rafId = null;

      var doc = document.documentElement;
      var denominator = Math.max(doc.scrollHeight - window.innerHeight, 1);
      var depth = (window.scrollY / denominator) * 100;

      if (!firedDepthEvents.scroll_50 && depth >= 50) {
        firedDepthEvents.scroll_50 = true;
        trackEvent("scroll_50", {
          percent_scrolled: 50
        });
      }

      if (!firedDepthEvents.scroll_90 && depth >= 90) {
        firedDepthEvents.scroll_90 = true;
        trackEvent("scroll_90", {
          percent_scrolled: 90
        });
      }
    }

    window.addEventListener("scroll", function () {
      if (rafId !== null) {
        return;
      }
      rafId = requestAnimationFrame(emitDepthEvents);
    }, { passive: true });

    emitDepthEvents();
  }

  function sanitizeHtmlMessage(rawMessage) {
    var holder = document.createElement("div");
    holder.innerHTML = rawMessage;
    return holder.textContent ? holder.textContent.trim() : "";
  }

  function submitToMailchimp(emailValue) {
    if (!mailchimpActionUrl) {
      return Promise.reject(new Error("Email signup is not configured yet."));
    }

    var endpoint = mailchimpActionUrl;

    if (endpoint.indexOf("/post?") !== -1) {
      endpoint = endpoint.replace("/post?", "/post-json?");
    } else if (endpoint.indexOf("/post-json?") === -1) {
      endpoint += endpoint.indexOf("?") === -1 ? "?" : "&";
    }

    return new Promise(function (resolve, reject) {
      var callbackName = "monelyMailchimpCallback_" + Date.now();
      var script = document.createElement("script");
      var timeoutId = null;

      function cleanup() {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (window[callbackName]) {
          delete window[callbackName];
        }
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      }

      window[callbackName] = function (response) {
        cleanup();

        if (response && response.result === "success") {
          resolve("Thanks. You are on the list.");
          return;
        }

        var rawMessage = response && response.msg ? String(response.msg) : "Could not complete signup.";
        reject(new Error(sanitizeHtmlMessage(rawMessage)));
      };

      script.async = true;
      script.src = endpoint +
        (endpoint.indexOf("?") === -1 ? "?" : "&") +
        "EMAIL=" + encodeURIComponent(emailValue) +
        "&c=" + encodeURIComponent(callbackName);
      script.onerror = function () {
        cleanup();
        reject(new Error("Could not reach the email service. Please try again."));
      };

      timeoutId = setTimeout(function () {
        cleanup();
        reject(new Error("Email request timed out. Please try again."));
      }, 12000);

      document.body.appendChild(script);
    });
  }

  function submitToGenericEndpoint(emailValue) {
    if (!emailCaptureEndpoint) {
      return Promise.reject(new Error("Email signup is not configured yet."));
    }

    return fetch(emailCaptureEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: emailValue
      })
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("Could not complete signup.");
      }

      return "Thanks. You are on the list.";
    });
  }

  function wireEmailCaptureForm() {
    var form = document.querySelector("[data-email-capture-form]");
    if (!form) {
      return;
    }

    var emailInput = form.querySelector("[data-email-capture-input]");
    var submitButton = form.querySelector("[data-email-capture-submit]");
    var statusElement = document.querySelector("[data-email-capture-status]");
    var defaultButtonText = submitButton ? submitButton.textContent : "";

    function setStatus(state, message) {
      if (!statusElement) {
        return;
      }
      statusElement.textContent = message;
      statusElement.setAttribute("data-state", state);
    }

    function setLoading(isLoading) {
      form.classList.toggle("is-loading", isLoading);
      if (submitButton) {
        submitButton.disabled = isLoading;
        submitButton.textContent = isLoading ? "Joining..." : defaultButtonText;
      }
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (!emailInput) {
        return;
      }

      var emailValue = toTrimmedString(emailInput.value);
      if (!emailValue || !emailInput.checkValidity()) {
        setStatus("error", "Enter a valid email address.");
        emailInput.focus();
        trackEvent("email_capture_error", {
          reason: "invalid_email"
        });
        return;
      }

      trackEvent("email_capture_submit", {
        provider: emailCaptureProvider
      });

      setLoading(true);
      setStatus("loading", "Submitting...");

      var submitPromise = emailCaptureProvider === "mailchimp"
        ? submitToMailchimp(emailValue)
        : submitToGenericEndpoint(emailValue);

      submitPromise
        .then(function (message) {
          form.reset();
          setStatus("success", message || "Thanks. You are on the list.");
          trackEvent("email_capture_success", {
            provider: emailCaptureProvider
          });
        })
        .catch(function (error) {
          setStatus("error", error.message || "Could not complete signup.");
          trackEvent("email_capture_error", {
            provider: emailCaptureProvider,
            reason: toTrimmedString(error.message || "request_failed")
          });
        })
        .finally(function () {
          setLoading(false);
        });
    });

    if (emailInput) {
      emailInput.addEventListener("input", function () {
        if (!statusElement) {
          return;
        }
        if (statusElement.getAttribute("data-state") === "error") {
          setStatus("", "");
        }
      });
    }
  }

  initGA4();
  ensureSearchConsoleVerification();
  ensureCanonicalUrlFromConfig();
  wireAppStoreLinks();
  wireDemoTracking();
  wireFAQTracking();
  wireSupportClickTracking();
  wireScrollDepthTracking();
  wireEmailCaptureForm();
  trackHistoryNavigations();
  trackPageView();
}());
