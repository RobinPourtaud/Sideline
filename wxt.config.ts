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
      "scripts/**",
      "safari/**",
      "tests/**",
      "*.md",
      "LICENSE",
      "*.json",
      "*.ts",
      ".nvmrc",
    ],
    excludeSources: [
      "docs/assets/**",
      "playwright-report/**",
      "test-results/**",
      "safari/**/xcuserdata/**",
    ],
  },
  manifest: ({ browser }) => ({
    name: browser === "safari" ? "__MSG_safariExtensionName__" : "__MSG_extensionName__",
    description: "__MSG_extensionDescription__",
    default_locale: "en",
    permissions: ["storage"],
    icons: { 16: "icons/16.png", 32: "icons/32.png", 48: "icons/48.png", 128: "icons/128.png" },
    ...(browser === "firefox"
      ? {
          browser_specific_settings: {
            gecko: {
              id: "sideline@pourtaud.dev",
              strict_min_version: "142.0",
              data_collection_permissions: { required: ["none"] },
            },
          },
        }
      : browser === "safari"
        ? {
            permissions: ["storage", "scripting"],
            host_permissions: ["https://www.youtube.com/*"],
          }
        : { minimum_chrome_version: "120" }),
  }),
});
