import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const appRoot = join(import.meta.dirname, "..");

describe("PWA metadata", () => {
  it("declares iPad fullscreen metadata in the HTML shell", () => {
    const html = readFileSync(join(appRoot, "index.html"), "utf8");

    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
    expect(html).toContain('<meta name="apple-mobile-web-app-capable" content="yes" />');
    expect(html).toContain('<meta name="apple-mobile-web-app-title" content="Кіоск" />');
    expect(html).toContain('<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />');
    expect(html).toContain('<meta name="mobile-web-app-capable" content="yes" />');
    expect(html).toContain('<meta name="theme-color" content="#f2eadf" />');
  });

  it("ships a fullscreen web app manifest", () => {
    const manifest = JSON.parse(
      readFileSync(join(appRoot, "public", "manifest.webmanifest"), "utf8")
    ) as {
      name: string;
      short_name: string;
      start_url: string;
      scope: string;
      display: string;
      display_override: string[];
      orientation: string;
      icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
    };

    expect(manifest.name).toBe("Дитячий кіоск");
    expect(manifest.short_name).toBe("Кіоск");
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.display).toBe("fullscreen");
    expect(manifest.display_override).toEqual(["fullscreen", "standalone"]);
    expect(manifest.orientation).toBe("landscape");
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: "/icons/kiosk-icon.svg", purpose: "any" }),
        expect.objectContaining({ src: "/icons/kiosk-maskable.svg", purpose: "maskable" })
      ])
    );
  });
});
