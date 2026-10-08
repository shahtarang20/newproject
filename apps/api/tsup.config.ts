import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['cjs'],
  target: 'node20',
  clean: true,
  sourcemap: true,
  // @vastra/shared ships TypeScript source, so it must be bundled rather than required at runtime.
  noExternal: ['@vastra/shared'],
});
