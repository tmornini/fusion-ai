import {
    $, $select, attr,
} from '../app/dom';
import {
    html,
    setHtml,
} from '../app/safe-html';
import {
    buildSkeleton,
    withLoadingState,
} from '../app/loading-states';
import {
    iconGitBranch,
} from '../app/icons';
import {
    navigateTo,
    openDialog,
    closeDialog,
} from '../app/core';
import {
    getFlows,
    getProjects,
    importFlowFromMermaid,
    importFlowFromZip,
    parseZipBackup,
    resolveFlowBackup,
    overwriteFlow,
    createFlowFromBackup,
} from '../app/adapters';
import type {
    BackupV2,
    ImportResolution,
} from '../app/adapters';
import {
    FlowPresenter,
} from '../app/presenters';
import { showToast } from '../app/toast';

let pendingBackup:
    BackupV2 | null = null;
let pendingResolution:
    ImportResolution | null = null;

export async function init(
): Promise<void> {
    const listEl = $(
        '#flow-list', document,
    );
    if (!listEl) return;

    const result = await withLoadingState(
        listEl,
        buildSkeleton('card-list', 4),
        getFlows,
        init,
        {
            icon: iconGitBranch(24, ''),
            title: 'No Flows Yet',
            description:
                'Flows are created'
                + ' from the project'
                + ' detail page.',
            action: {
                label: 'View Projects',
                href:
                    '../projects/'
                    + 'index.html',
            },
        },
    );
    if (!result) return;
    const flows = result.map(
        wf => new FlowPresenter(wf),
    );

    setHtml(
        listEl,
        html`${flows.map(
            wf => wf.buildCard(),
        )}`,
    );

    listEl.addEventListener(
        'click',
        (e) => {
            if (
                !(e.target
                    instanceof Element)
            ) return;
            const card =
                e.target
                    .closest<HTMLElement>(
                    '[data-flow-card]',
                );
            if (card)
                navigateTo(
                    'flow-detail',
                    {
                        flowId: attr(
                            card,
                            'data-flow'
                            + '-card',
                        ),
                    },
                );
        },
    );

    bindImport();
}

function bindImport(): void {
    const btn = $(
        '#import-flow-btn', document,
    );
    const fileInput = $(
        '#import-flow-input', document,
    ) as HTMLInputElement | null;
    const cancelBtn = $(
        '#import-cancel', document,
    );
    const chooseBtn = $(
        '#import-choose', document,
    );
    const overwriteBtn = $(
        '#import-overwrite', document,
    );
    const createNewBtn = $(
        '#import-create-new', document,
    );
    const createBtn = $(
        '#import-create', document,
    );

    if (
        !btn || !fileInput
        || !cancelBtn || !chooseBtn
    ) return;

    btn.addEventListener(
        'click',
        () => void openImportDialog(),
    );

    cancelBtn.addEventListener(
        'click',
        () => {
            pendingBackup = null;
            pendingResolution = null;
            resetImportDialog();
            closeDialog('import-flow');
        },
    );

    chooseBtn.addEventListener(
        'click',
        () => fileInput.click(),
    );

    fileInput.addEventListener(
        'change',
        () => void handleFileSelect(
            fileInput,
        ),
    );

    overwriteBtn?.addEventListener(
        'click',
        () => void handleOverwrite(
            fileInput,
        ),
    );

    createNewBtn?.addEventListener(
        'click',
        () => void handleCreateNew(
            fileInput,
        ),
    );

    createBtn?.addEventListener(
        'click',
        () => void handleCreate(
            fileInput,
        ),
    );
}

async function openImportDialog(
): Promise<void> {
    const select = $select(
        '#import-project', document,
    );
    if (!select) return;

    resetImportDialog();
    pendingBackup = null;
    pendingResolution = null;

    const projects = await getProjects();
    if (projects.length === 0) {
        showToast(
            'No projects available',
            'error',
        );
        return;
    }

    select.replaceChildren();
    for (const p of projects) {
        const opt =
            document.createElement(
                'option',
            );
        opt.value = p.id;
        opt.textContent = p.title;
        select.appendChild(opt);
    }

    openDialog('import-flow');
}

