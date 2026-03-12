// src/tracks/WindowTrack.ts
import { BaseTrack } from './BaseTrack';
import { WindowStrategy } from '../strategies/WindowStrategy';
import { WindowMode } from '../core/constants';

export class WindowTrack extends BaseTrack {
    constructor(
        id: number,
        name: string,
        sourceTrackId: number,
        lookBackCount: number,
        mode: WindowMode = WindowMode.GRADUAL  // ← default حتى لا يتكسر أي كود قديم
    ) {
        super(id, name, 'window', new WindowStrategy(), {
            historySourceId: sourceTrackId,
            count: lookBackCount,
            mode
        });
    }
}