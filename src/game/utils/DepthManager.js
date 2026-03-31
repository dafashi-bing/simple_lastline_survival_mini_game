export class DepthManager {
    constructor(startDepth = 1000) {
        this.currentDepth = startDepth;
    }

    getNextDepth() {
        return this.currentDepth--;
    }

    reset(startDepth = 1000) {
        this.currentDepth = startDepth;
    }
}