async function handleFileSelect(
    input: HTMLInputElement,
): Promise<void> {
    const file = input.files?.[0];
    if (!file) return;

    const ext = file.name
        .split('.').pop()
        ?.toLowerCase();

    if (ext === 'zip') {
        const bytes = new Uint8Array(
            await file.arrayBuffer(),
        );
        const backup =
            await parseZipBackup(bytes);
        if (backup) {
            await handleV2Zip(
                backup, input,
            );
            return;
        }
    }

    const select = $select(
        '#import-project', document,
    );
    const projectId = select?.value;
    if (!projectId) {
        showToast(
            'Select a project first',
            'error',
        );
        return;
    }

    closeDialog('import-flow');

    let result: {
        flowId: string;
        warnings: string[];
    };
    try {
        result = ext === 'zip'
            ? await importFlowFromZip(
                new Uint8Array(
                    await file
                        .arrayBuffer(),
                ),
                projectId,
            )
            : await importFlowFromMermaid(
                await file.text(),
                projectId,
            );
    } catch (err) {
        const msg =
            err instanceof Error
                ? err.message
                : 'Import failed';
        showToast(msg, 'error');
        input.value = '';
        return;
    }

    input.value = '';

    if (result.warnings.length > 0) {
        showToast(
            'Imported with '
            + String(
                result.warnings.length,
            )
            + ' warning(s)',
            'warning',
        );
    } else {
        showToast(
            'Flow imported',
            'success',
        );
    }

    navigateTo(
        'flow-detail',
        { flowId: result.flowId },
    );
}

async function handleV2Zip(
    backup: BackupV2,
    input: HTMLInputElement,
): Promise<void> {
    let resolution: ImportResolution;
    try {
        resolution =
            await resolveFlowBackup(
                backup,
            );
    } catch {
        showToast(
            'Failed to resolve import',
            'error',
        );
        input.value = '';
        return;
    }
    pendingBackup = backup;
    pendingResolution = resolution;
    configureResolutionDialog(
        resolution, backup,
    );
}

function configureResolutionDialog(
    resolution: ImportResolution,
    backup: BackupV2,
): void {
    const desc = $(
        '#import-description',
        document,
    );
    const projectSec = $(
        '#import-project-section',
        document,
    );
    const overwriteBtn = $(
        '#import-overwrite', document,
    );
    const createNewBtn = $(
        '#import-create-new', document,
    );
    const createBtn = $(
        '#import-create', document,
    );
    const chooseBtn = $(
        '#import-choose', document,
    );
    if (
        !desc || !projectSec
        || !overwriteBtn
        || !createNewBtn
        || !createBtn || !chooseBtn
    ) return;

    const name = backup.flow.name;

    chooseBtn.classList.add('hidden');

    if (
        resolution.case === '1a'
    ) {
        desc.textContent =
            '\u2018' + name
            + '\u2019 already exists'
            + ' in \u2018'
            + resolution.projectName
            + '\u2019.';
        projectSec.classList
            .add('hidden');
        overwriteBtn.classList
            .remove('hidden');
        createNewBtn.classList
            .remove('hidden');
        createBtn.classList
            .add('hidden');
    } else if (
        resolution.case === '1b'
    ) {
        desc.textContent =
            'Project \u2018'
            + resolution.projectName
            + '\u2019 found. \u2018'
            + name
            + '\u2019 will be created.';
        projectSec.classList
            .add('hidden');
        overwriteBtn.classList
            .add('hidden');
        createNewBtn.classList
            .remove('hidden');
        createBtn.classList
            .add('hidden');
    } else if (
        resolution.case === '2a'
    ) {
        desc.textContent =
            '\u2018' + name
            + '\u2019 exists but its'
            + ' project does not.';
        projectSec.classList
            .add('hidden');
        overwriteBtn.classList
            .remove('hidden');
        createNewBtn.classList
            .add('hidden');
        createBtn.classList
            .add('hidden');
    } else {
        desc.textContent =
            'Neither \u2018' + name
            + '\u2019 nor its project'
            + ' exist. Select a'
            + ' project.';
        projectSec.classList
            .remove('hidden');
        overwriteBtn.classList
            .add('hidden');
        createNewBtn.classList
            .add('hidden');
        createBtn.classList
            .remove('hidden');
    }
}

