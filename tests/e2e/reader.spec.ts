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

  // The highlight is a flash: ~900ms under reduced motion, two frames
  // without it. Polling for the class is a race with its own removal — it
  // failed once under four-worker contention where it passes 5/5 solo. Watch
  // for the transition instead of sampling for it, which is deterministic
  // and asserts the same thing.
  await innerLight.locator("#op-1").evaluate((el) => {
    (window as unknown as { __flashed?: boolean }).__flashed = false;
    new MutationObserver(() => {
      if (/is-highlighted/.test(el.className)) {
        (window as unknown as { __flashed?: boolean }).__flashed = true;
      }
    }).observe(el, { attributes: true, attributeFilter: ["class"] });
  });

  await source.locator('[data-anchor="op-1"]').click();

  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __flashed?: boolean }).__flashed,
      ),
    )
    .toBe(true);
  await expect(innerLight.locator("#op-1")).toBeInViewport();
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
      // Instant, like the gesture it stands in for. A programmatic *smooth*
      // scroll was always an approximation of a swipe, and now that
      // `scrollToPane` jumps rather than glides, the two animations fight
      // and the track settles wherever they cancel each other.
      track?.scrollTo({ left: track.scrollWidth, behavior: "auto" });
    });
    await expect.poll(trackScrollLeft).toBeGreaterThan(0);
    await paneTabs.getByRole("tab", { name: "The Ari's Text" }).click();
    await expect(
      paneTabs.getByRole("tab", { name: "The Ari's Text" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#reader-source-pane")).toBeInViewport();
    await expect.poll(trackScrollLeft).toBe(0);
  });

  test("collapses the top chrome on demand, and remembers it", async ({
    page,
  }) => {
    // Issue 113. A button, not a scroll gesture: the reader asks, so the
    // pane is allowed to simply grow into the space and everything stays
    // in normal flow. The earlier scroll-driven version had to lift the
    // chrome onto measured absolute positions to avoid moving the text,
    // and broke in those seams (#117).
    await page.goto(CHAPTER_PATH);
    await waitForHydration(page);
    await page
      .getByRole("group", { name: "Reading mode" })
      .getByRole("button", { name: "Panes" })
      .click();

    const paneBody = page.locator("#reader-source-pane .tes-pane-body");
    const heightOf = async () =>
      Math.round((await paneBody.boundingBox())!.height);
    const expanded = await heightOf();

    await page.getByRole("button", { name: "Collapse the toolbar" }).click();

    // The site navbar goes with it — on a phone it is 60px of the ~200px
    // being asked for back.
    await expect(page.locator("header").first()).toBeHidden();
    await expect(
      page.getByRole("navigation", { name: "Chapter navigation" }),
    ).toHaveCount(0);
    expect(await heightOf()).toBeGreaterThan(expanded + 100);

    // Expanding restores every piece of it. (That it *persists* across
    // visits is `tests/unit/collapsed-reader-chrome.spec.ts` — this
    // harness clears `localStorage` on every navigation, so a page-load
    // assertion here could only ever prove the harness.)
    await page.getByRole("button", { name: "Expand the toolbar" }).click();
    await expect(page.locator("header").first()).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Chapter navigation" }),
    ).toBeVisible();
    expect(await heightOf()).toBe(expanded);
  });

  test("switches pane on a tap with motion enabled — the real-device path", async ({
    page,
  }) => {
    // `playwright.config.ts` sets `reducedMotion: "reduce"` for the whole
    // project, so every other test here takes `scrollToPane`'s instant
    // branch. A real phone does not: it took the smooth one, on a
    // `scroll-snap-type: x mandatory` container, which is exactly where
    // engines disagree — and the branch had never run in CI. This test
    // pins the path a reader actually gets.
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(CHAPTER_PATH);
    await waitForHydration(page);
    await page
      .getByRole("group", { name: "Reading mode" })
      .getByRole("button", { name: "Panes" })
      .click();

    const paneTabs = page.getByRole("tablist", { name: "Reader pane" });
    const trackScrollLeft = () =>
      page.evaluate(
        () =>
          document.querySelector("#reader-source-pane")?.parentElement
            ?.scrollLeft ?? 0,
      );

    await paneTabs.getByRole("tab", { name: "Inner Light" }).tap();
    await expect(page.locator("#reader-commentary-pane")).toBeInViewport();
    await expect.poll(trackScrollLeft).toBeGreaterThan(0);

    await paneTabs.getByRole("tab", { name: "The Ari's Text" }).tap();
    await expect(page.locator("#reader-source-pane")).toBeInViewport();
    await expect.poll(trackScrollLeft).toBe(0);
  });

  test("an anchor tap carries the reader to Inner Light", async ({ page }) => {
    // Reported broken on a real phone while working on desktop, and this
    // path had only ever been covered at desktop width — where both panes
    // are on screen at once and there is no swipe track. It passes in
    // emulation either way, so it does not yet reproduce the report; it is
    // here so the mobile path stops being untested, not as proof of a fix.
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(CHAPTER_PATH);
    await waitForHydration(page);
    await page
      .getByRole("group", { name: "Reading mode" })
      .getByRole("button", { name: "Panes" })
      .click();

    await page.locator('#reader-source-pane [data-anchor="op-1"]').tap();

    await expect(
      page.getByRole("tablist", { name: "Reader pane" }).getByRole("tab", {
        name: "Inner Light",
      }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#reader-commentary-pane")).toBeInViewport();
    await expect(
      page.locator("#reader-commentary-pane #op-1"),
    ).toBeInViewport();
  });

  test("docks the pane switcher to the bottom edge", async ({ page }) => {
    await page.goto(CHAPTER_PATH);
    await waitForHydration(page);
    await page
      .getByRole("group", { name: "Reading mode" })
      .getByRole("button", { name: "Panes" })
      .click();

    const bar = page
      .getByRole("tablist", { name: "Reader pane" })
      .locator("xpath=..");
    const box = (await bar.boundingBox())!;
    const viewport = page.viewportSize()!;

    // Flush, not floating: it used to sit 1rem up with the chapter's own
    // text visible in the gap underneath it.
    expect(Math.round(box.y + box.height)).toBe(viewport.height);

    // One row, not two — "Inner Observation" wrapping made the bar ragged.
    expect(box.height).toBeLessThan(72);

    // In normal flow, not `position: fixed`. On Firefox for Android the
    // dynamic address bar moves the viewport a fixed element anchors to, and
    // `bottom: 0` came to rest a strip above the real bottom edge with the
    // page showing beneath it (issue #122). Everything placed by layout was
    // correct throughout, so the fix is to be placed by layout.
    await expect(bar).toHaveCSS("position", "static");

    // The pane ends exactly where the bar begins — no overlap to compensate
    // for with padding, and nothing hidden underneath it.
    const paneBody = page.locator("#reader-source-pane .tes-pane-body");
    expect(
      Math.round(
        (await paneBody.boundingBox())!.y +
          (await paneBody.boundingBox())!.height,
      ),
    ).toBe(Math.round(box.y));
  });

  test("keeps the pane still when the contents panel opens over the bar", async ({
    page,
  }) => {
    // The bar used to be removed from the DOM while a panel was open, which
    // in flow would reflow the pane underneath on every open and close. It
    // goes `inert` instead: out of the tab order and the accessibility tree,
    // still occupying its row.
    await page.goto(CHAPTER_PATH);
    await waitForHydration(page);
    await page
      .getByRole("group", { name: "Reading mode" })
      .getByRole("button", { name: "Panes" })
      .click();

    const paneBody = page.locator("#reader-source-pane .tes-pane-body");
    const heightOf = async () =>
      Math.round((await paneBody.boundingBox())!.height);
    const closed = await heightOf();

    await page.getByRole("button", { name: "Contents", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    expect(await heightOf()).toBe(closed);
  });
});
