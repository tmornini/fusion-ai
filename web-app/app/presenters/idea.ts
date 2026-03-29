import { html, SafeHtml } from '../safe-html';
import {
    displayText, formatDate,
    SECONDS_PER_DAY,
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
    iconCheckCircle,
    iconXCircle,
    iconMessageSquare,
    iconAlertCircle,
    iconAlertTriangle,
    iconChevronRight,
    iconEdit,
    iconSave,
    iconX,
    iconRocket,
    iconCalendar,
    iconUsers,
    iconFolderKanban,
    iconLoader,
    iconUser,
    iconLightbulb,
    iconFileText,
    iconShield,
    iconGauge,
} from '../icons';
import type {
    Idea,
    ReadinessLevel,
} from '../../../api/types';
import { User } from '../../../api/types';
import type {
    EdgeData,
    Metric,
} from '../adapters/helpers';

type ConversionField =
    | 'project-name'
    | 'project-lead'
    | 'start-date'
    | 'target-end-date'
    | 'budget'
    | 'priority'
    | 'first-milestone'
    | 'success-criteria';

export interface ConversionFormState {
    projectDetails: Record<
        ConversionField, string
    >;
    completedCount: number;
    requiredCount: number;
    isReady: boolean;
    fieldChecks: Record<
        ConversionField, SafeHtml
    >;
}

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

type Severity =
    | 'high'
    | 'medium'
    | 'low';

const SEVERITY_CONFIG: Record<
    Severity,
    string
