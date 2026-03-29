import { html, SafeHtml } from '../safe-html';
import { formatDate } from '../core';
import {
    iconCheckCircle2,
    iconAlertCircle,
    iconClock,
    iconChevronRight,
    iconTrendingUp,
    iconShield,
    iconBarChart,
    iconUser,
} from '../icons';
import type {
    EdgeListEntry,
} from '../../../api/types';

export class EdgePresenter {
    readonly #edge: EdgeListEntry;

    constructor(edge: EdgeListEntry) {
        this.#edge = edge;
    }

    isComplete(): boolean {
        return this.#edge.isComplete();
    }

    isDraft(): boolean {
        return this.#edge.isDraft();
    }

    isMissing(): boolean {
        return this.#edge.isMissing();
    }

    matchesFilter(
        search: string,
        status: string,
    ): boolean {
        const matchesSearch =
            this.#edge.matchesSearch(search);
        const matchesStatus =
            status === 'all'
            || this.#edge.status === status;
        return matchesSearch
            && matchesStatus;
    }

    buildCard(): SafeHtml {
        return html`
    <div class="card card-hover p-4"
        style="cursor:pointer"
        data-edge-card="${
            this.#edge.ideaId
        }">
        <div class="${
            'flex items-start '
            + 'justify-between gap-4'
        }">
            <div style="${
                'flex:1;min-width:0'
            }">
                ${this.#buildBadges()}
                <h3 class="${
                    'font-semibold mb-1'
                }">${
                    this.#edge.ideaTitle
                }</h3>
                ${this.#buildMeta()}
            </div>
            <div class="${
                'flex items-center'
            }">${
                iconChevronRight(
                    20, 'text-muted',
                )
            }</div>
        </div>
    </div>`;
    }

    #buildStatusIcon(): SafeHtml {
        if (this.#edge.isComplete())
            return iconCheckCircle2(12, '');
        if (this.#edge.isDraft())
            return iconClock(12, '');
        return iconAlertCircle(12, '');
    }

    #buildBadges(): SafeHtml {
        return html`
        <div class="${
            'flex flex-wrap '
            + 'items-center '
            + 'gap-2 mb-2'
        }">
            <span class="${
                'badge '
                + this.#edge
                    .statusClassName()
                + ' text-xs'
            }">${
                this.#buildStatusIcon()
            } ${
                this.#edge.statusLabel()
            }</span>
            <span
                class="${
                    'flex items-center'
                    + ' gap-1 text-xs '
                    + this.#edge
                        .confidenceClassName()
                }">${
                    iconShield(14, '')
                } ${
                    this.#edge
                        .confidenceLabel()
                } Confidence</span>
        </div>`;
    }

    #buildMeta(): SafeHtml {
        const e = this.#edge;
        return html`
        <div class="${
            'flex flex-wrap '
            + 'items-center gap-3 '
            + 'text-sm text-muted'
        }">
            ${e.owner
                ? html`<span
                    class="${
                        'flex '
                        + 'items-center'
                        + ' gap-1'
                    }">${
                    iconUser(14, '')
                } ${e.owner}</span>`
                : html``}
            ${!e.isMissing()
                ? html`<span
                    class="${
                        'flex '
                        + 'items-center'
                        + ' gap-1'
                    }">${
                    iconTrendingUp(14, '')
                } ${
                    e.outcomesCount
                } ${
                    e.outcomesCount === 1
                        ? 'outcome'
                        : 'outcomes'
                }</span><span
                    class="${
                        'flex '
                        + 'items-center'
                        + ' gap-1'
                    }">${
                    iconBarChart(14, '')
                } ${
                    e.metricsCount
                } ${
                    e.metricsCount === 1
                        ? 'metric'
                        : 'metrics'
                }</span>`
                : html``}
            ${e.updatedAt
                ? html`<span
                    class="text-xs"
                    >Updated ${
                    formatDate(
                        e.updatedAt,
                    )
                }</span>`
                : html``}
        </div>`;
    }
}
