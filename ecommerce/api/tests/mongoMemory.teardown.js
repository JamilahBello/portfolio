const { disconnectDB } = require("../config/db");

module.exports = async () => {
    await disconnectDB();
    if (global.__MONGOD__) {
        await global.__MONGOD__.stop();
    }
};
