export interface ResultList<T> {
    total: number;
    data: T[];
}
export interface ThreadsResultList<T> extends ResultList<T> {
    totalNotDeletedComments: number;
}
//# sourceMappingURL=result-list.model.d.ts.map