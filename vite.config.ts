import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    {
      name: "watch-fixture",
      configureServer(server) {
        server.middlewares.use((request, _response, next) => {
          if (request.url?.startsWith("/watch?")) request.url = "/tests/fixtures/watch.html";
          next();
        });
      },
    },
  ],
});
