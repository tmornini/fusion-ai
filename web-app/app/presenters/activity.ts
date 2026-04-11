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
            && !this.#activity.actor
                .toLowerCase()
                .includes(query)
            && !this.#activity.target
                .toLowerCase()
                .includes(query))
            return false;
        if (types
            && !types.includes(
                this.#activity.type,
            ))
            return false;
        return true;
    }

    buildActivity(): SafeHtml {
        const meta = this.#activity.status
                ? html`<div
                    class="${
                        'badge badge-default'
                        + ' text-xs mt-1'
                    }">${
                    this.#activity.status
                }</div>`
                : this.#activity.comment
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
                        this.#activity.comment
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
                        this.#activity.actor,
                    )
                }</span>
                <span class="${
                    'text-muted'
                }"> ${
                    this.#activity.action
                } </span>
                <span class="${
                    'font-medium'
                }">${
                    this.#activity.target
                }</span>
            </p>
            ${meta}
            <p class="${
                'text-xs text-muted mt-1'
            }">${
                formatDate(
                    this.#activity.timestamp,
                )
            }</p>
        </div>
    </div>`;
    }

    #buildIcon(): SafeHtml {
        const actType =
            this.#activity.type as ActivityType;
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
