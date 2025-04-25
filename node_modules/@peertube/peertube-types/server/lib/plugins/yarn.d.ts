declare function installNpmPlugin(npmName: string, versionArg?: string): Promise<void>;
declare function installNpmPluginFromDisk(path: string): Promise<void>;
declare function removeNpmPlugin(name: string): Promise<void>;
declare function rebuildNativePlugins(): Promise<void>;
export { installNpmPlugin, installNpmPluginFromDisk, rebuildNativePlugins, removeNpmPlugin };
//# sourceMappingURL=yarn.d.ts.map