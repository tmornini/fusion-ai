import { html, SafeHtml } from '../safe-html';
import {
    iconClock,
    iconDollarSign,
    iconTrendingUp,
    iconAlertCircle,
    iconArrowRight,
    iconArrowLeft,
    iconTarget,
    iconRocket,
    iconCalendar,
    iconUsers,
    iconFolderKanban,
} from '../icons';
import type {
    Idea,
} from '../../../api/types';
import {
    User,
} from '../../../api/types';

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

export class IdeaConversionPresenter {
    readonly #idea: Idea;

    constructor(idea: Idea) {
        this.#idea = idea;
    }

    #buildLeadOptions(
        users: User[],
        selectedId: string,
    ): SafeHtml[] {
        return users
            .filter(u => u.isActive())
            .map(u => html`<option
                value="${u.id}" ${
                    u.id === selectedId
                        ? 'selected'
                        : ''
                }>${u.fullName()} -
                ${u.role}</option>`);
    }

    buildConversionPage(
        estimatedDuration: string,
        estimatedCost: string,
        users: User[],
        form: ConversionFormState,
    ): SafeHtml {
        const percent =
            (form.completedCount
                / form.requiredCount)
            * 100;
        const leadVal =
            form.projectDetails[
                'project-lead'
            ];

        return html`
        <div class="${
            'flex items-center'
            + ' justify-between'
            + ' gap-4 mb-6'
        }">
            <div class="${
                'flex items-center'
                + ' gap-4'
            }">
                <button
                    class="${
                        'btn btn-ghost'
                        + ' btn-icon'
                    }"
                    id=${'convert'
                        + '-back-to'
                        + '-ideas'}>
                    ${iconArrowLeft(20, '')}
                </button>
                <div class="flex
                    items-center gap-3">
                    <div
                        class="${
                            'gradient-hero'
                            + ' rounded-lg'
                            + ' flex'
                            + ' items-center'
                            + ' justify-'
                            + 'center'
                        }"
                        style=${'width:'
                            + '2.25rem;'
                            + 'height:'
                            + '2.25rem;'
                            + 'color:'
                            + 'hsl(var('
                            + '--primary'
                            + '-foreground'
                            + '))'}>
                        ${iconRocket(20, '')}
                    </div>
                    <span class="${
                        'text-xl'
                        + ' font-display'
                        + ' font-bold'
                    }">
                        ${'Convert to'
                            + ' Project'}
                    </span>
                </div>
            </div>
            <div class="${
                'hidden-mobile'
                + ' flex items-center'
                + ' gap-2'
                + ' text-sm'
            }">
                <span class="${
                    'text-muted'
                }">${
                    form.completedCount
                }/${
                    form.requiredCount
                } required fields${
                    ''
                }</span>
                <div style=${'width:'
                    + '6rem;'
                    + 'height:0.5rem;'
                    + 'background:'
                    + 'hsl(var(--muted)'
                    + ');'
                    + 'border-radius:'
                    + '9999px;'
                    + 'overflow:'
                    + 'hidden'}>
                    <div style=${
                        'height:100%;'
                        + 'background:'
                        + 'hsl(var('
                        + '--success));'
                        + 'transition:'
                        + 'width 0.3s;'
                        + 'width:'
                        + percent
                        + '%'
                    }></div>
                </div>
            </div>
        </div>
            <div class="convert-grid"
                style=${'grid-template-'
                    + 'columns:'
                    + '2fr 3fr;gap:2rem'}>
                ${this
                    .#buildConvSummary(
                    estimatedDuration,
                    estimatedCost,
                )}
                ${this
                    .#buildConvForm(
                    estimatedCost,
                    users,
                    leadVal,
                    form,
                )}
            </div>`;
    }

    #buildConvSummary(
        estimatedDuration: string,
        estimatedCost: string,
    ): SafeHtml {
        const idea = this.#idea;
        return html`
            <div>
                <div class="card p-6"
                    style=${'position:'
                        + 'sticky;'
                        + 'top:6rem'}>
                    <div class="${
                        'flex items-center'
                        + ' gap-2 text-sm'
                        + ' font-medium'
                        + ' text-muted'
                        + ' mb-4'
                    }">
                        ${iconFolderKanban(
                            16, '',
                        )}
                        Idea Summary
                    </div>
                    <h2 class="${
                        'text-xl'
                        + ' font-display'
                        + ' font-bold'
                        + ' mb-4'
                    }">${
                        idea.title
                    }</h2>
                    <div style=${
                        'display:flex;'
                        + 'flex-direction:'
                        + 'column;'
                        + 'gap:1rem;'
                        + 'margin-bottom:'
                        + '1.5rem'
                    }>
                        <div>
                            <h4 class="${
                                'text-sm'
                                + ' font-medium'
                                + ' text-muted'
                                + ' mb-1'
                            }">
                                Problem
                            </h4>
                            <p class="${
                                'text-sm'
                            }">${
                                idea
                                .problemStatement
                            }</p>
                        </div>
                        <div>
                            <h4 class="${
                                'text-sm'
                                + ' font-medium'
                                + ' text-muted'
                                + ' mb-1'
                            }">
                                Solution
                            </h4>
                            <p class="${
                                'text-sm'
                            }">${
                                idea
                                .proposedSolution
                            }</p>
                        </div>
                        <div>
                            <h4 class="${
                                'text-sm'
                                + ' font-medium'
                                + ' text-muted'
                                + ' mb-1'
                            }">
                                ${'Expected'
                                    + ' Outcome'}
                            </h4>
                            <p class="${
                                'text-sm'
                            }">${
                                idea
                                .expectedOutcome
                            }</p>
                        </div>
                    </div>
                    <div style=${
                        'border-top:'
                        + '1px solid'
                        + ' hsl(var('
                        + '--border));'
                        + 'padding-top:'
                        + '1rem;'
                        + 'display:flex;'
                        + 'flex-direction:'
                        + 'column;'
                        + 'gap:0.75rem'
                    }>
                        <div class="flex
                            items-center
                            justify-between">
                            <span class="${
                                'flex'
                                + ' items-center'
                                + ' gap-2'
                                + ' text-muted'
                            }">
                                ${iconClock(
                                    16, '',
                                )}
                                <span class="${
                                    'text-sm'
                                }">
                                    Est. Time
                                </span>
                            </span>
                            <span
                                class="${
                                    'font-medium'
                                }">${
                                estimatedDuration
                            }</span>
                        </div>
                        <div class="flex
                            items-center
                            justify-between">
                            <span class="${
                                'flex'
                                + ' items-center'
                                + ' gap-2'
                                + ' text-muted'
                            }">
                                ${iconDollarSign(
                                    16, '',
                                )}
                                <span class="${
                                    'text-sm'
                                }">
                                    Est. Cost
                                </span>
                            </span>
                            <span
                                class="${
                                    'font-medium'
                                }">${
                                estimatedCost
                            }</span>
                        </div>
                        <div class="flex
                            items-center
                            justify-between">
                            <span class="${
                                'flex'
                                + ' items-center'
                                + ' gap-2'
                                + ' text-muted'
                            }">
                                ${iconTrendingUp(
                                    16, '',
                                )}
                                <span class="${
                                    'text-sm'
                                }">
                                    ${'Priority'
                                        + ' Score'}
                                </span>
                            </span>
                            <span
                                class="${
                                    'font-bold'
                                }"
                                style=${
                                    'color:'
                                    + 'hsl(var('
                                    + '--success'
                                    + '))'
                                }>
                                ${idea.score
                                }/100
                            </span>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    #buildConvForm(
        estimatedCost: string,
        users: User[],
        leadVal: string,
        form: ConversionFormState,
    ): SafeHtml {
        return html`
            <div style=${'display:flex;'
                + 'flex-direction:column;'
                + 'gap:1.5rem'}>
                ${this.#buildConvRequired(
                    estimatedCost,
                    users,
                    leadVal,
                    form,
                )}
                ${this.#buildConvOptional(
                    form,
                )}
                ${this.#buildConvConfirm(
                    form,
                )}
            </div>`;
    }

    #buildConvRequired(
        estimatedCost: string,
        users: User[],
        leadVal: string,
        form: ConversionFormState,
    ): SafeHtml {
        return html`
            <div class="card p-6">
                <div class="flex
                    items-center
                    gap-2 mb-6">
                    ${iconAlertCircle(
                        20,
                        'text-warning',
                    )}
                    <span class="${
                        'font-medium'
                    }">
                        ${'Complete these'
                            + ' details'
                            + ' to create'
                            + ' a project'}
                    </span>
                </div>
                <div style=${
                    'display:flex;'
                    + 'flex-direction:'
                    + 'column;'
                    + 'gap:1.5rem'
                }>
                    <div>
                        <label class="${
                            'label mb-2'
                            + ' font-medium'
                            + ' flex'
                            + ' items-center'
                            + ' gap-2'
                        }">
                            Project Name
                            ${form
                            .fieldChecks[
                            'project-name'
                            ]}
                        </label>
                        <input
                            class="input"
                            id=${
                            'convert-project-name'
                            }
                            value="${
                                form
                                .projectDetails[
                                'project-name'
                                ]
                            }"
                            placeholder=${
                                'Give your'
                                + ' project'
                                + ' a clear'
                                + ' name'
                            }
                        />
                    </div>
                    <div>
                        <label class="${
                            'label mb-2'
                            + ' font-medium'
                            + ' flex'
                            + ' items-center'
                            + ' gap-2'
                        }">
                            Project Lead
                            ${form
                            .fieldChecks[
                            'project-lead'
                            ]}
                        </label>
                        <select
                            class="input"
                            id=${
                            'convert-project-lead'
                            }>
                            <option
                                value="">
                                ${'Who will'
                                    + ' own'
                                    + ' this'
                                    + ' project?'}
                            </option>
                            ${this
                            .#buildLeadOptions(
                                users,
                                leadVal,
                            )}
                        </select>
                    </div>
                    <div style=${
                        'display:grid;'
                        + 'grid-template-'
                        + 'columns:'
                        + '1fr 1fr;'
                        + 'gap:1rem'
                    }>
                        <div>
                            <label class="${
                                'label mb-2'
                                + ' font-medium'
                                + ' flex'
                                + ' items-center'
                                + ' gap-2'
                            }">
                                ${iconCalendar(
                                    16,
                                    'text-muted',
                                )}
                                Start Date
                                ${form
                                .fieldChecks[
                                'start-date'
                                ]}
                            </label>
                            <input
                                class="input"
                                type="date"
                                id=${
                                'convert-start-date'
                                }
                                value="${
                                    form
                                    .projectDetails[
                                    'start-date'
                                    ]
                                }" />
                        </div>
                        <div>
                            <label class="${
                                'label mb-2'
                                + ' font-medium'
                                + ' flex'
                                + ' items-center'
                                + ' gap-2'
                            }">
                                ${iconTarget(
                                    16,
                                    'text-muted',
                                )}
                                ${'Target End'
                                    + ' Date'}
                                ${form
                                .fieldChecks[
                                'target-end-date'
                                ]}
                            </label>
                            <input
                                class="input"
                                type="date"
                                id=${
                                'convert-target-end-date'
                                }
                                value="${
                                    form
                                    .projectDetails[
                                    'target-end-date'
                                    ]
                                }" />
                        </div>
                    </div>
                    <div>
                        <label class="${
                            'label mb-2'
                            + ' font-medium'
                            + ' flex'
                            + ' items-center'
                            + ' gap-2'
                        }">
                            ${iconDollarSign(
                                16,
                                'text-muted',
                            )}
                            ${'Allocated'
                                + ' Budget'}
                            ${form
                            .fieldChecks[
                            'budget'
                            ]}
                        </label>
                        <select
                            class="input"
                            id="${
                                'convert'
                                + '-budget'
                            }">
                            <option
                                value="">
                                ${'Select'
                                    + ' budget'
                                    + ' range'}
                            </option>
                            <option
                                value="0-25k">
                                ${'Under'
                                    + ' $25,000'}
                            </option>
                            <option
                                value="25-50k">
                                ${'$25,000'
                                    + ' - $50,'
                                    + '000'}
                            </option>
                            <option
                                value="50-100k">
                                ${'$50,000'
                                    + ' - $100,'
                                    + '000'}
                            </option>
                            <option
                                value="${
                                    '100-250k'
                                }">
                                ${'$100,000'
                                    + ' - $250,'
                                    + '000'}
                            </option>
                            <option
                                value="250k+">
                                $250,000+
                            </option>
                        </select>
                        <p class="${
                            'text-xs'
                            + ' text-muted'
                            + ' mt-1'
                        }">
                            AI estimate:
                            ${estimatedCost}
                        </p>
                    </div>
                    <div>
                        <label class="${
                            'label mb-2'
                            + ' font-medium'
                            + ' flex'
                            + ' items-center'
                            + ' gap-2'
                        }">
                            Priority Level
                            ${form
                            .fieldChecks[
                            'priority'
                            ]}
                        </label>
                        <select
                            class="input"
                            id="${
                                'convert'
                                + '-priority'
                            }">
                            <option value="">
                                ${'How urgent'
                                    + ' is this'
                                    + ' project?'}
                            </option>
                            <option
                                value="${
                                    'critical'
                                }">
                                ${'Critical'
                                    + ' - Must'
                                    + ' start'
                                    + ' immediately'}
                            </option>
                            <option
                                value="high">
                                ${'High'
                                    + ' - Start'
                                    + ' within'
                                    + ' 2 weeks'}
                            </option>
                            <option
                                value="medium">
                                ${'Medium'
                                    + ' - Start'
                                    + ' within'
                                    + ' 1 month'}
                            </option>
                            <option
                                value="low">
                                ${'Low - Can'
                                    + ' wait for'
                                    + ' capacity'}
                            </option>
                        </select>
                    </div>
                </div>
            </div>`;
    }

    #buildConvOptional(
        form: ConversionFormState,
    ): SafeHtml {
        return html`
            <div class="card p-6">
                <div class="flex
                    items-center
                    gap-2 mb-6">
                    ${iconUsers(
                        20,
                        'text-primary',
                    )}
                    <span class="${
                        'font-medium'
                    }">
                        ${'Additional'
                            + ' Details'}
                    </span>
                    <span class="${
                        'text-xs'
                        + ' text-muted'
                    }">
                        (Optional)
                    </span>
                </div>
                <div style=${
                    'display:flex;'
                    + 'flex-direction:'
                    + 'column;'
                    + 'gap:1.5rem'
                }>
                    <div>
                        <label class="${
                            'label mb-2'
                            + ' font-medium'
                        }">
                            ${'First'
                                + ' Milestone'}
                        </label>
                        <input
                            class="input"
                            id=${'convert'
                                + '-first'
                                + '-milestone'}
                            placeholder=${
                                'e.g.,'
                                + ' Complete'
                                + ' data'
                                + ' pipeline'
                                + ' setup'
                            }
                            value="${
                                form
                                .projectDetails[
                                'first-milestone'
                                ]
                            }" />
                        <p class="${
                            'text-xs'
                            + ' text-muted'
                            + ' mt-1'
                        }">
                            ${'What is the'
                                + ' first'
                                + ' measurable'
                                + ' goal for'
                                + ' this'
                                + ' project?'}
                        </p>
                    </div>
                    <div>
                        <label class="${
                            'label mb-2'
                            + ' font-medium'
                        }">
                            ${'Success'
                                + ' Criteria'}
                        </label>
                        <textarea
                            class="textarea"
                            id=${'convert'
                                + '-success'
                                + '-criteria'}
                            placeholder=${
                                'How will you'
                                + ' know when'
                                + ' this'
                                + ' project is'
                                + ' complete'
                                + ' and'
                                + ' successful?'
                            }
                            rows="4"
                            style="${
                                'resize:none'
                            }">${
                            form
                            .projectDetails[
                            'success-criteria'
                            ]
                        }</textarea>
                    </div>
                </div>
            </div>`;
    }

    #buildConvConfirm(
        form: ConversionFormState,
    ): SafeHtml {
        const remaining =
            form.requiredCount
            - form.completedCount;
        return html`
            <div class="card p-6"
                id=${'convert'
                    + '-confirm'
                    + '-section'}
                style=${'border:'
                    + '2px solid '
                    + (form.isReady
                        ? 'hsl(var('
                            + '--success)'
                            + ' / 0.3)'
                        : 'transparent')
                    + ';'
                    + (form.isReady
                        ? 'background:'
                            + 'hsl(var('
                            + '--success)'
                            + ' / 0.05)'
                        : '')}>
                <div class="flex
                    items-start gap-4">
                    <div style=${
                        'width:3rem;'
                        + 'height:3rem;'
                        + 'border-radius:'
                        + '0.75rem;'
                        + 'display:flex;'
                        + 'align-items:'
                        + 'center;'
                        + 'justify-'
                        + 'content:'
                        + 'center;'
                        + (form.isReady
                            ? 'background:'
                                + 'hsl(var('
                                + '--success'
                                + '));'
                                + 'color:'
                                + 'hsl(var('
                                + '--success-'
                                + 'foreground'
                                + '))'
                            : 'background:'
                                + 'hsl(var('
                                + '--muted));'
                                + 'color:'
                                + 'hsl(var('
                                + '--muted-'
                                + 'foreground'
                                + '))')
                    }>
                        ${iconRocket(24, '')}
                    </div>
                    <div style="flex:1">
                        <h3
                            class="${
                                'font-semibold'
                                + ' mb-1'
                            }">
                            ${form.isReady
                                ? 'Ready to'
                                    + ' Create'
                                    + ' Project'
                                : 'Complete'
                                    + ' Required'
                                    + ' Fields'}
                        </h3>
                        <p class="${
                            'text-sm'
                            + ' text-muted'
                            + ' mb-4'
                        }">
                            ${form.isReady
                                ? 'All required'
                                    + ' info has'
                                    + ' been'
                                    + ' provided.'
                                    + ' Click'
                                    + ' below to'
                                    + ' create'
                                    + ' this'
                                    + ' project.'
                                : `${
                                    remaining
                                } required${
                                    ' '
                                }field${
                                    remaining > 1
                                        ? 's'
                                        : ''
                                } remaining`}
                        </p>
                        <div class="${
                            'flex gap-3'
                        }">
                            <button
                                class="${
                                    'btn'
                                    + ' btn-ghost'
                                }"
                                id=${
                                    'convert'
                                    + '-back'
                                    + '-to'
                                    + '-ideas-2'
                                }>
                                ${iconArrowLeft(
                                    16, '',
                                )}
                                ${'Back to'
                                    + ' Ideas'}
                            </button>
                            <button
                                class="${
                                    'btn'
                                    + ' btn-hero'
                                    + ' gap-2'
                                }"
                                id=${
                                    'convert'
                                    + '-submit'
                                    + '-btn'
                                }
                                ${form.isReady
                                    ? ''
                                    : 'disabled'
                                }>
                                ${'Create'
                                    + ' Project'}
                                ${iconArrowRight(
                                    16, '',
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;
    }
}
