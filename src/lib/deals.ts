import type { Catalog, Product } from '../types';
import { productValidOn } from '../types';
import { todayIso } from './format';

/** The products sold as special deals (the expo flyer packages), in catalog order. */
export const dealProducts = (catalog: Catalog): Product[] => (catalog.PRODUCTS ?? []).filter((p) => p.family === 'expo');

/** Deals shown today: only inside their validity window (outside it the page and menu hide them). */
export const liveDeals = (catalog: Catalog, today = todayIso()): Product[] =>
  dealProducts(catalog).filter((p) => productValidOn(p, today));

/** Whether a deal can be booked for a visit on `iso`. */
export const dealValidOn = (p: Product, iso: string) => productValidOn(p, iso);

/** "Rs X" saving per person, from the data (was − deal); 0 when there is no was-price. */
export const dealSaving = (p: Product) => (p.was != null ? Math.max(0, p.was - p.rr) : 0);
