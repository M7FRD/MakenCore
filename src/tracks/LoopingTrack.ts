import { BaseTrack } from './BaseTrack';
import { LoopingStrategy } from '../strategies/LoopingStrategy';

export class LoopingTrack extends BaseTrack {
    constructor(id: number, name: string, startIdx: number, amountLines: number) {
        super(id, name, 'looping', new LoopingStrategy(), { amount: amountLines }, startIdx);
    }
}