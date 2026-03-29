import { html, SafeHtml } from '../safe-html';
import {
    iconCircle,
    iconShare,
    iconChevronRight,
    iconFolderKanban,
} from '../icons';
import type {
    WorkflowSummary,
} from '../adapters/workflows';

export class WorkflowPresenter {
    readonly #wf: WorkflowSummary;

    constructor(wf: WorkflowSummary) {
        this.#wf = wf;
    }

    buildCard(): SafeHtml {
        const wf = this.#wf;
        return html`
    <div class="card card-hover p-4"
        style="cursor:pointer"
        data-workflow-card="${wf.id}">
        <div class="${
            'flex items-start '
            + 'justify-between gap-4'
        }">
            <div style="${
                'flex:1;min-width:0'
            }">
                <div class="${
                    'flex flex-wrap '
                    + 'items-center'
                    + ' gap-2 mb-2'
                }">
                    ${wf.projectName
                        ? html`<span
                            class="${
                                'badge'
                                + ' badge-outline'
                                + ' text-xs'
                            }">${
                            iconFolderKanban(
                                12, '',
                            )
                        } ${
                            wf.projectName
                        }</span>`
                        : html``}
                </div>
                <h3 class="${
                    'font-semibold mb-1'
                }">${wf.name}</h3>
                <p class="${
                    'text-sm'
                    + ' text-muted mb-2'
                    + ' truncate'
                }">${wf.description}</p>
                <div class="${
                    'flex flex-wrap '
                    + 'items-center'
                    + ' gap-3 '
                    + 'text-sm'
                    + ' text-muted'
                }">
                    <span class="${
                        'flex'
                        + ' items-center'
                        + ' gap-1'
                    }">${
                        iconCircle(14, '')
                    } ${
                        wf.nodeCount
                    } ${
                        wf.nodeCount === 1
                            ? 'state'
                            : 'states'
                    }</span>
                    <span class="${
                        'flex'
                        + ' items-center'
                        + ' gap-1'
                    }">${
                        iconShare(14, '')
                    } ${
                        wf.edgeCount
                    } ${
                        wf.edgeCount === 1
                            ? 'transition'
                            : 'transitions'
                    }</span>
                </div>
            </div>
            <div class="${
                'flex items-center'
            }">${
                iconChevronRight(
                    20,
                    'text-muted',
                )
            }</div>
        </div>
    </div>`;
    }
}
