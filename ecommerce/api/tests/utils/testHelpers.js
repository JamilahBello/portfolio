const request = require("supertest");
const app = require("../../app");
const User = require("../../models/User");
const Product = require("../../models/Product");
const State = require("../../models/State");
const City = require("../../models/City");

async function createUser(payload = {}) {
    const user = new User({
        email: payload.email || `user${Date.now()}@ex.com`,
        password: payload.password || "Secret123!",
        firstname: payload.firstname || "Test",
        lastname: payload.lastname || "User",
        phone:
            payload.phone ||
            `0${Math.floor(1000000000 + Math.random() * 8999999999)}`,
        type: payload.type || "customer",
    });
    await user.save();
    return user;
}

async function loginGetCookie({ email, password }) {
    const res = await request(app)
        .post("/api/v1/users/login")
        .send({ email, password });
    return res.headers["set-cookie"];
}

async function createStateAndCity() {
    const state = await new State({
        name: "Test State",
        code: "TS"
    }).save();
    const city = await new City({
        name: "Test City",
        state: state._id,
        coordinates: { type: "Point", coordinates: [0, 0] },
    }).save();
    return { state, city };
}

async function createAndLoginRole(type = "admin") {
    const email = `${type}${Date.now()}@ex.com`;
    const password = "Secret123!";
    await createUser({ type, email, password });
    const cookie = await loginGetCookie({ email, password });
    return { cookie, email, password };
}

async function createProductDoc(overrides = {}) {
    const product = new Product({
        name: overrides.name || `Prod ${Date.now()}`,
        description: overrides.description || "Test product",
        price: overrides.price ?? 1500,
        quantity: overrides.quantity ?? 10,
        category: overrides.category || "general",
        tags: overrides.tags || ["tag"],
        images: overrides.images || [],
        isActive: overrides.isActive ?? true,
        createdBy: overrides.createdBy || null,
    });
    await product.save();
    return product;
}

const uniquePhone = () =>
    "0" +
    Math.floor(10_000_000_000 + Math.random() * 89_999_999_999)
        .toString()
        .slice(0, 10);

const uniqueEmail = () =>
    `user${Date.now()}${Math.random().toString(36).slice(2, 6)}@ex.com`;

const validUser = () => ({
    email: uniqueEmail(),
    password: "Secret123!",
    phone: uniquePhone(),
    firstname: "Test",
    lastname: "User",
    type: "customer",
});

module.exports = {
    app,
    createUser,
    loginGetCookie,
    createAndLoginRole,
    createProductDoc,
    validUser,
    uniquePhone,
    uniqueEmail,
    createStateAndCity,
};
