// Apex `/` destination. The refresh cookie is
// Path=/authentication, so GET `/` cannot see it.
// The existing refresh grant is the probe — not a
// new door.

export const APEX_SIGNED_IN = 'dashboard/index.html';
export const APEX_SIGNED_OUT = 'landing/index.html';

export async function resolveApexLocation(
    sessionLive: () => Promise<boolean>,
): Promise<string> {
    try {
        if (await sessionLive()) {
            return APEX_SIGNED_IN;
        }
    } catch {
        // a probe fault is unsigned
    }
    return APEX_SIGNED_OUT;
}

export async function probeRefreshSession(
): Promise<boolean> {
    const response = await fetch(
        '/authentication/token',
        {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                grant_type: 'refresh',
            }),
        },
    );
    return response.ok;
}
