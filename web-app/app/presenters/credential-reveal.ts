import { html, type SafeHtml } from '../safe-html.ts';
import type {
    SeededCredentials,
} from '../../../api/mock-data.ts';

// One-time reveal of the freshly-seeded demo sign-ins. The
// plaintext passwords live only here and in the surfacing
// response — only their PBKDF2 hashes are stored. html``
// escapes every interpolated value, so a hostile password
// cannot inject markup; `trusted` is deliberately never used.
// DEMO-ONLY: this panel and its in-band plaintext are deleted
// at the server tier.
export function credentialRevealPanel(
    creds: SeededCredentials,
): SafeHtml {
    const entries = creds.identities.map(c => html`
        <div class="credential-reveal-entry">
            <dt>Username</dt>
            <dd>${c.username}</dd>
            <dt>Password</dt>
            <dd class="credential-reveal-secret">${
                c.password
            }</dd>
        </div>`);
    return html`
        <section class="credential-reveal"
            data-tone="warning" role="status">
            <h3 class="credential-reveal-title">
                Save your demo sign-ins
            </h3>
            <p class="credential-reveal-note">
                Shown once and never stored — copy them now,
                they cannot be recovered.
            </p>
            <dl class="credential-reveal-fields">
                ${entries}
            </dl>
        </section>`;
}
