import type { ElectrobunConfig } from "electrobun";

const config: ElectrobunConfig = {
  app: {
    name: "Chorus",
    identifier: "sh.chorus.desktop",
    version: "0.0.1",
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
};

export default config;
