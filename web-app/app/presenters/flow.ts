import { html, SafeHtml } from '../safe-html';
import {
    iconCircle,
    iconShare,
    iconChevronRight,
    iconFolderKanban,
} from '../icons';
import type {
    FlowSummary,
} from '../adapters/flows';

export class FlowPresenter {
    readonly #flow: FlowSummary;

    constructor(wf: FlowSummary) {
        this.#flow = wf;
    }

    buildCard(): SafeHtml {
        return html`
    <div class="card card-hover p-4"
        style="cursor:pointer"
        data-flow-card="${this.#flow.id}">
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
                    ${this.#flow.projectName
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
                            this.#flow.projectName
                        }</span>`
                        : html``}
                </div>
                <h3 class="${
                    'font-semibold mb-1'
                }">${this.#flow.name}</h3>
                <p class="${
                    'text-sm'
                    + ' text-muted mb-2'
                    + ' truncate'
                }">${
                    this.#flow.description
                }</p>
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
                        this.#flow.nodeCount
                    } ${
                        this.#flow.nodeCount === 1
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
                        this.#flow.edgeCount
                    } ${
                        this.#flow.edgeCount === 1
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
