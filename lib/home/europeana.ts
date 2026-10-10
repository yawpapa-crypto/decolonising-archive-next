import "server-only";
import { searchEuropeana } from "./europeana-normalize";
/** Server environment only: query, page and count use the existing provider contract. */
export function europeanaStream(page: number, query: string, count: number, openOnly = false) {
  return searchEuropeana(query, page, count, process.env.EUROPEANA_API_KEY?.trim() || "", fetch, openOnly);
}
