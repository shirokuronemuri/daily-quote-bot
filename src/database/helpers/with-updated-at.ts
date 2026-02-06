import { sql } from 'kysely';

export const withUpdatedAt = <T extends object>(data: T) => {
  return {
    ...data,
    updatedAt: sql<string>`datetime('now')`,
  };
};
