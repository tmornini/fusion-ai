import {
    html, setHtml, SafeHtml,
} from '../safe-html.ts';
import { initials, formatDate } from '../core.ts';
import {
    iconPeople,
    iconStar,
    iconTrendingUp,
    iconBriefcase,
    iconAward,
    iconChevronRight,
    iconBarChart,
    iconCheckCircle2,
    iconAlertCircle,
    iconClock,
    iconPersonX,
    iconPersonCheck,
    iconShield,
} from '../icons.ts';
import {
    AVAILABILITY_HIGH,
    AVAILABILITY_LOW,
    type Person,
} from '../adapters/index.ts';
import {
    WorkingStylesPresenter,
} from './working-styles.ts';

type AvailabilityTone =
    'success' | 'warning' | 'error';

function toneForAvailability(
    availability: number,
): AvailabilityTone {
    if (availability >= AVAILABILITY_HIGH)
        return 'success';
    if (availability >= AVAILABILITY_LOW)
        return 'warning';
    return 'error';
}

function buildStatusDot(
    availability: number,
): SafeHtml {
    const tone =
        toneForAvailability(availability);
    return html`<div class="status-dot"
        data-tone="${tone}"></div>`;
}

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

    buildMemberCard(
        selectedId: string | null,
    ): SafeHtml {
        const selectedClass =
            selectedId === this.#person.idForLink()
                ? ' card-selected'
                : '';
        return html`
    <div
        class="${
            'card card-hover p-5'
            + ' cursor-pointer'
            + selectedClass
        }"
        data-member-card="${this.#person.idForLink()}"
    >
        <div class="flex items-start gap-4">
            <div class="avatar-frame">
                <div class="icon-box-lg"
                    data-tone="primary">
                    <span
                        class="${
                            'text-lg font-bold'
                            + ' text-primary'
                        }"
                    >${
                        initials(
                            this.#person.fullName(),
                        )
                    }</span>
                </div>
                ${buildStatusDot(
                    this.#person.availabilityScore(),
                )}
            </div>
            <div class="flex-fill">
                <div
                    class="${
                        'flex flex-wrap'
                        + ' items-center'
                        + ' gap-2 mb-1'
                    }"
                >
                    <h3 class="${
                        'font-semibold'
                        + ' text-sm'
                    }">
                        ${this.#person.fullName()}
                    </h3>
                    <span
                        class="pill"
                        data-tone="${
                            toneForAvailability(
                                this.#person
                                .availabilityScore(),
                            )
                        }"
                    >${
                        this.#person.availabilityScore()
                    }%</span>
                </div>
                <p class="${
                    'text-xs text-muted mb-2'
                }">
                    ${this.#person.roleLabel()}
                    \u2022 ${this.#person.departmentLabel()}
                </p>
                <div
                    class="${
                        'flex flex-wrap'
                        + ' gap-1.5 mb-2'
                    }"
                >
                    ${this.#person
                        .parsedStrengths()
                        .slice(0, 3)
                        .map(s => html`
                    <span
                        class="${
                            'pill-tag'
                            + ' pill-tag-strength'
                        }"
                    >
                        ${iconStar(10, '')}
                        ${s}
                    </span>
                        `)}
                </div>
                <div
                    class="${
                        'flex items-center'
                        + ' gap-4'
                        + ' text-xs text-muted'
                    }"
                >
                    <span
                        class="${
                            'flex items-center'
                            + ' gap-1'
                        }"
                    >
                        ${iconTrendingUp(
                            14, 'text-success',
                        )}
                        ${this.#person
                            .performanceScoreValue()
                        }%
                    </span>
                    <span
                        class="${
                            'flex items-center'
                            + ' gap-1'
                        }"
                    >
                        ${iconBriefcase(14, '')}
                        ${this.#person
                            .currentProjectsCount()
                        } active
                    </span>
                    <span
                        class="${
                            'flex items-center'
                            + ' gap-1'
                            + ' hidden-mobile'
                        }"
                    >
                        ${iconAward(
                            14, 'text-primary',
                        )}
                        ${this.#person
                            .projectsCompletedCount()}
                        completed
                    </span>
                </div>
            </div>
            ${iconChevronRight(
                20, 'text-muted',
            )}
        </div>
    </div>`;
    }

    buildMemberDetail(): SafeHtml {
        return html`
    <div class="person-detail-wrap">
        <div class="${
            'person-detail-header'
        }">
            <div class="${
                'avatar avatar-2xl'
                + ' avatar-tinted'
                + ' mx-auto mb-4'
            }">
                <span
                    class="${
                        'text-2xl font-bold'
                        + ' text-primary'
                    }"
                >${
                    initials(
                        this.#person.fullName(),
                    )
                }</span>
            </div>
            <h3
                class="${
                    'text-lg font-display'
                    + ' font-semibold'
                }"
            >${this.#person.fullName()}</h3>
            <p class="text-sm text-muted">
                ${this.#person.roleLabel()}
            </p>
            <p class="text-xs text-muted">
                ${this.#person.emailAddress()}
            </p>
        </div>
        ${this.#buildDimensionsTab()}
        ${this.#buildPerformanceTab()}
    </div>`;
    }

    buildUserRow(): SafeHtml {
        return html`
        <div class="${
            'flex items-center '
            + 'gap-4 p-4 person-row-divider '
            + (this.#person.isDeactivated()
                ? 'opacity-50' : '')
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
                <p class="${
                    'text-xs text-muted'
                    + ' mt-1'
                }">
                    ${this.#person.isPending()
                        ? 'Invite sent'
                        : 'Last active '
                            + formatDate(
                                this.#person
                                .lastActiveDate(),
                            )}
                </p>
            </div>
            <div class="flex-shrink-0">
                ${this.#person.isDeactivated()
                    ? html`<button
                        class="${
                            'btn btn-ghost '
                            + 'btn-icon btn-sm'
                        }"
                        data-reactivate-person="${
                            this.#person
                                .idForLink()
                        }"
                        title="Reactivate person"
                        aria-label="${
                            'Reactivate person'
                        }">
                        ${iconPersonCheck(
                            16, '',
                        )}
                    </button>`
                    : html`<button
                        class="${
                            'btn btn-ghost '
                            + 'btn-icon btn-sm'
                        }"
                        data-deactivate-person="${
                            this.#person
                                .idForLink()
                        }"
                        title="Deactivate person"
                        aria-label="${
                            'Deactivate person'
                        }">
                        ${iconPersonX(
                            16, '',
                        )}
                    </button>`}
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

    #buildDimensionsTab(): SafeHtml {
        const styles =
            new WorkingStylesPresenter(
                this.#person
                    .parsedTeamDimensions(),
            );
        return html`
        <div
            class="tabs mb-4"
            role="tablist"
        >
            <button
                class="tab active"
                role="tab"
                data-tab="dimensions"
            >Dimensions</button>
            <button
                class="tab"
                role="tab"
                data-tab="performance"
            >Performance</button>
        </div>
        <div
            id="tab-dimensions"
            class="tab-panel"
        >
            <p class="${
                'text-xs text-muted'
                + ' text-center mb-4'
            }">
                Team Dimensions Assessment
                Results
            </p>
            ${styles.buildRows()}
        </div>`;
    }

    #buildPerformanceTab(): SafeHtml {
        return html`
        <div
            id="tab-performance"
            class="tab-panel hidden"
        >
            <div class="perf-hero">
                ${iconBarChart(
                    32, 'text-primary',
                )}
                <div
                    class="${
                        'text-3xl font-bold'
                        + ' text-primary'
                        + ' perf-hero-value'
                    }"
                >${
                    this.#person.performanceScoreValue()
                }%</div>
                <p class="${
                    'text-xs text-muted'
                }">
                    Overall Performance Score
                </p>
            </div>
            <div
                class="${
                    'grid grid-cols-2 gap-3'
                }"
            >
                <div class="perf-stat-cell">
                    ${iconCheckCircle2(
                        20, 'text-success',
                    )}
                    <div
                        class="${
                            'text-lg '
                            + 'font-bold '
                            + 'perf-stat-value'
                        }"
                    >${
                        this.#person
                            .projectsCompletedCount()
                    }</div>
                    <p class="${
                        'text-xs text-muted'
                    }">
                        Completed
                    </p>
                </div>
                <div class="perf-stat-cell">
                    ${iconAlertCircle(
                        20, 'text-warning',
                    )}
                    <div
                        class="${
                            'text-lg '
                            + 'font-bold '
                            + 'perf-stat-value'
                        }"
                    >${
                        this.#person
                            .currentProjectsCount()
                    }</div>
                    <p class="${
                        'text-xs text-muted'
                    }">
                        Active
                    </p>
                </div>
            </div>
        </div>`;
    }
}

export type ManagedPeopleState = {
    people: Person[];
    search: string;
    role: string;
    status: string;
};

export function buildInitialManagedPeopleState(
    people: Person[],
): ManagedPeopleState {
    return {
        people,
        search: '',
        role: 'all',
        status: 'all',
    };
}

export function applyManagedPeopleUpdate(
    state: ManagedPeopleState,
    people: Person[],
): ManagedPeopleState {
    return { ...state, people };
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
    #search: string;
    #role: string;
    #status: string;

    constructor(state: ManagedPeopleState) {
        this.#presenters = state.people.map(
            u => new PersonPresenter(u),
        );
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
        setHtml(container, html`${filtered.map(
            p => p.buildUserRow(),
        )}`);
    }
}

