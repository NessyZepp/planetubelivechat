import express from 'express';
export type VideoPlaylistFetchType = 'summary' | 'all';
declare function doesVideoPlaylistExist(id: number | string, res: express.Response, fetchType?: VideoPlaylistFetchType): Promise<boolean>;
export { doesVideoPlaylistExist };
//# sourceMappingURL=video-playlists.d.ts.map