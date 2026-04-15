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
