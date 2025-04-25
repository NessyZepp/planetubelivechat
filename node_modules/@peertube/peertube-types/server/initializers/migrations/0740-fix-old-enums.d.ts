import * as Sequelize from 'sequelize';
declare function up(utils: {
    transaction: Sequelize.Transaction;
    queryInterface: Sequelize.QueryInterface;
    sequelize: Sequelize.Sequelize;
    db: any;
}): Promise<void>;
declare function down(utils: {
    queryInterface: Sequelize.QueryInterface;
    transaction: Sequelize.Transaction;
}): Promise<void>;
export { up, down };
//# sourceMappingURL=0740-fix-old-enums.d.ts.map