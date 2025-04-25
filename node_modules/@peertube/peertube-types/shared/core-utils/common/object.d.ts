declare function pick<O extends object, K extends keyof O>(object: O, keys: K[]): Pick<O, K>;
declare function omit<O extends object, K extends keyof O>(object: O, keys: K[]): Exclude<O, K>;
declare function objectKeysTyped<O extends object, K extends keyof O>(object: O): K[];
declare function getKeys<O extends object, K extends keyof O>(object: O, keys: K[]): K[];
declare function hasKey<T extends object>(obj: T, k: keyof any): k is keyof T;
declare function sortObjectComparator(key: string, order: 'asc' | 'desc'): (a: any, b: any) => 1 | 0 | -1;
declare function shallowCopy<T>(o: T): T;
declare function simpleObjectsDeepEqual(a: any, b: any): boolean;
export { pick, omit, objectKeysTyped, getKeys, hasKey, shallowCopy, sortObjectComparator, simpleObjectsDeepEqual };
//# sourceMappingURL=object.d.ts.map