import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://docs.magnetic-marten.com",
  integrations: [
    starlight({
      title: "Docs",
      social: {
        github: "https://github.com/bohdandan/homelab"
      }
    })
  ]
});
