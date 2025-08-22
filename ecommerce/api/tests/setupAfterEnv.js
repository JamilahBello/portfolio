const { clearDB } = require("../config/db");

afterEach(async () => {
    await clearDB();
});
