// Supabase/PostgREST caps query results at ~1000 rows by default. For report
// queries that can grow beyond that (a year of sessions / bowls / bowl_items),
// we have to paginate explicitly with .range() or rows silently get dropped
// and report totals come out too low.

const PAGE_SIZE = 1000;
const IN_CHUNK = 500;

type PageResult<T> = { data: T[] | null; error: unknown };

/**
 * Run a query repeatedly with .range() until a short page is returned, then
 * concatenate all rows. The builder must apply `.range(from, to)` to the query.
 */
export async function fetchAllRows<T>(
  buildPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  for (let i = 0; i < 200; i++) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await buildPage(from, to);
    if (error) throw error;
    const page = data || [];
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

/**
 * Run an `.in(column, ids)` query in chunks of IDs AND paginate each chunk,
 * so neither a giant URL nor the 1000-row cap can drop rows.
 *
 * The builder receives the id chunk plus range bounds and must apply both
 * `.in(column, ids)` and `.range(from, to)` to the query.
 */
export async function fetchAllInChunks<T>(
  ids: string[],
  buildPage: (ids: string[], from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<T[]> {
  if (ids.length === 0) return [];
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const chunk = ids.slice(i, i + IN_CHUNK);
    const rows = await fetchAllRows<T>((from, to) => buildPage(chunk, from, to));
    out.push(...rows);
  }
  return out;
}
