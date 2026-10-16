(() => {
  "use strict";
  const S = OrbitSubscriptions,
    { t, escape: esc } = S;
  let audience = "all",
    selected = null,
    billingPeriod = null,
    pending = false,
    checkoutBusy = false,
    checkoutRequest = null;
  const check =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
  const cardIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h3"/></svg>';
  function knownPrice(plan) {
    return (
      (typeof plan.price === "number" && Number.isFinite(plan.price)) ||
      (typeof plan.price === "string" && !!plan.price.trim())
    );
  }
  function amount(plan) {
    if (!knownPrice(plan)) return t("Pricing coming soon", "الأسعار قريبًا");
    if (typeof plan.price === "string") return plan.price;
    try {
      return new Intl.NumberFormat(
        document.documentElement.lang === "en" ? "en" : "ar-JO",
        plan.currency ? { style: "currency", currency: plan.currency } : {},
      ).format(plan.price);
    } catch {
      return String(plan.price);
    }
  }
  function periodLabel(period) {
    return period === "monthly"
      ? t("Monthly", "شهري")
      : period === "yearly"
        ? t("Yearly", "سنوي")
        : t("Not announced yet", "لم تُعلن بعد");
  }
  function filter() {
    const grid = document.querySelector(".orbit-pricing-grid"),
      student = document.getElementById("pricing-student-info");
    if (!grid) return;
    grid.hidden = audience === "student";
    if (student) student.hidden = audience !== "student";
    if (audience === "student") {
      const checkout = document.getElementById("pricing-checkout");
      if (checkout) checkout.hidden = true;
    }
    grid
      .querySelectorAll(".orbit-plan-card")
      .forEach((card) => (card.hidden = audience !== "all" && card.dataset.audience !== audience));
    document
      .querySelectorAll("[data-plan-audience]")
      .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.planAudience === audience)));
  }
  function updateSelected() {
    document.querySelectorAll(".orbit-plan-card").forEach((c) => {
      const active = c.querySelector("[data-select-plan]")?.dataset.selectPlan === selected;
      c.classList.toggle("pricing-selected", active);
    });
  }
  function scrollToElement(element) {
    element.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
    const heading = element.querySelector("h2");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }
  function renderCheckout() {
    const section = document.getElementById("pricing-checkout"),
      plan = S.config.plans[selected];
    if (!section || !plan) return;
    const configured = !!window.OrbitConfig?.subscriptionCheckoutEndpoint && knownPrice(plan);
    section.innerHTML = `<div class="pricing-checkout-head"><div><h2>${t(configured ? "Review your subscription" : "Checkout preview", configured ? "راجع اشتراكك" : "معاينة الدفع")}</h2><p>${esc(plan.name)} · ${t("Review the details before your next step.", "راجع التفاصيل قبل خطوتك التالية.")}</p></div><button type="button" class="btn soft" id="pricing-back">${t("Back to plans", "العودة للباقات")}</button></div>
  <div class="pricing-checkout-grid"><section class="pricing-payment" aria-labelledby="pricing-payment-heading"><h3 id="pricing-payment-heading">${t(configured ? "Secure provider checkout" : "Payment details preview", configured ? "الدفع عبر المزود" : "معاينة بيانات الدفع")}</h3>
  <p class="pricing-checkout-notice" id="pricing-payment-notice">${configured ? t("Card details are entered only on the payment provider’s hosted page. ORBIT does not collect card numbers or CVV here.", "تُدخل بيانات البطاقة على صفحة مزود الدفع فقط. لا نجمع رقم البطاقة أو رمز الأمان هنا.") : t("Preview only. Prices and payments are not available yet. No card details can be entered or sent, and no subscription will be activated.", "هذه معاينة فقط. الأسعار والدفع غير متاحين حاليًا. لا يمكن إدخال أو إرسال بيانات بطاقة، ولن يُفعّل أي اشتراك.")}</p>
  <div class="pricing-card-option">${cardIcon}<span>${t("Card payment", "الدفع بالبطاقة")}</span><span class="pricing-status">${t(configured ? "Hosted by provider" : "Not connected", configured ? "عبر المزود" : "غير مربوط")}</span></div>
  ${configured ? "" : `<fieldset disabled class="pricing-payment-fields" aria-describedby="pricing-payment-notice"><legend class="pricing-sr-only">${t("Non-interactive payment preview", "معاينة دفع غير تفاعلية")}</legend><label>${t("Cardholder name", "اسم حامل البطاقة")}<input disabled autocomplete="off" placeholder="${t("Unavailable in preview", "غير متاح في المعاينة")}"></label><label>${t("Card number", "رقم البطاقة")}<input disabled autocomplete="off" dir="ltr" placeholder="••••  ••••  ••••  ••••"></label><div class="pricing-field-pair"><label>${t("Expiry date", "تاريخ الانتهاء")}<input disabled autocomplete="off" dir="ltr" placeholder="MM / YY"></label><label>${t("Security code", "رمز الأمان")}<input disabled autocomplete="off" dir="ltr" placeholder="•••"></label></div></fieldset>`}
  <p class="pricing-security-note">${configured ? t("Continue securely to your payment provider.", "تابع إلى صفحة مزود الدفع الآمنة.") : t("Your card information is neither requested nor stored.", "لا نطلب معلومات بطاقتك ولا نخزّنها.")}</p>
  <button type="button" class="orbit-access-button pricing-pay" id="pricing-pay" ${configured && !checkoutBusy ? "" : "disabled"}>${configured ? t("Continue to provider · ", "المتابعة للمزود · ") + esc(amount(plan)) : t("Payments are not available yet", "الدفع غير متاح حاليًا")}</button><p id="pricing-payment-status" role="status" aria-live="polite"></p></section>
  <aside class="pricing-order" aria-labelledby="pricing-order-heading"><h3 id="pricing-order-heading">${t("Order summary", "ملخص الاشتراك")}</h3><div class="pricing-summary-plan"><span>${t("Selected plan", "الباقة المختارة")}</span><strong>${esc(plan.name)}</strong></div><dl><div><dt>${t("Billing period", "دورة الفوترة")}</dt><dd>${esc(periodLabel(billingPeriod))}</dd></div><div><dt>${t("Subtotal", "السعر الأساسي")}</dt><dd>${esc(amount(plan))}</dd></div></dl><div class="pricing-total"><span>${t("Total", "الإجمالي")}</span><strong>${esc(amount(plan))}</strong></div><p>${t("No taxes or discounts have been configured for this plan. No charges are calculated in this preview.", "لا توجد ضرائب أو خصومات مهيأة لهذه الباقة. لا تُحسب رسوم في هذه المعاينة.")}</p></aside></div>`;
    section.querySelector("#pricing-back").onclick = () => {
      checkoutRequest?.abort("cancelled");
      section.hidden = true;
      scrollToElement(document.getElementById("pricing-comparison-heading"));
    };
    if (configured)
      section.querySelector("#pricing-pay").onclick = async (event) => {
        if (checkoutBusy) return;
        const user = OrbitAuth.current();
        if (!user || user.role !== plan.accountType) {
          S.requireAccount(plan.accountType);
          return;
        }
        const button = event.currentTarget,
          status = section.querySelector("#pricing-payment-status");
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
        status.textContent = t("Opening the payment provider…", "جاري فتح مزود الدفع…");
        checkoutBusy = true;
        const request = new AbortController();
        checkoutRequest = request;
        const timeout = setTimeout(() => request.abort("timeout"), 15000);
        try {
          const response = await fetch(OrbitConfig.subscriptionCheckoutEndpoint, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ planId: selected, scopeId: S.effective().scopeId }),
            signal: request.signal,
          });
          if (!response.ok) throw Error("CHECKOUT_FAILED");
          const data = await response.json(),
            url = new URL(data.checkoutUrl);
          if (url.protocol !== "https:") throw Error("INVALID_CHECKOUT");
          if (!request.signal.aborted) location.assign(url.href);
        } catch {
          status.textContent =
            request.signal.reason === "cancelled"
              ? t(
                  "Checkout cancelled. No subscription was activated.",
                  "أُلغيت المتابعة للدفع. لم يُفعّل أي اشتراك.",
                )
              : t(
                  "Checkout could not be opened. No subscription was activated. Please try again.",
                  "تعذر فتح الدفع. لم يُفعّل أي اشتراك. جرّب مرة أخرى.",
                );
        } finally {
          clearTimeout(timeout);
          checkoutBusy = false;
          checkoutRequest = null;
          const currentButton = document.getElementById("pricing-pay");
          if (currentButton) {
            currentButton.disabled = false;
            currentButton.removeAttribute("aria-busy");
          }
        }
      };
  }
  function selectPreview(id) {
    if (checkoutBusy) return;
    selected = id;
    billingPeriod = S.config.plans[id]?.billingPeriod || null;
    updateSelected();
    renderCheckout();
    const section = document.getElementById("pricing-checkout");
    section.hidden = false;
    scrollToElement(section);
  }
  function decorate() {
    const grid = document.querySelector(".orbit-pricing-grid");
    if (!grid || grid.dataset.pricingEnhanced) return;
    grid.dataset.pricingEnhanced = "true";
    const heading = document.createElement("section");
    heading.id = "pricing-comparison-heading";
    heading.className = "pricing-comparison-heading";
    heading.innerHTML = `<div><h2>${t("A plan for every next step", "باقة تناسب خطوتك الجاية")}</h2><p>${t("Compare the actual features and limits.", "قارن المزايا والحدود المتاحة بكل وضوح.")}</p></div><nav aria-label="${t("Plan audience", "فئة الباقات")}">${[
      ["all", "All", "الكل"],
      ["student", "Students", "الطلاب"],
      ["teacher", "Teachers", "المعلمون"],
      ["school", "Schools", "المدارس"],
    ]
      .map(
        ([id, en, ar]) =>
          `<button type="button" data-plan-audience="${id}" aria-pressed="${audience === id}">${t(en, ar)}</button>`,
      )
      .join("")}</nav>`;
    grid.before(heading);
    heading.querySelectorAll("button").forEach(
      (b) =>
        (b.onclick = () => {
          audience = b.dataset.planAudience;
          filter();
        }),
    );
    const student = document.createElement("section");
    student.id = "pricing-student-info";
    student.className = "pricing-student-info";
    student.hidden = true;
    student.innerHTML = `<h3>${t("Your learning journey", "رحلتك التعليمية")}</h3><p>${t("No student subscription plans are currently configured. Your existing learning access remains unchanged.", "لا توجد باقات اشتراك للطلاب مهيأة حاليًا. وصولك الحالي للتعلّم يبقى كما هو.")}</p><a class="orbit-access-button secondary" href="../lessons/lessons.html">${t("Explore lessons", "استكشف الدروس")}</a>`;
    grid.after(student);
    const current = S.effective().plan;
    grid.querySelectorAll(".orbit-plan-card").forEach((card) => {
      const button = card.querySelector("[data-select-plan]"),
        id = button?.dataset.selectPlan,
        plan = S.config.plans[id];
      if (!plan) return;
      card.dataset.audience = plan.accountType;
      card.dataset.planId = id;
      card.classList.toggle("current-plan-option", current?.name === plan.name);
      const badges = document.createElement("div");
      badges.className = "pricing-card-labels";
      const pill = card.querySelector(".orbit-plan-pill");
      if (pill) badges.append(pill);
      if (id === "teacher-pro") {
        card.classList.add("pricing-recommended");
        badges.insertAdjacentHTML(
          "beforeend",
          `<span class="pricing-recommendation">${t("Recommended", "مقترحة لك")}</span>`,
        );
      }
      card.prepend(badges);
      if (current?.name === plan.name) {
        const currentLabel = document.createElement("span");
        currentLabel.className = "pricing-current-label";
        currentLabel.textContent = t("Your current plan", "باقتك الحالية");
        card.querySelector("h2").after(currentLabel);
      }
      card.querySelectorAll("li").forEach((li) => {
        const text = document.createElement("span");
        while (li.firstChild) text.append(li.firstChild);
        li.innerHTML = check;
        li.append(text);
      });
      if (id !== "teacher-free" && id !== "school-starter") {
        card.querySelector(".orbit-plan-price").textContent = amount(plan);
        button.onclick = () => selectPreview(id);
      }
    });
    const checkout = document.createElement("section");
    checkout.id = "pricing-checkout";
    checkout.className = "pricing-checkout";
    checkout.hidden = true;
    student.after(checkout);
    if (selected && S.config.plans[selected]) renderCheckout();
    updateSelected();
    filter();
  }
  document.addEventListener("DOMContentLoaded", () => {
    decorate();
    new MutationObserver((records) => {
      if (
        !records.some((r) =>
          [...r.addedNodes].some(
            (n) =>
              n.nodeType === 1 &&
              (n.matches?.(".wrap,.orbit-pricing-grid") ||
                n.querySelector?.(".orbit-pricing-grid")),
          ),
        )
      )
        return;
      if (!pending) {
        pending = true;
        queueMicrotask(() => {
          pending = false;
          decorate();
        });
      }
    }).observe(document.getElementById("app"), { childList: true, subtree: true });
  });
})();
