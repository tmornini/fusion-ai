import {
    html, setHtml, SafeHtml,
} from '../safe-html.ts';
import { initials } from '../core.ts';
import {
    iconStar,
    iconBriefcase,
    iconCheckCircle2,
    iconClock,
    iconPersonX,
    iconShield,
} from '../icons.ts';
import {
    type Person,
} from '../adapters/index.ts';

const ROLE_LABELS: Record<
    string,
    { label: string; icon: (
        size: number,
        cssClass: string,
    ) => SafeHtml }
> = {
    admin: {
        label: 'Admin',
        icon: iconShield,
    },
    manager: {
        label: 'Manager',
        icon: iconBriefcase,
    },
    member: {
        label: 'Member',
        icon: iconStar,
    },
};

export class PersonPresenter {
    readonly #person: Person;

    constructor(person: Person) {
        this.#person = person;
    }

    idForLink(): string {
        return this.#person.idForLink();
    }

    matchesSearch(
        query: string,
    ): boolean {
        return this.#person.fullName()
            .toLowerCase()
            .includes(query)
            || this.#person.roleLabel()
                .toLowerCase()
                .includes(query)
            || this.#person.departmentLabel()
                .toLowerCase()
                .includes(query);
    }

    matchesUserSearch(
        query: string,
    ): boolean {
        return this.#person.fullName()
            .toLowerCase()
            .includes(query)
            || this.#person.emailAddress()
                .toLowerCase()
                .includes(query);
    }

    matchesRoleFilter(
        role: string,
    ): boolean {
        return role === 'all'
            || this.#person.roleLabel() === role;
    }

    matchesStatusFilter(
        status: string,
    ): boolean {
        return status === 'all'
            || this.#person.statusValue() === status;
    }

    buildUserRow(isSelf: boolean = false): SafeHtml {
        return html`
        <div class="${
            'flex items-center '
            + 'gap-4 p-4 person-row '
            + 'person-row-divider '
            + (this.#person.isDeactivated()
                ? 'opacity-50' : '')
        }"
            data-self="${isSelf ? 'true' : 'false'}"
            data-person-id="${
                this.#person.idForLink()
            }">
            <div class="${
                'flex items-center'
                + ' gap-3 flex-2 min-w-0'
            }">
                <div class="${
                    'avatar avatar-tinted'
                }">
                    <span
                        class="${
                            'text-sm '
                            + 'font-bold '
                            + 'text-primary'
                        }">
                        ${initials(
                            this.#person.fullName(),
                        )}
                    </span>
                </div>
                <div class="${
                    'min-w-0'
                }">
                    <p class="${
                        'font-medium '
                        + 'truncate'
                    }">
                        ${this.#person.fullName()}
                    </p>
                    <p
                        class="${
                            'text-xs '
                            + 'text-muted '
                            + 'truncate'
                        }">
                        ${this.#person.emailAddress()}
                    </p>
                </div>
            </div>
            <div class="flex-1">
                ${this.#buildRoleBadge()}
            </div>
            <div class="${
                'flex-1'
                + ' text-sm text-muted'
            }">
                ${this.#person.departmentLabel()}
            </div>
            <div class="flex-1">
                ${this.#buildStatusBadge()}
                ${this.#person.isPending()
                    ? html`<p class="${
                        'text-xs text-muted'
                        + ' mt-1'
                    }">Invite sent</p>`
                    : html``}
            </div>
        </div>`;
    }

    #buildStatusBadge(): SafeHtml {
        if (this.#person.isActive())
            return html`<span
                class="${
                    'status-badge-success'
                }">
                ${iconCheckCircle2(14, '')}
                Active
            </span>`;
        if (this.#person.isPending())
            return html`<span
                class="${
                    'status-badge-warning'
                }">
                ${iconClock(14, '')}
                Pending
            </span>`;
        return html`<span
            class="${
                'status-badge-error'
            }">
            ${iconPersonX(14, '')}
            Deactivated
        </span>`;
    }

    #buildRoleBadge(): SafeHtml {
        const cfg =
            ROLE_LABELS[this.#person.roleLabel()];
        if (!cfg)
            return html`<span
                class="${
                    'badge badge-secondary'
                }">
                ${this.#person.roleLabel()}
            </span>`;
        return html`<span
            class="${
                'badge badge-secondary'
            }">
            ${cfg.icon(12, '')}
            ${cfg.label}
        </span>`;
    }
}

export type ManagedPeopleState = {
    people: Person[];
    currentPersonId: string;
    search: string;
    role: string;
    status: string;
};

export function buildInitialManagedPeopleState(
    people: Person[],
    currentPersonId: string,
): ManagedPeopleState {
    return {
        people,
        currentPersonId,
        search: '',
        role: 'all',
        status: 'all',
    };
}

export function applyManagedPeopleSearch(
    state: ManagedPeopleState,
    query: string,
): ManagedPeopleState {
    return {
        ...state,
        search: query.toLowerCase(),
    };
}

export function applyManagedPeopleRole(
    state: ManagedPeopleState,
    role: string,
): ManagedPeopleState {
    return { ...state, role };
}

export function applyManagedPeopleStatus(
    state: ManagedPeopleState,
    status: string,
): ManagedPeopleState {
    return { ...state, status };
}

export class ManagedPeoplePresenter {
    #presenters: PersonPresenter[];
    #currentPersonId: string;
    #search: string;
    #role: string;
    #status: string;

    constructor(state: ManagedPeopleState) {
        this.#presenters = state.people.map(
            u => new PersonPresenter(u),
        );
        this.#currentPersonId =
            state.currentPersonId;
        this.#search = state.search;
        this.#role = state.role;
        this.#status = state.status;
    }

    activeCount(): number {
        return this.#presenters.filter(
            p => p.matchesStatusFilter(
                'active',
            ),
        ).length;
    }

    pendingCount(): number {
        return this.#presenters.filter(
            p => p.matchesStatusFilter(
                'pending',
            ),
        ).length;
    }

    renderList(
        container: HTMLElement,
    ): void {
        const filtered = this.#presenters
            .filter(p =>
                (this.#search === ''
                    || p.matchesUserSearch(
                        this.#search,
                    ))
                && p.matchesRoleFilter(
                    this.#role,
                )
                && p.matchesStatusFilter(
                    this.#status,
                ),
            );
        const self = this.#presenters.find(
            p => p.idForLink()
                === this.#currentPersonId,
        );
        setHtml(container, html`${
            self
                ? self.buildUserRow(true)
                : html``
        }${filtered.map(
            p => p.buildUserRow(false),
        )}`);
    }
}
