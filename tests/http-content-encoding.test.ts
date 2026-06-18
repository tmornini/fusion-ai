import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { Octets } from '../api/http-message/octets.ts';
import {
    ContentCodingRegistry,
    defaultContentCodingRegistry,
    gzipContentCodec,
    deflateContentCodec,
    type ContentCodec,
} from '../api/http-message/content-coding.ts';

async function deflate(
    coding: 'gzip' | 'deflate', text: string,
): Promise<Octets> {
    const stream = new Blob([new TextEncoder().encode(text)])
        .stream()
        .pipeThrough(new CompressionStream(coding));
    const buffer = await new Response(stream).arrayBuffer();
    return Octets.fromBytes(new Uint8Array(buffer));
}

test('gzip codec round-trips compressed octets', async () => {
    const decoded = await gzipContentCodec.decode(
        await deflate('gzip', 'hello, world'),
    );
    assert.equal(
        new TextDecoder().decode(decoded.asBytes()),
        'hello, world',
    );
});

test('deflate codec round-trips compressed octets', async () => {
    const decoded = await deflateContentCodec.decode(
        await deflate('deflate', 'hello, world'),
    );
    assert.equal(
        new TextDecoder().decode(decoded.asBytes()),
        'hello, world',
    );
});

test('the default registry has no br codec', () => {
    assert.equal(
        defaultContentCodingRegistry().codecFor('br'),
        undefined,
    );
});

test('an injected br codec is found', () => {
    const br: ContentCodec = {
        handles: (coding) => coding === 'br',
        decode: (body) => Promise.resolve(body),
    };
    assert.equal(
        new ContentCodingRegistry([br]).codecFor('br'), br,
    );
});
