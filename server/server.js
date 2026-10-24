
import express from "express";
import cors from "cors";
import { Octokit } from "@octokit/rest";

const app = express();

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || false
}));

app.use(express.json({ limit: "1mb" }));

const {
  GITHUB_TOKEN,
  GITHUB_OWNER,
  GITHUB_REPO,
  GITHUB_BRANCH = "main",
  ADMIN_API_KEY,
  PORT = 3000
} = process.env;

const languages = new Set([
  "Engelska",
  "Svenska",
  "Persiska"
]);

const octokit = GITHUB_TOKEN
  ? new Octokit({ auth: GITHUB_TOKEN })
  : null;

function isAuthorized(req) {
  const supplied = req.get("x-admin-key") || "";
  const expected = ADMIN_API_KEY || "";

  if (!expected || supplied.length !== expected.length) {
    return false;
  }

  let difference = 0;

  for (let i = 0; i < expected.length; i++) {
    difference |=
      supplied.charCodeAt(i) ^ expected.charCodeAt(i);
  }

  return difference === 0;
}

function validateWord(value) {
  if (typeof value !== "string") return null;

  const word = value.trim().normalize("NFC");

  if (
    !word ||
    word.length > 120 ||
    /[\/\\]/.test(word) ||
    word === "." ||
    word === ".." ||
    word.includes("..") ||
    /[\u0000-\u001f\u007f]/.test(word)
  ) {
    return null;
  }

  return word;
}

function createPath(source, target, word) {
  return `${source}-${target}/ord/${word}.txt`;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/words", async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({
      error: "دسترسی ادمین تأیید نشد."
    });
  }

  if (!octokit || !GITHUB_OWNER || !GITHUB_REPO) {
    return res.status(503).json({
      error: "تنظیمات GitHub در سرور کامل نیست."
    });
  }

  const source = req.body?.source;
  const target = req.body?.target;
  const word = validateWord(req.body?.word);
  const description = req.body?.description;

  if (
    !languages.has(source) ||
    !languages.has(target) ||
    source === target
  ) {
    return res.status(400).json({
      error: "زبان مبدأ یا مقصد نامعتبر است."
    });
  }

  if (
    !word ||
    typeof description !== "string" ||
    !description.trim()
  ) {
    return res.status(400).json({
      error: "لغت و توضیحات الزامی هستند."
    });
  }

  const path = createPath(source, target, word);

  try {
    // بررسی وجود فایل؛ فایل موجود نباید جایگزین شود.
    try {
      await octokit.rest.repos.getContent({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path,
        ref: GITHUB_BRANCH
      });

      return res.status(409).json({
        error: "این لغت قبلاً ثبت شده است."
      });
    } catch (error) {
      if (error.status !== 404) throw error;
    }

    const content = Buffer
      .from(description, "utf8")
      .toString("base64");

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path,
      branch: GITHUB_BRANCH,
      message: `Add dictionary word: ${word} (${source}-${target})`,
      content
    });

    return res.status(201).json({
      ok: true,
      path
    });
  } catch (error) {
    console.error(
      "GitHub save failed:",
      error.status || error.message
    );

    // GitHub ممکن است در صورت ایجاد هم‌زمان فایل،
    // درخواست دوم را رد کند.
    if (error.status === 422) {
      return res.status(409).json({
        error: "این لغت قبلاً ثبت شده یا هم‌زمان ایجاد شده است."
      });
    }

    return res.status(502).json({
      error: "ذخیره در GitHub انجام نشد؛ تنظیمات مخزن را بررسی کنید."
    });
  }
});

app.listen(PORT, () => {
  console.log(`Dictionary API listening on port ${PORT}`);
});
