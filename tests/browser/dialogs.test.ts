import { assertEquals } from '@std/assert';
import { useBrowser, withAdminPage, type Page } from
    './fixtures.ts';
import { registryUrl } from
    '../../web-app/app/browser-drive.ts';

const browser = useBrowser();

// The add dialogs are static markup: a cancelled or escaped
// session leaves last time's text in the inputs unless the
// page clears them on open. Type, cancel, reopen, then read
// every field the dialog owns.

const ADD_IDENTITY_FIELDS = [
    '#id-name', '#id-email', '#id-phone', '#id-bio',
    '#svc-secret',
];

async function openDialog(
    page: Page, id: string,
): Promise<void> {
    await page.click(`[data-dialog-open="${id}"]`);
    await page.waitFor(`#${id}-dialog[open]`);
}

async function cancelDialog(
    page: Page, id: string,
): Promise<void> {
    await page.click(`[data-dialog-cancel="${id}"]`);
    await page.until(
        `!document.querySelector('#${id}-dialog[open]')`,
        `${id} dialog closed`,
    );
}

// Page-side expressions: set every field to a marker, then
// read every field back as an array.
function fillFields(fields: readonly string[]): string {
    const sets = fields.map(f =>
        `document.querySelector(${JSON.stringify(f)})`
        + `.value = 'stale';`,
    ).join(' ');
    return `(() => { ${sets} return true; })()`;
}

function fieldValues(fields: readonly string[]): string {
    const reads = fields.map(f =>
        `document.querySelector(${JSON.stringify(f)}).value`,
    ).join(', ');
    return `[${reads}]`;
}

Deno.test('the add-identity dialog reopens with every field empty',
async () => {
    await withAdminPage(browser.get(), async (page, origin) => {
        await page.navigate(
            registryUrl(origin.baseUrl, 'identities'),
        );
        await page.ready('identities');
        await openDialog(page, 'add-identity');
        await page.evaluate(fillFields(ADD_IDENTITY_FIELDS));
        await cancelDialog(page, 'add-identity');
        await openDialog(page, 'add-identity');
        const values = await page.evaluate<string[]>(
            fieldValues(ADD_IDENTITY_FIELDS),
        );
        assertEquals(
            values, ADD_IDENTITY_FIELDS.map(() => ''),
        );
    });
});
