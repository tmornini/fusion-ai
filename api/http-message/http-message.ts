import { parseWire, serializeWire } from './wire-codec.ts';
import type { MessageModel } from './types.ts';

// The public façade. An immutable message that derives its wire
// and JSON projections lazily and memoizes them — safe because
// the model can never change, so the memo can never stale (this
// is lazy pure derivation, not the Sin of the Cache). All
// transforms it calls are free pure functions.
export class HttpMessage {
    readonly #model: MessageModel;
    #wire: string | undefined;

    private constructor(model: MessageModel) {
        this.#model = model;
    }

    static fromModel(model: MessageModel): HttpMessage {
        return new HttpMessage(model);
    }

    static fromWire(wire: string): HttpMessage {
        return new HttpMessage(parseWire(wire));
    }

    toWire(): string {
        if (this.#wire === undefined) {
            this.#wire = serializeWire(this.#model);
        }
        return this.#wire;
    }
}
