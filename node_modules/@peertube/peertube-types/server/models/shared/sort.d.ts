import { OrderItem } from 'sequelize';
declare function getSort(value: string, lastSort?: OrderItem): OrderItem[];
declare function getAdminUsersSort(value: string): OrderItem[];
declare function getPlaylistSort(value: string, lastSort?: OrderItem): OrderItem[];
declare function getVideoSort(value: string, lastSort?: OrderItem): OrderItem[];
declare function getBlacklistSort(value: string, lastSort?: OrderItem): OrderItem[];
declare function getInstanceFollowsSort(value: string, lastSort?: OrderItem): OrderItem[];
declare function getChannelSyncSort(value: string): OrderItem[];
declare function buildSortDirectionAndField(value: string): {
    direction: "ASC" | "DESC";
    field: string;
};
export { buildSortDirectionAndField, getPlaylistSort, getSort, getAdminUsersSort, getVideoSort, getBlacklistSort, getChannelSyncSort, getInstanceFollowsSort };
//# sourceMappingURL=sort.d.ts.map