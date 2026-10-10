/** The ARED event vocabulary. These eight events are all the recommendation lab ever sees. */
export const ARED_EVENTS = ["follow", "save", "collection_add", "record_open", "source_open", "profile_open", "search", "less_like_this"] as const;
export type AredEvent = (typeof ARED_EVENTS)[number];
/** Weight of each event as an implicit rating for the offline lab. less_like_this is negative and is filtered, never learned as taste. */
export const EVENT_WEIGHT: Record<AredEvent, number> = { follow: 5, save: 4, collection_add: 4, record_open: 2, source_open: 1.5, profile_open: 1.5, search: 1, less_like_this: -3 };
