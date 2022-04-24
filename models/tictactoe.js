module.exports = (sequelize, DataTypes) => {
    return sequelize.define('tictactoe', {
        user_id: {
            type: DataTypes,
            primaryKey: true,
        },
        score: {
            type: DataTypes,
            defaultValue: 0,
            allowNull : false,
        }
    })
}