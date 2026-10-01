/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Map tiles, e.g. a self-hosted or commercial tile server. Defaults to OpenStreetMap. */
  readonly VITE_MAP_TILE_URL?: string;
  readonly VITE_MAP_TILE_ATTRIBUTION?: string;
}
