import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Catalog } from '../types';
import { fetchCatalog } from '../lib/api';
import fallbackJson from '../data/fallback.json';

const fallback = fallbackJson as unknown as Catalog;

interface CatalogState {
  catalog: Catalog;
  /** true once the live API copy has loaded (fallback data is shown before that / when API is down) */
  live: boolean;
}

const Ctx = createContext<CatalogState>({ catalog: fallback, live: false });

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CatalogState>({ catalog: fallback, live: false });

  useEffect(() => {
    let mounted = true;
    fetchCatalog()
      .then((catalog) => { if (mounted) setState({ catalog, live: true }); })
      .catch(() => { /* offline / API down: bundled fallback keeps the site fully browsable */ });
    return () => { mounted = false; };
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useCatalog(): Catalog {
  return useContext(Ctx).catalog;
}

export function useCatalogLive(): boolean {
  return useContext(Ctx).live;
}
