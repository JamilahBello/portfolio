const { MongoMemoryServer } = require("mongodb-memory-server");
const { connectDB } = require("../config/db");

module.exports = async () => {
    // Start in-memory Mongo
    global.__MONGOD__ = await MongoMemoryServer.create({
        // optional: choose version
        // binary: { version: '7.0.14' },
    });

    const uri = global.__MONGOD__.getUri();

    // Expose so tests/helpers can reuse (if needed)
    process.env.MONGO_URI = uri;
    process.env.NODE_ENV = "test";

    // Connect Mongoose once per Jest runtime
    await connectDB(uri);
};
