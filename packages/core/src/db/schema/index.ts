/**
 * Single import surface for the whole schema. drizzle-kit reads this file
 * (see drizzle.config.ts) and the db client passes it to `drizzle({ schema })`.
 */
export * from './enums';
export * from './auth';
export * from './system';
export * from './catalog';
export * from './customers';
export * from './marketing';
export * from './groups';
export * from './orders';
export * from './payments';
export * from './shipping';
export * from './notifications';
export * from './relations';
