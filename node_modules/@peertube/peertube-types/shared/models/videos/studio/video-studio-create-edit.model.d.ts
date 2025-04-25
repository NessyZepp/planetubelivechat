export interface VideoStudioCreateEdition {
    tasks: VideoStudioTask[];
}
export type VideoStudioTask = VideoStudioTaskCut | VideoStudioTaskIntro | VideoStudioTaskOutro | VideoStudioTaskWatermark;
export interface VideoStudioTaskCut {
    name: 'cut';
    options: {
        start?: number;
        end?: number;
    };
}
export interface VideoStudioTaskIntro {
    name: 'add-intro';
    options: {
        file: Blob | string;
    };
}
export interface VideoStudioTaskOutro {
    name: 'add-outro';
    options: {
        file: Blob | string;
    };
}
export interface VideoStudioTaskWatermark {
    name: 'add-watermark';
    options: {
        file: Blob | string;
    };
}
export declare function isVideoStudioTaskIntro(v: VideoStudioTask): v is VideoStudioTaskIntro;
export declare function isVideoStudioTaskOutro(v: VideoStudioTask): v is VideoStudioTaskOutro;
export declare function isVideoStudioTaskWatermark(v: VideoStudioTask): v is VideoStudioTaskWatermark;
export declare function hasVideoStudioTaskFile(v: VideoStudioTask): v is VideoStudioTaskIntro | VideoStudioTaskOutro | VideoStudioTaskWatermark;
//# sourceMappingURL=video-studio-create-edit.model.d.ts.map