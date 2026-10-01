/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Map tiles, e.g. a self-hosted or commercial tile server. Defaults to OpenStreetMap. */
  readonly VITE_MAP_TILE_URL?: string;
  readonly VITE_MAP_TILE_ATTRIBUTION?: string;
  /** CARTO basemaps key (carto.com/basemaps/apikey); used when no VITE_MAP_TILE_URL is set. */
  readonly VITE_CARTO_BASEMAP_KEY?: string;
  readonly VITE_CARTO_BASEMAP_STYLE?: string;
}
