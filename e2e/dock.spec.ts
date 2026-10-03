import { expect, test, type Page } from "@playwright/test";

const STORAGE = "glass-dock:config";

/** Seeds the mock adapter's saved config before the page loads. */
async function seed(page: Page, config: unknown) {
  // Only when nothing is stored yet, so a reload keeps whatever the app saved in between.
  await page.addInitScript(
    ([key, value]) => {
      if (localStorage.getItem(key as string) === null)
        localStorage.setItem(key as string, JSON.stringify(value));
    },
    [STORAGE, config],
  );
}

const dock = (items: unknown[], extra: Record<string, unknown> = {}) => ({
  version: 2,
  system: { onboarded: true },
  docks: [{ id: "d1", name: "Main dock", items }],
  ...extra,
});

const app = (id: string, label: string) => ({
  id,
  type: "app",
  label,
  path: `C:\\Mock\\${label}.exe`,
  args: [],
});
const widget = (id: string, kind: string, size = "compact", options = {}) => ({
  id,
  type: "widget",
  widget: kind,
  size,
  options,
});

test.describe("dock basics", () => {
  test("renders pinned apps and launches one", async ({ page }) => {
    await page.goto("/");
    const terminal = page.getByRole("button", { name: "Terminal", exact: true });
    await expect(terminal).toBeVisible();
    await terminal.click();
    // A running window makes the focus dot appear next to the icon.
    await expect(
      page.locator('[data-item-id="mock-terminal"] span.rounded-full').last(),
    ).toHaveClass(/bg-accent|bg-white/);
  });

  test("context menu offers window controls and a snap submenu", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Code", exact: true }).click({ button: "right" });
    await expect(page.getByRole("menuitem", { name: "Always on top" })).toBeVisible();
    await page.getByRole("menuitem", { name: /^Snap/ }).click();
    await expect(page.getByRole("menuitem", { name: "Left half" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
  });

  test("magnification grows the icon under the pointer", async ({ page }) => {
    await page.goto("/");
    const icon = page.getByRole("button", { name: "Browser", exact: true });
    const before = (await icon.boundingBox())!.width;
    const box = (await icon.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect.poll(async () => (await icon.boundingBox())!.width).toBeGreaterThan(before + 10);
  });
});

test.describe("command palette and launcher", () => {
  test("Ctrl+Space searches apps and Escape closes it", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Control+Space");
    const palette = page.getByRole("dialog", { name: "Command palette" });
    await expect(palette).toBeVisible();
    await page.keyboard.type("term");
    await expect(palette.getByRole("option").first()).toContainText("Terminal");
    await page.keyboard.press("Escape");
    await expect(palette).toHaveCount(0);
  });

  test("launcher shows categories and finds documents", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Control+Alt+Space");
    const launcher = page.getByRole("dialog", { name: "Launcher" });
    await expect(launcher).toBeVisible();
    await launcher.getByRole("tab", { name: "Accessories" }).click();
    await expect(launcher.getByRole("option")).toHaveCount(2);
    await launcher.getByRole("tab", { name: "Home" }).click();
    await launcher.getByLabel("Search apps, files and settings").fill("rep");
    await expect(launcher.getByRole("option", { name: /Report draft/ })).toBeVisible();
  });
});

test.describe("settings, themes and docks", () => {
  test("choosing a theme updates the dock and persists", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByRole("tab", { name: "Look" }).click();
    await page.getByRole("button", { name: "Parchment" }).click();
    await expect(page.getByRole("button", { name: "Parchment" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect
      .poll(() =>
        page.evaluate(
          (k) => JSON.parse(localStorage.getItem(k) ?? "{}").appearance?.themeId,
          STORAGE,
        ),
      )
      .toBe("parchment");
  });

  test("position change re-lays the dock out vertically", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Settings" }).click();
    await page
      .getByRole("dialog", { name: "Settings" })
      .getByLabel("Position")
      .selectOption("left");
    const nav = page.getByRole("toolbar", { name: "Dock" });
    await expect(nav).toHaveAttribute("aria-orientation", "vertical");
  });

  test("adding and removing a second dock edits the config", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByRole("button", { name: "Add dock", exact: true }).click();
    await expect
      .poll(() =>
        page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "{}").docks?.length, STORAGE),
      )
      .toBe(2);
    await page.getByRole("button", { name: /^Remove Dock 2/ }).click();
    await expect
      .poll(() =>
        page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "{}").docks?.length, STORAGE),
      )
      .toBe(1);
  });

  test("a v1 config from an older version is migrated, not lost", async ({ page }) => {
    await seed(page, {
      version: 1,
      dock: { position: "top", iconSize: 64 },
      items: [app("a1", "Legacy")],
    });
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Legacy", exact: true })).toBeVisible();
    await expect(page.getByRole("toolbar", { name: "Dock" })).toHaveAttribute(
      "aria-orientation",
      "horizontal",
    );
  });
});

