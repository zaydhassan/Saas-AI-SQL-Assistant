import puppeteer from "puppeteer-core";

const email = "bellprobe@test.com";
const pass = "Sup3rSecret!";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

console.log("1. go to /login");
await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });

console.log("2. fill + submit login");
await page.type('input[type="email"]', email);
await page.type('input[type="password"]', pass);
await Promise.all([
  page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {}),
  page.click('button[type="submit"]'),
]);
await new Promise((r) => setTimeout(r, 2500));

console.log("3. current URL:", page.url());

// Force a re-sync by waiting for the navbar profile to appear.
const navInfo = await page.evaluate(() => {
  const bell = document.querySelector('[aria-label="Notifications"]');
  const profileBtn = document.querySelector('[aria-label]'); // placeholder
  // Look for the profile menu button (ProfileMenu) — find a button inside nav containing an img or "Logout"
  const nav = document.querySelector("nav");
  const navText = nav ? nav.innerText : "(no nav)";
  const bellRect = bell ? bell.getBoundingClientRect() : null;
  const bellStyles = bell ? (() => {
    const s = getComputedStyle(bell);
    return { color: s.color, display: s.display, visibility: s.visibility, opacity: s.opacity, width: s.width, height: s.height, background: s.background };
  })() : null;
  const bellHtml = bell ? bell.outerHTML.slice(0, 300) : null;
  const bellSvg = bell ? bell.querySelector("svg") ? bell.querySelector("svg").outerHTML.slice(0, 200) : "(no svg inside)" : null;
  return { url: location.href, bellPresent: !!bell, bellRect, bellStyles, bellHtml, bellSvg, navText: navText.slice(0, 400) };
});

console.log("4. nav info:\n" + JSON.stringify(navInfo, null, 2));

await page.screenshot({ path: "C:/Users/ZAYD/OneDrive/Desktop/AI-SQL-ASSISTANT/frontend/navbar-probe.png" });
console.log("5. screenshot -> navbar-probe.png");
console.log("6. console errors:\n" + (errors.join("\n") || "(none)"));

await browser.close();