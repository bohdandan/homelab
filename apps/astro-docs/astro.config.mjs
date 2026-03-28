import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://docs.magnetic-marten.com",
  integrations: [
    starlight({
      title: "Docs",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/bohdandan/homelab"
        }
      ]
    })
  ]
});
