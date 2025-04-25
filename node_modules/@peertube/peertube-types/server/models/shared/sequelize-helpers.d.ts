declare function isOutdated(model: {
    createdAt: Date;
    updatedAt: Date;
}, refreshInterval: number): boolean;
declare function throwIfNotValid(value: any, validator: (value: any) => boolean, fieldName?: string, nullable?: boolean): void;
declare function buildTrigramSearchIndex(indexName: string, attribute: string): {
    name: string;
    fields: any[];
    using: string;
    operator: string;
};
export { throwIfNotValid, buildTrigramSearchIndex, isOutdated };
//# sourceMappingURL=sequelize-helpers.d.ts.map