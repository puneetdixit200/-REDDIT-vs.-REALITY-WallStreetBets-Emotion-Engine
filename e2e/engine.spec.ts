import { expect, test } from "@playwright/test";

test("renders the emotion engine and keeps canvases nonblank", async ({ page }, testInfo) => {
  await page.goto("/");

  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", /icon/);
  await expect(page.locator(".brand-mark")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "REDDIT vs REALITY" })).toBeVisible();
  await expect(page.getByText("DELUSION GAP")).toBeVisible();
  await expect(page.getByText("WSB Bingo")).toBeVisible();
  await expect(page.getByText("Live WSB events")).toBeVisible();
  await expect(page.getByText("Degen Alert Tape")).toBeVisible();
  await expect(page.getByText("Anomaly Radar")).toBeVisible();
  await expect(page.locator(".status-pill", { hasText: "Socket" })).toContainText("live", {
    ignoreCase: true,
    timeout: 20_000
  });
  await expect(page.locator(".ticker-track")).toHaveCSS("animation-duration", "56s");
  await expect(page.getByRole("link", { name: "Made with heart by PUNEET DIXIT" })).toHaveAttribute(
    "href",
    "https://github.com/puneetdixit200"
  );

  await page.locator(".coin-selector button", { hasText: "DOGE" }).click();
  await expect(page.getByRole("heading", { name: "Dogecoin LIVE PRICE" })).toBeVisible();

  await page.getByRole("button", { name: "Replay" }).click();
  await expect(page.getByText("Replay is driving the center gauge.")).toBeVisible();

  const canvasStates = await page.locator("canvas").evaluateAll((canvases) =>
    canvases.map((canvas) => {
      const element = canvas as HTMLCanvasElement;
      const context = element.getContext("2d");
      if (!context || element.width === 0 || element.height === 0) {
        return false;
      }

      const sample = context.getImageData(
        Math.floor(element.width / 2),
        Math.floor(element.height / 2),
        1,
        1
      ).data;

      return sample[0] + sample[1] + sample[2] + sample[3] > 0;
    })
  );

  expect(canvasStates).toEqual([true, true]);
  await page.screenshot({
    path: testInfo.outputPath(`emotion-engine-${testInfo.project.name}.png`),
    fullPage: true
  });
});
