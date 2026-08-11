import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { redwood } from "rwsdk/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  resolve: {
    alias: {
      // `pg` statically references its libpq binding from
      // pg/lib/native/client.js, even though that path is only reachable via
      // the `pg.native` API we never use. Without this alias the worker build
      // fails with `Could not resolve "pg-native"`. See src/lib/pgNativeStub.ts
      // — installing the real package would be worse, as it cannot run in
      // workerd at all.
      "pg-native": fileURLToPath(
        new URL("./src/lib/pgNativeStub.ts", import.meta.url),
      ),
    },
  },
  plugins: [
    cloudflare({
      viteEnvironment: { name: "worker" },
    }),
    redwood(),
    tailwindcss(),
  ],
});
