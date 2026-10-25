import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  // Путь сайта: на GitHub Pages — /<имя-репозитория>/ (задаётся в workflow), локально — корень
  base: process.env.BASE_PATH ?? "/",
  plugins: [react()],
  // Воркеры собираются как ES-модули (new Worker(..., { type: "module" }))
  worker: {
    format: "es",
  },
  build: {
    rollupOptions: {
      output: {
        // Библиотеки — в отдельные чанки: кешируются браузером независимо от кода приложения
        manualChunks: {
          react: ["react", "react-dom"],
          mui: ["@mui/material", "@mui/icons-material", "@emotion/react", "@emotion/styled"],
          dnd: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
