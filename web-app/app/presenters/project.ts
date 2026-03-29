import { html, SafeHtml } from '../safe-html';
import { displayText } from '../core';
import {
    iconClock,
    iconDollarSign,
    iconTrendingUp,
    iconTarget,
    iconEye,
    iconGripVertical,
    iconCheckCircle2,
    iconAlertCircle,
    iconXCircle,
} from '../icons';
import {
    type Project,
    type ProjectStatus,
    PROJECT_STATUS_CONFIG,
} from '../../../api/types';

const STATUS_ICONS: Record<
    ProjectStatus,
    (
        size: number,
        cssClass: string,
    ) => SafeHtml
> = {
    'submitted': iconClock,
    'under-review': iconAlertCircle,
    'sent-back': iconXCircle,
    'approved': iconCheckCircle2,
    'declined': iconXCircle,
    'completed': iconCheckCircle2,
    'deleted': iconXCircle,
};

export class ProjectPresenter {
    readonly #project: Project;

    constructor(project: Project) {
        this.#project = project;
    }

    idForLink(): string {
        return this.#project.id;
    }

    prioritySortKey(): number {
        return this.#project.priority;
    }

    scoreSortKey(): number {
        return this.#project.priorityScore;
    }

    statusGroup(): ProjectStatus {
        return this.#project.status;
    }

    buildStatusBadge(): SafeHtml {
        const cfg = PROJECT_STATUS_CONFIG[
            this.#project.status
        ]!;
        const icon = STATUS_ICONS[
            this.#project.status
        ]!;
        return html`<span class="${
            'badge '
            + cfg.className
            + ' text-xs'
        }">${
            icon(14, '')
        } ${cfg.label}</span>`;
    }

    buildCard(view: string): SafeHtml {
        const statusIcon = STATUS_ICONS[
            this.#project.status
        ]!;
        const metricBoxStyle =
            'width:2rem;height:2rem;'
            + 'border-radius:0.5rem;'
            + 'background:'
            + 'hsl(var(--primary)/0.1);'
            + 'display:flex;'
            + 'align-items:center;'
            + 'justify-content:center';
        return html`
    <div class="card card-hover"
        style="padding:1.25rem"
        data-project-card="${
            this.#project.id
        }">
        <div class="${
            'flex items-start gap-4'
        }">
            <div class="${
                'hidden-mobile text-muted'
            }" style="${
                'margin-top:0.25rem;'
                + 'cursor:grab'
            }">${
                iconGripVertical(20, '')
            }</div>
            <div style="flex:1;min-width:0">
                <div class="${
                    'flex items-start '
                    + 'justify-between'
                    + ' gap-4 mb-3'
                }">
                    <div style="${
                        'flex:1;min-width:0'
                    }">
                        <div class="${
                            'flex flex-wrap '
                            + 'items-center'
                            + ' gap-2 mb-1'
                        }">
                            <h3 class="${
                                'font-display '
                                + 'font-semibold'
                            }" style="${
                                'white-space:'
                                + 'nowrap;'
                                + 'overflow:'
                                + 'hidden;'
                                + 'text-overflow'
                                + ':ellipsis'
                            }">${
                                this.#project
                                    .title
                            }</h3>
                            <span class="${
                                'badge '
                                + this.#project
                                    .statusClassName()
                                + ' text-xs'
                            }">${
                                statusIcon(
                                    14, '',
                                )
                            } ${
                                this.#project
                                    .statusLabel()
                            }</span>
                        </div>
                        ${view === 'priority'
                            ? html`<span
                                class="${
                                    'text-xs'
                                    + ' text-muted'
                                }">Priority #${
                                    this.#project
                                        .priority
                                }</span>`
                            : html``}
                    </div>
                    ${this.#buildProgressRing()}
                </div>
                <div class="${
                    'flex items-end '
                    + 'justify-between gap-4'
                }">
                    ${this.#buildMetrics(
                        metricBoxStyle,
                    )}
                    <button class="${
                        'btn btn-outline '
                        + 'btn-sm gap-2'
                    }" data-view-project="${
                        this.#project.id
                    }">${
                        iconEye(16, '')
                    } <span class="${
                        'hidden-mobile'
                    }">View Details</span
                    ></button>
                </div>
            </div>
        </div>
    </div>`;
    }

    #buildProgressRing(): SafeHtml {
        const percent =
            this.#project.progress;
        const radius = 20;
        const center = 24;
        const circumference =
            2 * Math.PI * radius;
        return html`
    <div style="${
        'position:relative;'
        + 'width:3rem;height:3rem'
    }">
        <svg width="48" height="48"
            style="${
                'transform:rotate(-90deg)'
            }">
            <circle
                cx="${center}"
                cy="${center}"
                r="${radius}"
                stroke="${
                    'hsl(var(--muted))'
                }"
                stroke-width="4"
                fill="none"/>
            <circle
                cx="${center}"
                cy="${center}"
                r="${radius}"
                stroke="${
                    'hsl(var(--primary))'
                }"
                stroke-width="4"
                fill="none"
                stroke-dasharray="${
                    percent
                    * circumference / 100
                } ${circumference}"/>
        </svg>
        <span style="${
            'position:absolute;inset:0;'
            + 'display:flex;'
            + 'align-items:center;'
            + 'justify-content:center;'
            + 'font-size:0.625rem;'
            + 'font-weight:700'
        }">${percent}%</span>
    </div>`;
    }

    #buildMetrics(
        boxStyle: string,
    ): SafeHtml {
        const p = this.#project;
        const cost = p.actualCost;
        const impact =
            p.actualImpact
            || p.estimatedImpact;
        return html`
    <div class="${
        'project-metrics-grid'
    }" style="flex:1">
        <div class="${
            'flex items-center gap-2'
        }">
            <div style="${boxStyle}">${
                iconClock(16, 'text-primary')
            }</div>
            <div>
                <p class="${
                    'text-xs text-muted'
                }">Time</p>
                <p class="${
                    'text-sm font-medium'
                }">${
                    p.estimatedDuration
                    ? html`${
                        p.actualDurationDays()
                    }d <span class="${
                        'text-xs text-muted'
                    }">/ ${
                        p.estimatedDurationDays()
                    }d</span>`
                    : html`&mdash;`
                }</p>
            </div>
        </div>
        <div class="${
            'flex items-center gap-2'
        }">
            <div style="${boxStyle}">${
                iconDollarSign(
                    16, 'text-primary',
                )
            }</div>
            <div>
                <p class="${
                    'text-xs text-muted'
                }">Cost</p>
                <p class="${
                    'text-sm font-medium'
                }">${
                    cost
                    ? '$'
                        + (cost / 1000)
                            .toFixed(0)
                        + 'k'
                    : '\u2014'
                }</p>
            </div>
        </div>
        <div class="${
            'flex items-center gap-2'
        }">
            <div style="${boxStyle}">${
                iconTrendingUp(
                    16, 'text-primary',
                )
            }</div>
            <div>
                <p class="${
                    'text-xs text-muted'
                }">Impact</p>
                <p class="${
                    'text-sm font-medium'
                }">${
                    displayText(
                        impact
                            ? String(impact)
                            : '',
                    )
                }</p>
            </div>
        </div>
        <div class="${
            'flex items-center gap-2'
        }">
            <div style="${boxStyle}">${
                iconTarget(
                    16, 'text-primary',
                )
            }</div>
            <div>
                <p class="${
                    'text-xs text-muted'
                }">Score</p>
                <p class="${
                    'text-sm font-medium'
                }">${
                    p.priorityScore
                }</p>
            </div>
        </div>
    </div>`;
    }
}
