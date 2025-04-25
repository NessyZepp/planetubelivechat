declare function checkMissedConfig(): string[];
declare function checkFFmpeg(CONFIG: {
    TRANSCODING: {
        ENABLED: boolean;
    };
}): Promise<any>;
declare function checkNodeVersion(): void;
export { checkFFmpeg, checkMissedConfig, checkNodeVersion };
//# sourceMappingURL=checker-before-init.d.ts.map