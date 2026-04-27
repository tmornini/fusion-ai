export interface NodeMoveUpdate {
    nodeId: string;
    x: number;
    y: number;
}

export type FsmInput =
    | {
        kind: 'pointer-down-on-canvas';
        x: number;
        y: number;
        isShift: boolean;
        isLocked: boolean;
    }
    | {
        kind: 'pointer-down-on-node';
        nodeId: string;
        isShift: boolean;
        isLocked: boolean;
    }
    | {
        kind: 'pointer-down-on-port';
        nodeId: string;
        portKind: 'in' | 'out';
    }
    | {
        kind: 'pointer-move';
        x: number;
        y: number;
    }
    | {
        kind: 'pointer-up';
        x: number;
        y: number;
    }
    | {
        kind: 'wheel';
        delta: number;
        isAutoFit: boolean;
    }
    | {
        kind: 'space-down';
        isAutoFit: boolean;
    }
    | { kind: 'space-up' }
    | {
        kind: 'key-down';
        key: string;
    };

export type Action =
    | {
        kind: 'move-nodes';
        updates: NodeMoveUpdate[];
    }
    | {
        kind: 'add-edge';
        fromId: string;
        toId: string;
    }
    | {
        kind: 'add-node';
        fromId: string;
        x: number;
        y: number;
    }
    | {
        kind: 'open-panel';
        open: boolean;
    }
    | { kind: 'request-update' };
