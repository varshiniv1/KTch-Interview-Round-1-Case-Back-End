import request from "supertest";
import app from "../src/app.js";
import responses from "../src/utils/responses.js";

const { errors } = responses;

// Helper tokens 
const TOKEN_USER1 = "Bearer sub:user1";

describe("Global middleware rules", () => {
  test("406 when Accept is not JSON", async () => {
    const res = await request(app)
      .get("/health")
      .set("Accept", "text/html");

    expect(res.status).toBe(406);
    expect(res.body).toEqual(errors.NOT_ACCEPTABLE);
  });

  test("415 when request has a body but Content-Type is not application/json", async () => {
    // Use an endpoint that parses body
    // If /users does not exist yet, change to any route that expects JSON body.
    const res = await request(app)
      .post("/users")
      .set("Accept", "application/json")
      .set("Authorization", TOKEN_USER1)
      .set("Content-Type", "text/plain")
      .send("hello");

    expect(res.status).toBe(415);
    expect(res.body).toEqual(errors.UNSUPPORTED_MEDIA_TYPE);
  });

  test("400 when body is sent but endpoint forbids body (noBodyAllowed)", async () => {
    const res = await request(app)
      .post("/arts")
      .set("Accept", "application/json")
      .set("Authorization", TOKEN_USER1)
      .set("Content-Type", "application/json")
      .send({ shouldNot: "exist" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(errors.NO_BODY_ALLOWED);
  });

  test("401 when Authorization header is missing", async () => {
    const res = await request(app)
      .post("/arts")
      .set("Accept", "application/json");

    expect(res.status).toBe(401);
    expect(res.body).toEqual(errors.NO_AUTH_HEADER);
  });

  test("401 when Authorization header is invalid", async () => {
    const res = await request(app)
      .post("/arts")
      .set("Accept", "application/json")
      .set("Authorization", "Bearer totally-wrong");

    expect(res.status).toBe(401);
    expect(res.body).toEqual(errors.INVALID_HEADER);
  });
});
