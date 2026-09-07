import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";
import tailwindcss from "@tailwindcss/vite";
import denoConfig from "./deno.json" with { type: "json" };

const { imports } = denoConfig;
const serverDependencies: Record<string, string> = {
  "@aws-sdk/client-s3": imports["@aws-sdk/client-s3"],
  "@aws-sdk/client-sqs": imports["@aws-sdk/client-sqs"],
  "@aws-sdk/client-ses": imports["@aws-sdk/client-ses"],
  "winston": imports.winston,
  "winston-cloudwatch": imports["winston-cloudwatch"],
  "sharp": imports.sharp,
};

export default defineConfig(({ command }) => ({
  plugins: [
    {
      name: "server-runtime-dependencies",
      enforce: "pre",
      applyToEnvironment: (environment) =>
        environment.config.consumer === "server",
      resolveId(id) {
        if (!Object.hasOwn(serverDependencies, id)) return;
        return {
          id: command === "serve" ? id : serverDependencies[id],
          external: true,
        };
      },
    },
    fresh(),
    tailwindcss(),
  ],
  server: { port: 8000 },
  ssr: { external: Object.keys(serverDependencies) },
}));
