const mongoose = require("mongoose");

const connectDB = async (uri) => {
    try {
        await mongoose.connect(uri || process.env.MONGO_URI);
        console.log("✅ MongoDB connected");
    } catch (err) {
        console.error("❌ DB connection failed:", err.message);
        process.exit(1);
    }
};

const disconnectDB = async () => {
    try {
        await mongoose.disconnect();
        console.log("✅ MongoDB disconnected");
    } catch (err) {
        console.error("❌ DB disconnection failed:", err.message);
    }
};

const clearDB = async () => {
    const { collections } = mongoose.connection;
    const tasks = Object.values(collections).map((c) => c.deleteMany({}));
    await Promise.all(tasks);
};

module.exports = { connectDB, disconnectDB, clearDB };
