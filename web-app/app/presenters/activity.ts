import { html, SafeHtml } from '../safe-html';
import { formatDate, displayText } from '../core';
import {
    iconLightbulb,
    iconStar,
    iconFolderKanban,
    iconCheckCircle2,
    iconMessageSquare,
    iconUserPlus,
    iconEdit,
    iconArrowRight,
} from '../icons';
import type { Activity } from '../../../api/types';

type ActivityType =
    | 'idea_created'
    | 'idea_scored'
    | 'project_created'
    | 'task_completed'
    | 'comment_added'
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
    idea_scored: {
        icon: iconStar,
        bg: 'background:'
            + 'hsl(var(--info-soft));'
            + 'color:'
            + 'hsl(var(--info-text))',
    },
    project_created: {
        icon: iconFolderKanban,
        bg: 'background:'
            + 'hsl(var(--primary) / 0.1);'
            + 'color:'
            + 'hsl(var(--primary))',
    },
    task_completed: {
        icon: iconCheckCircle2,
        bg: 'background:'
            + 'hsl(var(--success-soft));'
            + 'color:'
            + 'hsl(var(--success-text))',
    },
    comment_added: {
        icon: iconMessageSquare,
        bg: 'background:'
            + 'hsl(var(--info-soft));'
            + 'color:'
            + 'hsl(var(--info-text))',
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
        types: readonly string[] | undefined,
    ): boolean {
        const a = this.#activity;
        if (query
            && !a.actor
                .toLowerCase()
                .includes(query)
            && !a.target
                .toLowerCase()
                .includes(query))
            return false;
        if (types
            && !types.includes(a.type))
            return false;
        return true;
    }

    buildActivity(): SafeHtml {
        const a = this.#activity;
        const meta = a.score
            ? html`<div
                class="${
                    'badge badge-default'
                    + ' text-xs mt-1'
                }">${
                iconStar(12, '')
            } Score: ${a.score}</div>`
            : a.status
                ? html`<div
                    class="${
                        'badge badge-default'
                        + ' text-xs mt-1'
                    }">${a.status}</div>`
                : a.comment
                    ? html`<p
                        class="${
                            'text-sm text-muted'
                            + ' mt-1'
                        }"
                        style="${
                            'font-style:italic'
                        }"
                        >"${a.comment}"</p>`
                    : html``;
        return html`
    <div class="flex items-start gap-4
        p-4 rounded-lg activity-row">
        ${this.#buildIcon()}
        <div style="flex:1;min-width:0">
            <p class="text-sm">
                <span class="font-medium">${
                    displayText(a.actor)
                }</span>
                <span class="text-muted"> ${
                    a.action} </span>
                <span class="font-medium">${
                    a.target}</span>
            </p>
            ${meta}
            <p class="${
                'text-xs text-muted mt-1'
            }">${
                formatDate(a.timestamp)
            }</p>
        </div>
    </div>`;
    }

    #buildIcon(): SafeHtml {
        const t = this.#activity.type;
        const actType =
            t as ActivityType;
        const entry = ICON_MAP[actType]!;
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
        }">${entry.icon(20, '')}</div>`;
    }
}
