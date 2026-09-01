// state.ts (transitively imported via the adapters ->
// presenters) reads localStorage and window / document
// at module-eval time, which Node lacks. Stub before
// any import, then load the page-module reducer with
// dynamic import() so the stubs are in place. Same
// pattern as members-detail-reduce.
// @ts-expect-error — Node global stub
globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {},
};
globalThis.window = {
    matchMedia: () => ({ matches: false }),
    addEventListener: () => {},
} as unknown as Window & typeof globalThis;
// @ts-expect-error — Node global stub
globalThis.document = { addEventListener: () => {} };

// A real EventTarget (never a cast) so instanceof narrowing
// in isDesignerEditableTarget sees a genuine match — the DOM
// hierarchy these fakes stand in for extends EventTarget too
// (composition over inheritance, except where the platform
// itself demands the hierarchy).
class FakeEventTarget implements EventTarget {
    addEventListener(): void {}
    removeEventListener(): void {}
    dispatchEvent(): boolean {
        return true;
    }
}
class FakeInput extends FakeEventTarget {
    readonly type: string;
    constructor(type: string) {
        super();
        this.type = type;
    }
}
class FakeTextArea extends FakeEventTarget {}
class FakeSelect extends FakeEventTarget {}
const g = globalThis as Record<
    string, unknown
>;
g.HTMLInputElement = FakeInput;
g.HTMLTextAreaElement = FakeTextArea;
g.HTMLSelectElement = FakeSelect;

import { assertStrictEquals } from '@std/assert';
import type {
    DesignerShortcutInput,
} from '../web-app/flows/detail.ts';

const {
    reduceDesignerShortcut,
    isDesignerEditableTarget,
} = await import(
    '../web-app/flows/detail.ts'
);

function chord(
    overrides: Partial<DesignerShortcutInput>,
): DesignerShortcutInput {
    return {
        key: '',
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        isEditableFocused: false,
        isPanelOpen: false,
        ...overrides,
    };
}

Deno.test('Cmd+Shift+Z arrives as key Z and is redo', () => {
    assertStrictEquals(
        reduceDesignerShortcut(chord({
            key: 'Z', metaKey: true, shiftKey: true,
        })),
        'redo',
    );
});

Deno.test('Cmd+z is undo', () => {
    assertStrictEquals(
        reduceDesignerShortcut(chord({
            key: 'z', metaKey: true,
        })),
        'undo',
    );
});

Deno.test('Caps-Lock Cmd+Z (no shift) is still undo', () => {
    assertStrictEquals(
        reduceDesignerShortcut(chord({
            key: 'Z', metaKey: true,
        })),
        'undo',
    );
});

Deno.test('Ctrl+Shift+z is redo', () => {
    assertStrictEquals(
        reduceDesignerShortcut(chord({
            key: 'z', ctrlKey: true, shiftKey: true,
        })),
        'redo',
    );
});

Deno.test('the chord honors an editable target', () => {
    assertStrictEquals(
        reduceDesignerShortcut(chord({
            key: 'z', metaKey: true,
            isEditableFocused: true,
        })),
        null,
    );
});

Deno.test('Delete in an editable target is null', () => {
    assertStrictEquals(
        reduceDesignerShortcut(chord({
            key: 'Delete', isEditableFocused: true,
        })),
        null,
    );
});

Deno.test('Delete with canvas focus deletes', () => {
    assertStrictEquals(
        reduceDesignerShortcut(chord({
            key: 'Delete',
        })),
        'delete',
    );
});

Deno.test('Escape closes only an open panel', () => {
    assertStrictEquals(
        reduceDesignerShortcut(chord({
            key: 'Escape', isPanelOpen: true,
        })),
        'escape',
    );
    assertStrictEquals(
        reduceDesignerShortcut(chord({
            key: 'Escape',
        })),
        null,
    );
});

Deno.test(
    'a Members checkbox is not an editable'
    + ' target',
    () => {
        assertStrictEquals(
            isDesignerEditableTarget(
                new FakeInput('checkbox'),
            ),
            false,
        );
        assertStrictEquals(
            isDesignerEditableTarget(
                new FakeInput('radio'),
            ),
            false,
        );
        assertStrictEquals(
            isDesignerEditableTarget(
                new FakeInput('button'),
            ),
            false,
        );
        assertStrictEquals(
            isDesignerEditableTarget(
                new FakeInput('submit'),
            ),
            false,
        );
        assertStrictEquals(
            isDesignerEditableTarget(
                new FakeInput('reset'),
            ),
            false,
        );
    },
);

Deno.test(
    'texty inputs, textarea, and select are'
    + ' editable targets',
    () => {
        assertStrictEquals(
            isDesignerEditableTarget(
                new FakeInput('text'),
            ),
            true,
        );
        assertStrictEquals(
            isDesignerEditableTarget(
                new FakeInput('password'),
            ),
            true,
        );
        assertStrictEquals(
            isDesignerEditableTarget(
                new FakeTextArea(),
            ),
            true,
        );
        assertStrictEquals(
            isDesignerEditableTarget(
                new FakeSelect(),
            ),
            true,
        );
    },
);

Deno.test(
    'null is not an editable target',
    () => {
        assertStrictEquals(
            isDesignerEditableTarget(null),
            false,
        );
    },
);
