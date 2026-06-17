import { parseWire, serializeWire } from './wire-codec.ts';
import { parseJson, serializeJson } from './json-codec.ts';
import { queryModel } from './query.ts';
import type { FieldValue } from './field-value.ts';
import type { MessageModel } from './types.ts';

// The public façade. An immutable message that derives its wire
// and JSON projections lazily and memoizes them — safe because
// the model can never change, so the memo can never stale (this
// is lazy pure derivation, not the Sin of the Cache). All
// transforms it calls are free pure functions.
export class HttpMessage {
    readonly #model: MessageModel;
    #wire: string | undefined;
    #json: string | undefined;

    private constructor(model: MessageModel) {
        this.#model = model;
    }

    static fromModel(model: MessageModel): HttpMessage {
        return new HttpMessage(model);
    }

    static fromWire(wire: string): HttpMessage {
        return new HttpMessage(parseWire(wire));
    }

    static fromJson(json: string): HttpMessage {
        return new HttpMessage(parseJson(json));
    }

    toWire(): string {
        if (this.#wire === undefined) {
            this.#wire = serializeWire(this.#model);
        }
        return this.#wire;
    }

    toJson(): string {
        if (this.#json === undefined) {
            this.#json = serializeJson(this.#model);
        }
        return this.#json;
    }

    query(dottedKey: string): FieldValue {
        return queryModel(this.#model, dottedKey);
    }
}
