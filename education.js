
"use strict";

const courseList = document.getElementById("courseList");
const learningLanguage = document.getElementById("learningLanguage");
const translationLanguage = document.getElementById("translationLanguage");
const lessonPanel = document.getElementById("lessonPanel");
const lessonMenu = document.getElementById("lessonMenu");
const lessonContent = document.getElementById("lessonContent");
const courseTitle = document.getElementById("courseTitle");
const lessonTitle = document.getElementById("lessonTitle");
const lessonText = document.getElementById("lessonText");
const exerciseText = document.getElementById("exerciseText");
const taskText = document.getElementById("taskText");
const toggleLessons = document.getElementById("toggleLessons");
const readingSpeed = document.getElementById("readingSpeed");

let activeCourse = "";
let activeLesson = 0;
let activeUtterance = null;
let activeWord = "";
let meaningTimer = null;

const lessonNames = [
  "معرفی خود — Presentera sig",
  "سلام و احوال‌پرسی",
  "اعداد و سن",
  "کشور و زبان",
  "خانواده",
  "روزهای هفته",
  "ساعت و زمان",
  "کارهای روزانه",
  "غذا و نوشیدنی",
  "خانه",
  "محل کار",
  "خرید",
  "مسیر و آدرس",
  "حمل‌ونقل",
  "افعال پرکاربرد",
  "جمله‌سازی",
  "پرسش و پاسخ",
  "خواندن متن",
  "مرور درس‌ها",
  "آزمون پایانی"
];

function lessonFolder(course, lessonNumber) {
  if (course === "SFI-kurs-A" && lessonNumber === 1) {
    return `${course}/firstLesson`;
  }

  return `${course}/lesson${lessonNumber}`;
}

function fileUrl(path) {
  return new URL(path, window.location.href).href;
}

async function readTextFile(path) {
  const response = await fetch(fileUrl(path), { cache: "no-cache" });

  if (!response.ok) {
    throw new Error(`فایل پیدا نشد: ${path}`);
  }

  return response.text();
}

function showMessage(message) {
  const box = document.getElementById("lessonLoadMessage");

  if (box) {
    box.textContent = message;
    box.hidden = false;
  } else {
    const messageBox = document.createElement("p");
    messageBox.id = "lessonLoadMessage";
    messageBox.className = "intro";
    messageBox.setAttribute("role", "status");
    messageBox.textContent = message;
    lessonPanel.prepend(messageBox);
  }
}

function clearMessage() {
  const box = document.getElementById("lessonLoadMessage");

  if (box) {
    box.textContent = "";
    box.hidden = true;
  }
}

function renderLessonMenu() {
  lessonMenu.replaceChildren();

  lessonNames.forEach((name, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `درس ${index + 1}: ${name}`;

    if (index + 1 === activeLesson) {
      button.classList.add("active");
      button.setAttribute("aria-current", "true");
    }

    button.addEventListener("click", () => {
      loadLesson(activeCourse, index + 1);
    });

    lessonMenu.appendChild(button);
  });
}

async function openCourse(course) {
  activeCourse = course;
  activeLesson = 0;

  const languageName =
    learningLanguage.value === "SFI" ? "سوئدی" : "انگلیسی";

  courseTitle.textContent = `${languageName} — ${course}`;
  lessonPanel.hidden = false;
  lessonContent.hidden = true;
  clearMessage();
  renderLessonMenu();

  lessonPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function loadLesson(course, lessonNumber) {
  activeCourse = course;
  activeLesson = lessonNumber;

  stopReading();
  clearMessage();
  lessonContent.hidden = true;
  renderLessonMenu();

  const folder = lessonFolder(course, lessonNumber);

  try {
    const [lesson, exercise, task] = await Promise.all([
      readTextFile(`${folder}/lektion.txt`),
      readTextFile(`${folder}/exercise.txt`),
      readTextFile(`${folder}/task.txt`)
    ]);

    lessonTitle.textContent =
      `درس ${lessonNumber}: ${lessonNames[lessonNumber - 1]}`;

    // نمایش متن اصلی بدون حذف یا بازنویسی محتوای TXT
    lessonText.textContent = lesson;
    exerciseText.textContent = exercise;
    taskText.textContent = task;

    lessonContent.hidden = false;
    clearMessage();
  } catch (error) {
    showMessage(
      `${error.message} — مسیر و نام فایل‌ها را در GitHub بررسی کن.`
    );
  }
}

courseList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-course]");

  if (!button) return;

  const course = button.dataset.course;
  openCourse(course);
});

toggleLessons.addEventListener("click", () => {
  const isExpanded = toggleLessons.getAttribute("aria-expanded") === "true";

  toggleLessons.setAttribute("aria-expanded", String(!isExpanded));
  lessonMenu.hidden = isExpanded;
  toggleLessons.textContent = isExpanded
    ? "نمایش فهرست درس‌ها"
    : "بستن فهرست درس‌ها";
});

function getSelectedVoice() {
  const voices = window.speechSynthesis.getVoices();
  const wantedLanguage =
    learningLanguage.value === "SFI" ? "sv" : "en";

  return voices.find((voice) =>
    voice.lang.toLowerCase().startsWith(wantedLanguage)
  );
}

