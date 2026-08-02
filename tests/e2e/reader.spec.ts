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

test("switches editions, identifies AI text, and supports themes", async ({
  page,
}) => {
  await page.goto(CHAPTER_PATH);
  await waitForHydration(page);

  const source = page.locator("#reader-source-pane");
  await source.getByLabel("Edition").selectOption("he-jerusalem-1956");
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
    await paneTabs.getByRole("tab", { name: "Inner Light" }).click();
    await expect(
      paneTabs.getByRole("tab", { name: "Inner Light" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#reader-commentary-pane")).toBeInViewport();
  });
});
