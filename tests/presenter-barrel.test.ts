import { assert } from '@std/assert';
import { withLocalStorageAsync } from
    './fixtures/local-storage.ts';

// state.ts (transitively imported via core.ts ->
// presenters) reads localStorage and window /
// document at module-eval time, which Node lacks.
// window/document are stubbed once here; localStorage
// is scoped to the one test below via the fixture, since
// this file's sole dynamic import already runs inside
// that test body.
globalThis.window = {
    matchMedia: () => ({ matches: false }),
    addEventListener: () => {},
} as unknown as Window & typeof globalThis;
// @ts-expect-error — Node global stub
globalThis.document = { addEventListener: () => {} };

Deno.test('barrel exports all new presenters', async () => {
    await withLocalStorageAsync(
        { getItem: () => null, setItem: () => {} },
        async () => {
            const P = await import(
                '../web-app/app/presenters/index.ts'
            );
            const expected = [
                'OrganizationObjectivesPresenter',
                'ProjectActionBarPresenter',
                'ProjectObjectivesPresenter',
                'ProjectScoreHistoryPresenter',
                'DashboardObjectiveAggregatesPresenter',
            ];
            for (const name of expected) {
                assert(
                    name in P,
                    'barrel missing export: ' + name,
                );
            }
        },
    );
});
