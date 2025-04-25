import 'multer';
import { UploadFilesForCheck } from 'express';
declare function isVideoImportTargetUrlValid(url: string): boolean;
declare function isVideoImportStateValid(value: any): boolean;
declare function isVideoImportTorrentFile(files: UploadFilesForCheck): boolean;
export { isVideoImportStateValid, isVideoImportTargetUrlValid, isVideoImportTorrentFile };
//# sourceMappingURL=video-imports.d.ts.map