import { assertEquals, assertStrictEquals } from '@std/assert';
import { FakeTime } from '@std/testing/time';

// debouncer.ts → logger.ts → preferences.ts reads
// localStorage, which is absent in Node. Stub it
// before any log.* call fires.
// @ts-expect-error — Node global stub
globalThis.localStorage = {
    getItem: (_key: string) => null,
    setItem: () => {},
};

import {
    Debouncer,
} from '../web-app/app/debouncer.ts';

Deno.test(
    'schedule waits the delay; the last scheduled'
    + ' save wins the burst',
    () => {
        using time = new FakeTime();
        const d = new Debouncer(800);
        const ran: string[] = [];
        d.schedule(() => ran.push('first'));
        d.schedule(() => ran.push('second'));
        time.tick(799);
        assertEquals(ran, []);
        time.tick(1);
        assertEquals(ran, ['second']);
    },
);

Deno.test(
    'flush runs the pending save immediately and'
    + ' cancels the timer — no double fire',
    () => {
        using time = new FakeTime();
        const d = new Debouncer(800);
        let runs = 0;
        d.schedule(() => { runs += 1; });
        d.flush();
        assertStrictEquals(runs, 1);
        time.tick(800);
        assertStrictEquals(runs, 1);
    },
);

Deno.test(
    'flush with nothing pending is a no-op',
    () => {
        using time = new FakeTime();
        const d = new Debouncer(800);
        let runs = 0;
        // Empty flush invents no save and leaves the
        // debouncer ready for a later schedule.
        d.flush();
        assertStrictEquals(runs, 0);
        d.schedule(() => { runs += 1; });
        time.tick(800);
        assertStrictEquals(runs, 1);
    },
);

Deno.test(
    'a fired save clears pending — a later flush'
    + ' does not replay it',
    () => {
        using time = new FakeTime();
        const d = new Debouncer(800);
        let runs = 0;
        d.schedule(() => { runs += 1; });
        time.tick(800);
        assertStrictEquals(runs, 1);
        d.flush();
        assertStrictEquals(runs, 1);
    },
);

Deno.test(
    'schedule after a fire starts a fresh burst',
    () => {
        using time = new FakeTime();
        const d = new Debouncer(800);
        const ran: string[] = [];
        d.schedule(() => ran.push('a'));
        time.tick(800);
        d.schedule(() => ran.push('b'));
        time.tick(800);
        assertEquals(ran, ['a', 'b']);
    },
);

Deno.test(
    'isPending tracks a scheduled save until fire'
    + ' or flush',
    () => {
        using time = new FakeTime();
        const d = new Debouncer(800);
        assertStrictEquals(d.isPending(), false);
        d.schedule(() => {});
        assertStrictEquals(d.isPending(), true);
        time.tick(800);
        assertStrictEquals(d.isPending(), false);
        d.schedule(() => {});
        assertStrictEquals(d.isPending(), true);
        d.flush();
        assertStrictEquals(d.isPending(), false);
    },
);
