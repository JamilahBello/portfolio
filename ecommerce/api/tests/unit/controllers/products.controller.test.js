const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");

const app = require("../../../app");
const User = require("../../../models/User");
const Product = require("../../../models/Product");
const { connectDB, disconnectDB, clearDB } = require("../../../config/db");
const { validUser, loginGetCookie } = require("../../utils/testHelpers");

describe("Products Controller (HTTP + real DB)", () => {
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

    test("POST /api/v1/products - should create a new product (admin)", async () => {
        const adminPayload = { ...validUser(), type: "admin" };    

        const productData = {
            name: "Test Product",
            description: "This is a test product",
            price: 100,
            quantity: 10,
            category: new mongoose.Types.ObjectId(),
            images: ["http://example.com/image1.jpg"],
        };

        await new User(adminPayload).save();

        const res = await request(app)
            .post("/api/v1/products")
            .set("Cookie", await loginGetCookie(adminPayload))
            .send(productData);
        
        expect(res.status).toBe(201);
        expect(res.body.message).toMatch(/Product created successfully/);
    });

    test("POST /api/v1/products - should return 403 if user is not admin", async () => {
        const userPayload = validUser();
        await new User(userPayload).save();

        const res = await request(app)
            .post("/api/v1/products")
            .set("Cookie", await loginGetCookie(userPayload))
            .send({});

        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/Forbidden: insufficient privileges/);
    });

    test("GET /api/v1/products - should fetch products", async () => {
        const userPayload = validUser();
        await new User(userPayload).save();

        const product1 = await new Product({
            name: "Product 1",
            description: "Description 1",
            price: 50,
            quantity: 5,
            category: new mongoose.Types.ObjectId(),
            images: [],
        }).save();

        const product2 = await new Product({
            name: "Product 2",
            description: "Description 2",
            price: 150,
            quantity: 15,
            category: new mongoose.Types.ObjectId(),
            images: [],
        }).save();

        const res = await request(app)
            .get("/api/v1/products")
            .set("Cookie", await loginGetCookie(userPayload));

        expect(res.status).toBe(200);
        expect(res.body.products.length).toBe(2);
        expect(res.body.products[0]).toHaveProperty("name", product1.name);
        expect(res.body.products[1]).toHaveProperty("name", product2.name);
    });

    test("GET /api/v1/products/:id - should fetch a single product", async () => {
        const userPayload = validUser();
        await new User(userPayload).save();

        const product = await new Product({
            name: "Product 1",
            description: "Description 1",
            price: 50,
            quantity: 5,
            category: new mongoose.Types.ObjectId(),
            images: [],
        }).save();

        const res = await request(app)
            .get(`/api/v1/products/${product._id}`)
            .set("Cookie", await loginGetCookie(userPayload));

        expect(res.status).toBe(200);
        expect(res.body.product).toHaveProperty("name", product.name);
    });

    test("PUT /api/v1/products/:id - should update a product (admin)", async () => {
        const adminPayload = { ...validUser(), type: "admin" };
        await new User(adminPayload).save();

        const product = await new Product({
            name: "Product 1",
            description: "Description 1",
            price: 50,
            quantity: 5,
            category: new mongoose.Types.ObjectId(),
            images: [],
        }).save();

        const updates = { price: 75, quantity: 10 };

        const res = await request(app)
            .put(`/api/v1/products/${product._id.toString()}`)
            .set("Cookie", await loginGetCookie(adminPayload))
            .send(updates);

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/Product updated successfully/);
        expect(res.body.product).toHaveProperty("price", updates.price);
        expect(res.body.product).toHaveProperty("quantity", updates.quantity);
    });

    test("PUT /api/v1/products/:id - should return 403 if user is not admin", async () => {
        const userPayload = validUser();
        await new User(userPayload).save();

        const product = await new Product({
            name: "Product 1",
            description: "Description 1",
            price: 50,
            quantity: 5,
            category: new mongoose.Types.ObjectId(),
            images: [],
        }).save();

        const updates = { price: 75, quantity: 10 };

        const res = await request(app)
            .put(`/api/v1/products/${product._id.toString()}`)
            .set("Cookie", await loginGetCookie(userPayload))
            .send(updates);

        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/Forbidden: insufficient privileges/);
    });

    test("DELETE /api/v1/products/:id - should delete a product (admin)", async () => {
        const adminPayload = { ...validUser(), type: "admin" };
        await new User(adminPayload).save();

        const product = await new Product({
            name: "Product 1",
            description: "Description 1",
            price: 50,
            quantity: 5,
            category: new mongoose.Types.ObjectId(),
            images: [],
        }).save();

        const res = await request(app)
            .delete(`/api/v1/products/${product._id.toString()}`)
            .set("Cookie", await loginGetCookie(adminPayload));

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/Product deleted successfully/);
    });

    test("DELETE /api/v1/products/:id - should return 403 if user is not admin", async () => {
        const userPayload = validUser();
        await new User(userPayload).save();

        const product = await new Product({
            name: "Product 1",
            description: "Description 1",
            price: 50,
            quantity: 5,
            category: new mongoose.Types.ObjectId(),
            images: [],
        }).save();

        const res = await request(app)
            .delete(`/api/v1/products/${product._id.toString()}`)
            .set("Cookie", await loginGetCookie(userPayload));

        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/Forbidden: insufficient privileges/);
    });
});