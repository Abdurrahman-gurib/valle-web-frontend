/**
 * Where the shared staff session is saved by staff.setup.ts and read by the
 * dashboard tests. Kept in its own module because Playwright does not allow one
 * test file to import another. Relative to the Frontend/ working directory.
 */
export const STAFF_STATE = 'tests-e2e/.auth/staff.json';
