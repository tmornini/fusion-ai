import {
    html, trusted,
} from '../safe-html';
import type { SafeHtml } from '../safe-html';
import {
    iconArrowLeft,
    iconUndo,
    iconRedo,
    iconTrash,
} from '../icons';
import type { GraphField } from '../adapters';

export function buildFieldBadge(
    fieldType: string,
): SafeHtml {
    return html`<span
class="badge badge-outline text-xs"
>${fieldType}</span>`;
}

export function buildFieldRow(
    field: GraphField,
): SafeHtml {
    const req = field.isRequired
        ? html`<span class="${
            'text-xs wf-required-mark'
        }"> *</span>`
        : html``;
    return html`<div
class="wf-field-row"
data-field-id="${field.id}">
${buildFieldBadge(field.fieldType)}
<span class="text-sm"
    >${field.name}</span>
${req}
<button
    class="btn btn-ghost btn-xs ml-auto"
    data-action="delete-field"
    data-field-id="${field.id}"
    >&times;</button>
</div>`;
}

export function buildFieldEditor(
    nodeId: string | null,
): SafeHtml {
    if (!nodeId) {
        return html``;
    }
    return html`<div
class="wf-field-editor"
data-node-id="${nodeId}">
<h4 class="text-sm font-semibold mb-2"
    >Add Field</h4>
<div class="mb-2">
<input type="text"
    class="input input-sm"
    id="new-field-name"
    placeholder="Field name" />
</div>
<div class="mb-2">
<select class="input input-sm"
    id="new-field-type">
<option value="text">text</option>
<option value="textarea"
    >textarea</option>
<option value="number">number</option>
<option value="date">date</option>
<option value="select">select</option>
<option value="checkbox"
    >checkbox</option>
<option value="file">file</option>
<option value="email">email</option>
<option value="url">url</option>
<option value="phone">phone</option>
<option value="currency"
    >currency</option>
<option value="multi_select"
    >multi_select</option>
<option value="radio">radio</option>
<option value="image">image</option>
</select>
</div>
<div class="mb-2">
<label class="text-sm">
<input type="checkbox"
    id="new-field-required" />
Required</label>
</div>
<div class="mb-2">
<textarea
    class="input input-sm"
    id="new-field-options"
    placeholder="${
        'Options (one per line)'
    }"
    rows="2"></textarea>
</div>
<button class="btn btn-primary btn-xs"
    data-action="save-field"
    >Add</button>
</div>`;
}

export function buildToolbar(
    isAutoFitEnabled: boolean,
    canUndo: boolean,
    canRedo: boolean,
    isLocked: boolean,
    canDelete: boolean,
): SafeHtml {
    const autoFitCls = isAutoFitEnabled
        ? ' wf-toolbar-toggle-on'
        : '';
    return html`<div
class="wf-toolbar">
<div class="wf-toolbar-group">
<button
    class="btn btn-ghost btn-icon"
    id="flow-back-btn"
    >${iconArrowLeft(20, '')}</button>
</div>
<div class="wf-toolbar-spacer"></div>
<div class="wf-toolbar-group">
<button
    class="btn btn-ghost btn-icon"
    data-action="undo"${
    trusted(
        canUndo ? '' : ' disabled',
    )}>${iconUndo(18, '')}</button>
<button
    class="btn btn-ghost btn-icon"
    data-action="redo"${
    trusted(
        canRedo ? '' : ' disabled',
    )}>${iconRedo(18, '')}</button>
</div>
<div class="wf-toolbar-spacer"></div>
<div class="wf-toolbar-group">
<button class="btn btn-ghost btn-sm"
    data-action="auto-layout"${
    trusted(
        isLocked ? ' disabled' : '',
    )}><span class="wf-btn-stack"
    >Auto<br>Layout</span></button>
</div>
<div class="wf-toolbar-spacer"></div>
<div class="wf-toolbar-group">
<button class="btn btn-ghost btn-sm"
    data-action="zoom-out"
    >Zoom \u2212</button>
<button class="${trusted(
    'btn btn-ghost btn-sm'
    + ' wf-toolbar-toggle'
    + autoFitCls,
)}"
    data-action="auto-fit"
    ><span class="wf-btn-stack"
    >Auto<br>Fit</span></button>
<button class="btn btn-ghost btn-sm"
    data-action="zoom-in"
    >Zoom +</button>
</div>
<div class="wf-toolbar-spacer"></div>
<div class="wf-toolbar-group">
<button class="btn btn-ghost btn-sm"
    data-action="copy-mermaid"
    ><span class="wf-btn-stack"
    >Copy<br>Mermaid</span></button>
<button class="btn btn-ghost btn-sm"
    data-action="export-zip"
    >Export</button>
</div>
<div class="wf-toolbar-spacer"></div>
<div class="wf-toolbar-group">
<button
    class="btn btn-ghost btn-icon"
    data-action="delete-selected"${
    trusted(
        canDelete && !isLocked
            ? '' : ' disabled',
    )}>${iconTrash(18, '')}</button>
</div>
</div>`;
}
