

/*
 * واژه‌یار
 *
 * برای جست‌وجو، فایل‌های TXT از سایت خوانده می‌شوند.
 * برای ثبت فایل جدید، بک‌اند امن GitHub لازم است.
 */

// بعد از راه‌اندازی بک‌اند، نشانی آن را اینجا وارد کن.
// مثال: https://your-dictionary-api.example.com
const API_URL = "";

const $ = (id) => document.getElementById(id);

const languageNames = {
  Engelska: "انگلیسی",
  Svenska: "سوئدی",
  Persiska: "فارسی"
};
/*
function getPath(source, target, word) {
  return `${source}-${target}/ord/${encodeURIComponent(word.trim())}.txt`;
}*/

function getPath(source, target, word) {
  const folderNames = {
    "Svenska-Persiska": "Svenska-persiska"
  };

  const pair = `${source}-${target}`;
  const folder = folderNames[pair] || pair;

  return `${folder}/ord/${encodeURIComponent(word.trim())}.txt`;
}

function showMessage(element, message, type = "info") {
  element.textContent = message;
  element.className = `message ${type}`;
  element.hidden = false;
}

function showResultMessage(title, description) {
  const result = $("result");
  result.replaceChildren();

  const box = document.createElement("div");
  box.className = "empty-state";

  const icon = document.createElement("span");
  icon.className = "empty-icon";
  icon.textContent = "文";

  const heading = document.createElement("h3");
  heading.textContent = title;

  const paragraph = document.createElement("p");
  paragraph.textContent = description;

  box.append(icon, heading, paragraph);
  result.append(box);
}
/*
function renderEntry(word, content, source, target) {
  const result = $("result");
  result.replaceChildren();

  const article = document.createElement("article");
  article.className = "entry";

  const header = document.createElement("div");
  header.className = "entry-header";

  const heading = document.createElement("h3");
  heading.textContent = word;

  const meta = document.createElement("span");
  meta.className = "entry-meta";
  meta.textContent =
    `${languageNames[source]} ← ${languageNames[target]}`;

  const body = document.createElement("div");
  body.className = "entry-content";
  body.textContent = content;

  header.append(heading, meta);
  article.append(header, body);
  result.append(article);
}
*/


function renderEntry(word, content, source, target) {
  const result = document.getElementById("result");
  result.replaceChildren();

  const article = document.createElement("article");
  article.className = "entry";

  // متن اصلی بدون تغییر
  const body = document.createElement("div");
  body.className = "entry-content";
  body.textContent = content;

  article.appendChild(body);
  result.appendChild(article);
}


function validateLanguages(source, target) {
  if (source === target) {
    showResultMessage(
      "انتخاب زبان نامعتبر است",
      "زبان مبدأ و مقصد باید متفاوت باشند."
    );
    return false;
  }

  return true;
}

// جست‌وجوی فایل TXT
async function searchWord(word, source, target) {
  if (!validateLanguages(source, target)) return;

  const path = getPath(source, target, word);
  showResultMessage("در حال جست‌وجو...", "لطفاً منتظر بمانید.");

  try {
    const response = await fetch(path, { cache: "no-store" });

    if (response.status === 404) {
      showResultMessage(
        "لغت پیدا نشد",
        `فایل ${path} وجود ندارد. املای لغت و زبان‌ها را بررسی کنید.`
      );
      return;
    }

    if (!response.ok) {
      throw new Error("خطا در دریافت فایل");
    }

    const content = await response.text();
    renderEntry(word.trim(), content, source, target);
  } catch {
    showResultMessage(
      "خطا در جست‌وجو",
      "فایل قابل دریافت نیست. مطمئن شوید سایت روی سرور اجرا شده و مسیر فایل درست است."
    );
  }
}

$("dictionaryTab").addEventListener("click", () => {
  $("dictionaryView").hidden = false;
  $("adminView").hidden = true;
  $("dictionaryTab").classList.add("active");
  $("adminTab").classList.remove("active");
});

$("adminTab").addEventListener("click", () => {
  $("dictionaryView").hidden = true;
  $("adminView").hidden = false;
  $("adminTab").classList.add("active");
  $("dictionaryTab").classList.remove("active");
});

$("searchForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  await searchWord(
    $("searchWord").value,
    $("searchSource").value,
    $("searchTarget").value
  );
});

// افزودن لغت جدید
$("adminForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = $("adminMessage");
  message.hidden = true;

  const source = $("adminSource").value;
  const target = $("adminTarget").value;
  const word = $("newWord").value.trim().normalize("NFC");
  const description = $("newDescription").value;

  if (source === target) {
    showMessage(
      message,
      "زبان مبدأ و مقصد باید متفاوت باشند.",
      "error"
    );
    return;
  }

  if (!word || !description.trim()) {
    showMessage(
      message,
      "هر دو فیلد لغت جدید و توضیحات الزامی هستند.",
      "error"
    );
    return;
  }

  // جلوگیری از دست‌کاری مسیر فایل
  if (
    word.length > 120 ||
    /[\/\\]/.test(word) ||
    word === "." ||
    word === ".." ||
    word.includes("..") ||
    /[\u0000-\u001f\u007f]/.test(word)
  ) {
    showMessage(
      message,
      "نام لغت نامعتبر است. از نشانه‌های مسیر فایل استفاده نکنید.",
      "error"
    );
    return;
  }

  if (!API_URL) {
    showMessage(
      message,
      `فرم بررسی شد، اما بک‌اند هنوز تنظیم نشده است. مسیر فایل: ${getPath(source, target, word)}. برای ذخیره واقعی، API_URL را پس از راه‌اندازی بک‌اند تنظیم کنید.`,
      "info"
    );
    return;
  }

  // کلید ادمین داخل فایل عمومی ذخیره نمی‌شود.
  // آن را فقط هنگام ثبت از ادمین می‌پرسیم.
  const adminKey = window.prompt("کلید دسترسی ادمین را وارد کنید:");

  if (!adminKey) {
    showMessage(message, "عملیات لغو شد؛ کلید ادمین وارد نشد.", "error");
    return;
  }

  const submitButton = $("adminForm").querySelector(
    'button[type="submit"]'
  );

  submitButton.disabled = true;
  submitButton.textContent = "در حال ذخیره...";

  try {
    const response = await fetch(
      `${API_URL.replace(/\/+$/, "")}/api/words`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey
        },
        body: JSON.stringify({
          source,
          target,
          word,
          description
        })
      }
    );

    const data = await response.json().catch(() => ({}));

    if (response.status === 409) {
      showMessage(
        message,
        "این لغت قبلاً در همین جفت زبان ثبت شده است. فایل جدید ساخته نشد.",
        "error"
      );
      return;
    }

    if (response.status === 401) {
      showMessage(
        message,
        "کلید ادمین معتبر نیست.",
        "error"
      );
      return;
    }

    if (!response.ok) {
      showMessage(
        message,
        data.error || "ذخیره لغت ناموفق بود.",
        "error"
      );
      return;
    }

    showMessage(
      message,
      `لغت با موفقیت ذخیره شد: ${data.path}`,
      "success"
    );

    $("newWord").value = "";
    $("newDescription").value = "";
  } catch {
    showMessage(
      message,
      "ارتباط با بک‌اند برقرار نشد. نشانی API و اتصال سرور را بررسی کنید.",
      "error"
    );
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "بررسی و ذخیره لغت ←";
  }
});
