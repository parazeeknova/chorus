import type { ElectrobunConfig } from "electrobun";

const config: ElectrobunConfig = {
  app: {
    name: "Chorus",
    identifier: "sh.chorus.desktop",
    version: "0.0.3",
  },
  runtime: {
    exitOnLastWindowClosed: true,
  },
  build: {
    bun: {
      entrypoint: "src/bun/index.ts",
    },
    views: {
      mainview: {
        entrypoint: "src/mainview/index.ts",
      },
    },
    copy: {
      "src/mainview/index.html": "views/mainview/index.html",
    },
    useAsar: false,
    mac: {
      codesign: false,
      notarize: false,
      bundleCEF: false,
      defaultRenderer: "native",
    },
    linux: {
      bundleCEF: true,
      defaultRenderer: "cef",
    },
    win: {
      bundleCEF: false,
      defaultRenderer: "native",
    },
  },
  release: {
    // Auto-updater configuration
    // Users will check this URL for updates
    baseUrl: "https://github.com/parazeeknova/chorus/releases/download",
    // Electrobun will look for:
    // - {baseUrl}/v{version}/Chorus-{version}-{platform}.{ext}
    // Example: https://github.com/parazeeknova/chorus/releases/download/v0.0.3/Chorus-0.0.3-linux.AppImage
  },
};

export default config;
