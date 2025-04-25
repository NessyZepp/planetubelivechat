import express from 'express';
declare function doesVideoChannelIdExist(id: number, res: express.Response): Promise<boolean>;
declare function doesVideoChannelNameWithHostExist(nameWithDomain: string, res: express.Response): Promise<boolean>;
export { doesVideoChannelIdExist, doesVideoChannelNameWithHostExist };
//# sourceMappingURL=video-channels.d.ts.map