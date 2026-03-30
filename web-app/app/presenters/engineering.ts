import {
    html, SafeHtml,
} from '../safe-html';
import {
    iconUser, iconMessageSquare,
    iconFileText,
    iconLightbulb, iconChevronRight,
    iconUsers,
} from '../icons';
import { formatDate } from '../core';
import {
    clarificationIsPending,
} from '../../../api/types';
import type {
    EngineeringView,
    EngTeamMember,
} from '../adapters/projects';
import {
    Clarification,
} from '../adapters/projects';

export class EngineeringPresenter {
    readonly #view: EngineeringView;
    readonly #clarifications:
        readonly Clarification[];

    constructor(
        view: EngineeringView,
        clarifications:
            readonly Clarification[],
    ) {
        this.#view = view;
        this.#clarifications =
            clarifications;
    }

    pendingCount(): number {
        return this.#clarifications
            .filter(
                clarificationIsPending,
            ).length;
    }

    answeredCount(): number {
        return this.#clarifications
            .length
            - this.pendingCount();
    }

    #buildTeamMember(
        m: EngTeamMember,
    ): SafeHtml {
        const isBusiness =
            m.type === 'business';
        const bgColor = isBusiness
            ? 'hsl(var(--primary)/0.1)'
            : 'hsl(var(--success-soft))';
        const iconClass = isBusiness
            ? 'text-primary'
            : 'text-success';
        const badgeClass = isBusiness
            ? 'badge-primary'
            : 'badge-success';
        return html`
            <div
                class="${
                    'flex '
                    + 'items-center'
                    + ' gap-3'
                }"
                style="${
                    'padding:'
                    + '0.75rem;'
                    + 'border-'
                    + 'radius:'
                    + '0.5rem;'
                    + 'background:'
                    + 'hsl(var('
                    + '--muted)'
                    + '/0.3)'
                }">
                <div style="${
                    'width:'
                    + '2.5rem;'
                    + 'height:'
                    + '2.5rem;'
                    + 'border-'
                    + 'radius:'
                    + '9999px;'
                    + 'display:'
                    + 'flex;'
                    + 'align-'
                    + 'items:'
                    + 'center;'
                    + 'justify-'
                    + 'content:'
                    + 'center;'
                    + 'background:'
                    + bgColor
                }">
                    ${iconUser(
                        20, iconClass,
                    )}
                </div>
                <div
                    style="${
                        'flex:1;'
                        + 'min-'
                        + 'width:0'
                    }">
                    <p class="${
                        'font-'
                        + 'medium'
                    }">
                        ${m.name}
                    </p>
                    <p class="${
                        'text-xs '
                        + 'text-'
                        + 'muted'
                    }">
                        ${m.role}
                    </p>
                </div>
                <span class="${
                    'badge '
                    + badgeClass
                    + ' text-xs'
                }">
                    ${m.type}
                </span>
            </div>
        `;
    }

    buildTeamGrid(): SafeHtml {
        return html`
            <div class="${
                'card p-6 mb-6'
            }">
                <h3 class="${
                    'flex items-center '
                    + 'gap-2 text-lg '
                    + 'font-display '
                    + 'font-semibold mb-4'
                }">
                    ${iconUsers(
                        20, 'text-primary',
                    )}
                    Team Contacts
                </h3>
                <div class="${
                    'convert-grid'
                }"
                    style="${
                        'gap:0.75rem'
                    }">
                    ${this.#view
                        .teamMembers()
                        .map(
                            m => this
                                .#buildTeamMember(
                                    m,
                                ),
                        )}
                </div>
            </div>`;
    }

    buildLinkedIdeaCard(): SafeHtml {
        if (!this.#view.hasLinkedIdea())
            return html``;
        return html`
            <div class="${
                'card p-6 mb-8'
            }">
                <h3 class="${
                    'flex items-center '
                    + 'gap-2 text-lg '
                    + 'font-display '
                    + 'font-semibold mb-4'
                }">
                    ${iconFileText(
                        20, 'text-primary',
                    )}
                    Source Idea
                </h3>
                <a href="${
                    this.#view
                        .linkedIdeaHref()
                }"
                    class="${
                        'flex items-center '
                        + 'justify-between'
                    }"
                    style="${
                        'padding:1rem;'
                        + 'border-radius:'
                        + '0.5rem;'
                        + 'background:'
                        + 'hsl(var(--muted)'
                        + '/0.3);'
                        + 'text-decoration:'
                        + 'none;'
                        + 'color:inherit'
                    }">
                    <div
                        class="${
                            'flex '
                            + 'items-center '
                            + 'gap-3'
                        }">
                        <div style="${
                            'padding:'
                            + '0.5rem;'
                            + 'border-'
                            + 'radius:'
                            + '0.5rem;'
                            + 'background:'
                            + 'hsl(var('
                            + '--primary)'
                            + '/0.1)'
                        }">
                            ${iconLightbulb(
                                20,
                                'text-primary',
                            )}
                        </div>
                        <div>
                            <p class="${
                                'font-medium'
                            }">
                                ${this.#view
                                    .linkedIdeaTitle()}
                            </p>
                            <p class="${
                                'text-xs '
                                + 'text-muted'
                            }">
                                View original
                                idea
                            </p>
                        </div>
                    </div>
                    <div
                        class="${
                            'flex '
                            + 'items-center '
                            + 'gap-3'
                        }">
                        <span
                            class="${
                                'badge '
                                + 'badge-'
                                + 'success '
                                + 'text-xs'
                            }">
                            Score:
                            ${this.#view
                                .linkedIdeaScore()}
                        </span>
                        ${iconChevronRight(
                            20, 'text-muted',
                        )}
                    </div>
                </a>
            </div>`;
    }

    #buildAnswer(
        c: Clarification,
    ): SafeHtml {
        if (!c.hasAnswer())
            return html``;
        return html`
            <div style="${
                'margin-left:2.5rem;'
                + 'margin-top:1rem;'
                + 'padding:0.75rem;'
                + 'border-radius:'
                + '0.5rem;'
                + 'background:'
                + 'hsl(var(--muted)'
                + '/0.5);'
                + 'border-left:'
                + '2px solid '
                + 'hsl(var(--primary))'
            }">
                <div class="${
                    'flex items-center '
                    + 'gap-2 mb-1'
                }">
                    <span class="${
                        'font-medium'
                    }">
                        ${c
                            .answeredByName()}
                    </span>
                    <span class="${
                        'text-xs '
                        + 'text-muted'
                    }">
                        ${formatDate(
                            c.answeredAtDate(),
                        )}
                    </span>
                </div>
                <p>${
                    c.answerText()
                }</p>
            </div>`;
    }

    buildClarification(
        c: Clarification,
    ): SafeHtml {
        const isPending =
            clarificationIsPending(c);
        const borderColor = isPending
            ? 'hsl(var(--warning)/0.3)'
            : 'hsl(var(--border))';
        const bgStyle = isPending
            ? 'background:'
                + 'hsl(var(--warning)'
                + '/0.05)'
            : '';
        return html`
            <div class="card"
                style="${
                    'border:1px solid '
                    + borderColor + ';'
                    + bgStyle
                    + ';padding:1rem'
                }">
                <div
                    class="${
                        'flex items-start '
                        + 'gap-3 mb-3'
                    }">
                    <div style="${
                        'padding:0.5rem;'
                        + 'border-radius:'
                        + '9999px;'
                        + (isPending
                            ? 'background:'
                                + 'hsl(var('
                                + '--warning'
                                + ')/0.1)'
                            : 'background:'
                                + 'hsl(var('
                                + '--muted))')
                    }">
                        ${iconMessageSquare(
                            16,
                            isPending
                                ? 'text-'
                                    + 'warning'
                                : 'text-'
                                    + 'muted',
                        )}
                    </div>
                    <div style="flex:1">
                        <div class="${
                            'flex '
                            + 'items-center '
                            + 'gap-2 mb-1'
                        }">
                            <span class="${
                                'font-medium'
                            }">
                                ${c
                                    .askerName()}
                            </span>
                            <span class="${
                                'text-xs '
                                + 'text-muted'
                            }">
                                ${formatDate(
                                    c.askedAtDate(),
                                )}
                            </span>
                            <span class="${
                                'badge '
                                + (isPending
                                    ? 'badge-'
                                        + 'warning'
                                    : 'badge-'
                                        + 'success')
                                + ' text-xs'
                            }">
                                ${isPending
                                    ? 'Awaiting'
                                        + ' response'
                                    : 'Answered'}
                            </span>
                        </div>
                        <p>${
                            c.questionText()
                        }</p>
                    </div>
                </div>
                ${this.#buildAnswer(c)}
            </div>`;
    }

    buildClarificationList():
        SafeHtml {
        return html`${
            this.#clarifications.map(
                c => this
                    .buildClarification(c),
            )
        }`;
    }
}
