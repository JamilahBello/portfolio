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

describe("Orders Controller (HTTP + real DB)", () => {
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

    test("POST /api/v1/orders - should create a new order", async () => {
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
            deliveryFee: 10,
        }

        const res = await request(app)
            .post("/api/v1/orders")
            .set("Cookie", await loginGetCookie(userPayload))
            .send(orderData);

        const refreshed = await Product.findById(product._id).lean();
        expect(refreshed.quantity).toBe(8);
        expect(res.status).toBe(201);
        expect(res.body.message).toMatch(/Order created successfully/);
    });

    test("POST /api/v1/orders - should return 400 if product quantity is insufficient", async () => {
        const userPayload = validUser();
        const userRes = await new User(userPayload).save();

        const productData = {
            name: "Test Product",
            description: "This is a test product",
            price: 100,
            quantity: 1,
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
            deliveryFee: 10,
        }

        const res = await request(app)
            .post("/api/v1/orders")
            .set("Cookie", await loginGetCookie(userPayload))
            .send(orderData);

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Insufficient stock/);
    });

    test("POST /api/v1/orders - should return 400 if product price is incorrect", async () => {
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
            products: [{ productId: product._id, quantity: 2, price: 50 }],
            shippingAddress: {
                street: "123 Main St",
                city: new mongoose.Types.ObjectId(),
                state: new mongoose.Types.ObjectId(),
            },
            paymentMethod: "credit_card",
            deliveryFee: 10,
        }

        const res = await request(app)
            .post("/api/v1/orders")
            .set("Cookie", await loginGetCookie(userPayload))
            .send(orderData);

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Price mismatch/);
    });

    test("GET /api/v1/orders/:id - should return 200 and the order if it exists", async () => {
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
            deliveryFee: 10,
        }

        const order = await new Order(orderData).save();

        const res = await request(app)
            .get(`/api/v1/orders/${order._id.toString()}`)
            .set("Cookie", await loginGetCookie(userPayload));

        expect(res.status).toBe(200);
        expect(res.body.order).toBeDefined();
        expect(res.body.order._id.toString()).toBe(order._id.toString());
    });

    test("GET /api/v1/orders/:id - should return 404 if order does not exist", async () => {
        const userPayload = validUser();
        const userRes = await new User(userPayload).save();

        const res = await request(app)
            .get(`/api/v1/orders/${new mongoose.Types.ObjectId().toString()}`)
            .set("Cookie", await loginGetCookie(userPayload));

        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/Order not found/);
    });

    test("GET /api/v1/orders - should return 200 and list of orders (customer)", async () => {
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
            deliveryFee: 10,
        }

        await new Order(orderData).save();

        const res = await request(app)
            .get("/api/v1/orders")
            .set("Cookie", await loginGetCookie(userPayload));

        expect(res.status).toBe(200);
        expect(res.body.orders).toBeDefined();
        expect(res.body.orders.length).toBeGreaterThan(0);
    });

    test("GET /api/v1/orders - should return 200 and list of orders (admin)", async () => {
        const adminPayload = { ...validUser(), type: "admin" };
        const adminRes = await new User(adminPayload).save();

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
            userId: adminRes._id,
            products: [{ productId: product._id, quantity: 2, price: product.price }],
            shippingAddress: {
                street: "123 Main St",
                city: new mongoose.Types.ObjectId(),
                state: new mongoose.Types.ObjectId(),
            },
            paymentMethod: "credit_card",
            deliveryFee: 10,
        }

        await new Order(orderData).save();

        const res = await request(app)
            .get("/api/v1/orders")
            .set("Cookie", await loginGetCookie(adminPayload));

        expect(res.status).toBe(200);
        expect(res.body.orders).toBeDefined();
        expect(res.body.orders.length).toBeGreaterThan(0);
    });

    test("GET /api/v1/orders - should return 401 if not authenticated", async () => {
        const res = await request(app)
            .get("/api/v1/orders");

        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/Token not found/);
    });

    test('PUT /api/v1/orders/:id - should update an order (admin)', async () => {
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

        const orderData = {
            userId: userRes._id,
            products: [{ productId: product._id, quantity: 2, price: product.price }],
            shippingAddress: {
                street: "123 Main St",
                city: new mongoose.Types.ObjectId(),
                state: new mongoose.Types.ObjectId(),
            },
            paymentMethod: "credit_card",
            deliveryFee: 10,
        }

        const order = await new Order(orderData).save();

        const invoice = await new Invoice({
            userId: userRes._id,
            orderId: order._id,
            invoiceNumber: `INV-${order._id}-${Date.now()}`,
            products: order.products,
            totalAmount: order.totalAmount,
        }).save();

        const res = await request(app)
            .put(`/api/v1/orders/${order._id}`)
            .set("Cookie", await loginGetCookie(adminPayload))
            .send({ status: "completed" });

        expect(res.status).toBe(200);
        expect(res.body.order).toBeDefined();
        expect(res.body.order.status).toBe("completed");
    });

    test('PUT /api/v1/orders/:id - should return 403 if user is not admin', async () => {
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
            deliveryFee: 10,
        }

        const order = await new Order(orderData).save();

        const res = await request(app)
            .put(`/api/v1/orders/${order._id}`)
            .set("Cookie", await loginGetCookie(userPayload))
            .send({ status: "completed" });

        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/Forbidden: insufficient privileges/);
    });

    test('PUT /api/v1/orders/:id - should return 404 if order not found', async () => {
        const adminPayload = { ...validUser(), type: "admin" };

        await new User(adminPayload).save();

        const res = await request(app)
            .put(`/api/v1/orders/${new mongoose.Types.ObjectId()}`)
            .set("Cookie", await loginGetCookie(adminPayload))
            .send({ status: "completed" });

        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/Order not found/);
    });

    test('DELETE /api/v1/orders/:id - should delete an order (admin)', async () => {
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

        const orderData = {
            userId: userRes._id,
            products: [{ productId: product._id, quantity: 2, price: product.price }],
            shippingAddress: {
                street: "123 Main St",
                city: new mongoose.Types.ObjectId(),
                state: new mongoose.Types.ObjectId(),
            },
            paymentMethod: "credit_card",
            deliveryFee: 10,
        }

        const order = await new Order(orderData).save();
        product.quantity -= orderData.products[0].quantity;
        await product.save();

        const invoice = await new Invoice({
            userId: userRes._id,
            orderId: order._id,
            invoiceNumber: `INV-${order._id}-${Date.now()}`,
            products: order.products,
            totalAmount: order.totalAmount,
        }).save();

        const res = await request(app)
            .delete(`/api/v1/orders/${order._id}`)
            .set("Cookie", await loginGetCookie(adminPayload));

        const deletedOrder = await Order.findById(order._id);
        const deletedInvoice = await Invoice.findOne({ orderId: order._id });

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/Order deleted successfully/);
        expect(deletedOrder.isDeleted).toBe(true);
        expect(deletedOrder.deletedAt).toBeInstanceOf(Date);
        expect(deletedInvoice.isDeleted).toBe(true);
        expect(deletedInvoice.deletedAt).toBeInstanceOf(Date);
        const refreshed = await Product.findById(product._id).lean();
        expect(refreshed.quantity).toBe(10);
    });

    test('DELETE /api/v1/orders/:id - should return 404 if order not found', async () => {
        const adminPayload = { ...validUser(), type: "admin" };

        await new User(adminPayload).save();

        const res = await request(app)
            .delete(`/api/v1/orders/${new mongoose.Types.ObjectId()}`)
            .set("Cookie", await loginGetCookie(adminPayload));

        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/Order not found/);
    });

    test('DELETE /api/v1/orders/:id - should return 403 if user is not admin', async () => {
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
            deliveryFee: 10,
        }

        const order = await new Order(orderData).save();

        const res = await request(app)
            .delete(`/api/v1/orders/${order._id}`)
            .set("Cookie", await loginGetCookie(userPayload));

        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/Forbidden: insufficient privileges/);
    });
});
