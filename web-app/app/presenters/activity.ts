import { html, SafeHtml } from '../safe-html';
import { formatDate, displayText } from '../core';
import {
    iconLightbulb,
    iconFolderKanban,
    iconUserPlus,
    iconEdit,
    iconArrowRight,
} from '../icons';
import type { Activity } from '../adapters';

type ActivityType =
    | 'idea_created'
    | 'project_created'
    | 'user_joined'
    | 'status_changed'
    | 'idea_converted';

type IconEntry = {
    icon: (
        size: number,
        cssClass: string,
    ) => SafeHtml;
    bg: string;
};

const ICON_MAP: Record<
    ActivityType,
    IconEntry
> = {
    idea_created: {
        icon: iconLightbulb,
        bg: 'background:'
            + 'hsl(var(--warning-soft));'
            + 'color:'
            + 'hsl(var(--warning-text))',
    },
    project_created: {
        icon: iconFolderKanban,
        bg: 'background:'
            + 'hsl(var(--primary) / 0.1);'
            + 'color:'
            + 'hsl(var(--primary))',
    },
    user_joined: {
        icon: iconUserPlus,
        bg: 'background:'
            + 'hsl(var(--info-soft));'
            + 'color:'
            + 'hsl(var(--info-text))',
    },
    status_changed: {
        icon: iconEdit,
        bg: 'background:'
            + 'hsl(var(--warning-soft));'
            + 'color:'
            + 'hsl(var(--warning-text))',
    },
    idea_converted: {
        icon: iconArrowRight,
        bg: 'background:'
            + 'hsl(var(--success-soft));'
            + 'color:'
            + 'hsl(var(--success-text))',
    },
};

export class ActivityPresenter {
    readonly #activity: Activity;

    constructor(activity: Activity) {
        this.#activity = activity;
    }

    matchesFilter(
        query: string,
        types:
            readonly string[]
            | undefined,
    ): boolean {
        if (query
            && !this.#activity
                .matchesActor(query)
            && !this.#activity
                .matchesTarget(query))
            return false;
        if (types
            && !types.some(
                t => this.#activity
                    .hasType(t),
            ))
            return false;
        return true;
    }

    buildActivity(): SafeHtml {
        const meta =
            this.#activity.hasStatus()
                ? html`<div
                    class="${
                        'badge badge-default'
                        + ' text-xs mt-1'
                    }">${
                    this.#activity
                        .statusText()
                }</div>`
                : this.#activity
                    .hasComment()
                    ? html`<p
                        class="${
                            'text-sm'
                            + ' text-muted'
                            + ' mt-1'
                        }"
                        style="${
                            'font-style'
                            + ':italic'
                        }"
                        >"${
                        this.#activity
                            .commentText()
                    }"</p>`
                    : html``;
        return html`
    <div class="flex items-start gap-4
        p-4 rounded-lg activity-row">
        ${this.#buildIcon()}
        <div style="flex:1;min-width:0">
            <p class="text-sm">
                <span class="${
                    'font-medium'
                }">${
                    displayText(
                        this.#activity
                            .actorName(),
                    )
                }</span>
                <span class="${
                    'text-muted'
                }"> ${
                    this.#activity
                        .actionText()
                } </span>
                <span class="${
                    'font-medium'
                }">${
                    this.#activity
                        .targetText()
                }</span>
            </p>
            ${meta}
            <p class="${
                'text-xs text-muted mt-1'
            }">${
                formatDate(
                    this.#activity
                        .timestampValue(),
                )
            }</p>
        </div>
    </div>`;
    }

    #buildIcon(): SafeHtml {
        const actType = this.#activity
            .typeValue() as ActivityType;
        const entry =
            ICON_MAP[actType]
            ?? ICON_MAP.idea_created;
        return html`<div style="${
            'width:2.5rem;'
            + 'height:2.5rem;'
            + 'border-radius:'
            + 'var(--radius-lg);'
            + 'display:flex;'
            + 'align-items:center;'
            + 'justify-content:center;'
            + 'flex-shrink:0;'
            + entry.bg
        }">${
            entry.icon(20, '')
        }</div>`;
    }
}
