"use strict";
const O = ORBIT,
  { t, esc } = O,
  A = OrbitAuth,
  key = "orbit.exchange.v2";
const read = () => O.get(key, { items: [], requests: [] }),
  me = () => A.current()?.email;
let filter = "all";
function owner(x) {
  return OrbitProfiles.read(x.owner, "student");
}
function render() {
  const d = read();
  O.shell(
    t("Book exchange", "كتبك إلها رحلة ثانية"),
    `<section class="hero"><h2>${t("Sell a book. Lend an idea.", "بيع كتاب، أو أعيره لحد يستفيد")}</h2><p>${t("Connect with other students and agree on collection and return.", "تواصل مع الطلاب واتفقوا على الاستلام والإرجاع.")}</p><button class="btn" id="add-item">${t("Add listing", "أضف إعلان")}</button></section><label>${t("Listing type", "نوع الإعلان")}<select id="exchange-filter"><option value="all">${t("All", "الكل")}</option><option value="sale">${t("For sale", "للبيع")}</option><option value="lend">${t("For lending", "للإعارة")}</option><option value="mine">${t("My listings", "إعلاناتي")}</option></select></label><div class="grid">${
      d.items
        .filter(
          (x) => filter === "all" || (filter === "mine" && x.owner === me()) || x.type === filter,
        )
        .map(
          (x) =>
            `<article class="card">${x.images?.[0] ? `<img class="book-photo" data-asset="${esc(x.images[0])}" alt="${esc(x.title)}">` : ""}<span class="pill">${x.type === "sale" ? t("For sale", "للبيع") : t("For lending", "للإعارة")}</span><h2>${esc(x.title)}</h2><p>${esc(x.location)} · ${x.quantity} ${t("copies", "نسخ")}</p><strong>${x.type === "sale" ? esc(x.price) + " " + t("JD", "دينار") : esc(x.days) + " " + t("days", "يوم")}</strong><p>${esc(owner(x).name)}</p><button class="btn soft" data-detail="${x.id}">${t("View details", "شوف التفاصيل")}</button></article>`,
        )
        .join("") ||
      `<p>${t("No listings yet. Add your first book.", "لسه ما في إعلانات هون، ضيف أول كتاب!")}</p>`
    }</div><section class="card"><h2>${t("Requests on my books", "طلبات على كتبي")}</h2>${
      d.requests
        .filter((r) => r.owner === me())
        .map(
          (r) =>
            `<article><h3>${esc(r.title)} · ${esc(OrbitProfiles.read(r.from, "student").name || r.name)}</h3><p>${esc(r.message)}</p><p>${esc(r.contact)}</p><small>${t("Saved on this browser; coordinate directly using the contact provided.", "محفوظ على هذا المتصفح؛ اتفقوا مباشرة عبر وسيلة التواصل المكتوبة.")}</small><hr></article>`,
        )
        .join("") || t("No requests yet.", "ما وصلك طلب لسه.")
    }</section>`,
  );
  document.getElementById("exchange-filter").value = filter;
  document.getElementById("exchange-filter").onchange = (e) => {
    filter = e.target.value;
    render();
  };
  document.getElementById("add-item").onclick = () => edit();
  document
    .querySelectorAll("[data-detail]")
    .forEach((b) => (b.onclick = () => detail(b.dataset.detail)));
}
function edit(id) {
  if (!OrbitSubscriptions.requireAccount("student")) return;
  const old = read().items.find((x) => x.id === id);
  if (old && old.owner !== me()) return;
  const x = old || { type: "sale", quantity: 1, days: 7 },
    d = O.dialog(
      `<h2>${t("Book listing", "إعلان كتاب")}</h2><form id="listing-form"><label>${t("Type", "النوع")}<select name="type"><option value="sale">${t("Sale", "بيع")}</option><option value="lend">${t("Lending", "إعارة")}</option></select></label><label>${t("Book title", "اسم الكتاب")}<input name="title" required maxlength="150" value="${esc(x.title || "")}"></label><label>${t("Category", "الفئة")}<select name="category"><option value="book">${t("Book", "كتاب")}</option><option value="tool">${t("Educational tool", "أداة تعليمية")}</option><option value="equipment">${t("Equipment", "معدات")}</option></select></label><label>${t("Condition", "الحالة")}<select name="condition"><option value="new">${t("New", "جديد")}</option><option value="good">${t("Good", "جيد")}</option><option value="used">${t("Used", "مستعمل")}</option></select></label><label>${t("Description", "الوصف")}<textarea name="description" required maxlength="2000">${esc(x.description || "")}</textarea></label><label>${t("Location", "الموقع")}<input name="location" required maxlength="200" value="${esc(x.location || "")}"></label><label>${t("Quantity", "الكمية")}<input name="quantity" type="number" min="1" max="100" step="1" required value="${x.quantity}"></label><div id="sale-fields"><label>${t("Price per copy (JD)", "سعر النسخة بالدينار")}<input name="price" type="number" min="0" max="10000" step="0.01" value="${x.price ?? ""}"></label></div><div id="lend-fields"><label>${t("Loan duration (days)", "مدة الإعارة بالأيام")}<input name="days" type="number" min="1" max="365" step="1" value="${x.days || 7}"></label><label>${t("Return conditions", "شروط الإرجاع")}<textarea name="terms" maxlength="1000">${esc(x.terms || "")}</textarea></label></div><label>${t("Contact method (public)", "وسيلة التواصل (تظهر للجميع)")}<input name="contact" required maxlength="200" value="${esc(x.contact || "")}"></label><label>${t("Up to 3 photos, 5 MB each", "حتى 3 صور، 5 MB للصورة")}<input name="images" type="file" accept="image/png,image/jpeg,image/webp" multiple></label>${old ? `<label><input type="checkbox" name="removeImages">${t("Remove existing photos", "حذف الصور السابقة")}</label>` : ""}<p id="listing-status" role="status"></p><button class="btn">${t("Save listing", "احفظ الإعلان")}</button></form>`,
    ),
    f = d.querySelector("form");
  f.type.value = x.type;
  f.category.value = x.category || "book";
  f.condition.value = x.condition || "good";
  function fields() {
    const sale = f.type.value === "sale";
    d.querySelector("#sale-fields").hidden = !sale;
    d.querySelector("#lend-fields").hidden = sale;
    f.price.required = sale;
    f.price.disabled = !sale;
    f.days.required = !sale;
    f.days.disabled = sale;
    f.terms.required = !sale;
    f.terms.disabled = sale;
  }
  f.type.onchange = fields;
  fields();
  f.onsubmit = async (e) => {
    e.preventDefault();
    const b = f.querySelector("button[type=submit],button:not([type])");
    b.disabled = true;
    try {
      const v = Object.fromEntries(new FormData(f)),
        files = [...f.images.files],
        images = v.removeImages ? [] : [...(x.images || [])];
      if (files.length + images.length > 3)
        throw Error(t("Maximum 3 photos.", "الحد الأقصى 3 صور."));
      for (const photo of files)
        if (
          !["image/png", "image/jpeg", "image/webp"].includes(photo.type) ||
          photo.size > 5 * 1024 * 1024
        )
          throw Error(t("Choose supported photos below 5 MB.", "اختر صورًا مدعومة أقل من 5 MB."));
      for (const photo of files) {
        const asset = "exchange-" + crypto.randomUUID();
        await O.media(asset, photo);
        images.push(asset);
      }
      const item = {
        id: old?.id || crypto.randomUUID(),
        owner: me(),
        ownerName: A.profile().name,
        title: v.title.trim(),
        description: v.description.trim(),
        location: v.location.trim(),
        contact: v.contact.trim(),
        quantity: +v.quantity,
        type: v.type,
        category: v.category,
        condition: v.condition,
        images,
        createdAt: old?.createdAt || Date.now(),
      };
      if (
        !item.title ||
        !item.description ||
        !item.location ||
        !item.contact ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1
      )
        throw Error(t("Complete required fields.", "أكمل الحقول المطلوبة."));
      if (item.type === "sale") {
        if (!Number.isFinite(+v.price) || +v.price < 0) throw Error("Invalid price");
        item.price = +v.price;
      } else {
        if (!Number.isInteger(+v.days) || +v.days < 1 || !v.terms.trim())
          throw Error("Invalid lending terms");
        item.days = +v.days;
        item.terms = v.terms.trim();
      }
      const data = read();
      if (old) {
        if (data.items.find((i) => i.id === id)?.owner !== me()) throw Error("Forbidden");
        data.items = data.items.map((i) => (i.id === id ? item : i));
      } else data.items.unshift(item);
      O.set(key, data);
      d.close();
      render();
    } catch (ex) {
      d.querySelector("#listing-status").textContent = ex.message;
    } finally {
      b.disabled = false;
    }
  };
}
function detail(id) {
  const x = read().items.find((i) => i.id === id);
  if (!x) return;
  const p = owner(x),
    mine = x.owner === me(),
    d = O.dialog(
      `<h2>${esc(x.title)}</h2>${(x.images || []).map((asset) => `<img class="book-photo" data-asset="${esc(asset)}" alt="${esc(x.title)}">`).join("")}<p>${esc(x.category || "book")} · ${esc(x.condition || "good")}</p><p>${esc(x.description)}</p><p>${esc(x.location)} · ${x.quantity} ${t("copies", "نسخ")}</p><p>${x.type === "sale" ? esc(x.price) + " " + t("JD per copy", "دينار للنسخة") : esc(x.days) + " " + t("days", "يوم") + " · " + esc(x.terms)}</p>${p.photo ? `<img class="owner-photo" data-asset="${esc(p.photo)}" alt="">` : ""}<h3>${esc(p.name)}</h3><p>${esc(x.contact)}</p>${mine ? `<button class="btn" id="edit-listing">${t("Edit", "تعديل")}</button> <button class="btn soft" id="delete-listing">${t("Delete", "حذف")}</button><p id="delete-confirm" hidden>${t("Delete this listing?", "تحذف الإعلان؟")} <button class="btn" id="confirm-delete">${t("Confirm deletion", "أكد الحذف")}</button></p>` : `<form id="request-form"><label>${t("Your contact method", "وسيلة التواصل معك")}<input name="contact" required maxlength="200"></label><label>${t("Message", "رسالتك")}<textarea name="message" required maxlength="1000"></textarea></label><label><input type="checkbox" required>${t("Share my name and contact with the owner", "أوافق على مشاركة اسمي وتواصلي مع صاحب الكتاب")}</label><button class="btn">${x.type === "sale" ? t("Request purchase", "طلب شراء") : t("Request loan", "طلب استعارة")}</button><p id="request-status" role="status"></p><small>${t("Requests are saved in this browser. Use the listed contact to reach the owner; no external message is sent.", "الطلب ينحفظ على هذا المتصفح. تواصل مع صاحب الكتاب بالوسيلة المكتوبة؛ لا تُرسل رسالة خارجية.")}</small></form>`}`,
    );
  O.hydrate();
  if (mine) {
    d.querySelector("#edit-listing").onclick = () => {
      d.close();
      edit(id);
    };
    d.querySelector("#delete-listing").onclick = () =>
      (d.querySelector("#delete-confirm").hidden = false);
    d.querySelector("#confirm-delete").onclick = () => {
      const data = read();
      data.items = data.items.filter((i) => i.id !== id || i.owner !== me());
      O.set(key, data);
      d.close();
      render();
    };
  } else
    d.querySelector("form").onsubmit = (e) => {
      e.preventDefault();
      if (!OrbitSubscriptions.requireAccount("student")) return;
      const data = read(),
        v = Object.fromEntries(new FormData(e.target));
      if (data.requests.some((r) => r.item === id && r.from === me())) {
        d.querySelector("#request-status").textContent = t(
          "Your request is already saved.",
          "طلبك محفوظ مسبقًا.",
        );
        return;
      }
      data.requests.push({
        id: crypto.randomUUID(),
        item: id,
        title: x.title,
        owner: x.owner,
        from: me(),
        name: A.profile().name,
        contact: v.contact.trim(),
        message: v.message.trim(),
        createdAt: Date.now(),
      });
      O.set(key, data);
      d.querySelector("#request-status").textContent = t(
        "Request saved. Contact the owner to arrange collection.",
        "انحفظ طلبك. تواصل مع صاحب الكتاب واتفقوا على الاستلام.",
      );
      e.target.querySelector("button[type=submit],button:not([type])").disabled = true;
    };
}
render();

window.addEventListener("orbit:profile-change", () => {
  if (!document.querySelector("dialog[open]")) render();
});
