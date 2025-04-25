import { UploadFilesForCheck } from 'express';
declare function isVideoCaptionLanguageValid(value: any): boolean;
declare function isVideoCaptionFile(files: UploadFilesForCheck, field: string): boolean;
declare function isVTTFileValid(filePath: string): Promise<boolean>;
export { isVideoCaptionFile, isVTTFileValid, isVideoCaptionLanguageValid };
//# sourceMappingURL=video-captions.d.ts.map