test.describe("widgets", () => {
  test("calculator evaluates an expression", async ({ page }) => {
    await seed(page, dock([widget("w1", "calculator")]));
    await page.goto("/");
    await page.getByRole("button", { name: "Calculator" }).click();
    await page.getByLabel("Expression").fill("2+3*4");
    await page.keyboard.press("Enter");
    await expect(page.getByText("14", { exact: true })).toBeVisible();
  });

  test("to-do list adds, completes and persists items", async ({ page }) => {
    await seed(page, dock([widget("w1", "todo")]));
    await page.goto("/");
    await page.getByRole("button", { name: "To-do list" }).click();
    await page.getByLabel("New task").fill("Write tests");
    await page.keyboard.press("Enter");
    await page.getByRole("checkbox", { name: "Write tests" }).check();
    const saved = () =>
      page.evaluate(
        (k) => JSON.parse(localStorage.getItem(k) ?? "{}").docks?.[0]?.items?.[0]?.options?.items,
        STORAGE,
      );
    await expect.poll(saved).toContain("Write tests");
    await expect.poll(saved).toContain('"done":true');
  });

  test("stopwatch starts and shows elapsed time", async ({ page }) => {
    await seed(page, dock([widget("w1", "stopwatch")]));
    await page.goto("/");
    await page.getByRole("button", { name: "Stopwatch" }).click();
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await page.waitForTimeout(1200);
    await expect(page.getByRole("button", { name: "Stop", exact: true })).toBeVisible();
    await expect(page.getByText(/^00:0[1-9],\d\d$/)).toBeVisible();
  });

  test("currency converter uses ECB-style rates with a decimal comma", async ({ page }) => {
    await seed(page, dock([widget("w1", "currency")]));
    await page.goto("/");
    await page.getByRole("button", { name: "Currency" }).click();
    await expect(page.getByText(/108,45 USD/)).toBeVisible();
  });

  test("record player panel switches finish", async ({ page }) => {
    await seed(page, dock([widget("w1", "turntable", "wide")]));
    await page.goto("/");
    await page.getByRole("button", { name: "Record player" }).click();
    await page.getByRole("button", { name: "walnut" }).click();
    await expect
      .poll(() =>
        page.evaluate(
          (k) =>
            JSON.parse(localStorage.getItem(k) ?? "{}").docks?.[0]?.items?.[0]?.options?.finish,
          STORAGE,
        ),
      )
      .toBe("walnut");
  });

  test("wide size doubles the tile width", async ({ page }) => {
    await seed(page, dock([widget("w1", "uptime"), widget("w2", "battery", "wide")]));
    await page.goto("/");
    const compact = (await page.getByRole("button", { name: "Uptime" }).boundingBox())!.width;
    const wide = (await page.getByRole("button", { name: "Battery" }).boundingBox())!.width;
    expect(wide).toBeGreaterThan(compact * 1.8);
  });
});

test.describe("first run and accessibility", () => {
  test("welcome panel appears once and can be dismissed", async ({ page }) => {
    await seed(page, { ...dock([app("a1", "Code")]), system: { onboarded: false } });
    await page.goto("/");
    const welcome = page.getByRole("dialog", { name: "Welcome" });
    await expect(welcome).toBeVisible();
    await welcome.getByRole("button", { name: "Got it" }).click();
    await expect(welcome).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("dialog", { name: "Welcome" })).toHaveCount(0);
  });

  test("keyboard navigation moves between dock items", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Control+Alt+Home");
    await expect(page.locator(":focus")).toHaveAttribute("aria-label", "Code");
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(":focus")).toHaveAttribute("aria-label", "Browser");
    await page.keyboard.press("End");
    await expect(page.locator(":focus")).toHaveAttribute("aria-label", "Settings");
  });

  test("window switcher opens with its hotkey", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Control+Alt+w");
    await expect(page.getByRole("dialog", { name: "Window switcher" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Window switcher" })).toHaveCount(0);
  });

  test("no console errors while exercising the main flows", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto("/");
    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByRole("button", { name: "Close settings" }).click();
    await page.keyboard.press("Control+Space");
    await page.keyboard.press("Escape");
    expect(errors).toEqual([]);
  });
});
