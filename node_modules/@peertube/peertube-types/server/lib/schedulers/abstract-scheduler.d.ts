import Bluebird from 'bluebird';
export declare abstract class AbstractScheduler {
    protected abstract schedulerIntervalMs: number;
    private interval;
    private isRunning;
    enable(): void;
    disable(): void;
    execute(): Promise<void>;
    protected abstract internalExecute(): Promise<any> | Bluebird<any>;
}
//# sourceMappingURL=abstract-scheduler.d.ts.map