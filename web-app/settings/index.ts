import {
    $, $input, bindEnterToClick,
} from '../app/dom';
import { setHtml } from '../app/safe-html';
import { showToast } from '../app/toast';
import {
    buildErrorState,
} from '../app/loading-states';
import { log } from '../app/logger';
import {
    getCompanySettings,
    putCompanySettings,
    type CompanySettings,
} from '../app/adapters';
import {
    SettingsPresenter,
} from '../app/presenters';

const escapeController =
    { current: new AbortController() };

let currentSettings:
    CompanySettings | null = null;

function mutateSettingsPage(
    settings: CompanySettings,
    isEditing: boolean,
): void {
    currentSettings = settings;
    const container = $(
        '#settings-content', document,
    );
    if (!container) return;
    const presenter =
        new SettingsPresenter(settings);
    setHtml(
        container,
        presenter.buildPage(isEditing),
    );
    bindSettingsEvents(settings, isEditing);
}

function bindSettingsEvents(
    settings: CompanySettings,
    isEditing: boolean,
): void {
    escapeController.current.abort();
    escapeController.current =
        new AbortController();
    if (isEditing) {
        document.addEventListener(
            'keydown',
            (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    $(
                        '#company-settings'
                        + '-cancel-btn',
                        document,
                    )?.click();
                }
            },
            {
                signal: escapeController
                    .current.signal,
            },
        );
        const saveSel =
            '#company-settings-save-btn';
        bindEnterToClick(
            '#company-settings-name',
            saveSel,
        );
        bindEnterToClick(
            '#company-settings-domain',
            saveSel,
        );
    }
    $(
        '#company-settings-edit-btn',
        document,
    )?.addEventListener(
        'click',
        () => mutateSettingsPage(
            settings, true,
        ),
    );
    $(
        '#company-settings-cancel-btn',
        document,
    )?.addEventListener(
        'click',
        () => mutateSettingsPage(
            settings, false,
        ),
    );
    $(
        '#company-settings-save-btn',
        document,
    )?.addEventListener(
        'click',
        handleSave,
    );
}

async function handleSave(): Promise<void> {
    if (!currentSettings) return;
    const name = $input(
        '#company-settings-name', document,
    )!.value.trim();
    const domain = $input(
        '#company-settings-domain', document,
    )!.value.trim();
    const updated: CompanySettings = {
        name, domain,
    };
    try {
        await putCompanySettings(updated);
    } catch (err) {
        log.error(
            'putCompanySettings failed',
            'settings',
            err,
        );
        showToast(
            'Failed to save settings',
            'error',
        );
        return;
    }
    showToast('Settings saved', 'success');
    mutateSettingsPage(updated, false);
}

export async function init(): Promise<void> {
    const container = $(
        '#settings-content', document,
    );
    if (!container) return;
    let settings: CompanySettings;
    try {
        settings =
            await getCompanySettings();
    } catch (err) {
        log.error(
            'getCompanySettings failed',
            'settings',
            err,
        );
        setHtml(
            container,
            buildErrorState(
                'Failed to load company'
                + ' settings.',
                'Try Again',
            ),
        );
        container
            .querySelector(
                '[data-retry-btn]',
            )
            ?.addEventListener(
                'click',
                () => init(),
            );
        return;
    }
    mutateSettingsPage(settings, false);
}
