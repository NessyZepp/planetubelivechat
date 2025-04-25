import { Sequelize, Transaction } from 'sequelize';
declare function setAsUpdated(options: {
    sequelize: Sequelize;
    table: string;
    id: number;
    transaction?: Transaction;
}): Promise<void>;
export { setAsUpdated };
//# sourceMappingURL=update.d.ts.map