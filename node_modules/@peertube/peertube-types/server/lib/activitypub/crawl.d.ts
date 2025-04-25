import Bluebird from 'bluebird';
type HandlerFunction<T> = (items: T[]) => (Promise<any> | Bluebird<any>);
type CleanerFunction = (startedDate: Date) => Promise<any>;
declare function crawlCollectionPage<T>(argUrl: string, handler: HandlerFunction<T>, cleaner?: CleanerFunction): Promise<void>;
export { crawlCollectionPage };
//# sourceMappingURL=crawl.d.ts.map