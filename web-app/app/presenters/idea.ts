import { html, SafeHtml } from '../safe-html';
import {
    displayText, formatDate,
} from '../core';
import {
    iconGripVertical,
    iconClock,
    iconDollarSign,
    iconTrendingUp,
    iconStar,
    iconEye,
    iconClipboardCheck,
    iconArrowRight,
    iconArrowLeft,
    iconTarget,
    iconCheckCircle2,
    iconMessageSquare,
    iconAlertCircle,
    iconChevronRight,
    iconEdit,
    iconSave,
    iconX,
} from '../icons';
import type {
    Idea,
    ReadinessLevel,
} from '../../../api/types';
import {
    COST_DIVISOR,
} from '../../../api/types';

const PRIORITY_CONFIG: Record<
    string,
    { label: string; className: string }
> = {
    high: {
        label: 'High Priority',
        className: 'badge-error',
    },
    medium: {
        label: 'Medium',
        className: 'badge-warning',
    },
    low: {
        label: 'Low',
        className: 'badge-default',
    },
};

const READINESS_ICONS: Record<
    ReadinessLevel,
    (
        size: number,
        cssClass: string,
    ) => SafeHtml
> = {
    ready: iconCheckCircle2,
    'needs-info': iconMessageSquare,
    incomplete: iconAlertCircle,
};

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

    isReady(): boolean {
        return this.#idea.isReady();
    }

    matchesPriorityFilter(
        priority: string,
    ): boolean {
        return priority === 'all'
            || this.#idea.priorityLevel()
                === priority;
    }

    matchesReadinessFilter(
        readiness: string,
    ): boolean {
        return readiness === 'all'
            || this.#idea.readiness
                === readiness;
    }

    waitingDays(): number {
        return this.#idea.waitingDays;
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
                                    / COST_DIVISOR
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

    buildReviewCard(): SafeHtml {
        const idea = this.#idea;
        const rIcon = READINESS_ICONS[
            idea.readiness
        ]!;
        const pd = PRIORITY_CONFIG[
            idea.priorityLevel()
        ]!;
        return html`
    <div class="card card-hover p-4"
        style="cursor:pointer"
        data-review-card="${idea.id}">
        <div class="flex items-start
            justify-between gap-4">
            <div style="${
                'flex:1;min-width:0'
            }">
                <div class="${
                    'flex flex-wrap'
                    + ' items-center'
                    + ' gap-2 mb-2'
                }">
                    <span class="${
                        'badge '
                        + pd.className
                        + ' text-xs'
                    }">${pd.label}</span>
                    <span class="${
                        'flex items-center'
                        + ' gap-1 text-sm '
                        + idea
                            .readinessClassName()
                    }">${
                        rIcon(16, '')
                    } ${
                        idea.readinessLabel()
                    }</span>
                    <span class="${
                        'badge '
                        + idea
                            .edgeStatusClassName()
                        + ' text-xs'
                    }">${
                        iconTarget(12, '')
                    } ${
                        idea.edgeStatusLabel()
                    }</span>
                </div>
                <h3 class="${
                    'font-semibold mb-1'
                }">${idea.title}</h3>
                <div class="${
                    'flex items-center'
                    + ' gap-4 text-sm'
                    + ' text-muted'
                }">
                    <span>by ${
                        displayText(
                            idea.submittedBy,
                        )
                    }</span>
                    <span>${
                        '\u2022'
                    }</span>
                    <span>${
                        idea.category
                    }</span>
                    <span>${
                        '\u2022'
                    }</span>
                    <span style="${
                        'color:hsl('
                        + 'var(--warning))'
                    }">${
                        idea.waitingDays
                    } days waiting</span>
                </div>
            </div>
            <div class="${
                'flex items-center gap-6'
            }">
                <div class="${
                    'text-right'
                    + ' hidden-mobile'
                }">
                    <div class="${
                        'flex items-center'
                        + ' gap-4 text-sm'
                    }">
                        <div>
                            <p class="${
                                'text-muted'
                            }">Score</p>
                            <p class="${
                                'font-semibold'
                            }"
                                style="${
                                    idea
                                    .scoreColor()
                                }">${
                                idea.score
                            }</p>
                        </div>
                        <div>
                            <p class="${
                                'text-muted'
                            }">Impact</p>
                            <p class="${
                                'font-medium'
                            }">${
                                idea.impactLabel
                            }</p>
                        </div>
                        <div>
                            <p class="${
                                'text-muted'
                            }">Effort</p>
                            <p class="${
                                'font-medium'
                            }">${
                                idea.effortLabel
                            }</p>
                        </div>
                    </div>
                </div>
                ${iconChevronRight(
                    20, 'text-muted',
                )}
            </div>
        </div>
    </div>`;
    }

    buildDetailView(
        ideaId: string,
        isEditing: boolean,
    ): SafeHtml {
        const idea = this.#idea;
        return html`
    <div
        style="max-width:48rem;
            margin:0 auto">
        <div class="flex items-center gap-2
            text-sm text-muted mb-4">
            <a href="../ideas/index.html"
                class="hover-link">
                Ideas
            </a>
            <span>/</span>
            <span>${idea.title}</span>
        </div>

        <div class="flex items-start
            justify-between gap-4 mb-6">
            <div
                class="${
                    'flex items-center gap-4'
                }">
                <button
                    class="${
                        'btn btn-ghost'
                        + ' btn-icon'
                    }"
                    id="idea-back-btn">
                    ${iconArrowLeft(20, '')}
                </button>
                <div>
                    <div class="flex flex-wrap
                        items-center gap-3
                        mb-2">
                        ${isEditing
                            ? html`<input
                                class="input"
                                id="${
                                    'idea-edit'
                                    + '-title'
                                }"
                                value="${
                                    idea.title
                                }"
                                style="${
                                    'font-size:'
                                    + '1.125rem;'
                                    + 'font-weight'
                                    + ':700'
                                }" />`
                            : html`<h1
                                class="${
                                    'text-xl'
                                    + ' font-display'
                                    + ' font-bold'
                                }">
                                ${idea.title}
                            </h1>`}
                        <span class="badge
                            ${idea
                                .statusClassName()}
                            text-xs">
                            ${idea.statusLabel()}
                        </span>
                        <span class="badge
                            ${idea
                                .edgeStatusClassName()}
                            text-xs">
                            ${iconTarget(
                                12, '',
                            )}
                            ${idea
                                .edgeStatusLabel()}
                        </span>
                        <div style="${
                            'padding:0.25rem'
                            + ' 0.75rem;'
                            + 'border-radius:'
                            + 'var('
                            + '--radius-lg);'
                            + 'font-weight:600;'
                            + 'font-size:'
                            + '0.875rem;'
                        }${idea.scoreStyle()}">
                            ${iconStar(14, '')}
                            ${idea.score}
                        </div>
                    </div>
                    <p class="${
                        'text-sm text-muted'
                    }">
                        Submitted by
                        ${displayText(
                            idea.submittedBy,
                        )}
                    </p>
                </div>
            </div>
            <div
                class="${
                    'flex items-center gap-2'
                }">
                ${idea.needsEdgeDefinition()
                    ? html`
                <button
                    class="${
                        'btn btn-outline'
                        + ' btn-sm gap-2'
                    }"
                    style="${
                        'border-color:hsl('
                        + 'var(--primary)'
                        + '/0.3);'
                        + 'color:hsl('
                        + 'var(--primary))'
                    }"
                    id="idea-edge-btn">
                    ${iconTarget(16, '')}
                    Define Edge
                </button>` : html``}
                ${idea.status === 'active'
                    ? html`
                <button
                    class="${
                        'btn btn-primary'
                        + ' btn-sm gap-2'
                    }"
                    id="${
                        'idea-submit'
                        + '-review-btn'
                    }">
                    ${iconClipboardCheck(
                        16, '',
                    )}
                    Submit for Review
                </button>` : html``}
                ${idea.isReviewable()
                    ? html`
                <button
                    class="${
                        'btn btn-outline'
                        + ' btn-sm gap-2'
                    }"
                    style="${
                        'border-color:hsl('
                        + 'var(--warning)'
                        + '/0.3);'
                        + 'color:hsl('
                        + 'var(--warning))'
                    }"
                    id="idea-review-btn">
                    ${iconClipboardCheck(
                        16, '',
                    )}
                    Review
                </button>` : html``}
                ${idea.isConvertible()
                    ? html`
                <button
                    class="${
                        'btn btn-primary'
                        + ' btn-sm gap-2'
                    }"
                    id="idea-convert-btn">
                    ${iconArrowRight(16, '')}
                    Convert
                </button>` : html``}
                ${isEditing
                    ? html`<div
                        class="flex gap-2">
                        <button
                            class="${
                                'btn btn-outline'
                                + ' gap-2'
                            }"
                            id="${
                                'idea-cancel'
                                + '-btn'
                            }">
                            ${iconX(
                                16, '',
                            )} Cancel
                        </button>
                        <button
                            class="${
                                'btn btn-primary'
                                + ' gap-2'
                            }"
                            id="${
                                'idea-save-btn'
                            }">
                            ${iconSave(
                                16, '',
                            )} Save
                        </button>
                    </div>`
                    : html`<button
                        class="${
                            'btn btn-outline'
                            + ' gap-2'
                        }"
                        id="idea-edit-btn">
                        ${iconEdit(
                            16, '',
                        )} Edit
                    </button>`}
            </div>
        </div>

        <div style="display:flex;
            flex-direction:column;
            gap:1.5rem">
            ${this.#buildProblemSolutionCard(
                isEditing,
            )}
            ${this.#buildDetailsCard(
                isEditing,
            )}
            ${this.#buildEstimatesCard(
                isEditing,
            )}
        </div>
    </div>`;
    }

    #buildProblemSolutionCard(
        isEditing: boolean,
    ): SafeHtml {
        const idea = this.#idea;
        return html`
    <div class="card p-6">
        <h2 class="text-lg font-display
            font-semibold mb-4">
            Problem &amp; Solution
        </h2>
        <div style="display:flex;
            flex-direction:column;
            gap:1.25rem">
            <div>
                <p class="${
                    'text-xs text-muted mb-1'
                }">
                    Problem Statement
                </p>
                ${isEditing
                    ? html`<textarea
                        class="textarea"
                        id="idea-edit-problem"
                        rows="3"
                        style="resize:none"
                        >${idea
                            .problemStatement
                        }</textarea>`
                    : html`<p class="text-sm">
                        ${displayText(
                            idea
                                .problemStatement,
                        )}
                        </p>`}
            </div>
            <div>
                <p class="${
                    'text-xs text-muted mb-1'
                }">
                    Target Users
                </p>
                ${isEditing
                    ? html`<textarea
                        class="textarea"
                        id="${
                            'idea-edit-'
                            + 'target-users'
                        }"
                        rows="2"
                        style="resize:none"
                        >${idea
                            .description
                        }</textarea>`
                    : html`<p class="text-sm">
                        ${displayText(
                            idea.description,
                        )}
                        </p>`}
            </div>
            <div>
                <p class="${
                    'text-xs text-muted mb-1'
                }">
                    Proposed Solution
                </p>
                ${isEditing
                    ? html`<textarea
                        class="textarea"
                        id="${
                            'idea-edit-'
                            + 'solution'
                        }"
                        rows="3"
                        style="resize:none"
                        >${idea
                            .proposedSolution
                        }</textarea>`
                    : html`<p class="text-sm">
                        ${displayText(
                            idea
                                .proposedSolution,
                        )}
                        </p>`}
            </div>
            <div>
                <p class="${
                    'text-xs text-muted mb-1'
                }">
                    Expected Outcome
                </p>
                ${isEditing
                    ? html`<textarea
                        class="textarea"
                        id="${
                            'idea-edit-'
                            + 'outcome'
                        }"
                        rows="3"
                        style="resize:none"
                        >${idea
                            .expectedOutcome
                        }</textarea>`
                    : html`<p class="text-sm">
                        ${displayText(
                            idea
                                .expectedOutcome,
                        )}
                        </p>`}
            </div>
            <div>
                <p class="${
                    'text-xs text-muted mb-1'
                }">
                    Success Metrics
                </p>
                ${isEditing
                    ? html`<textarea
                        class="textarea"
                        id="${
                            'idea-edit-'
                            + 'metrics'
                        }"
                        rows="3"
                        style="resize:none"
                        >${idea
                            .successMetrics
                        }</textarea>`
                    : html`<p class="text-sm">
                        ${displayText(
                            idea
                                .successMetrics,
                        )}
                        </p>`}
            </div>
        </div>
    </div>`;
    }

    #buildDetailsCard(
        isEditing: boolean,
    ): SafeHtml {
        const idea = this.#idea;
        return html`
    <div class="card p-6">
        <h2 class="text-lg font-display
            font-semibold mb-4">
            Details
        </h2>
        <div style="display:flex;
            flex-direction:column;
            gap:1rem">
            <div>
                <p class="${
                    'text-xs text-muted mb-1'
                }">
                    Category
                </p>
                ${isEditing
                    ? html`<input class="input"
                        id="${
                            'idea-edit-category'
                        }"
                        value="${
                            idea.category
                        }" />`
                    : html`<p
                        class="${
                            'text-sm font-medium'
                        }">
                        ${displayText(
                            idea.category,
                        )}
                    </p>`}
            </div>
            <div>
                <p class="${
                    'text-xs text-muted mb-1'
                }">
                    Submitted by
                </p>
                <p class="${
                    'text-sm font-medium'
                }">
                    ${displayText(
                        idea.submittedBy,
                    )}
                </p>
            </div>
            <div>
                <p class="${
                    'text-xs text-muted mb-1'
                }">
                    Submitted at
                </p>
                <p class="${
                    'text-sm font-medium'
                }">
                    ${idea.submittedAt
                        ? formatDate(
                            idea.submittedAt,
                        )
                        : displayText('')}
                </p>
            </div>
        </div>
    </div>`;
    }

    #buildEstimatesCard(
        isEditing: boolean,
    ): SafeHtml {
        const idea = this.#idea;
        return html`
    <div class="card p-6">
        <h2 class="text-lg font-display
            font-semibold mb-4">
            Estimates
        </h2>
        <div class="score-grid">
            ${[
              {
                  label: 'Score',
                  inputId: 'score',
                  icon: iconStar,
                  value: idea.score,
                  unit: '',
                  prefix: '#',
              },
              {
                  label: 'Impact',
                  inputId: 'impact',
                  icon: iconTrendingUp,
                  value:
                      idea.estimatedImpact,
                  unit: ' pts',
                  prefix: '',
              },
              {
                  label: 'Duration',
                  inputId: 'duration',
                  icon: iconClock,
                  value:
                      idea.durationInDays(),
                  unit: 'd',
                  prefix: '',
              },
              {
                  label: 'Cost',
                  inputId: 'cost',
                  icon: iconDollarSign,
                  value:
                      idea.estimatedCost,
                  unit: '',
                  prefix: '$',
              },
            ].map(metric => html`
            <div style="padding:1rem;
                border-radius:0.75rem;
                background:hsl(
                    var(--muted)/0.3);
                border:1px solid
                    hsl(var(--border))">
                <div
                    class="${
                        'flex items-center'
                        + ' gap-2 mb-3'
                    }">
                    ${metric.icon(
                        20, 'text-primary',
                    )}
                    <span
                        class="font-medium">
                        ${metric.label}
                    </span>
                </div>
                ${isEditing
                    ? html`<input
                        type="number"
                        id="${
                            'idea-edit-'
                            + metric.inputId
                        }"
                        value="${String(
                            metric.value,
                        )}"
                        class="input"
                        style="width:100%"
                        min="0"
                        step="any" />`
                    : html`<p
                        class="${
                            'text-lg'
                            + ' font-bold'
                        }">
                        ${metric.value
                            ? `${metric.prefix}${metric.value}${metric.unit}`
                            : '\u2014'}
                    </p>`}
            </div>
            `)}
        </div>
    </div>`;
    }
}
