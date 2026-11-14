// Demo video recorder: the app runs in an iframe (1920x915) above a caption band (165px),
// so one Playwright recording already carries the caption, the role badge and the cursor ring.
import { execFileSync } from "node:child_process";
import { mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const W = 1920, H = 1080, BAND = 165;

const WRAPPER = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:#fff;font-family:Arial,Helvetica,sans-serif}
iframe{display:block;border:0;width:${W}px;height:${H - BAND}px}
#band{box-sizing:border-box;height:${BAND}px;background:#14213d;border-top:6px solid #f26f21;padding:22px 46px;color:#fff}
#head{display:flex;justify-content:space-between;font-weight:700;font-size:24px;letter-spacing:.5px}
#title{color:#ff9d5c;text-transform:uppercase}#badge{color:#dbe2f0}
#line{margin-top:14px;font-size:30px;line-height:1.25}
#card{position:fixed;inset:0 0 ${BAND}px 0;background:#14213d;color:#fff;display:flex;flex-direction:column;
align-items:center;justify-content:center;gap:18px;transition:opacity .4s}
#card b{font-size:64px}#card span{font-size:34px;color:#ff9d5c}
</style></head><body><iframe id="app" name="app"></iframe>
<div id="band"><div id="head"><div id="title"></div><div id="badge"></div></div><div id="line"></div></div>
<div id="card"><b id="cardTitle"></b><span id="cardSub"></span></div></body></html>`;

// Runs in every frame; only the app iframe draws the ring that follows the mouse.
function cursorRing() {
  if (window === window.top) return;
  const ring = document.createElement("div");
  ring.style.cssText = "position:fixed;z-index:2147483647;width:26px;height:26px;margin:-16px 0 0 -16px;"
    + "border:3px solid #f26f21;border-radius:50%;pointer-events:none;left:-99px;top:-99px;"
    + "transition:transform .12s;box-shadow:0 0 0 2px rgba(255,255,255,.7)";
  function attach() { document.documentElement.appendChild(ring); }
  if (document.documentElement) attach(); else document.addEventListener("DOMContentLoaded", attach);
  document.addEventListener("mousemove", (e) => { ring.style.left = e.clientX + "px"; ring.style.top = e.clientY + "px"; }, true);
  document.addEventListener("mousedown", () => { ring.style.transform = "scale(.6)"; }, true);
  document.addEventListener("mouseup", () => { ring.style.transform = "scale(1)"; }, true);
}

/**
 * @param {{ baseURL: string, outDir: string, headless?: boolean }} options
 * baseURL is the Vite client of the demo stack, outDir receives scenes/<id>.mp4 and the built videos.
 */
export async function openRecorder({ baseURL, outDir, headless = true }) {
  const scenesDir = path.join(outDir, "scenes");
  mkdirSync(scenesDir, { recursive: true });
  const browser = await chromium.launch({ headless });

  /**
   * Records one scene to scenes/<id>.mp4. A scene is one actor in one sitting.
   * meta: { id, title (orange heading), badge (right side, e.g. "04 / 10 · CLUB LEADER"),
   *         card: [big, small] shown while the app loads, cookie (ucms_session value or null), start (path) }
   * run receives { app (Frame: goto/locator/getByRole…), page, say, click, type, pause }.
   */
  async function scene(meta, run) {
    const raw = path.join(scenesDir, `${meta.id}-raw`);
    rmSync(raw, { recursive: true, force: true });
    const context = await browser.newContext({
      viewport: { width: W, height: H }, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh",
      recordVideo: { dir: raw, size: { width: W, height: H } },
    });
    if (meta.cookie) {
      await context.addCookies([{ name: "ucms_session", value: meta.cookie, url: baseURL, httpOnly: true }]);
    }
    await context.addInitScript(cursorRing);
    await context.addInitScript(() => { try { localStorage.setItem("locale", "vi"); localStorage.setItem("theme", "light"); } catch { /* opaque origin */ } });
    const page = await context.newPage();
    await page.route("**/__rec", (route) => route.fulfill({ contentType: "text/html", body: WRAPPER }));
    await page.goto(`${baseURL}/__rec`);
    async function setText(id, text) {
      await page.evaluate(([i, t]) => { document.getElementById(i).textContent = t; }, [id, text ?? ""]);
    }
    await setText("title", meta.title);
    await setText("badge", meta.badge);
    await setText("cardTitle", meta.card?.[0] ?? meta.title);
    await setText("cardSub", meta.card?.[1] ?? "");
    const app = page.frame({ name: "app" });
    await app.goto(baseURL + (meta.start ?? "/"));
    await app.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1800); // the card stays readable while the app settles
    await page.evaluate(() => { document.getElementById("card").style.opacity = "0"; });
    await page.waitForTimeout(500);
    await page.evaluate(() => { document.getElementById("card").style.display = "none"; });

    const tools = {
      app, page,
      pause: (ms) => page.waitForTimeout(ms),
      /** Caption line (what the presenter says), optional new heading; waits so it can be read. */
      async say(text, { title, ms } = {}) {
        if (title) await setText("title", title);
        await setText("line", text ? `“${text}”` : "");
        await page.waitForTimeout(ms ?? Math.min(7000, 1500 + text.length * 45));
      },
      /** Glides the ring to the target, then clicks. */
      async click(locator, { after = 900 } = {}) {
        await locator.scrollIntoViewIfNeeded();
        const box = await locator.boundingBox();
        if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 22 });
        await page.waitForTimeout(350);
        await locator.click();
        await page.waitForTimeout(after);
      },
      /** Clicks the field, then types at a readable speed (clears it first). */
      async type(locator, text, { delay = 28 } = {}) {
        await tools.click(locator, { after: 150 });
        await locator.fill("");
        await locator.pressSequentially(text, { delay });
        await page.waitForTimeout(400);
      },
    };
    let failure = null;
    try { await run(tools); } catch (error) {
      failure = error;
      await page.screenshot({ path: path.join(scenesDir, `${meta.id}-FAILED.png`) }).catch(() => {});
    }
    const video = page.video();
    await context.close();
    const out = path.join(scenesDir, `${meta.id}.mp4`);
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", await video.path(), "-r", "30",
      "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-an", out]);
    rmSync(raw, { recursive: true, force: true });
    if (failure) {
      renameSync(out, path.join(scenesDir, `${meta.id}-FAILED.mp4`));
      throw failure;
    }
    return out;
  }

  return { scene, close: () => browser.close() };
}

function duration(file) {
  return Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration",
    "-of", "csv=p=0", file]).toString().trim());
}

/** Joins scene files into one MP4 with a chapter per entry: chapters = [{ title, files: [mp4…] }]. */
export function buildVideo(outFile, chapters) {
  const list = `${outFile}.list.txt`, metaFile = `${outFile}.meta.txt`;
  let meta = ";FFMETADATA1\n", at = 0;
  const lines = [];
  for (const chapter of chapters) {
    const start = at;
    for (const file of chapter.files) {
      lines.push(`file '${path.resolve(file).replaceAll("'", "'\\''")}'`);
      at += duration(file);
    }
    meta += `[CHAPTER]\nTIMEBASE=1/1000\nSTART=${Math.round(start * 1000)}\nEND=${Math.round(at * 1000)}\ntitle=${chapter.title}\n`;
  }
  writeFileSync(list, lines.join("\n"));
  writeFileSync(metaFile, meta);
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", list,
    "-i", metaFile, "-map_metadata", "1", "-c", "copy", "-movflags", "+faststart", outFile]);
  rmSync(list); rmSync(metaFile);
  return at;
}
