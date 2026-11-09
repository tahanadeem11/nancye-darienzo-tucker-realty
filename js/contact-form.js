/* Sends the contact page form and the footer "Inquire" forms to /api/contact (no page reload). */
(function () {
	"use strict";

	var ENDPOINT = "/api/contact";
	var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

	function statusBox(form) {
		var box = form.querySelector(".form-status");
		if (!box) {
			box = document.createElement("div");
			box.className = "form-status";
			box.setAttribute("role", "status");
			box.setAttribute("aria-live", "polite");
			form.appendChild(box);
		}
		return box;
	}

	function show(form, ok, text) {
		var box = statusBox(form);
		box.className = "form-status " + (ok ? "is-success" : "is-error");
		box.textContent = text;
	}

	function field(form, name) {
		var el = form.querySelector('[name="' + name + '"]');
		return el ? el.value.trim() : "";
	}

	function init(form) {
		// hidden honeypot field for spam bots
		var hp = document.createElement("input");
		hp.type = "text";
		hp.name = "website";
		hp.tabIndex = -1;
		hp.autocomplete = "off";
		hp.setAttribute("aria-hidden", "true");
		hp.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;opacity:0;";
		form.appendChild(hp);

		form.setAttribute("novalidate", "novalidate");
		form.setAttribute("action", ENDPOINT);
		form.setAttribute("method", "post");

		form.addEventListener("submit", function (e) {
			e.preventDefault();
			var data = {
				username: field(form, "username"),
				email: field(form, "email"),
				phone: field(form, "phone"),
				message: field(form, "message"),
				website: field(form, "website")
			};

			if (!data.username || !EMAIL_RE.test(data.email) || !data.message) {
				show(form, false, "Please enter your name, a valid email address and a message.");
				return;
			}

			var btn = form.querySelector('button[type="submit"]');
			var label = btn && btn.querySelector(".btn-title");
			var original = label ? label.textContent : "";
			if (btn) { btn.disabled = true; }
			if (label) { label.textContent = "Sending..."; }

			fetch(ENDPOINT, {
				method: "POST",
				headers: { "Content-Type": "application/json", "Accept": "application/json" },
				body: JSON.stringify(data)
			}).then(function (res) {
				return res.json().catch(function () { return {}; }).then(function (json) {
					return { ok: res.ok && json.ok, error: json.error };
				});
			}).then(function (r) {
				if (r.ok) {
					form.reset();
					show(form, true, "Thank you! Your message has been sent. Nancye will be in touch soon.");
				} else {
					show(form, false, r.error || "Sorry, your message could not be sent. Please call (360) 941-5415.");
				}
			}).catch(function () {
				show(form, false, "Network problem. Please try again or call (360) 941-5415.");
			}).then(function () {
				if (btn) { btn.disabled = false; }
				if (label) { label.textContent = original; }
			});
		});
	}

	Array.prototype.forEach.call(document.querySelectorAll("#contact-form, .request-form form"), init);
})();
