import { defineConfig } from '@playwright/test';

// Los tests E2E siempre corren en modo demostración (sin tocar Supabase real):
// estas variables sobreescriben las de .env porque dotenv no pisa variables
// de entorno que ya existen en el proceso.
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: {
    // Astro 7 siempre bifurca "astro dev" a un demonio en segundo plano y el proceso
    // lanzador termina casi de inmediato, lo que Playwright interpreta como una "salida
    // temprana" fatal aunque el servidor real sí quede escuchando. Este wrapper espera
    // activamente a que el puerto responda antes de salir, evitando esa carrera.
    command: 'node scripts/wait-for-astro-dev.mjs',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
    env: {
      PUBLIC_SUPABASE_URL: 'YOUR_SUPABASE_URL',
      PUBLIC_SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY'
    }
  }
});
