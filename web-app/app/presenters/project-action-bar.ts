import { html, type SafeHtml } from '../safe-html.ts';
import type {
    Id, ObjectiveId, ProjectState,
} from '../../../api/types.ts';
import type {
    ProjectProblem,
} from '../adapters/project-publish.ts';
import type {
    ValidationResult,
} from '../adapters/validation.ts';

type Check = ValidationResult<ProjectProblem>;
type ObjectiveNames = ReadonlyMap<
    ObjectiveId, string
>;

export class ProjectActionBarPresenter {
    readonly #projectId: Id;
    readonly #state: ProjectState;
    readonly #approvalCheck: Check;
    readonly #archivalCheck: Check;
    readonly #objectiveNames: ObjectiveNames;

    constructor(
        projectId: Id,
        state: ProjectState,
        approvalCheck: Check,
        archivalCheck: Check,
        objectiveNames: ObjectiveNames = new Map(),
    ) {
        this.#projectId = projectId;
        this.#state = state;
        this.#approvalCheck = approvalCheck;
        this.#archivalCheck = archivalCheck;
        this.#objectiveNames = objectiveNames;
    }

    buildBar(): SafeHtml {
        const state = this.#state;
        const isReview = state === 'submitted'
            || state === 'under-review'
            || state === 'sent-back';

        return html`
            <div class="action-bar"
                data-project-id="${this.#projectId}">
                ${isReview
                    ? this.#reviewActions()
                    : html``}
                ${state === 'approved'
                    ? this.#approvedActions()
                    : html``}
                ${state === 'approved'
                    || state === 'archived'
                    ? html`<button
                        data-action="view-history">
                        View history
                      </button>`
                    : html``}
            </div>
        `;
    }

    #namesFor(
        problems: ProjectProblem[],
    ): string {
        return problems
            .map(p => this.#objectiveNames.get(
                p.objectiveId,
            ) ?? p.objectiveId)
            .join(', ');
    }

    #reviewActions(): SafeHtml {
        const check = this.#approvalCheck;
        const tooltip = check.ready
            ? ''
            : this.#namesFor(check.problems)
                + ' unscored';
        return html`
            <button data-action="approve" ${
                check.ready ? '' : 'disabled'
            } title="${tooltip}">
                Approve
            </button>
            <button data-action="decline">
                Decline
            </button>
            <button data-action="send-back">
                Send back
            </button>
        `;
    }

    #approvedActions(): SafeHtml {
        const check = this.#archivalCheck;
        const tooltip = check.ready
            ? ''
            : this.#namesFor(check.problems)
                + ' lack actual measurements';
        const caption = check.ready
            ? html``
            : html`<small
                class="action-bar-caption"
                data-tone="muted"
              >${this.#namesFor(check.problems)
                  + ' lack actual measurements'
                  + ' before archival'}</small>`;
        return html`
            <button data-action="archive" ${
                check.ready ? '' : 'disabled'
            } title="${tooltip}">
                Archive
            </button>
            ${caption}
        `;
    }
}
