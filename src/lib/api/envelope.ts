// Success bodies are { data, meta? }. Lists carry meta = { page, pageSize, total }.

export type ListMeta = { page: number; pageSize: number; total: number };

export type Envelope<T> = { data: T };
export type ListEnvelope<T> = { data: T[]; meta?: ListMeta };

export type Paginated<T> = { items: T[]; meta: ListMeta };

export const unwrap = <T>(body: Envelope<T>): T => body.data;

/** Some owner lists come back without meta; synthesize one so tables behave the same. */
export const unwrapList = <T>(body: ListEnvelope<T>): Paginated<T> => ({
  items: body.data,
  meta: body.meta ?? { page: 1, pageSize: body.data.length, total: body.data.length },
});

export const pageCount = (meta: ListMeta) => Math.max(1, Math.ceil(meta.total / Math.max(1, meta.pageSize)));
