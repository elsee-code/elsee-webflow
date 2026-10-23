// ============================================================================
// reinitialisation-mot-de-passe.js — page /reset-password
// ============================================================================
// Le lien « mot de passe oublié » des e-mails Firebase Auth mène ici (?mode=resetPassword&
// oobCode=…). La page vérifie le code, fait saisir deux fois le nouveau mot de passe, l'enregistre
// par Firebase Auth (SDK compat 10.12.0, projet appelsee-2k24), puis renvoie vers
// app.elsee.care/login. Un code expiré ou déjà utilisé propose un nouvel envoi. Chaque erreur est
// signalée à la fonction `logPasswordResetError` d'elsee_functions_v2.
//
// Bloc Embed de la page, après le formulaire #reset-form : les deux balises du SDK Firebase
// (app puis auth, sans `defer`), puis celle-ci en `defer` (webflow/embeds/reset-password.html).
// La configuration Firebase ci-dessous est celle d'une application web : publique par
// construction (elle est aussi dans le bundle de l'app), sans valeur secrète.
//
// Repris à l'identique du bloc collé (relevé le 2026-10-23), sans aucun changement de code.
// Page d'authentification : toute modification est structurelle (dev_ops:standards/securite.md
// § 5) et passe par une revue de sécurité.

(function () {
  "use strict";
  if (window.__elseeResetFinal) return;
  window.__elseeResetFinal = true;

  var CONFIG = {
    apiKey: "AIzaSyDhz3TtutV09ePCF6zsxAALRglQxtKiLOk",
    authDomain: "appelsee-2k24.firebaseapp.com",
    projectId: "appelsee-2k24",
    storageBucket: "appelsee-2k24.appspot.com",
    messagingSenderId: "161403521992",
    appId: "1:161403521992:web:6ce1a6215e0f24dbbccefd",
    measurementId: "G-YFHVSHS1V4"
  };
  if (!firebase.apps.length) firebase.initializeApp(CONFIG);

  var auth = firebase.auth();
  var FN = "https://europe-west1-appelsee-2k24.cloudfunctions.net";

  function param(name) {
    return new URLSearchParams(location.search).get(name);
  }
  var oobCode = param("oobCode");

  function logError(code, message, context, email) {
    try {
      fetch(FN + "/logPasswordResetError", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email || param("email") || null,
          errorCode: code || null,
          errorMessage: message || null,
          oobCode: oobCode,
          context: context
        })
      }).catch(function () {});
    } catch (e) {}
  }

  function isFatalCode(code) {
    return code === "auth/invalid-action-code" || code === "auth/expired-action-code";
  }

  function humanMessage(code) {
    switch (code) {
      case "auth/expired-action-code":
        return "⏳ Ce lien a expiré. Cliquez ci-dessous pour en recevoir un nouveau.";
      case "auth/invalid-action-code":
        return "Ce lien a déjà été utilisé ou a été remplacé par une demande plus récente. Si vous avez reçu plusieurs e-mails, seul le dernier fonctionne. Vous pouvez aussi demander un nouveau lien ci-dessous.";
      case "auth/user-not-found":
      case "auth/user-disabled":
        return "Ce compte n'existe plus ou est désactivé. Contactez hello@elsee.care.";
      case "auth/weak-password":
        return "Mot de passe trop simple : 6 caractères minimum.";
      case "auth/network-request-failed":
        return "Connexion instable. Vérifiez votre réseau puis réessayez.";
      case "auth/too-many-requests":
        return "Trop de tentatives. Patientez quelques minutes puis réessayez.";
      default:
        return "❌ Erreur lors de la mise à jour du mot de passe. Si l'erreur se reproduit, contactez hello@elsee.care.";
    }
  }

  function init() {
    var form = document.getElementById("reset-form");
    var pass1 = document.getElementById("new-password");
    var pass2 = document.getElementById("confirm-password");
    var status = document.getElementById("reset-status");
    if (!form || !pass1 || !pass2) return;

    var successEl =
      document.getElementById("success") ||
      document.querySelector('[id*="succ" i]') ||
      document.querySelector('[id*="suc" i]');

    var submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
    if (!submitBtn) {
      submitBtn = Array.prototype.filter.call(form.querySelectorAll("button"), function (b) {
        return b.type !== "button" && b.className.indexOf("pw-toggle") < 0;
      })[0] || null;
    }

    var wrappers = form.querySelectorAll(".reset-password-fields-wrapper");
    var verifiedEmail = null;
    var busy = false;
    var DONE = false;

    function setStatus(txt) { if (status) status.textContent = txt; }
    function setLabel(el, txt) { if (el) { if (el.tagName === "INPUT") el.value = txt; else el.textContent = txt; } }
    function getLabel(el) { return el ? (el.tagName === "INPUT" ? el.value : el.textContent) : ""; }

    /* ---- Suppression : on sort le form du DOM, aucun CSS ne peut le ramener ---- */
    function killForms() {
      document.querySelectorAll(".reset-password-form, #reset-form").forEach(function (el) {
        if (!el.hasAttribute("data-elsee-success")) el.remove();
      });
    }

    var LOGIN_URL = "https://app.elsee.care/login";

    function buildCard() {
      if (successEl) {
        successEl.setAttribute("data-elsee-success", "1");
        successEl.style.setProperty("display", "flex", "important");
        // filet : si le bloc Webflow n'a pas de lien de connexion, on l'ajoute
        if (!successEl.querySelector('a[href*="/login"]')) {
          successEl.appendChild(loginButton());
        }
        return successEl;
      }
      var card = document.createElement("div");
      card.setAttribute("data-elsee-success", "1");
      card.style.cssText = "width:100%;max-width:400px;margin:0 auto;background:#fff;border:1px solid #E9EDBE;border-radius:20px;padding:40px 36px;display:flex;flex-direction:column;gap:16px;box-shadow:0 4px 24px rgba(30,70,52,.05);box-sizing:border-box;text-align:center;";
      var t = document.createElement("div");
      t.style.cssText = "font-size:20px;font-weight:700;color:#173B2B;";
      t.textContent = "✅ Mot de passe mis à jour";
      var n = document.createElement("div");
      n.style.cssText = "font-size:14px;color:#173B2B;";
      n.textContent = "Vous pouvez maintenant vous reconnecter à l'application avec votre nouveau mot de passe.";
      card.appendChild(t);
      card.appendChild(n);
      card.appendChild(loginButton());
      return card;
    }

    function loginButton() {
      var a = document.createElement("a");
      a.href = LOGIN_URL;
      a.className = "login-button w-button";
      a.textContent = "Connectez-vous";
      a.style.cssText = "display:inline-block;margin-top:8px;min-height:48px;line-height:36px;padding:6px 24px;border-radius:100px;background-color:#EFD273;color:#173B2B;font-size:15px;font-weight:600;text-decoration:none;text-align:center;box-sizing:border-box;";
      return a;
    }

    function showSuccess() {
      DONE = true;

      var card = buildCard();
      var anchor = document.querySelector(".reset-password-form, #reset-form") || form;
      var parent = anchor.parentNode || document.body;

      // on pose la carte AVANT de supprimer, au même endroit dans la page
      parent.insertBefore(card, anchor);

      killForms();
    }

    // filet : si Webflow ré-injecte un form après coup, il repart aussitôt
    if (window.MutationObserver) {
      try {
        new MutationObserver(function () { if (DONE) killForms(); })
          .observe(document.body, { childList: true, subtree: true });
      } catch (e) {}
    }
    setInterval(function () { if (DONE) killForms(); }, 400);

    /* ---- Toggles œil ---- */
    function bindToggle(btn, input) {
      btn.addEventListener("click", function () {
        var hidden = input.type === "password";
        input.type = hidden ? "text" : "password";
        var icon = btn.querySelector("i");
        if (icon) icon.className = hidden ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
        btn.setAttribute("aria-label", hidden ? "Masquer le mot de passe" : "Afficher le mot de passe");
      });
    }

    var toggles = form.querySelectorAll(".pw-toggle");
    if (toggles.length) {
      Array.prototype.forEach.call(toggles, function (btn) {
        var input =
          document.getElementById(btn.getAttribute("data-target") || "") ||
          (btn.parentNode && btn.parentNode.querySelector('input[type="password"], input[type="text"]'));
        if (!input) return;
        var clone = btn.cloneNode(true);
        btn.parentNode.replaceChild(clone, btn);
        bindToggle(clone, input);
      });
    } else {
      [pass1, pass2].forEach(function (input) {
        var box = document.createElement("div");
        box.style.position = "relative";
        input.parentNode.insertBefore(box, input);
        box.appendChild(input);
        input.style.width = "100%";
        input.style.paddingRight = "48px";
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pw-toggle";
        btn.setAttribute("aria-label", "Afficher le mot de passe");
        btn.style.cssText = "position:absolute;right:16px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;padding:4px;font-size:16px;color:#173B2B;";
        btn.innerHTML = '<i class="fa-solid fa-eye"></i>';
        bindToggle(btn, input);
        box.appendChild(btn);
      });
    }

    /* ---- Bloc "recevoir un nouveau lien" ---- */
    var resendBox = null, resendInput = null, resendBtn = null;
    var RESEND_LABEL = "Recevoir un nouveau lien";

    function buildResend() {
      if (resendBox || document.querySelector("[data-elsee-resend]")) return;

      resendBox = document.createElement("div");
      resendBox.setAttribute("data-elsee-resend", "1");
      resendBox.style.cssText = "display:flex;flex-direction:column;gap:8px;margin-top:12px;";

      if (!verifiedEmail) {
        resendInput = pass1.cloneNode(false);
        resendInput.type = "email";
        resendInput.value = "";
        resendInput.removeAttribute("id");
        resendInput.removeAttribute("required");
        resendInput.name = "resend-email";
        resendInput.placeholder = "Votre adresse e-mail";
        resendInput.autocomplete = "email";
        resendInput.style.paddingRight = "18px";
        resendInput.style.display = "";
        resendInput.addEventListener("keydown", function (e) {
          if (e.key === "Enter") { e.preventDefault(); doResend(); }
        });
        resendBox.appendChild(resendInput);
      }

      resendBtn = submitBtn ? submitBtn.cloneNode(true) : document.createElement("button");
      resendBtn.removeAttribute("id");
      resendBtn.type = "button";
      resendBtn.disabled = false;
      resendBtn.style.cssText = "";
      resendBtn.className = (resendBtn.className + "").replace(/\bpw-toggle\b/g, "").trim() || "w-button";
      setLabel(resendBtn, RESEND_LABEL);
      resendBtn.addEventListener("click", doResend);
      resendBox.appendChild(resendBtn);

      var anchor = status && form.contains(status) ? status : null;
      if (anchor) anchor.parentNode.insertBefore(resendBox, anchor.nextSibling);
      else form.appendChild(resendBox);
    }

    function cooldown(sec) {
      resendBtn.disabled = true;
      var left = sec;
      var t = setInterval(function () {
        left--;
        if (left <= 0) {
          clearInterval(t);
          resendBtn.disabled = false;
          setLabel(resendBtn, RESEND_LABEL);
        } else {
          setLabel(resendBtn, RESEND_LABEL + " (" + left + "s)");
        }
      }, 1000);
    }

    function doResend() {
      var email = (verifiedEmail || (resendInput && resendInput.value) || "").trim();
      if (!email || email.indexOf("@") < 1) {
        setStatus("Entrez votre adresse e-mail pour recevoir un nouveau lien.");
        return;
      }
      resendBtn.disabled = true;
      setLabel(resendBtn, "Envoi…");
      fetch(FN + "/sendPasswordResetEmailBrevo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email })
      }).then(function (res) {
        if (res.ok) {
          setStatus("📩 Nouvel e-mail envoyé à " + email + ". Ouvrez bien le DERNIER e-mail reçu : les liens précédents sont désactivés.");
          cooldown(60);
        } else if (res.status === 404) {
          setStatus("Aucun compte n'existe avec l'adresse " + email + ". Vérifiez l'orthographe ou contactez hello@elsee.care.");
          resendBtn.disabled = false;
          setLabel(resendBtn, RESEND_LABEL);
        } else {
          setStatus("Impossible d'envoyer l'e-mail pour le moment. Réessayez dans quelques minutes ou contactez hello@elsee.care.");
          logError("resend_http_" + res.status, "sendPasswordResetEmailBrevo HTTP " + res.status, "webflow_reset_password_resend", email);
          resendBtn.disabled = false;
          setLabel(resendBtn, RESEND_LABEL);
        }
      }).catch(function () {
        setStatus("Connexion instable. Vérifiez votre réseau puis réessayez.");
        resendBtn.disabled = false;
        setLabel(resendBtn, RESEND_LABEL);
      });
    }

    function hideFields() {
      var any = false;
      wrappers.forEach(function (w) { w.style.display = "none"; any = true; });
      if (!any) {
        [pass1, pass2].forEach(function (i) {
          (i.parentNode === form ? i : i.parentNode).style.display = "none";
        });
      }
      if (submitBtn) submitBtn.style.display = "none";
    }

    function fatal(code, message, context, custom) {
      hideFields();
      setStatus(custom || humanMessage(code));
      buildResend();
      logError(code, message, context, verifiedEmail);
    }

    /* ---- Submit ---- */
    document.addEventListener("submit", function (e) {
      if (e.target !== form) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();
      submitReset();
    }, true);

    function submitReset() {
      if (busy) return;
      setStatus("");

      var pwd = pass1.value;
      if (!pwd || pwd.length < 6) {
        setStatus("Le mot de passe doit contenir au moins 6 caractères.");
        return;
      }
      if (pwd !== pass2.value) {
        setStatus("Les mots de passe ne correspondent pas.");
        return;
      }
      if (!oobCode) {
        fatal("missing_oob", "submit sans oobCode", "webflow_reset_password", "Lien invalide ou incomplet. Demandez un nouveau lien ci-dessous.");
        return;
      }

      busy = true;
      var original = getLabel(submitBtn);
      if (submitBtn) { submitBtn.disabled = true; setLabel(submitBtn, "Un instant…"); }

      auth.confirmPasswordReset(oobCode, pwd).then(function () {
        showSuccess();
        busy = false;
      }).catch(function (err) {
        var code = err && err.code;
        if (isFatalCode(code)) {
          fatal(code, err.message || String(err), "webflow_reset_password");
        } else {
          setStatus(humanMessage(code));
          logError(code, (err && err.message) || String(err), "webflow_reset_password", verifiedEmail);
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          setLabel(submitBtn, original || "Réinitialiser mon mot de passe");
        }
        busy = false;
      });
    }

    /* ---- Vérification du lien au chargement ---- */
    if (oobCode) {
      auth.verifyPasswordResetCode(oobCode).then(function (email) {
        verifiedEmail = email || null;
      }).catch(function (err) {
        fatal(err.code, err.message || String(err), "webflow_reset_password_onload");
      });
    } else {
      fatal("missing_oob", "page sans oobCode", "webflow_reset_password_onload", "Lien invalide ou incomplet. Demandez un nouveau lien ci-dessous.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