function speakText(text) {
  if (!("speechSynthesis" in window)) {
    showMessage("مرورگر شما از قابلیت خواندن متن پشتیبانی نمی‌کند.");
    return;
  }

  stopReading();

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = getSelectedVoice();

  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang =
      learningLanguage.value === "SFI" ? "sv-SE" : "en-US";
  }

  utterance.rate = Number(readingSpeed.value);
  activeUtterance = utterance;

  utterance.onerror = () => {
    activeUtterance = null;
    showMessage("پخش صدا با مشکل مواجه شد.");
  };

  utterance.onend = () => {
    if (activeUtterance === utterance) {
      activeUtterance = null;
    }
  };

  window.speechSynthesis.speak(utterance);
}

function stopReading() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  activeUtterance = null;
}

document.getElementById("readText").addEventListener("click", () => {
  if (!lessonText.textContent) {
    showMessage("ابتدا یک درس را باز کن.");
    return;
  }

  speakText(lessonText.textContent);
});

document.getElementById("readWord").addEventListener("click", () => {
  if (!activeWord) {
    showMessage("ابتدا یک لغت از متن درس انتخاب کن.");
    return;
  }

  speakText(activeWord);
});

document.getElementById("stopReading").addEventListener("click", stopReading);

function findDictionaryPath(word) {
  const source = learningLanguage.value === "SFI" ? "Svenska" : "Engelska";
  const target = translationLanguage.value;

  // نام پوشه‌ها باید با حروف بزرگ و کوچک واقعی GitHub هماهنگ باشد.
  const pairNames = {
    "Svenska-Persiska": "Svenska-persiska"
  };

  const pair = `${source}-${target}`;
  const folder = pairNames[pair] || pair;

  return `${folder}/ord/${encodeURIComponent(word)}.txt`;
}


async function showWordMeaning(word, anchor) {
  // اگر معنی همین لغت باز است، آن را ببند
  const oldMeaning = anchor.nextElementSibling;

  if (oldMeaning?.classList.contains("word-meaning")) {
    oldMeaning.remove();
    return;
  }

  // معنی‌های باز قبلی را ببند
  document.querySelectorAll(".word-meaning").forEach((meaning) => {
    meaning.remove();
  });

  try {
    const content = await readTextFile(findDictionaryPath(word));

    const meaning = document.createElement("span");
    meaning.className = "word-meaning";

    const text = document.createElement("span");
    text.textContent = content;

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "close-meaning";
    closeButton.textContent = "بستن معنی ✕";
    closeButton.setAttribute("aria-label", "بستن معنی لغت");

    closeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      meaning.remove();
    });

    meaning.append(text, closeButton);
    meaning.setAttribute("role", "status");

    anchor.insertAdjacentElement("afterend", meaning);
  } catch {
    const meaning = document.createElement("span");
    meaning.className = "word-meaning";

    const text = document.createElement("span");
    text.textContent = "معنی این لغت هنوز موجود نیست.";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "close-meaning";
    closeButton.textContent = "بستن ✕";

    closeButton.addEventListener("click", () => meaning.remove());

    meaning.append(text, closeButton);
    anchor.insertAdjacentElement("afterend", meaning);
  }
}


function prepareLessonWords() {
  // این تابع فقط برای متن نمایشی درس استفاده می‌شود.
  // فایل اصلی همچنان بدون تغییر در lessonText ذخیره و نمایش داده می‌شود.
  const original = lessonText.textContent;
  const fragment = document.createDocumentFragment();

  const words = original.match(/\s+|[^\s]+/gu) || [];

  words.forEach((part) => {
    if (/^\s+$/u.test(part)) {
      fragment.appendChild(document.createTextNode(part));
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "lesson-word";
    button.textContent = part;
    button.dataset.word = part.replace(/^[^\p{L}\p{N}åäöÅÄÖ]+|[^\p{L}\p{N}åäöÅÄÖ]+$/gu, "");

    let timer;

    button.addEventListener("pointerdown", () => {
      timer = setTimeout(() => {
        const word = button.dataset.word;

        if (word) {
          activeWord = word;
          showWordMeaning(word, button);
        }
      }, 1000);
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach((eventName) => {
      button.addEventListener(eventName, () => clearTimeout(timer));
    });

    button.addEventListener("click", () => {
      activeWord = button.dataset.word;
    });

    fragment.appendChild(button);
  });

  lessonText.replaceChildren(fragment);
}

// معنی لغت‌ها فقط به متن درس اعمال می‌شود، نه فایل‌های تمرین و تکلیف.
const originalLoadLesson = loadLesson;

loadLesson = async function (course, lessonNumber) {
  await originalLoadLesson(course, lessonNumber);

  if (!lessonContent.hidden) {
    prepareLessonWords();
  }
};

translationLanguage.addEventListener("change", () => {
  const meanings = lessonText.querySelectorAll(".word-meaning");
  meanings.forEach((meaning) => meaning.remove());
});

window.speechSynthesis?.getVoices();
