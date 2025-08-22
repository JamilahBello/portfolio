const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");

const app = require("../../../app");
const User = require("../../../models/User");
const Product = require("../../../models/Product");
const Order = require("../../../models/Order");
const Invoice = require("../../../models/Invoice");
const { connectDB, disconnectDB, clearDB } = require("../../../config/db");
const { validUser, loginGetCookie } = require("../../utils/testHelpers");

describe("Invoices, Controller (HTTP + real DB)", () => {
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

    test("POST /api/v1/invoices - should create a new paid invoice without specified amount (admin)", async () => {
        const adminPayload = { ...validUser(), type: "admin" };
        await new User(adminPayload).save();

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

        const orderData = {
            userId: userRes._id,
            products: [{ productId: product._id, quantity: 2, price: product.price }],
            shippingAddress: {
                street: "123 Main St",
                city: new mongoose.Types.ObjectId(),
                state: new mongoose.Types.ObjectId(),
            },
            paymentMethod: "credit_card",
            deliveryFee: 50,
        };

        const order = await new Order(orderData).save();

        const res = await request(app)
            .post("/api/v1/invoices")
            .set("Cookie", await loginGetCookie(adminPayload))
            .send({ orderId: order._id, proofOfPayment: "http://example.com/proof.jpg" });

        expect(res.status).toBe(201);
        expect(res.body.message).toMatch(/Invoice created successfully/);
        expect(res.body.invoice.totalAmount).toBe(200);
    });

    test("POST /api/v1/invoices - should create a new paid invoice with specified amount (admin)", async() => {
        const adminPayload = { ...validUser(), type: "admin" };
        await new User(adminPayload).save();

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

        const orderData = {
            userId: userRes._id,
            products: [{ productId: product._id, quantity: 2, price: product.price }],
            shippingAddress: {
                street: "123 Main St",
                city: new mongoose.Types.ObjectId(),
                state: new mongoose.Types.ObjectId(),
            },
            paymentMethod: "credit_card",
            deliveryFee: 50,
        };

        const order = await new Order(orderData).save();

        const res = await request(app)
            .post("/api/v1/invoices")
            .set("Cookie", await loginGetCookie(adminPayload))
            .send({ orderId: order._id, discountAmount: 20, proofOfPayment: "http://example.com/proof.jpg", discountReason: "Discount applied" });

        expect(res.status).toBe(201);
        expect(res.body.message).toMatch(/Invoice created successfully/);
        expect(res.body.invoice.totalAmount).toBe(200);
        expect(res.body.invoice.discountAmount).toBe(20);
        expect(res.body.invoice.discountReason).toBe("Discount applied");
    });

    test("POST /api/v1/invoices - should return 404 if order is not found", async () => {
        const adminPayload = { ...validUser(), type: "admin" };
        await new User(adminPayload).save();

        const res = await request(app)
            .post("/api/v1/invoices")
            .set("Cookie", await loginGetCookie(adminPayload))
            .send({ orderId: new mongoose.Types.ObjectId(), proofOfPayment: "http://example.com/proof.jpg" });

        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/Order not found/);
    });

    test("POST /api/v1/invoices - should return 403 if user is not authorized", async () => {
        const userPayload = validUser();
        await new User(userPayload).save();

        const adminPayload = { ...validUser(), type: "admin" };
        await new User(adminPayload).save();

        const res = await request(app)
            .post("/api/v1/invoices")
            .set("Cookie", await loginGetCookie(userPayload))
            .send({ orderId: new mongoose.Types.ObjectId(), proofOfPayment: "http://example.com/proof.jpg" });

        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/Forbidden: insufficient privileges/);
    });

    test("GET /api/v1/invoices - should return 401 if user is not authenticated", async () => {
        const res = await request(app)
            .get("/api/v1/invoices");

        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/Token not found/);
    });

    test("GET /api/v1/invoices - should return 200 and fetch invoices for (admin)", async () => {
        const adminPayload = { ...validUser(), type: "admin" };
        await new User(adminPayload).save();

        const userPayload = validUser();
        const userRes = await new User(userPayload).save();

        const userPayload2 = validUser();
        const userRes2 =await new User(userPayload2).save();

        const productData = {
            name: "Test Product",
            description: "This is a test product",
            price: 100,
            quantity: 10,
            category: new mongoose.Types.ObjectId(),
            images: ["http://example.com/image1.jpg"],
        };
        const product = await new Product(productData).save();

        const orderData = {
            userId: userRes._id,
            products: [{ productId: product._id, quantity: 2, price: product.price }],
            shippingAddress: {
                street: "123 Main St",
                city: new mongoose.Types.ObjectId(),
                state: new mongoose.Types.ObjectId(),
            },
            paymentMethod: "credit_card",
            deliveryFee: 50,
        };

        const orderData2 = {
            userId: userRes2._id,
            products: [{ productId: product._id, quantity: 1, price: product.price }],
            shippingAddress: {
                street: "456 Elm St",
                city: new mongoose.Types.ObjectId(),
                state: new mongoose.Types.ObjectId(),
            },
            paymentMethod: "credit_card",
            deliveryFee: 50,
        };

        const order = await new Order(orderData).save();
        const order2 = await new Order(orderData2).save();

        const invoiceData = {
            userId: userRes._id,
            orderId: order._id,
            invoiceNumber: "INV-001",
            totalAmount: 200,
            discountAmount: 20,
            discountReason: "Discount applied",
            products: order.products,
        };
        const invoice = await new Invoice(invoiceData).save();

        const invoiceData2 = {
            userId: userRes2._id,
            orderId: order2._id,
            invoiceNumber: "INV-002",
            totalAmount: 100,
            discountAmount: 10,
            discountReason: "Discount applied",
            products: order2.products,
        };
        const invoice2 = await new Invoice(invoiceData2).save();

        const res = await request(app)
            .get("/api/v1/invoices")
            .set("Cookie", await loginGetCookie(adminPayload));

        expect(res.status).toBe(200);
        expect(res.body.invoices).toBeDefined();
        expect(res.body.invoices.length).toBe(2);
        expect(res.body.invoices[0]._id.toString()).toBe(invoice._id.toString());
        expect(res.body.invoices[1]._id.toString()).toBe(invoice2._id.toString());
    });

    test("GET /api/v1/invoices - should return 200 and fetch invoices for (customer)", async () => {
        const userPayload = validUser();
        const userRes = await new User(userPayload).save();

        const userPayload2 = validUser();
        const userRes2 =await new User(userPayload2).save();

        const productData = {
            name: "Test Product",
            description: "This is a test product",
            price: 100,
            quantity: 10,
            category: new mongoose.Types.ObjectId(),
            images: ["http://example.com/image1.jpg"],
        };
        const product = await new Product(productData).save();

        const orderData = {
            userId: userRes._id,
            products: [{ productId: product._id, quantity: 2, price: product.price }],
            shippingAddress: {
                street: "123 Main St",
                city: new mongoose.Types.ObjectId(),
                state: new mongoose.Types.ObjectId(),
            },
            paymentMethod: "credit_card",
            deliveryFee: 50,
        };

        const orderData2 = {
            userId: userRes2._id,
            products: [{ productId: product._id, quantity: 1, price: product.price }],
            shippingAddress: {
                street: "456 Elm St",
                city: new mongoose.Types.ObjectId(),
                state: new mongoose.Types.ObjectId(),
            },
            paymentMethod: "credit_card",
            deliveryFee: 50,
        };

        const order = await new Order(orderData).save();
        const order2 = await new Order(orderData2).save();

        const invoiceData = {
            userId: userRes._id,
            orderId: order._id,
            invoiceNumber: "INV-001",
            totalAmount: 200,
            discountAmount: 20,
            discountReason: "Discount applied",
            products: order.products,
        };
        const invoice = await new Invoice(invoiceData).save();

        const invoiceData2 = {
            userId: userRes2._id,
            orderId: order2._id,
            invoiceNumber: "INV-002",
            totalAmount: 100,
            discountAmount: 10,
            discountReason: "Discount applied",
            products: order2.products,
        };
        const invoice2 = await new Invoice(invoiceData2).save();

        const res = await request(app)
            .get("/api/v1/invoices")
            .set("Cookie", await loginGetCookie(userPayload));

        expect(res.status).toBe(200);
        expect(res.body.invoices).toBeDefined();
        expect(res.body.invoices.length).toBe(1);
        expect(res.body.invoices[0]._id.toString()).toBe(invoice._id.toString());
    });

    test("GET /api/v1/invoices/:id - should return 404 if invoice not found", async () => {
        const userPayload = validUser();
        await new User(userPayload).save();

        const res = await request(app)
            .get(`/api/v1/invoices/${new mongoose.Types.ObjectId()}`)
            .set("Cookie", await loginGetCookie(userPayload));

        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/Invoice not found/);
    });

    test("GET /api/v1/invoices/:id - should return 403 if user is not authorized", async () => {
        const userPayload = validUser();
        const userRes = await new User(userPayload).save();

        const userPayload2 = validUser();
        const userRes2 = await new User(userPayload2).save();

        const invoice = await new Invoice({
            userId: userRes._id,
            orderId: new mongoose.Types.ObjectId(),
            invoiceNumber: "INV-001",
            totalAmount: 200,
            discountAmount: 20,
            discountReason: "Discount applied",
            products: [],
        }).save();

        const res = await request(app)
            .get(`/api/v1/invoices/${invoice._id}`)
            .set("Cookie", await loginGetCookie(userPayload2));

        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/Unauthorized/);
    });

    test("GET /api/v1/invoices/:id should return 200 and fetch invoice (admin)", async () => {
        const adminPayload = { ...validUser(), type: "admin" };
        const adminRes = await new User(adminPayload).save();
        
        const userPayload = validUser();
        const userRes = await new User(userPayload).save();

        const invoice = await new Invoice({
            userId: userRes._id,
            orderId: new mongoose.Types.ObjectId(),
            invoiceNumber: "INV-001",
            totalAmount: 200,
            discountAmount: 20,
            discountReason: "Discount applied",
            products: [],
        }).save();

        const res = await request(app)
            .get(`/api/v1/invoices/${invoice._id}`)
            .set("Cookie", await loginGetCookie(adminPayload));

        expect(res.status).toBe(200);
        expect(res.body.invoice).toBeDefined();
        expect(res.body.invoice._id.toString()).toBe(invoice._id.toString());
    });

    test("GET /api/v1/invoices/:id should return 200 and fetch invoice (customer)", async () => {
        const userPayload = validUser();
        const userRes = await new User(userPayload).save();

        const invoice = await new Invoice({
            userId: userRes._id,
            orderId: new mongoose.Types.ObjectId(),
            invoiceNumber: "INV-001",
            totalAmount: 200,
            discountAmount: 20,
            discountReason: "Discount applied",
            products: [],
        }).save();

        const res = await request(app)
            .get(`/api/v1/invoices/${invoice._id}`)
            .set("Cookie", await loginGetCookie(userPayload));

        expect(res.status).toBe(200);
        expect(res.body.invoice).toBeDefined();
        expect(res.body.invoice._id.toString()).toBe(invoice._id.toString());
    });

    test("DELETE /api/v1/invoices/:id should return 403 if user is not authorized", async () => {
        const userPayload = validUser();
        const userRes = await new User(userPayload).save();

        const invoice = await new Invoice({
            userId: userRes._id,
            orderId: new mongoose.Types.ObjectId(),
            invoiceNumber: "INV-001",
            totalAmount: 200,
            discountAmount: 20,
            discountReason: "Discount applied",
            products: [],
        }).save();

        const res = await request(app)
            .delete(`/api/v1/invoices/${invoice._id}`)
            .set("Cookie", await loginGetCookie(userPayload));

        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/Forbidden: insufficient privileges/);
    });

    test("DELETE /api/v1/invoices/:id should return 200 if user is admin", async () => {
        const adminPayload = { ...validUser(), type: "admin" };
        const adminRes = await new User(adminPayload).save();

        const userPayload = validUser();
        const userRes = await new User(userPayload).save();

        const invoice = await new Invoice({
            userId: userRes._id,
            orderId: new mongoose.Types.ObjectId(),
            invoiceNumber: "INV-001",
            totalAmount: 200,
            discountAmount: 20,
            discountReason: "Discount applied",
            products: [],
        }).save();

        const res = await request(app)
            .delete(`/api/v1/invoices/${invoice._id}`)
            .set("Cookie", await loginGetCookie(adminPayload));

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/Invoice deleted successfully/);
    });

    test("DELETE /api/v1/invoices/:id should return 404 if invoice not found", async () => {
        const adminPayload = { ...validUser(), type: "admin" };
        const adminRes = await new User(adminPayload).save();

        const res = await request(app)
            .delete(`/api/v1/invoices/${new mongoose.Types.ObjectId()}`)
            .set("Cookie", await loginGetCookie(adminPayload));

        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/Invoice not found/);
    });

    test("DELETE /api/v1/invoices/:id should return 400 if invoice is paid", async () => {
        const adminPayload = { ...validUser(), type: "admin" };
        const adminRes = await new User(adminPayload).save();

        const userPayload = validUser();
        const userRes = await new User(userPayload).save();

        const invoice = await new Invoice({
            userId: userRes._id,
            orderId: new mongoose.Types.ObjectId(),
            invoiceNumber: "INV-001",
            totalAmount: 200,
            discountAmount: 20,
            discountReason: "Discount applied",
            products: [],
            status: "paid",
        }).save();

        const res = await request(app)
            .delete(`/api/v1/invoices/${invoice._id}`)
            .set("Cookie", await loginGetCookie(adminPayload));

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Invoice already paid/);
    });

    test("POST /api/v1/invoices/pay should return 403 if user is not authorized", async () => {
        const userPayload = validUser();
        const userRes = await new User(userPayload).save();

        const invoice = await new Invoice({
            userId: userRes._id,
            orderId: new mongoose.Types.ObjectId(),
            invoiceNumber: "INV-001",
            totalAmount: 200,
            discountAmount: 20,
            discountReason: "Discount applied",
            products: [],
        }).save();

        const res = await request(app)
            .post(`/api/v1/invoices/pay`)
            .set("Cookie", await loginGetCookie(userPayload))
            .send({
                invoiceId: invoice._id,
                proofOfPayment: "http://example.com/proof.jpg",
            });

        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/Forbidden: insufficient privileges/);
    });

    test("POST /api/v1/invoices/pay should return 200 if payment is successful", async () => {
        const adminPayload = { ...validUser(), type: "admin" };
        const adminRes = await new User(adminPayload).save();

        const userPayload = validUser();
        const userRes = await new User(userPayload).save();

        const invoice = await new Invoice({
            userId: userRes._id,
            orderId: new mongoose.Types.ObjectId(),
            invoiceNumber: "INV-001",
            totalAmount: 200,
            discountAmount: 20,
            discountReason: "Discount applied",
            products: [],
        }).save();

        const res = await request(app)
            .post(`/api/v1/invoices/pay`)
            .set("Cookie", await loginGetCookie(adminPayload))
            .send({
                invoiceId: invoice._id,
                proofOfPayment: "http://example.com/proof.jpg",
            });

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/Invoice paid successful/);
    });

    test("POST /api/v1/invoices/pay should return 404 if invoice is not found", async () => {
        const adminPayload = { ...validUser(), type: "admin" };
        const adminRes = await new User(adminPayload).save();

        const res = await request(app)
            .post(`/api/v1/invoices/pay`)
            .set("Cookie", await loginGetCookie(adminPayload))
            .send({
                invoiceId: new mongoose.Types.ObjectId(),
                proofOfPayment: "http://example.com/proof.jpg",
            });

        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/Invoice not found/);
    });

    test("POST /api/v1/invoices/pay should return 400 if invoice already paid", async () => {
        const adminPayload = { ...validUser(), type: "admin" };
        const adminRes = await new User(adminPayload).save();

        const userPayload = validUser();
        const userRes = await new User(userPayload).save();

        const invoice = await new Invoice({
            userId: userRes._id,
            orderId: new mongoose.Types.ObjectId(),
            invoiceNumber: "INV-001",
            totalAmount: 200,
            discountAmount: 20,
            discountReason: "Discount applied",
            products: [],
            status: "paid",
        }).save();

        const res = await request(app)
            .post(`/api/v1/invoices/pay`)
            .set("Cookie", await loginGetCookie(adminPayload))
            .send({
                invoiceId: invoice._id,
                proofOfPayment: "http://example.com/proof.jpg",
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Invoice already paid/);
    });
});
