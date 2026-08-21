import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../app.js";
import { db } from "../db/index.js";
import { orders } from "../db/schema/warehouse.js";
import { users } from "../db/schema/core.js";
import { lucia } from "../lib/auth.js";
import crypto from "crypto";

describe("Warehouse API Routes", () => {
  let testOrderId: string;
  let authCookie: { [key: string]: string };

  beforeAll(async () => {
    await app.ready();

    // 1. Create a test user and session for authenticated requests
    const testUserId = `usr_${crypto.randomUUID().substring(0, 8)}`;
    await db.insert(users).values({
      id: testUserId,
      email: `test_wh_${Date.now()}@atlas.local`,
      role: "ADMIN",
    });

    const session = await lucia.createSession(testUserId, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    authCookie = { [sessionCookie.name]: sessionCookie.value };

    // 2. Create test order
    testOrderId = `test_ord_${Date.now()}`;
    await db.insert(orders).values({
      id: testOrderId,
      customerName: "Integration Test Logistics",
      status: "PENDING",
      totalAmount: 4500.0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/warehouse/tasks should return task list", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/warehouse/tasks",
      cookies: authCookie,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(Array.isArray(body)).toBe(true);
  });

  it("POST /api/warehouse/tasks and PUT /api/warehouse/tasks/:id/status should create and update task", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/api/warehouse/tasks",
      cookies: authCookie,
      payload: {
        orderId: testOrderId,
        status: "PICK",
        priority: "HIGH",
      },
    });

    expect(createRes.statusCode).toBe(201);
    const createBody = JSON.parse(createRes.payload);
    expect(createBody.success).toBe(true);
    expect(createBody.id).toBeDefined();

    const taskId = createBody.id;

    // Fetch created task
    const getRes = await app.inject({
      method: "GET",
      url: `/api/warehouse/tasks/${taskId}`,
      cookies: authCookie,
    });
    expect(getRes.statusCode).toBe(200);
    const getBody = JSON.parse(getRes.payload);
    expect(getBody.id).toBe(taskId);
    expect(getBody.status).toBe("PICK");
    expect(getBody.priority).toBe("HIGH");
    expect(getBody.customerName).toBe("Integration Test Logistics");

    // Update status to PACK
    const updateRes = await app.inject({
      method: "PUT",
      url: `/api/warehouse/tasks/${taskId}/status`,
      cookies: authCookie,
      payload: {
        status: "PACK",
      },
    });

    expect(updateRes.statusCode).toBe(200);
    const updateBody = JSON.parse(updateRes.payload);
    expect(updateBody.success).toBe(true);
    expect(updateBody.status).toBe("PACK");
  });

  it("GET /api/warehouse/traffic and POST /api/warehouse/traffic should manage traffic", async () => {
    const postRes = await app.inject({
      method: "POST",
      url: "/api/warehouse/traffic",
      cookies: authCookie,
      payload: {
        deviceNumber: "TRK-TEST-99",
        driverName: "John Tester",
        deviceType: "TRUCK",
        status: "WAITING",
        cargoDescription: "Test Electronics",
        expectedQuantity: 5,
        type: "INBOUND",
      },
    });

    expect(postRes.statusCode).toBe(201);
    const postBody = JSON.parse(postRes.payload);
    expect(postBody.success).toBe(true);
    expect(postBody.id).toBeDefined();

    const getRes = await app.inject({
      method: "GET",
      url: "/api/warehouse/traffic",
      cookies: authCookie,
    });

    expect(getRes.statusCode).toBe(200);
    const getBody = JSON.parse(getRes.payload);
    expect(getBody.success).toBe(true);
    expect(Array.isArray(getBody.data)).toBe(true);
  });

  it("GET /api/warehouse/inventory should return inventory with 3D isometric coordinates", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/warehouse/inventory",
      cookies: authCookie,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});
