import { html, SafeHtml } from '../safe-html';
import { displayText } from '../core';
import {
    iconGripVertical,
    iconClock,
    iconDollarSign,
    iconTrendingUp,
    iconStar,
    iconEye,
    iconClipboardCheck,
    iconArrowRight,
    iconTarget,
} from '../icons';
import type { Idea } from '../../../api/types';

export class IdeaPresenter {
    readonly #idea: Idea;

    constructor(idea: Idea) {
        this.#idea = idea;
    }

    idForLink(): string {
        return this.#idea.id;
    }

    prioritySortKey(): number {
        return this.#idea.priority;
    }

    scoreSortKey(): number {
        return this.#idea.score;
    }

    isInReview(): boolean {
        return this.#idea.isInReview();
    }

    matchesSearch(
        term: string,
    ): boolean {
        return this.#idea
            .matchesSearch(term);
    }

    buildCard(view: string): SafeHtml {
        return html`
    <div class="card card-hover p-5"
        style="cursor:pointer"
        data-idea-card="${
            this.#idea.id
        }">
        <div class="flex items-start gap-4">
            <div class="hidden-mobile"
                style="color:hsl(
                    var(--muted-foreground)
                    /0.5);
                    margin-top:0.25rem;
                    cursor:grab">
                ${iconGripVertical(20, '')}
            </div>
            <div style="flex:1;min-width:0">
                <div class="flex items-start
                    justify-between gap-4 mb-3">
                    <div style="${
                        'flex:1;min-width:0'
                    }">
                        ${this.#buildHeading(
                            view,
                        )}
                    </div>
                    ${this.#buildScoreBadge()}
                </div>
                <div style="display:grid;
                    grid-template-columns:
                        3fr 2fr;
                    gap:1rem;
                    align-items:end">
                    ${this.#buildEstimates()}
                    ${this.#buildActions()}
                </div>
            </div>
        </div>
    </div>`;
    }

