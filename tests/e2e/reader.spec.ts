import { expect, test } from "@playwright/test";

const CHAPTER_PATH = "/read/part-01/chapter-01";

const waitForHydration = async (page: import("@playwright/test").Page) => {
  await page.waitForFunction(() =>
    Boolean(
      (
        document.querySelector("#__nuxt") as {
          __vue_app__?: {
            config?: {
              globalProperties?: { $nuxt?: { isHydrating?: boolean } };
            };
          };
        } | null
      )?.__vue_app__?.config?.globalProperties?.$nuxt?.isHydrating === false,
    ),
  );
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test("serves the aligned English reader and synchronizes Ari anchors", async ({
  page,
}) => {
  await page.goto(CHAPTER_PATH);
  await waitForHydration(page);

  const source = page.locator("#reader-source-pane");
  const innerLight = page.locator("#reader-commentary-pane");
  const innerObservation = page.locator("#reader-inner-observation-pane");

  await expect(
    source.getByRole("heading", { name: "The Ari's Text" }),
  ).toBeVisible();
  await expect(
    innerLight
      .getByRole("heading", { name: "Inner Light", exact: true })
      .first(),
  ).toBeVisible();
  await expect(
    innerObservation
      .getByRole("heading", { name: "Inner Observation", exact: true })
      .first(),
  ).toBeVisible();
  await expect(source.locator("li[data-seif]").first()).toContainText(
    "emanated beings",
  );
  await expect(innerLight.locator("#op-1")).toContainText("spiritual time");
  await expect(innerObservation.locator("li").first()).not.toBeEmpty();

  await source.locator('[data-anchor="op-1"]').click();
  await expect(innerLight.locator("#op-1")).toHaveClass(/is-highlighted/);
});

test("switches languages, identifies AI text, and supports themes", async ({
  page,
}) => {
  await page.goto(CHAPTER_PATH);
  await waitForHydration(page);

  // The pane switcher lists LANGUAGES, and each pane's control is named
  // after its own layer — panes mode mounts three of them on this page, so
  // a bare "Language" would be ambiguous for both Playwright and a screen
  // reader. The resolved edition (here `he-jerusalem-1956`) is never a
  // control, only the `lang`/`dir` it produces.
  const source = page.locator("#reader-source-pane");
  await source.getByLabel("Language: The Ari's Text").selectOption("he");
  await expect(source.locator('[lang="he"][dir="rtl"]')).toBeVisible();

  const html = page.locator("html");
  const themeButton = page.getByRole("button", {
    name: "Switch to sepia mode",
  });
  await themeButton.click();
  await expect(html).toHaveClass(/sepia/);

  await page.goto("/read/part-09/chapter-73");
  await expect(
    page
      .locator("#reader-source-pane")
      .getByText("AI translated", { exact: true }),
  ).toBeVisible();
});

test("serves the Hebrew reader with RTL panes", async ({ page }) => {
  await page.goto(`/he${CHAPTER_PATH}`);
  await waitForHydration(page);

  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(
    page
      .locator("#reader-source-pane")
      .getByRole("heading", { name: "כתבי האר״י" }),
  ).toBeVisible();
  await expect(
    page
      .locator("#reader-commentary-pane")
      .getByRole("heading", { name: "אור פנימי", exact: true })
      .first(),
  ).toBeVisible();
  await expect(
    page
      .locator("#reader-inner-observation-pane")
      .getByRole("heading", { name: "הסתכלות פנימית", exact: true })
      .first(),
  ).toBeVisible();
});

test.describe("Q&A cross-references (issue #91)", () => {
  test("resolves an answer's 'to the question' link to the consolidated questions chapter", async ({
    page,
  }) => {
    // Answer chapters were consolidated into one `answers-<subject>-01`
    // chapter per part, items addressed by `#seif-N` — this is the closed
    // Questions <-> Answers loop (#78) still resolving internally against
    // that shape, not falling back to the sefaria.org new-tab link.
    await page.goto("/he/read/part-01/answers-terminology-01");
    await waitForHydration(page);

    const source = page.locator("#reader-source-pane");
    const firstSeif = source.locator("li[data-seif]").first();
    await expect(firstSeif).toHaveAttribute("data-seif", "1");

    const toQuestion = firstSeif.getByRole("link", { name: "לשאלה" });
    await expect(toQuestion).toHaveAttribute(
      "href",
      "/he/read/part-01/questions-terminology-01#seif-1",
    );

    await toQuestion.click();
    await expect(page).toHaveURL(
      "/he/read/part-01/questions-terminology-01#seif-1",
    );
    await expect(
      page.locator("#reader-source-pane li[data-seif='1']"),
    ).toBeVisible();
  });
});

test.describe("mobile reader", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test("defaults to study mode and offers swipe panes", async ({ page }) => {
    await page.goto(CHAPTER_PATH);
    await waitForHydration(page);

    const modes = page.getByRole("group", { name: "Reading mode" });
    await expect(modes.getByRole("button", { name: "Study" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(
      page.getByText("Before the emanated beings", { exact: false }).first(),
    ).toBeVisible();

    await modes.getByRole("button", { name: "Panes" }).click();
    const paneTabs = page.getByRole("tablist", { name: "Reader pane" });
    await expect(paneTabs).toBeVisible();
    const trackScrollLeft = () =>
      page.evaluate(
        () =>
          document.querySelector("#reader-source-pane")?.parentElement
            ?.scrollLeft ?? 0,
      );

    // Pill tap moves the track (regression: a tap used to flip
    // aria-selected without scrolling the track at all on some engines).
    await paneTabs.getByRole("tab", { name: "Inner Light" }).click();
    await expect(
      paneTabs.getByRole("tab", { name: "Inner Light" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#reader-commentary-pane")).toBeInViewport();
    await expect.poll(trackScrollLeft).toBeGreaterThan(0);

    // Swipe to the last slide, then tap back — the tap must scroll the
    // track even while the swipe's settle timer is still pending.
    //
    // This used to flake (issue 106) and the animation was a red herring:
    // `reducedMotion: "reduce"` is already set project-wide in
    // `playwright.config.ts`, so `scrollToPane`'s own scroll was instant the
    // whole time. What raced was state, not motion — the settle commit armed
    // by this smooth scroll resolved the pre-tap ratios and scrolled back to
    // the last slide, which is exactly the 780 this assertion kept seeing.
    // `MobileSwipePanes` now cancels that pending commit when `activePane`
    // changes; `tests/unit/mobile-swipe-panes.spec.ts` pins the mechanism
    // deterministically with fake timers, and this stays as the real-browser
    // proof that a tap after a swipe moves the track.
    await page.evaluate(() => {
      const track = document.querySelector(
        "#reader-source-pane",
      )?.parentElement;
      track?.scrollTo({ left: track.scrollWidth, behavior: "smooth" });
    });
    await expect.poll(trackScrollLeft).toBeGreaterThan(0);
    await paneTabs.getByRole("tab", { name: "The Ari's Text" }).click();
    await expect(
      paneTabs.getByRole("tab", { name: "The Ari's Text" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#reader-source-pane")).toBeInViewport();
    await expect.poll(trackScrollLeft).toBe(0);
  });
});
