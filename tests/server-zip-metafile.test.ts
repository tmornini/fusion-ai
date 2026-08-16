import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import * as esbuild from 'esbuild';

const BUILD_SCRIPT = readFileSync('build', 'utf8');

test('build emits one ZIP from the server-core entry', () => {
    assert.match(
        BUILD_SCRIPT,
        /fusion-ai-server-\$\{SHA\}\.zip/,
    );
    assert.doesNotMatch(
        BUILD_SCRIPT,
        /fusion-ai-browser/,
    );
    assert.match(
        BUILD_SCRIPT,
        /web-app\/app\/server-core\.ts/,
    );
    assert.doesNotMatch(
        BUILD_SCRIPT,
        /web-app\/app\/core\.ts/,
    );
});

test(
    'client graph omits signing key and IndexedDB',
    async () => {
        const result = await esbuild.build({
            entryPoints: [
                'web-app/app/server-core.ts',
            ],
            bundle: true,
            write: false,
            metafile: true,
            format: 'iife',
            target: 'es2024',
            absWorkingDir: process.cwd(),
        });
        const meta = result.metafile;
        assert.ok(meta !== undefined);
        const hits: string[] = [];
        for (const input of Object.keys(meta.inputs)) {
            const path = input.includes('?')
                ? input.slice(0, input.indexOf('?'))
                : input;
            if (input.includes('backend-indexeddb')) {
                hits.push(input);
            }
            const src = readFileSync(path, 'utf8');
            if (src.includes('SIGNING_KEY_MATERIAL')) {
                hits.push(input);
            }
        }
        assert.deepEqual(hits, []);
    },
);
