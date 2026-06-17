import { Octets } from './octets.ts';
import { sortFields } from './canonical.ts';
import { CONTENT_LENGTH, isStoredField } from './framing.ts';
import {
    isHttpVersion,
    isStatusCodeText,
    isToken,
} from './grammar.ts';
import {
    HttpMessageError,
    type FieldLine,
    type MessageModel,
    type StartLine,
} from './types.ts';

const CRLF = '\r\n';
const SP = ' ';

// parseWire is the gate: profane wire text in, a trusted model
// out (or HttpMessageError). Wire is a Latin-1 binary string —
// one char per octet. serializeWire emits the canonical form.

export function parseWire(wire: string): MessageModel {
    const boundary = wire.indexOf(CRLF + CRLF);
    if (boundary === -1) {
        throw new HttpMessageError(
            'wire message has no header/body boundary',
        );
    }
    const head = wire.slice(0, boundary);
    const bodyText = wire.slice(boundary + 4);
    const lines = head.split(CRLF);
    const startLine = parseStartLine(lines[0]!);
    const allFields = lines.slice(1).map(parseFieldLine);
    const fields = allFields.filter(isStoredField);
    const body = frameBody(allFields, bodyText);
    return { startLine, fields, body, trailer: undefined };
}

function parseStartLine(line: string): StartLine {
    const first = line.indexOf(SP);
    const second = line.indexOf(SP, first + 1);
    if (first === -1 || second === -1) {
        throw new HttpMessageError(
            'malformed start-line: ' + line,
        );
    }
    const a = line.slice(0, first);
    const b = line.slice(first + 1, second);
    const c = line.slice(second + 1);
    if (a.startsWith('HTTP/')) {
        if (!isHttpVersion(a)) {
            throw new HttpMessageError(
                'invalid HTTP-version: ' + a,
            );
        }
        if (!isStatusCodeText(b)) {
            throw new HttpMessageError(
                'invalid status-code: ' + b,
            );
        }
        return {
            kind: 'response',
            version: a,
            status: Number(b),
            reason: c,
        };
    }
    if (!isToken(a)) {
        throw new HttpMessageError('invalid method: ' + a);
    }
    if (!isHttpVersion(c)) {
        throw new HttpMessageError('invalid HTTP-version: ' + c);
    }
    return { kind: 'request', method: a, target: b, version: c };
}

function parseFieldLine(line: string): FieldLine {
    const colon = line.indexOf(':');
    if (colon === -1) {
        throw new HttpMessageError(
            'field line without a colon: ' + line,
        );
    }
    const name = line.slice(0, colon).toLowerCase();
    if (!isToken(name)) {
        throw new HttpMessageError(
            'invalid field name: ' + name,
        );
    }
    const value = line.slice(colon + 1).trim();
    return { name, value };
}

function frameBody(
    allFields: readonly FieldLine[],
    bodyText: string,
): Octets | undefined {
    const declared = allFields.find(
        (field) => field.name === CONTENT_LENGTH,
    );
    if (declared !== undefined) {
        const length = Number(declared.value);
        if (!Number.isInteger(length) || length < 0) {
            throw new HttpMessageError(
                'invalid content-length: ' + declared.value,
            );
        }
        if (bodyText.length !== length) {
            throw new HttpMessageError(
                'content-length ' + length
                    + ' does not match body of '
                    + bodyText.length,
            );
        }
        return Octets.fromLatin1(bodyText);
    }
    return bodyText.length > 0
        ? Octets.fromLatin1(bodyText)
        : undefined;
}

export function serializeWire(model: MessageModel): string {
    const fields = [...model.fields];
    if (model.body !== undefined) {
        fields.push({
            name: CONTENT_LENGTH,
            value: String(model.body.byteLength()),
        });
    }
    let out = serializeStartLine(model.startLine) + CRLF;
    for (const field of sortFields(fields)) {
        out += field.name + ': ' + field.value + CRLF;
    }
    out += CRLF;
    if (model.body !== undefined) {
        out += model.body.toLatin1();
    }
    return out;
}

function serializeStartLine(line: StartLine): string {
    if (line.kind === 'request') {
        return line.method + SP + line.target + SP + line.version;
    }
    return line.version + SP + line.status + SP + line.reason;
}
