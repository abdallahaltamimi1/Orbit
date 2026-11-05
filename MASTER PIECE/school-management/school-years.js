(() => {
  "use strict";
  function mount(host, t) {
    const S = OrbitSchoolYears;
    const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    const labels = { upcoming: t("Upcoming", "قادمة"), active: t("Active", "نشطة"), archived: t("Archived", "مؤرشفة") };
    const errors = {
      INVALID_FIELDS: t("Enter a name of up to 100 characters.", "أدخل اسمًا لا يتجاوز 100 حرف."),
      INVALID_DATES: t("Use valid dates with the end later than the start.", "أدخل تاريخين صالحين؛ يجب أن تكون النهاية بعد البداية."),
      DUPLICATE_YEAR: t("This school already has a year with this name.", "توجد سنة بهذا الاسم لدى هذه المدرسة."),
      OVERLAPPING_YEARS: t("Dates overlap another upcoming or active year, including shared boundary dates.", "تتداخل التواريخ مع سنة قادمة أو نشطة، بما في ذلك يوم البداية أو النهاية المشترك."),
      CONFIRMATION_REQUIRED: t("Confirm the change before continuing.", "أكد التغيير قبل المتابعة."),
      ARCHIVED_RECORD: t("Archived years are read-only.", "السنوات المؤرشفة للقراءة فقط."),
      ACTIVE_NAME_READONLY: t("The active year's name is read-only.", "اسم السنة النشطة للقراءة فقط."),
      INVALID_TRANSITION: t("Only an upcoming year can be activated.", "يمكن تفعيل سنة قادمة فقط."),
      STALE_DATA: t("Years changed in another view. Close this dialog and refresh the list.", "تغيرت السنوات في نافذة أخرى. أغلق الحوار وحدّث القائمة."),
      SCHOOL_CHANGED: t("The school account changed. Reload before continuing.", "تغير حساب المدرسة. أعد تحميل الصفحة قبل المتابعة."),
      ROLE_DENIED: t("A School account is required.", "يلزم حساب مدرسة."),
      STORAGE_FAILED: t("Browser storage is unavailable. Changes were not saved.", "تعذر التخزين في المتصفح. لم تُحفظ التغييرات."),
    };
    const message = (e) => errors[e.message] || t("Saved year data is unavailable. It has not been replaced. Check browser storage.", "بيانات السنوات المحفوظة غير متاحة ولم تُستبدل. تحقق من تخزين المتصفح.");
    let db;
    function draw() {
      host.innerHTML = `<header class="sm-academic-view-header sm-years-header"><div><h2 id="sm-section-title" tabindex="-1">${t("Academic Years", "السنوات الدراسية")}</h2><p>${t("Create years manually and activate them with confirmation. Archived years remain read-only.", "أنشئ السنوات يدويًا وفعّلها بعد التأكيد. تبقى السنوات المؤرشفة للقراءة فقط.")}</p></div><div class="sm-view-actions"><button class="btn" data-year-create>${t("Create academic year", "إنشاء سنة دراسية")}</button><button class="btn soft" data-year-refresh>${t("Refresh list", "تحديث القائمة")}</button></div></header><p role="status" aria-live="polite" data-year-feedback></p><div data-year-list></div>`;
      try { db = S.read(); } catch (e) {
        host.querySelector("[data-year-create]").disabled = true;
        host.querySelector("[data-year-list]").innerHTML = `<p class="sm-error" role="alert">${esc(message(e))}</p>`;
        return;
      }
      // Sort the display only; legacy records and timestamp ties retain storage order.
      const years = db.years.map((row, index) => ({ row, index, created: row.createdAt ? Date.parse(row.createdAt) : -Infinity }))
        .sort((a, b) => (a.created === b.created ? a.index - b.index : a.created > b.created ? -1 : 1)).map(({ row }) => row);
      host.querySelector("[data-year-list]").innerHTML = db.years.length ? `<div class="sm-table-scroll" tabindex="0" role="region" aria-label="${t("Academic years", "السنوات الدراسية")}"><table class="sm-academic-table sm-years-table"><caption>${t("Newest created first · Includes read-only archives", "الأحدث إنشاءً أولًا · يشمل الأرشيف للقراءة فقط")}<span class="sm-table-scroll-hint">${t("Scroll for status and actions", "مرّر لعرض الحالة والإجراءات")}</span></caption><thead><tr>${[t("Name", "الاسم"), t("Start date", "تاريخ البداية"), t("End date", "تاريخ النهاية"), t("Status", "الحالة"), t("Actions", "الإجراءات")].map((s) => `<th scope="col">${s}</th>`).join("")}</tr></thead><tbody>${years.map((r) => `<tr data-year-id="${esc(r.id)}"><th scope="row">${esc(r.name)}</th><td data-year-label="${t("Start date", "تاريخ البداية")}"><time datetime="${r.startDate}">${r.startDate}</time></td><td data-year-label="${t("End date", "تاريخ النهاية")}"><time datetime="${r.endDate}">${r.endDate}</time></td><td><span class="sm-status" data-year-status="${r.status}">${labels[r.status]}</span></td><td><div class="sm-row-actions">${r.status === "archived" ? t("Read-only", "للقراءة فقط") : `<button class="btn soft" data-year-edit="${esc(r.id)}">${r.status === "active" ? t("Edit dates", "تعديل التواريخ") : t("Edit", "تعديل")}</button>${r.status === "upcoming" ? `<button class="btn" data-year-activate="${esc(r.id)}">${t("Activate", "تفعيل")}</button>` : ""}`}</div></td></tr>`).join("")}</tbody></table></div>` : `<p class="sm-empty sm-compact-empty">${t("No academic years yet. Create one to get started; it will remain Upcoming until you activate it.", "لا توجد سنوات دراسية بعد. أنشئ سنة للبدء؛ ستبقى قادمة حتى تفعّلها.")}</p>`;
    }
    function open(id, activating, trigger) {
      try { db = S.read(); } catch (e) { host.querySelector("[data-year-feedback]").textContent = message(e); return; }
      const row = db.years.find((r) => r.id === id);
      if (id && (!row || row.status === "archived")) return;
      const context = { schoolId: db.schoolId, revision: db.revision };
      const active = db.years.find((r) => r.id === db.activeYearId);
      const dialog = document.createElement("dialog");
      dialog.className = "sm-academic-dialog sm-year-dialog";
      dialog.setAttribute("aria-labelledby", "sm-year-dialog-title");
      const title = activating ? t("Activate academic year", "تفعيل السنة الدراسية") : row ? t("Edit academic year", "تعديل السنة الدراسية") : t("Create academic year", "إنشاء سنة دراسية");
      const field = (name, label, type, value) => `<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" required ${type === "text" ? 'maxlength="100"' : 'min="0001-01-01" max="9999-12-31"'} ${name === "name" && row?.status === "active" ? "readonly" : ""}></label>`;
      dialog.innerHTML = `<form><h2 id="sm-year-dialog-title">${title}</h2>${activating ? `<p>${esc(row.name)}</p><p>${active ? t("Activating this year archives the current active year:", "سيؤدي تفعيل هذه السنة إلى أرشفة السنة النشطة الحالية:") + " " + esc(active.name) : t("This year becomes the school's active year only after you confirm.", "ستصبح هذه السنة نشطة للمدرسة بعد تأكيدك فقط.")}</p><p>${t("Historical academic records will be preserved. Archived years are read-only.", "ستُحفظ السجلات الأكاديمية التاريخية. السنوات المؤرشفة للقراءة فقط.")}</p>` : `<div class="sm-dialog-fields">${field("name", t("Name", "الاسم"), "text", row?.name || "")}${field("startDate", t("Start date", "تاريخ البداية"), "date", row?.startDate || "")}${field("endDate", t("End date", "تاريخ النهاية"), "date", row?.endDate || "")}</div>${row?.status === "active" ? `<label class="sm-year-confirm"><input type="checkbox" name="confirmed" required> ${t("I confirm changing the active year's dates. Existing academic records remain unchanged.", "أؤكد تغيير تواريخ السنة النشطة. تبقى السجلات الأكاديمية الحالية دون تغيير.")}</label>` : `<p>${t("This year will remain Upcoming until manually activated.", "ستبقى هذه السنة قادمة حتى تفعيلها يدويًا.")}</p>`}`}<p role="alert" class="sm-error" data-year-error></p><div class="sm-dialog-actions"><button class="btn" type="submit">${activating ? t("Confirm activation", "تأكيد التفعيل") : row?.status === "active" ? t("Confirm date changes", "تأكيد تعديل التواريخ") : t("Save", "حفظ")}</button><button class="btn soft" type="button" data-year-cancel>${t("Cancel", "إلغاء")}</button></div></form>`;
      document.getElementById("orbit-page").append(dialog);
      dialog.querySelector("[data-year-cancel]").onclick = () => dialog.close();
      dialog.addEventListener("close", () => { dialog.remove(); if (trigger?.isConnected) trigger.focus(); }, { once: true });
      dialog.querySelector("form").onsubmit = (event) => {
        event.preventDefault();
        try {
          if (activating) S.activate(id, context, true);
          else S.save(id, Object.fromEntries(new FormData(event.target)), context, !!dialog.querySelector('[name="confirmed"]')?.checked);
          dialog.close(); draw();
          host.querySelector("[data-year-feedback]").textContent = t("Changes saved in this browser.", "حُفظت التغييرات في هذا المتصفح.");
          host.querySelector("[data-year-create]").focus({ preventScroll: true });
        } catch (e) { const error = dialog.querySelector("[data-year-error]"); error.textContent = message(e); error.tabIndex = -1; error.focus(); }
      };
      dialog.showModal();
      if (activating) dialog.querySelector("[data-year-cancel]").focus();
    }
    host.onclick = (event) => {
      const b = event.target.closest("button");
      if (!b) return;
      if (b.hasAttribute("data-year-refresh")) draw();
      else if (b.hasAttribute("data-year-create")) open("", false, b);
      else if (b.dataset.yearEdit) open(b.dataset.yearEdit, false, b);
      else if (b.dataset.yearActivate) open(b.dataset.yearActivate, true, b);
    };
    draw();
  }
  window.OrbitSchoolYearUI = { mount };
})();