> = {
    high: 'badge-error',
    medium: 'badge-warning',
    low: 'badge-default',
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

    buildApprovalPage(
        edge: EdgeData | null,
        isEditing: boolean,
    ): SafeHtml {
        const idea = this.#idea;
        return html`
    <div class="${
        'flex items-center'
        + ' justify-between'
        + ' gap-4 mb-6'
    }">
        <div
            class="flex items-center gap-4"
            style="min-width:0">
            <button
                class="${
                    'btn btn-ghost'
                    + ' btn-icon'
                }"
                id="${
                    'approval-back'
                    + '-btn'
                }">
                ${iconArrowLeft(20, '')}
            </button>
            <div style="min-width:0">
                <p class="text-xs
                    text-muted">
                    Reviewing Idea
                </p>
                ${isEditing
                    ? html`<input
                        class="input"
                        id="${
                            'approval'
                            + '-edit'
                            + '-title'
                        }"
                        value="${
                            idea.title
                        }"
                        style=${
                            'font-size:'
                            + '1.125rem;'
                            + 'font-'
                            + 'weight:'
                            + '700'
                        } />`
                    : html`<h1
                        class="${
                            'text-lg'
                            + ' font-bold'
                            + ' truncate'
                        }">
                        ${idea.title}
                    </h1>`}
            </div>
        </div>
        <div
            class="flex items-center
                gap-2"
            style="flex-shrink:0">
            ${isEditing
                ? html`
            <button
                class="${
                    'btn btn-outline'
                    + ' gap-2'
                }"
                id=${'approval'
                    + '-cancel'
                    + '-edit-btn'}>
                ${iconX(16, '')} Cancel
            </button>
            <button
                class="${
                    'btn btn-primary'
                    + ' gap-2'
                }"
                id=${'approval'
                    + '-save'
                    + '-edit-btn'}>
                ${iconSave(16, '')} Save
            </button>`
                : html`
            <button
                class="${
                    'btn btn-outline'
                    + ' gap-2'
                }"
                id="${
                    'approval'
                    + '-edit-btn'
                }">
                ${iconEdit(16, '')} Edit
            </button>
            <span
                class="badge
                    badge-error
                    text-xs">
                ${idea.priorityLevel()}
            </span>`}
        </div>
    </div>

    <div style="padding-bottom:10rem">
        <div class="flex flex-wrap
                items-center gap-4
                text-sm text-muted mb-6">
                <span
                    class="flex items-center
                        gap-1">
                    ${iconUser(16, '')}
                    <span
                        class="font-medium"
                        style=${'color:'
                            + 'hsl(var('
                            + '--foreground))'}>
                        ${displayText(
                            idea.submittedBy,
                        )}
                    </span>
                </span>
                <span
                    class="flex items-center
                        gap-1">
                    ${iconCalendar(16, '')}
                    ${idea.submittedAt}
                </span>
                <span
                    class="flex items-center
                        gap-1">
                    ${iconTarget(16, '')}
                    ${idea.category}
                </span>
                <span
                    class="flex items-center
                        gap-1 hidden-mobile">
                    ${iconFileText(16, '')}
                    3 attachments
                </span>
                <span
                    class="flex items-center
                        gap-1 hidden-mobile">
                    ${iconMessageSquare(
                        16, '',
                    )}
                    7 comments
                </span>
            </div>

            ${this
                .#buildApprovalScoreCard()}

            <div class="card p-6 mb-6">
                <h3 class="${
                    'font-semibold mb-3'
                    + ' flex items-center'
                    + ' gap-2'
                }">
                    ${iconLightbulb(
                        20,
                        'text-primary',
                    )}
                    Idea Overview
                </h3>
                ${isEditing
                    ? html`<textarea
                        class="textarea"
                        id=${'approval-edit'
                            + '-description'}
                        rows="4"
                        style="resize:none"
                        >${
                            idea.description
                        }</textarea>`
                    : html`<p class="${
                        'text-sm'
                        + ' leading-relaxed'
                    }">${
                        idea.description
                    }</p>`}
            </div>

            ${this
                .#buildApprovalImpactGrid()}

            <div class="card p-6 mb-6">
                <h3 class="${
                    'font-semibold mb-3'
                    + ' flex items-center'
                    + ' gap-2'
                }">
                    ${iconDollarSign(
                        20,
                        'text-primary',
                    )}
                    Cost Estimate
                </h3>
                <p class="${
                    'text-2xl font-bold'
                    + ' mb-1'
                }">${
                    idea.costEstimate
                }</p>
                <p class="${
                    'text-sm text-muted'
                }">${
                    idea.costBreakdown
                }</p>
            </div>

            ${edge
                ? this.#buildApprovalEdge(
                    edge,
                )
                : html``}

            ${this.#buildApprovalRisks()}
            ${this
                .#buildApprovalAssumptions()}
            ${this
                .#buildApprovalAlignments()}
    </div>

        ${this.#buildApprovalFooter()}
        ${this.#buildApprovalDialogs()}`;
    }

    #buildApprovalScoreCard(): SafeHtml {
        const idea = this.#idea;
        return html`
            <div class="card p-6 mb-6"
                style=${'background:'
                    + 'linear-gradient('
                    + 'to right,'
                    + 'hsl(var(--primary)'
                    + '/0.05),'
                    + 'hsl(var(--primary)'
                    + '/0.1));'
                    + 'border-color:'
                    + 'hsl(var(--primary)'
                    + '/0.2)'}>
                <div class="flex items-center
                    justify-between gap-4">
                    <div>
                        <p class="${
                            'text-sm'
                            + ' text-muted'
                            + ' mb-1'
                        }">
                            Innovation Score
                        </p>
                        <div class="flex
                            items-baseline
                            gap-2">
                            <span class="${
                                'text-4xl'
                                + ' font-bold'
                                + ' text-primary'
                            }">
                                ${idea.score}
                            </span>
                            <span class="${
                                'text-muted'
                            }">
                                /100
                            </span>
                        </div>
                    </div>
                    <div style=${
                        'display:grid;'
                        + 'grid-template-'
                        + 'columns:'
                        + 'repeat(3,1fr);'
                        + 'gap:2rem;'
                        + 'text-align:center'
                    }>
                        <div>
                            <p class="${
                                'text-sm'
                                + ' text-muted'
                                + ' mb-1'
                            }">
                                Impact
                            </p>
                            <p class="${
                                'text-xl'
                                + ' font-'
                                + 'semibold'
                            }">
                                ${idea
                                    .impactLabel}
                            </p>
                        </div>
                        <div>
                            <p class="${
                                'text-sm'
                                + ' text-muted'
                                + ' mb-1'
                            }">
                                Effort
                            </p>
                            <p class="${
                                'text-xl'
                                + ' font-'
                                + 'semibold'
                            }">
                                ${idea
                                    .effortLabel}
                            </p>
                        </div>
                        <div>
                            <p class="${
                                'text-sm'
                                + ' text-muted'
                                + ' mb-1'
                            }">
                                Timeline
                            </p>
                            <p class="${
                                'text-xl'
                                + ' font-'
                                + 'semibold'
                            }">
                                ${idea
                                    .effortDurationEstimate}
                            </p>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    #buildApprovalImpactGrid(): SafeHtml {
        const idea = this.#idea;
        return html`
            <div class="detail-grid mb-6"
                style=${'grid-template-'
                    + 'columns:'
                    + '1fr 1fr'}>
                <div class="card p-6">
                    <h3 class="${
                        'font-semibold mb-3'
                        + ' flex items-center'
                        + ' gap-2'
                    }">
                        ${iconTrendingUp(
                            20, '',
                        )}
                        Expected Impact
                    </h3>
                    <p class="text-sm">${
                        idea.description
                    }</p>
                </div>
                <div class="card p-6">
                    <h3 class="${
                        'font-semibold mb-3'
                        + ' flex items-center'
                        + ' gap-2'
                    }">
                        ${iconClock(20, '')}
                        Effort Required
                    </h3>
                    <div style=${
                        'display:flex;'
                        + 'flex-direction:'
                        + 'column;'
                        + 'gap:0.75rem'
                    }>
                        <div
                            class="flex
                                justify-between">
                            <span class="${
                                'text-sm'
                                + ' text-muted'
                            }">
                                Timeline
                            </span>
                            <span class="${
                                'text-sm'
                                + ' font-medium'
                            }">${
                                idea
                                    .effortDurationEstimate
                            }</span>
                        </div>
                        <div
                            class="flex
                                justify-between">
                            <span class="${
                                'text-sm'
                                + ' text-muted'
                            }">
                                Team Size
                            </span>
                            <span class="${
                                'text-sm'
                                + ' font-medium'
                            }">${
                                idea
                                    .effortTeamSize
                            }</span>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    #buildApprovalEdge(
        edge: EdgeData,
    ): SafeHtml {
        return html`
            <div class="card p-6 mb-6"
                style=${'background:'
                    + 'linear-gradient('
                    + 'to right,'
                    + 'hsl(var(--primary)'
                    + '/0.05),'
                    + 'hsl(var(--primary)'
                    + '/0.1));'
                    + 'border-color:'
                    + 'hsl(var(--primary)'
                    + '/0.2)'}>
                <div class="flex items-center
                    justify-between mb-4">
                    <h3 class="${
                        'font-semibold flex'
                        + ' items-center'
                        + ' gap-2'
                    }">
                        ${iconTarget(
                            20,
                            'text-primary',
                        )}
                        ${'Edge: Business'
                            + ' Outcomes'}
                        &amp; Success Criteria
                    </h3>
                    <span class="${
                        'badge'
                        + ' badge-success'
                        + ' text-xs'
                    }">
                        ${iconShield(12, '')}
                        High Confidence
                    </span>
                </div>
                ${edge.outcomes.map((
                    outcome:
                        EdgeData[
                            'outcomes'
                        ][number],
                    outcomeIndex: number,
                ) => this
                    .#buildApprovalOutcome(
                        outcome,
                        outcomeIndex,
                    ))}
                ${this
                    .#buildApprovalImpactTimeline(
                        edge,
                    )}
                <div
                    class="flex items-center
                        justify-between
                        mt-3 pt-3"
                    style=${'border-top:'
                        + '1px solid'
                        + ' hsl(var('
                        + '--border))'}>
                    <span class="text-xs
                        text-muted">
                        Edge Owner
                    </span>
                    <span class="text-sm
                        font-medium">${
                        edge.owner
                    }</span>
                </div>
            </div>`;
    }

    #buildApprovalOutcome(
        outcome: EdgeData[
            'outcomes'
        ][number],
        outcomeIndex: number,
    ): SafeHtml {
        return html`
                <div
                    class="p-4 rounded-lg mb-3"
                    style=${'background:'
                        + 'hsl(var('
                        + '--background));'
                        + 'border:1px solid'
                        + ' hsl(var('
                        + '--border))'}>
                    <div class="flex
                        items-start gap-2 mb-3">
                        <div style=${
                            'width:'
                            + '1.25rem;'
                            + 'height:1.25rem;'
                            + 'border-radius:'
                            + '9999px;'
                            + 'background:'
                            + 'hsl(var('
                            + '--primary)'
                            + '/0.1);'
                            + 'display:flex;'
                            + 'align-items:'
                            + 'center;'
                            + 'justify-'
                            + 'content:'
                            + 'center;'
                            + 'font-size:'
                            + '0.75rem;'
                            + 'font-weight:'
                            + '700;'
                            + 'color:'
                            + 'hsl(var('
                            + '--primary));'
                            + 'flex-shrink:0'
                        }>${
                            outcomeIndex + 1
                        }</div>
                        <p class="${
                            'font-medium'
                            + ' text-sm'
                        }">${
                            outcome
                                .description
                        }</p>
                    </div>
                    <div
                        style=${'padding-'
                            + 'left:'
                            + '1.75rem'}
                        class="${
                            'flex flex-wrap'
                            + ' gap-2'
                        }">
                        ${outcome.metrics
                            .map((
                                metric:
                                    Metric,
                            ) => html`
                        <span
                            class="${
                                'flex'
                                + ' items-center'
                                + ' gap-2'
                                + ' text-sm'
                            }"
                            style=${
                                'padding:'
                                + '0.375rem'
                                + ' 0.75rem;'
                                + 'border-'
                                + 'radius:'
                                + '9999px;'
                                + 'background:'
                                + 'hsl(var('
                                + '--muted)'
                                + '/0.5);'
                                + 'border:'
                                + '1px solid'
                                + ' hsl(var('
                                + '--border))'
                            }>
                            ${iconGauge(
                                14,
                                'text-primary',
                            )}
                            ${metric.name}:
                            <span
                                class="${
                                    'font-'
                                    + 'semibold'
                                    + ' text-'
                                    + 'primary'
                                }">${
                                metric.target
                            }${
                                metric.unit
                            }</span>
                        </span>`)}
                    </div>
                </div>`;
    }

    #buildApprovalImpactTimeline(
        edge: EdgeData,
    ): SafeHtml {
        return html`
                <div style=${
                    'display:grid;'
                    + 'grid-template-'
                    + 'columns:'
                    + 'repeat(3,1fr);'
                    + 'gap:0.75rem;'
                    + 'margin-top:0.5rem'
                }>
                    <div
                        class="${
                            'p-3 rounded-lg'
                        }"
                        style=${'background:'
                            + 'hsl(var('
                            + '--success-'
                            + 'soft));'
                            + 'border:'
                            + '1px solid'
                            + ' hsl(var('
                            + '--success)'
                            + '/0.2)'}>
                        <div class="flex
                            items-center
                            gap-1 mb-2">
                            <span
                                class="${
                                    'text-xs'
                                    + ' font-'
                                    + 'medium'
                                }"
                                style=${
                                    'color:'
                                    + 'hsl(var('
                                    + '--success'
                                    + '))'}>
                                ${iconClock(
                                    14, '',
                                )}
                                ${'Short-term'
                                    + ' (0-3mo)'}
                            </span>
                        </div>
                        <p class="${
                            'text-xs'
                        }">${
                            edge.impact
                                .shortTerm
                        }</p>
                    </div>
                    <div
                        class="${
                            'p-3 rounded-lg'
                        }"
                        style=${'background:'
                            + 'hsl(var('
                            + '--warning-'
                            + 'soft));'
                            + 'border:'
                            + '1px solid'
                            + ' hsl(var('
                            + '--warning)'
                            + '/0.2)'}>
                        <div class="flex
                            items-center
                            gap-1 mb-2">
                            <span
                                class="${
                                    'text-xs'
                                    + ' font-'
                                    + 'medium'
                                }"
                                style=${
                                    'color:'
                                    + 'hsl(var('
                                    + '--warning'
                                    + '))'}>
                                ${iconClock(
                                    14, '',
                                )}
                                ${'Mid-term'
                                    + ' (3-12'
                                    + 'mo)'}
                            </span>
                        </div>
                        <p class="${
                            'text-xs'
                        }">${
                            edge.impact
                                .midTerm
                        }</p>
                    </div>
                    <div
                        class="${
                            'p-3 rounded-lg'
                        }"
                        style=${'background:'
                            + 'hsl(var('
                            + '--info-soft));'
                            + 'border:'
                            + '1px solid'
                            + ' hsl(var('
                            + '--primary)'
                            + '/0.2)'}>
                        <div class="flex
                            items-center
                            gap-1 mb-2">
                            <span
                                class="${
                                    'text-xs'
                                    + ' font-'
                                    + 'medium'
                                    + ' text-'
                                    + 'primary'
                                }">
                                ${iconClock(
                                    14, '',
                                )}
                                ${'Long-term'
                                    + ' (12+mo)'}
                            </span>
                        </div>
                        <p class="${
                            'text-xs'
                        }">${
                            edge.impact
                                .longTerm
                        }</p>
                    </div>
                </div>`;
    }

    #buildApprovalRisks(): SafeHtml {
        const idea = this.#idea;
        if (!idea.parsedRisks().length) {
            return html``;
        }
        return html`
            <div class="card p-6 mb-6">
                <h3 class="${
                    'font-semibold mb-4'
                    + ' flex items-center'
                    + ' gap-2'
                }">
                    ${iconAlertTriangle(
                        20, '',
                    )}
                    Identified Risks
                </h3>
                <div style=${
                    'display:flex;'
                    + 'flex-direction:'
                    + 'column;'
                    + 'gap:0.75rem'
                }>
                    ${idea.parsedRisks()
                        .map((
                        risk:
                            { title: string;
                                severity:
                                    string;
                                mitigation:
                                    string },
                    ) => {
                    const s = (
                        risk.severity
                    ) as Severity;
                    const sev =
                        SEVERITY_CONFIG[
                            s
                        ]!;
                    return html`
                    <div
                        class="${
                            'p-4 rounded-lg'
                        }"
                        style=${'background:'
                            + 'hsl(var('
                            + '--muted)'
                            + '/0.3);'
                            + 'border:'
                            + '1px solid'
                            + ' hsl(var('
                            + '--border))'}>
                        <div class="flex
                            items-center
                            justify-between
                            mb-2">
                            <h4 class="${
                                'font-medium'
                                + ' text-sm'
                            }">${
                                risk.title
                            }</h4>
                            <span class="${
                                'badge '
                                + sev
                                + ' text-xs'
                            }">${
                                risk.severity
                            }</span>
                        </div>
                        <p class="text-xs
                            text-muted">
                            <span
                                class="${
                                    'font-'
                                    + 'medium'
                                }">
                                Mitigation:
                            </span>
                            ${risk
                                .mitigation}
                        </p>
                    </div>`;
                    })}
                </div>
            </div>`;
    }

    #buildApprovalAssumptions(
    ): SafeHtml {
        const idea = this.#idea;
        if (
            !idea
                .parsedAssumptions()
                .length
        ) {
            return html``;
        }
        return html`
            <div class="card p-6 mb-6">
                <h3 class="${
                    'font-semibold mb-3'
                }">
                    Key Assumptions
                </h3>
                <ul style=${
                    'display:flex;'
                    + 'flex-direction:'
                    + 'column;'
                    + 'gap:0.5rem'
                }>
                    ${idea
                        .parsedAssumptions()
                        .map((
                            assumption:
                                string,
                        ) => html`
                    <li class="${
                        'flex items-start'
                        + ' gap-2 text-sm'
                    }">
                        <span
                            class="text-primary
                                mt-1">
                            &#8226;
                        </span>
                        ${assumption}
                    </li>`)}
                </ul>
            </div>`;
    }

    #buildApprovalAlignments(
    ): SafeHtml {
        const idea = this.#idea;
        if (
            !idea
                .parsedAlignments()
                .length
        ) {
            return html``;
        }
        return html`
            <div class="card p-6 mb-6">
                <h3 class="${
                    'font-semibold mb-3'
                    + ' flex items-center'
                    + ' gap-2'
                }">
                    ${iconUsers(
                        20,
                        'text-primary',
                    )}
                    Strategic Alignment
                </h3>
                <div class="${
                    'flex flex-wrap'
                    + ' gap-2'
                }">
                    ${idea
                        .parsedAlignments()
                        .map((
                            alignment:
                                string,
                        ) => html`
                    <span class="${
                        'badge'
                        + ' badge-primary'
                        + ' text-xs'
                    }">${
                        alignment
                    }</span>`)}
                </div>
            </div>`;
    }

    #buildApprovalFooter(): SafeHtml {
        return html`
        <div class="action-footer">
            <div class="${
                'action-footer-inner'
            }">
                <div class="flex items-center
                    justify-between gap-4">
                    <button
                        class="${
                            'btn btn-outline'
                            + ' gap-2'
                        }"
                        id="${
                            'approval-clarify'
                            + '-btn'
                        }">
                        ${iconMessageSquare(
                            16, '',
                        )}
                        <span class="${
                            'hidden-mobile'
                        }">
                            ${'Request'
                                + ' Clarification'}
                        </span>
                        <span
                            class="${
                                'visible-'
                                + 'mobile'
                            }">
                            Clarify
                        </span>
                    </button>
                    <div class="flex gap-3">
                        <button
                            class="${
                                'btn'
                                + ' btn-outline'
                                + '-error gap-2'
                            }"
                            id="${
                                'approval-'
                                + 'reject'
                                + '-btn'
                            }">
                            ${iconXCircle(
                                16, '',
                            )}
                            <span
                                class="${
                                    'hidden-'
                                    + 'mobile'
                                }">
                                Send Back
                            </span>
                            <span
                                class="${
                                    'visible-'
                                    + 'mobile'
                                }">
                                Reject
                            </span>
                        </button>
                        <button
                            class="${
                                'btn'
                                + ' btn-success'
                                + ' gap-2'
                            }"
                            id=${'approval'
                                + '-approve'
                                + '-btn'}>
                            ${iconCheckCircle(
                                16, '',
                            )}
                            Approve
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    }

    #buildApprovalDialogs(): SafeHtml {
        return html`
        <div
            id="${
                'approval-reject'
                + '-backdrop'
            }"
            class="${
                'dialog-backdrop hidden'
            }">
        </div>
        <div
            id="${
                'approval-reject-dialog'
            }"
            class="dialog hidden"
            role="dialog"
            aria-modal="true"
            style="max-width:28rem">
            <div class="dialog-header">
                <h3 class="dialog-title">
                    ${'Send Back for'
                        + ' Revision'}
                </h3>
                <p class="${
                    'dialog-description'
                }">
                    ${'Provide feedback'
                        + ' to help the'
                        + ' submitter'
                        + ' improve'
                        + ' their idea.'}
                </p>
            </div>
            <div class="py-4">
                <textarea
                    class="${
                        'textarea'
                        + ' resize-none'
                    }"
                    id=${'approval'
                        + '-reject'
                        + '-feedback'}
                    placeholder=${
                        'Explain what'
                        + ' changes or'
                        + ' additional'
                        + ' information'
                        + ' is'
                        + ' needed...'
                    }
                    rows="4">
                </textarea>
            </div>
            <div class="dialog-footer">
                <button
                    class="${
                        'btn btn-outline'
                    }"
                    id="${
                        'approval-reject'
                        + '-cancel'
                    }">
                    Cancel
                </button>
                <button
                    class="btn btn-error"
                    id="${
                        'approval-reject'
                        + '-confirm'
                    }">
                    Send Back
                </button>
            </div>
        </div>

        <div
            id="${
                'approval-clarify'
                + '-backdrop'
            }"
            class="${
                'dialog-backdrop hidden'
            }">
        </div>
        <div
            id="${
                'approval-clarify'
                + '-dialog'
            }"
            class="dialog hidden"
            role="dialog"
            aria-modal="true"
            style="max-width:28rem">
            <div class="dialog-header">
                <h3 class="dialog-title">
                    ${'Request'
                        + ' Clarification'}
                </h3>
                <p class="${
                    'dialog-description'
                }">
                    ${'Ask the submitter'
                        + ' for additional'
                        + ' details before'
                        + ' making a'
                        + ' decision.'}
                </p>
            </div>
            <div class="py-4">
                <textarea
                    class="${
                        'textarea'
                        + ' resize-none'
                    }"
                    id=${'approval'
                        + '-clarify'
                        + '-feedback'}
                    placeholder=${
                        'What additional'
                        + ' information'
                        + ' do you'
                        + ' need?'
                    }
                    rows="4">
                </textarea>
            </div>
            <div class="dialog-footer">
                <button
                    class="${
                        'btn btn-outline'
                    }"
                    id="${
                        'approval-clarify'
                        + '-cancel'
                    }">
                    Cancel
                </button>
                <button
                    class="${
                        'btn btn-primary'
                    }"
                    id=${'approval'
                        + '-clarify'
                        + '-confirm'}>
                    Send Request
                </button>
            </div>
        </div>`;
    }
}