function resetImportDialog(): void {
    const desc = $(
        '#import-description',
        document,
    );
    const projectSec = $(
        '#import-project-section',
        document,
    );
    const overwriteBtn = $(
        '#import-overwrite', document,
    );
    const createNewBtn = $(
        '#import-create-new', document,
    );
    const createBtn = $(
        '#import-create', document,
    );
    const chooseBtn = $(
        '#import-choose', document,
    );
    if (desc) {
        desc.textContent =
            'Select a project and'
            + ' choose a .mmd or'
            + ' .zip file';
    }
    projectSec?.classList
        .remove('hidden');
    overwriteBtn?.classList
        .add('hidden');
    createNewBtn?.classList
        .add('hidden');
    createBtn?.classList
        .add('hidden');
    chooseBtn?.classList
        .remove('hidden');
}

function clearPending(
    input: HTMLInputElement,
): void {
    pendingBackup = null;
    pendingResolution = null;
    input.value = '';
}

async function handleOverwrite(
    input: HTMLInputElement,
): Promise<void> {
    const backup = pendingBackup;
    if (!backup) return;
    closeDialog('import-flow');
    resetImportDialog();
    try {
        const flowId =
            await overwriteFlow(backup);
        clearPending(input);
        showToast(
            'Flow overwritten',
            'success',
        );
        navigateTo(
            'flow-detail',
            { flowId },
        );
    } catch (err) {
        clearPending(input);
        const msg =
            err instanceof Error
                ? err.message
                : 'Overwrite failed';
        showToast(msg, 'error');
    }
}

async function handleCreateNew(
    input: HTMLInputElement,
): Promise<void> {
    const backup = pendingBackup;
    const resolution =
        pendingResolution;
    if (!backup || !resolution)
        return;
    const projectId =
        resolution.case === '1a'
        || resolution.case === '1b'
            ? backup.projectId!
            : null;
    if (!projectId) return;
    closeDialog('import-flow');
    resetImportDialog();
    try {
        const flowId =
            await createFlowFromBackup(
                backup, projectId,
            );
        clearPending(input);
        showToast(
            'Flow imported',
            'success',
        );
        navigateTo(
            'flow-detail',
            { flowId },
        );
    } catch (err) {
        clearPending(input);
        const msg =
            err instanceof Error
                ? err.message
                : 'Import failed';
        showToast(msg, 'error');
    }
}

async function handleCreate(
    input: HTMLInputElement,
): Promise<void> {
    const backup = pendingBackup;
    if (!backup) return;
    const select = $select(
        '#import-project', document,
    );
    const projectId = select?.value;
    if (!projectId) {
        showToast(
            'Select a project',
            'error',
        );
        return;
    }
    closeDialog('import-flow');
    resetImportDialog();
    try {
        const flowId =
            await createFlowFromBackup(
                backup, projectId,
            );
        clearPending(input);
        showToast(
            'Flow imported',
            'success',
        );
        navigateTo(
            'flow-detail',
            { flowId },
        );
    } catch (err) {
        clearPending(input);
        const msg =
            err instanceof Error
                ? err.message
                : 'Import failed';
        showToast(msg, 'error');
    }
}