    #buildHeading(
        view: string,
    ): SafeHtml {
        return html`
        <div class="${
            'flex flex-wrap'
            + ' items-center'
            + ' gap-2 mb-1'
        }">
            <h3 class="${
                'font-display'
                + ' font-semibold'
                + ' truncate'
            }">
                ${this.#idea.title}
            </h3>
            <span class="${
                'badge '
                + this.#idea
                    .statusClassName()
                + ' text-xs'
            }">
                ${this.#idea.statusLabel()}
            </span>
            <span class="${
                'badge '
                + this.#idea
                    .edgeStatusClassName()
                + ' text-xs'
            }">
                ${iconTarget(12, '')}
                ${this.#idea
                    .edgeStatusLabel()}
            </span>
        </div>
        <div class="${
            'flex items-center'
            + ' gap-2 text-xs'
            + ' text-muted'
        }">
            ${view === 'priority'
                ? html`<span>${
                    'Priority'
                    } #${
                    this.#idea.priority
                    }
                </span><span>${
                    '\u2022'
                }</span>`
                : html``}
            <span>
                by ${
                    displayText(
                        this.#idea
                            .submittedBy,
                    )
                }
            </span>
        </div>`;
    }

    #buildScoreBadge(): SafeHtml {
        return html`
        <div style="${
            'padding:0.25rem'
            + ' 0.75rem;'
            + 'border-radius:var('
            + '--radius-lg);'
            + 'font-weight:600;'
            + 'font-size:0.875rem;'
        }${this.#idea.scoreStyle()}">
            ${iconStar(14, '')
            } ${this.#idea.score}
        </div>`;
    }

    #buildEstimates(): SafeHtml {
        const boxStyle =
            'width:2rem;'
            + 'height:2rem;'
            + 'border-radius'
            + ':var('
            + '--radius-lg);'
            + 'background:'
            + 'hsl('
            + 'var(--primary)'
            + '/0.1);'
            + 'display:flex;'
            + 'align-items:'
            + 'center;'
            + 'justify-'
            + 'content:'
            + 'center';
        const days =
            this.#idea.durationInDays();
        const cost =
            this.#idea.estimatedCost;
        const impact =
            this.#idea.estimatedImpact;
        return html`
        <div style="display:grid;
            grid-template-columns:
                repeat(3,1fr);
            gap:1rem">
            <div class="${
                'flex items-center gap-2'
            }">
                <div style="${boxStyle}">
                    ${iconClock(
                        16, 'text-primary',
                    )}
                </div>
                <div>
                    <p class="${
                        'text-xs text-muted'
                    }">
                        Time
                    </p>
                    <p class="${
                        'text-sm font-medium'
                    }">
                        ${days
                            ? `${days}d`
                            : '\u2014'}
                    </p>
                </div>
            </div>
            <div class="${
                'flex items-center gap-2'
            }">
                <div style="${boxStyle}">
                    ${iconDollarSign(
                        16, 'text-primary',
                    )}
                </div>
                <div>
                    <p class="${
                        'text-xs text-muted'
                    }">
                        Cost
                    </p>
                    <p class="${
                        'text-sm font-medium'
                    }">
                        ${cost
                            ? '$'
                                + (
                                    cost
                                    / 1000
                                ).toFixed(0)
                                + 'k'
                            : '\u2014'}
                    </p>
                </div>
            </div>
            <div class="${
                'flex items-center gap-2'
            }">
                <div style="${boxStyle}">
                    ${iconTrendingUp(
                        16, 'text-primary',
                    )}
                </div>
                <div>
                    <p class="${
                        'text-xs text-muted'
                    }">
                        Impact
                    </p>
                    <p class="${
                        'text-sm font-medium'
                    }">
                        ${displayText(
                            impact
                                ? String(
                                    impact,
                                )
                                : '',
                        )}
                    </p>
                </div>
            </div>
        </div>`;
    }

    #buildActions(): SafeHtml {
        return html`
        <div
            class="${
                'flex items-center'
                + ' gap-2'
                + ' idea-actions'
            }"
            style="justify-content:
                flex-end">
            <button
                class="${
                    'btn btn-outline'
                    + ' btn-sm gap-2'
                }"
                data-idea-view="${
                    this.#idea.id}">
                ${iconEye(16, '')}
                <span class="${
                    'hidden-mobile'
                }">
                    View
                </span>
            </button>
            ${this.#idea
                .needsEdgeDefinition()
                ? html`
            <button
                class="${
                    'btn btn-outline'
                    + ' btn-sm gap-2'
                }"
                style="${
                    'border-color:'
                    + 'hsl('
                    + 'var(--primary)'
                    + '/0.3);'
                    + 'color:hsl('
                    + 'var(--primary))'
                }"
                data-idea-edge="${
                    this.#idea.id}">
                ${iconTarget(16, '')}
                <span
                    class="${
                        'hidden-'
                        + 'mobile'
                    }">
                    Define Edge
                </span>
            </button>` : html``}
            ${this.#idea.isReviewable()
                ? html`
            <button
                class="${
                    'btn btn-outline'
                    + ' btn-sm gap-2'
                }"
                style="${
                    'border-color:'
                    + 'hsl('
                    + 'var(--warning)'
                    + '/0.3);'
                    + 'color:hsl('
                    + 'var(--warning))'
                }"
                data-idea-review="${
                    this.#idea.id}">
                ${iconClipboardCheck(
                    16, '',
                )}
                <span
                    class="${
                        'hidden-'
                        + 'mobile'
                    }">
                    Review
                </span>
            </button>` : html``}
            ${this.#idea.isConvertible()
                ? html`
            <button
                class="${
                    'btn btn-primary'
                    + ' btn-sm gap-2'
                }"
                data-idea-convert="${
                    this.#idea.id}">
                ${iconArrowRight(16, '')}
                <span
                    class="${
                        'hidden-'
                        + 'mobile'
                    }">
                    Convert
                </span>
            </button>` : html``}
        </div>`;
    }
}
