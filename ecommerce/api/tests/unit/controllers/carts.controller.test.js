const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");

const app = require("../../../app");
const User = require("../../../models/User");
const Product = require("../../../models/Product");
const Order = require("../../../models/Order");
const Invoice = require("../../../models/Invoice");
const Cart = require("../../../models/Cart");
const { connectDB, disconnectDB, clearDB } = require("../../../config/db");
const { validUser, loginGetCookie } = require("../../utils/testHelpers");

describe("Carts Controller (HTTP + real DB)", () => {
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

    test("POST /api/v1/carts - should return 200 and create a new cart", async () => {
        const userPayload = validUser();
        const userRes = await new User(userPayload).save();

        const productData = {
            name: "Test Product",
            description: "This is a test product",
            price: 100,
            quantity: 10,
            category: new mongoose.Types.ObjectId(),
            images: ["http://example.com/image1.jpg"],
        };
        const product = await new Product(productData).save();

        const cartData = {
            productId: product._id,
            quantity: 2
        };

        const res = await request(app)
            .post("/api/v1/carts")
            .set("Cookie", await loginGetCookie(userPayload))
            .send(cartData);

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/Cart updated successfully/);
    });

    test("GET /api/v1/carts/:id - should return 200 and retrieve cart (admin)", async () => {
        const adminPayload = { ...validUser(), type: "admin" };
        const adminRes = await new User(adminPayload).save();

        const userPayload = validUser();
        const userRes = await new User(userPayload).save();

        const productData = {
            name: "Test Product",
            description: "This is a test product",
            price: 100,
            quantity: 10,
            category: new mongoose.Types.ObjectId(),
            images: ["http://example.com/image1.jpg"],
        };
        const product = await new Product(productData).save();

        const cartData = {
            productId: product._id,
            quantity: 2
        };

        const cart = await Cart.findOrCreate(userRes._id);
        cart.products.push(cartData);
        await cart.save();

        const res = await request(app)
            .get(`/api/v1/carts/${cart._id.toString()}`)
            .set("Cookie", await loginGetCookie(adminPayload));

        expect(res.status).toBe(200);
        expect(res.body.cart).toBeDefined();
        expect(res.body.cart.products).toHaveLength(1);
        expect(res.body.cart.products[0].productId.toString()).toEqual(product._id.toString());
        expect(res.body.cart.products[0].quantity).toEqual(cartData.quantity);
    });

    test("GET /api/v1/carts/:id - should return 200 and retrieve the user's cart", async () => {
        const userPayload = validUser();
        const userRes = await new User(userPayload).save();

        const productData = {
            name: "Test Product",
            description: "This is a test product",
            price: 100,
            quantity: 10,
            category: new mongoose.Types.ObjectId(),
            images: ["http://example.com/image1.jpg"],
        };
        const product = await new Product(productData).save();

        const cartData = {
            productId: product._id,
            quantity: 2
        };

        const cart = await Cart.findOrCreate(userRes._id);
        cart.products.push(cartData);
        await cart.save();

        const res = await request(app)
            .get(`/api/v1/carts/${cart._id.toString()}`)
            .set("Cookie", await loginGetCookie(userPayload))

        expect(res.status).toBe(200);
        expect(res.body.cart).toBeDefined();
        expect(res.body.cart.products).toHaveLength(1);
        expect(res.body.cart.products[0].productId.toString()).toEqual(product._id.toString());
        expect(res.body.cart.products[0].quantity).toEqual(cartData.quantity);
    });

    test("GET /api/v1/carts/:id - should return 403 when accessing another user's cart", async () => {
        const userPayload = validUser();
        const userRes = await new User(userPayload).save();

        const productData = {
            name: "Test Product",
            description: "This is a test product",
            price: 100,
            quantity: 10,
            category: new mongoose.Types.ObjectId(),
            images: ["http://example.com/image1.jpg"],
        };
        const product = await new Product(productData).save();

        const cartData = {
            productId: product._id,
            quantity: 2
        };

        const cart = await Cart.findOrCreate(userRes._id);
        cart.products.push(cartData);
        await cart.save();

        const userPayload2 = validUser();
        const userRes2 = await new User(userPayload2).save();

        const res = await request(app)
            .get(`/api/v1/carts/${cart._id.toString()}`)
            .set("Cookie", await loginGetCookie(userPayload2));

        expect(res.status).toBe(403);
    });

    test("GET /api/v1/carts/:id - should return 404 if cart not found", async () => {
        const userPayload = validUser();
        const userRes = await new User(userPayload).save();

        const fakeCartId = new mongoose.Types.ObjectId();

        const res = await request(app)
            .get(`/api/v1/carts/${fakeCartId.toString()}`)
            .set("Cookie", await loginGetCookie(userPayload));

        expect(res.status).toBe(404);
    });

    test("DELETE /api/v1/carts/items/:productId - should return 200 and remove the user's cart", async () => {
        const userPayload = validUser();
        const userRes = await new User(userPayload).save();

        const productData = {
            name: "Test Product",
            description: "This is a test product",
            price: 100,
            quantity: 10,
            category: new mongoose.Types.ObjectId(),
            images: ["http://example.com/image1.jpg"],
        };
        const product = await new Product(productData).save();

        const cartData = {
            productId: product._id,
            quantity: 2
        };

        const cart = await Cart.findOrCreate(userRes._id);
        cart.products.push(cartData);
        await cart.save();

        const res = await request(app)
            .delete(`/api/v1/carts/items/${product._id.toString()}?quantity=1`)
            .set("Cookie", await loginGetCookie(userPayload))

        console.log(res.body);

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/Cart updated successfully/);
        expect(res.body.cart).toBeDefined();
        expect(res.body.cart.products).toHaveLength(1);
        expect(res.body.cart.products[0].productId.toString()).toEqual(product._id.toString());
        expect(res.body.cart.products[0].quantity).toEqual(1);
    });

    test("DELETE /api/v1/carts/remove - should return 404 if cart not found", async () => {
        const userPayload = validUser();
        const userRes = await new User(userPayload).save();



        const res = await request(app)
            .delete(`/api/v1/carts/remove`)
            .set("Cookie", await loginGetCookie(userPayload));

        expect(res.status).toBe(404);
        
    });
});