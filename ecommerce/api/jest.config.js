module.exports = {
    testEnvironment: "node",
    testMatch: "<rootDir>/tests/**/*.test.js",
    globalSetup: "<rootDir>/tests/mongoMemory.setup.js",
    globalTeardown: "<rootDir>/tests/mongoMemory.teardown.js",
    setupFilesAfterEnv: ["<rootDir>/tests/setupAfterEnv.js"],
    transform: {},
    transformIgnorePatterns: ["/node_modules/"],
    restoreMocks: true,
    clearMocks: true,
    resetMocks: true,
};
