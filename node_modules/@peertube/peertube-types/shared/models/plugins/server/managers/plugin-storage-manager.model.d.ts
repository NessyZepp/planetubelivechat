export interface PluginStorageManager {
    getData: (key: string) => Promise<string>;
    storeData: (key: string, data: any) => Promise<any>;
}
//# sourceMappingURL=plugin-storage-manager.model.d.ts.map