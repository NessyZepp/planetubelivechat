export declare function isPromise<T = unknown>(value: T | Promise<T>): value is Promise<T>;
export declare function isCatchable(value: any): boolean;
export declare function timeoutPromise<T>(promise: Promise<T>, timeoutMs: number): Promise<unknown>;
export declare function promisify0<A>(func: (cb: (err: any, result: A) => void) => void): () => Promise<A>;
export declare function promisify1<T, A>(func: (arg: T, cb: (err: any, result: A) => void) => void): (arg: T) => Promise<A>;
export declare function promisify2<T, U, A>(func: (arg1: T, arg2: U, cb: (err: any, result: A) => void) => void): (arg1: T, arg2: U) => Promise<A>;
export declare function promisify3<T, U, V, A>(func: (arg1: T, arg2: U, arg3: V, cb: (err: any, result: A) => void) => void): (arg1: T, arg2: U, arg3: V) => Promise<A>;
//# sourceMappingURL=promises.d.ts.map