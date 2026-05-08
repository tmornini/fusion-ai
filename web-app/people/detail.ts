import { $, isFormField } from '../app/dom.ts';
import {
    PersonDetailPresenter,
    PersonDetailEditPresenter,
    personDraftFromPerson,
    personPatchFromDraft,
    isPersonFieldKey,
    type PersonDraftFields,
} from '../app/presenters/index.ts';
import { showToast } from '../app/toast.ts';
import { log } from '../app/logger.ts';
import {
    buildSkeleton,
    withLoadingState,
} from '../app/loading-states.ts';
import {
    navigateTo,
    trimStrings,
} from '../app/core.ts';
import {
    createFetchContext,
    getPerson,
    getPersonRow,
    putPerson,
    subscribePersonChanges,
    type Person,
    type PersonStatus,
} from '../app/adapters/index.ts';

const pageAbort = new AbortController();
const signal = pageAbort.signal;

type PageState =
    | {
        kind: 'reading';
        person: Person;
    }
    | {
        kind: 'editing';
        person: Person;
        draft: PersonDraftFields;
    };

let state: PageState | null = null;
let pageContainer: HTMLElement | null = null;

function buildPresenter():
    | PersonDetailPresenter
    | PersonDetailEditPresenter
{
    if (state === null) {
        throw new Error(
            'state not initialized',
        );
    }
    return state.kind === 'reading'
        ? new PersonDetailPresenter(state.person)
        : new PersonDetailEditPresenter(
            state.person, state.draft,
        );
}

function rerender(): void {
    if (!pageContainer) return;
    buildPresenter()
        .renderUpdate(pageContainer);
}

export async function init(
    params?: Record<string, string>,
): Promise<void> {
    const personId = params?.personId;
    if (!personId) {
        navigateTo('people');
        return;
    }

    const container = $(
        '#person-detail-content', document,
    );
    if (!container) return;
    pageContainer = container;

    const ctx = createFetchContext();
    const person = await withLoadingState(
        container,
        buildSkeleton('detail', 4),
        () => getPerson(ctx, personId),
        () => init(params),
    );
    if (!person) return;

    state = { kind: 'reading', person };
    buildPresenter().renderShell(container);
    bindStableListeners(container);

    subscribePersonChanges(async () => {
        if (!pageContainer || !state) return;
        const fresh = await getPerson(
            createFetchContext(), personId,
        );
        state = { kind: 'reading', person: fresh };
        rerender();
    });
}

function bindStableListeners(
    container: HTMLElement,
): void {
    container.addEventListener(
        'click', e => onClick(e),
        { signal },
    );
    container.addEventListener(
        'input', e => onInput(e),
        { signal },
    );
    container.addEventListener(
        'change', e => onInput(e),
        { signal },
    );
    container.addEventListener(
        'keydown',
        e => onContainerKeydown(e),
        { signal },
    );
    document.addEventListener(
        'keydown',
        e => onDocumentKeydown(e),
        { signal },
    );
}

function onClick(e: MouseEvent): void {
    const target = e.target as Element | null;
    if (!target) return;

    const actionEl = target.closest(
        '[data-person-action]',
    );
    const action = actionEl?.getAttribute(
        'data-person-action',
    );
    if (action === 'back') {
        navigateTo('people');
        return;
    }
    if (action === 'edit') {
        if (!state || state.kind !== 'reading') {
            return;
        }
        state = {
            kind: 'editing',
            person: state.person,
            draft: personDraftFromPerson(
                state.person,
            ),
        };
        rerender();
        return;
    }
    if (action === 'cancel') {
        if (!state || state.kind !== 'editing') {
            return;
        }
        state = {
            kind: 'reading',
            person: state.person,
        };
        rerender();
        return;
    }
    if (action === 'save') {
        void handleSave();
        return;
    }

    const chip = target.closest(
        '.strength-chip',
    );
    if (
        chip
        && state
        && state.kind === 'editing'
    ) {
        const name = chip.getAttribute(
            'data-strength',
        );
        if (name) {
            const cur = state.draft.strengths;
            const i = cur.indexOf(name);
            const next = i >= 0
                ? cur.filter(
                    (_, idx) => idx !== i,
                )
                : [...cur, name];
            state = {
                ...state,
                draft: {
                    ...state.draft,
                    strengths: next,
                },
            };
            rerender();
        }
    }
}

function onInput(e: Event): void {
    if (!state || state.kind !== 'editing') {
        return;
    }
    const target = e.target;
    if (!isFormField(target)) return;
    const field = target.getAttribute(
        'data-person-field',
    );
    if (!isPersonFieldKey(field)) return;
    if (field === 'status') {
        state = {
            ...state,
            draft: {
                ...state.draft,
                status: target.value as PersonStatus,
            },
        };
        return;
    }
    state = {
        ...state,
        draft: {
            ...state.draft,
            [field]: target.value,
        },
    };
}

function onContainerKeydown(
    e: KeyboardEvent,
): void {
    if (e.key !== 'Enter') return;
    const target = e.target as HTMLElement;
    if (!target.matches('input.input')) return;
    e.preventDefault();
    e.stopPropagation();
    void handleSave();
}

function onDocumentKeydown(
    e: KeyboardEvent,
): void {
    if (e.key !== 'Escape') return;
    if (!state || state.kind !== 'editing') {
        return;
    }
    e.preventDefault();
    state = {
        kind: 'reading',
        person: state.person,
    };
    rerender();
}

async function handleSave(): Promise<void> {
    if (!state || state.kind !== 'editing') {
        return;
    }
    const personId = state.person.idForLink();
    const ctx = createFetchContext();
    let row;
    try {
        row = await getPersonRow(ctx, personId);
    } catch (err) {
        log.error(
            'getPersonRow failed',
            'people', err,
        );
        showToast(
            'Failed to save person', 'error',
        );
        return;
    }
    const patch = trimStrings(
        personPatchFromDraft(state.draft),
    );
    const { id: _id, ...rest } = row;
    try {
        await putPerson(ctx, personId, {
            ...rest, ...patch,
        });
    } catch (err) {
        log.error(
            'putPerson failed',
            'people', err,
        );
        showToast(
            'Failed to save person', 'error',
        );
        return;
    }
    showToast('Person saved', 'success');
}
