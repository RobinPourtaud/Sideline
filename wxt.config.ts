import { defineConfig } from "wxt";

export default defineConfig({
  imports: false,
  manifestVersion: 3,
  zip: {
    dotSources: true,
    includeSources: [
      "src/**",
      "entrypoints/**",
      "public/**",
      "docs/**",
      "*.md",
      "LICENSE",
      "*.json",
      "*.ts",
      ".nvmrc",
    ],
    excludeSources: ["playwright-report/**", "test-results/**"],
  },
  manifest: ({ browser }) => ({
    name: "Sideline",
    description: "__MSG_extensionDescription__",
    default_locale: "en",
    permissions: ["storage"],
    icons: { 16: "icons/16.png", 32: "icons/32.png", 48: "icons/48.png", 128: "icons/128.png" },
    ...(browser === "firefox"
      ? {
          browser_specific_settings: {
            gecko_android: { strict_min_version: "142.0" },
            gecko: {
              id: "sideline@pourtaud.dev",
              strict_min_version: "140.0",
              data_collection_permissions: { required: ["none"] },
            },
          },
        }
      : { minimum_chrome_version: "120" }),
  }),
});
