/**
 * One page of a list.
 *
 * Every list endpoint on the backend is paginated, and `count` is not
 * decoration: the courses list prints "11 courses", the plan gate
 * compares the roster against PLAN_LIMITS, and a table cannot show a
 * range without a total. Unwrapping the envelope to a bare array
 * throws that away, and the total then has to be guessed from the rows
 * in hand — which is wrong the moment there is more than one page.
 *
 * `next` and `previous` stay opaque on purpose. They are the backend's
 * own cursors; a caller asks for the next page rather than building
 * the URL itself.
 *
 * Only the three lists that map to a real paginated endpoint use this
 * so far. The rest of the list ports still return arrays, because the
 * features behind them have no backend yet and converting them now
 * would be churn on code that may not survive the scope decisions.
 */
export interface Page<T> {
  items: T[];
  /** Total across every page, not `items.length`. */
  count: number;
  next: string | null;
  previous: string | null;
}

/** Wraps a complete in-memory list as a single page. */
export function onePage<T>(items: T[]): Page<T> {
  return { items, count: items.length, next: null, previous: null };
}

export function emptyPage<T>(): Page<T> {
  return onePage<T>([]);
}

/** Maps the items, keeping the envelope. */
export function mapPage<A, B>(page: Page<A>, fn: (item: A) => B): Page<B> {
  return { ...page, items: page.items.map(fn) };
}

export const hasMore = (page: Page<unknown>) => page.next !== null;
