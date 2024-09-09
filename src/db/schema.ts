import { integer, pgTable, varchar } from 'drizzle-orm/pg-core';

export const channels = pgTable('channels', {
    id: varchar('id', { length: 50 }).primaryKey(),
});

export const users = pgTable('users', {
    id: varchar('id', { length: 50 }).primaryKey(),
    count: integer('smelly').default(0).notNull(),
});