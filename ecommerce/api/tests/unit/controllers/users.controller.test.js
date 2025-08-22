const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");

const app = require("../../../app");
const User = require("../../../models/User");
const { connectDB, disconnectDB, clearDB } = require("../../../config/db");
const { validUser, loginGetCookie } = require("../../utils/testHelpers");

describe("Users Controller (HTTP + real DB)", () => {
    let mongod;

    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();

        process.env.NODE_ENV = "test";
        process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret_key";
        process.env.JWT_EXPIRES_IN = "1d";
        process.env.COOKIE_SECURE = "false";
        process.env.COOKIE_SAME_SITE = "Lax";

        await connectDB(uri);
    });

    afterEach(async () => {
        await clearDB();
    });

    afterAll(async () => {
        await disconnectDB();
        if (mongod) await mongod.stop();
    });

    test("POST /api/users/register - should register a new user", async () => {
        const userPayload = validUser();

        const res = await request(app)
            .post("/api/v1/users/register")
            .send(userPayload);

        expect(res.status).toBe(201);
        expect(res.body.message).toMatch(/User registered successfully/);

        const userInDb = await User.findOne({ email: userPayload.email });
        expect(userInDb).not.toBeNull();
        expect(userInDb.firstname).toBe(userPayload.firstname);
    });

    test("POST /api/v1/users/register - should not register user with existing email", async () => {
        const userPayload = validUser();

        // First registration
        await new User(userPayload).save();

        // Attempt to register again with the same email
        const res = await request(app)
            .post("/api/v1/users/register")
            .send(userPayload);

        expect(res.status).toBe(409);
        expect(res.body.error).toMatch(/Email already registered/);
    });

    test("POST /api/v1/users/login - should login an existing user", async () => {
        const userPayload = validUser();

        await new User(userPayload).save();

        const res = await request(app).post("/api/v1/users/login").send({
            email: userPayload.email,
            password: userPayload.password,
        });

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/Login successful/);
        expect(res.body.user).toHaveProperty("email", userPayload.email);
        expect(res.body.user).toHaveProperty(
            "firstname",
            userPayload.firstname,
        );
        expect(res.body.user).toHaveProperty("lastname", userPayload.lastname);
    });

    test("POST /api/v1/users/login - should not login with unregistered email", async () => {
        const res = await request(app).post("/api/v1/users/login").send({
            email: "unregistered@example.com",
            password: "password123",
        });

        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/Email or password is incorrect/);
    });

    test("POST /api/v1/users/login - should not login with incorrect password", async () => {
        const userPayload = validUser();

        await new User(userPayload).save();

        const res = await request(app).post("/api/v1/users/login").send({
            email: userPayload.email,
            password: "wrongpassword",
        });

        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/Email or password is incorrect/);
    });

    test("POST /api/v1/users/logout - should logout logged in user", async () => {
        const userPayload = validUser();

        await new User(userPayload).save();

        const loginRes = await request(app).post("/api/v1/users/login").send({
            email: userPayload.email,
            password: userPayload.password,
        });

        const cookies = loginRes.headers["set-cookie"];

        const res = await request(app)
            .post("/api/v1/users/logout")
            .set("Cookie", cookies);

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/Logout successful/);
    });

    test("POST /api/v1/users/forgot-password - should send reset password email", async () => {
        const userPayload = validUser();
        await new User(userPayload).save();

        const res = await request(app)
            .post("/api/v1/users/forgot-password")
            .send({
                email: userPayload.email,
            });

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/Password reset email sent/);
    });

    test("GET /api/v1/users - should get all users (admin/staff only)", async () => {
        const adminPayload = { ...validUser(), type: "admin" };
        const staffPayload = { ...validUser(), type: "staff" };

        await new User(adminPayload).save();
        await new User(staffPayload).save();

        const res = await request(app)
            .get("/api/v1/users")
            .set("Cookie", await loginGetCookie(adminPayload));

        expect(res.status).toBe(200);
        expect(res.body.users).toHaveLength(2);
        expect(res.body.users[0]).toHaveProperty("type", "admin");
        expect(res.body.users[1]).toHaveProperty("type", "staff");
    });

    test("GET /api/v1/users/:id - should get user by ID (self or admin/staff)", async () => {
        const userPayload = validUser();
        const adminPayload = { ...validUser(), type: "admin" };

        const userRes = await new User(userPayload).save();
        const adminRes = await new User(adminPayload).save();

        const userCookies = await loginGetCookie(userPayload);
        const adminCookies = await loginGetCookie(adminPayload);

        // User fetching own data
        const resSelf = await request(app)
            .get(`/api/v1/users/${userRes._id.toString()}`)
            .set("Cookie", userCookies);

        expect(resSelf.status).toBe(200);
        expect(resSelf.body.user).toHaveProperty("email", userPayload.email);

        // Admin fetching another user's data
        const resAdmin = await request(app)
            .get(`/api/v1/users/${userRes._id.toString()}`)
            .set("Cookie", adminCookies);

        expect(resAdmin.status).toBe(200);
        expect(resAdmin.body.user).toHaveProperty("email", userPayload.email);
    });

    test("GET /api/v1/users/:id - should fail if unauthorized", async () => {
        const userPayload = validUser();
        await new User(userPayload).save();

        const res = await request(app)
            .get(`/api/v1/users/${new mongoose.Types.ObjectId()}`)
            .set("Cookie", await loginGetCookie(userPayload));

        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/Forbidden/);
    });

    test("GET /api/v1/users/:id - should fail if authorized and user not found", async () => {
        const adminPayload = { ...validUser(), type: "admin" };

        await new User(adminPayload).save();

        const res = await request(app)
            .get(`/api/v1/users/${new mongoose.Types.ObjectId()}`)
            .set("Cookie", await loginGetCookie(adminPayload));

        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/User not found/);
    });

    test("PUT /api/v1/users/:id - should update user by ID (admin)", async () => {
        const userPayload = validUser();
        const adminPayload = { ...validUser(), type: "admin" };

        const userRes = await new User(userPayload).save();
        const adminRes = await new User(adminPayload).save();

        // Admin updating another user's data
        const resAdmin = await request(app)
            .put(`/api/v1/users/${userRes._id.toString()}`)
            .set("Cookie", await loginGetCookie(adminPayload))
            .send({ firstname: "AdminUpdatedName" });

        expect(resAdmin.status).toBe(200);
        expect(resAdmin.body.user).toHaveProperty(
            "firstname",
            "AdminUpdatedName",
        );
    });

    test("PUT /api/v1/users/:id - should fail to update if user not found", async () => {
        const adminPayload = { ...validUser(), type: "admin" };

        await new User(adminPayload).save();

        const res = await request(app)
            .put(`/api/v1/users/${new mongoose.Types.ObjectId()}`)
            .set("Cookie", await loginGetCookie(adminPayload))
            .send({ firstname: "NonExistentUser" });

        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/User not found/);
    });

    test("PUT /api/v1/users/:id - should fail to update if authorized user is not admin", async () => {
        const userPayload = validUser();

        const userRes = await new User(userPayload).save();

        const res = await request(app)
            .put(`/api/v1/users/${userRes._id.toString()}`)
            .set("Cookie", await loginGetCookie(userPayload))
            .send({ firstname: "NonAdminUser" });

        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/Forbidden/);
    });

    test("DELETE /api/v1/users/:id - should delete user by ID (admin)", async () => {
        const userPayload = validUser();

        const adminPayload = { ...validUser(), type: "admin" };

        const userRes = await new User(userPayload).save();
        const adminRes = await new User(adminPayload).save();

        // Admin deleting another user's data
        const resAdmin = await request(app)
            .delete(`/api/v1/users/${userRes._id.toString()}`)
            .set("Cookie", await loginGetCookie(adminPayload));

        expect(resAdmin.status).toBe(200);
        expect(resAdmin.body.message).toMatch(/User deleted successfully/);
    });

    test("DELETE /api/v1/users/:id - should fail to delete if user not found", async () => {
        const adminPayload = { ...validUser(), type: "admin" };

        await new User(adminPayload).save();

        const res = await request(app)
            .delete(`/api/v1/users/${new mongoose.Types.ObjectId().toString()}`)
            .set("Cookie", await loginGetCookie(adminPayload));

        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/User not found/);
    });

    test("DELETE /api/v1/users/:id - should fail to delete if authorized user is not admin", async () => {
        const userPayload = validUser();

        const userRes = await new User(userPayload).save();

        const res = await request(app)
            .delete(`/api/v1/users/${userRes._id.toString()}`)
            .set("Cookie", await loginGetCookie(userPayload));

        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/Forbidden/);
    });
});
