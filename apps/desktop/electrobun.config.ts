import type { ElectrobunConfig } from "electrobun/config";

const config: ElectrobunConfig = {
  appId: "sh.chorus.desktop",
  productName: "Chorus",
  build: {
    buildsDir: "dist",
    sign: false, // Enable this when you have code signing certificates
  },
  bun: {
    entrypoint: "./src/bun/index.ts",
  },
  views: {
    mainview: {
      html: "../../web/dist/index.html", // Will point to Next.js static export
      preload: "./src/mainview/preload.ts",
      entrypoint: "./src/mainview/index.ts",
    },
  },
};

export default config;
