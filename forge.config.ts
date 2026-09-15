import path from 'node:path';
import fs from 'node:fs/promises';
import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    // The Drizzle migrations aren't part of the Vite-bundled main process —
    // they're static .sql files `db/client.ts`'s `runMigrations()` reads
    // from disk at startup. asar archives can't be read as a plain
    // directory the way `migrationsFolder()` expects, so this copies
    // `drizzle/` next to the packaged app instead, reachable via
    // `process.resourcesPath`.
    extraResource: ['drizzle'],
    // Packager appends the right extension per platform (.icns on macOS,
    // .ico on Windows) — both files live at `assets/icon.{icns,ico}`.
    icon: './assets/icon',
  },
  // `better-sqlite3` is the only native module in the project and ships its
  // own prebuilt binary per platform/arch under `prebuilds/` (Node-API is
  // ABI-stable across Node/Electron versions for a given N-API version, so
  // those prebuilds work as-is) — there's nothing to rebuild from source.
  // `onlyModules: []` tells `@electron/rebuild` to rebuild zero modules
  // (rebuild.js's `options.onlyModules || null` — an empty array is
  // truthy, so it doesn't fall through to `null`/"rebuild everything").
  // Without this, packaging always tries a node-gyp source rebuild anyway
  // and fails wherever node-gyp itself can't run (e.g. this machine has
  // Xcode installed but its license isn't accepted, which blocks every
  // node-gyp compile — unrelated to this project's code).
  rebuildConfig: { onlyModules: [] },
  // Windows and macOS only (CLAUDE.md's stated target platforms) — no
  // Deb/Rpm makers.
  makers: [
    new MakerSquirrel({ setupIcon: './assets/icon.ico' }),
    new MakerZIP({}, ['darwin']),
    new MakerDMG({ icon: './assets/icon.icns' }),
  ],
  plugins: [
    // `better-sqlite3` is a native module and `packagerConfig.asar` is on
    // (needed for `OnlyLoadAppFromAsar` below) — without this plugin its
    // compiled `.node` binary would be archived into app.asar, where
    // Node's native `require`/dlopen can't load it. This unpacks any
    // detected native module into `app.asar.unpacked/` automatically. The
    // plugin was already a devDependency (added in Slice 0) but was never
    // wired into this array — the app has never actually been packaged and
    // launched before this slice, so the missing unpack step went unnoticed.
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          entry: 'src/main/index.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload/index.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.mts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  hooks: {
    // `@electron-forge/plugin-vite` points `packagerConfig.ignore` at only
    // `.vite/**` (see its own `resolveForgeConfig` hook) — it assumes Vite
    // bundled everything the app needs, so it never copies `node_modules`
    // into the packaged app at all. That's true for everything except
    // `better-sqlite3`: `vite.main.config.ts` marks it `external` because
    // it's a compiled `.node` binary Rollup can't parse, so it's `require`d
    // from `node_modules` at runtime instead — which then doesn't exist in
    // the package. `AutoUnpackNativesPlugin` above only moves `.node` files
    // out of app.asar; it has nothing to move unless the package is copied
    // in first. `better-sqlite3` ships its own prebuilt binaries for every
    // platform/arch under `prebuilds/` and has no runtime npm dependencies
    // of its own (`node-addon-api` is build-from-source only), so copying
    // just this one package directory is enough — verified against a real
    // `npm run make` output, which previously omitted `better-sqlite3`
    // entirely (not even unpacked) and would have crashed on first launch.
    packageAfterCopy: async (_config, buildPath) => {
      await fs.cp(
        path.join(__dirname, 'node_modules/better-sqlite3'),
        path.join(buildPath, 'node_modules/better-sqlite3'),
        { recursive: true },
      );
    },
  },
};

export default config;
