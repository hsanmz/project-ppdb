import { describe, it, expect, vi } from "vitest";
import {
  normalizePhoneNumber,
  toWhatsAppId,
  isValidIndonesianPhone,
  maskPhone,
} from "../src/lib/phoneUtils";
import { apiKeyAuth } from "../src/middlewares/apiKeyAuth";
import { env } from "../src/config/env";
import type { Request, Response, NextFunction } from "express";

describe("Phone Utilities Reliability", () => {
  it("normalizes standard 08xx Indonesian numbers", () => {
    expect(normalizePhoneNumber("081234567890")).toBe("6281234567890");
    expect(isValidIndonesianPhone("081234567890")).toBe(true);
  });

  it("normalizes +628xx numbers with punctuation and spaces", () => {
    expect(normalizePhoneNumber("+62 812-3456-7890")).toBe("6281234567890");
    expect(isValidIndonesianPhone("+62 812-3456-7890")).toBe(true);
  });

  it("normalizes numbers without leading zero: 81234567890", () => {
    expect(normalizePhoneNumber("81234567890")).toBe("6281234567890");
  });

  it("rejects non-Indonesian or invalid phone numbers", () => {
    expect(normalizePhoneNumber("")).toBeNull();
    expect(normalizePhoneNumber("12345")).toBeNull();
    expect(normalizePhoneNumber("0211234567")).toBeNull(); // Jakarta landline
    expect(normalizePhoneNumber("+15551234567")).toBeNull(); // US number
    expect(isValidIndonesianPhone("not-a-number")).toBe(false);
  });

  it("converts valid phone to WhatsApp JID", () => {
    expect(toWhatsAppId("081234567890")).toBe("6281234567890@c.us");
  });

  it("throws error when converting invalid phone to WhatsApp JID", () => {
    expect(() => toWhatsAppId("12345")).toThrow("Invalid phone number");
  });

  it("masks phone numbers properly for logging privacy", () => {
    const masked = maskPhone("6281234567890");
    expect(masked).toBe("6281*****7890");
  });
});

describe("API Key Authentication Middleware", () => {
  function createMockContext(headers: Record<string, string | undefined>) {
    const req = { headers } as unknown as Request;
    let statusCode: number | null = null;
    let jsonBody: unknown = null;
    const res = {
      status: vi.fn((code: number) => {
        statusCode = code;
        return res;
      }),
      json: vi.fn((data: unknown) => {
        jsonBody = data;
        return res;
      }),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;
    return { req, res, next, getStatus: () => statusCode, getJson: () => jsonBody };
  }

  it("rejects requests missing API key header", () => {
    const { req, res, next, getStatus, getJson } = createMockContext({});
    apiKeyAuth(req, res, next);
    expect(getStatus()).toBe(401);
    expect(getJson()).toMatchObject({
      success: false,
      error: expect.stringContaining("Missing API key"),
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects requests with incorrect Bearer token", () => {
    const { req, res, next, getStatus, getJson } = createMockContext({
      authorization: "Bearer wrong-api-key-value",
    });
    apiKeyAuth(req, res, next);
    expect(getStatus()).toBe(401);
    expect(getJson()).toMatchObject({ success: false, error: "Invalid API key" });
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts requests with correct Bearer token", () => {
    const { req, res, next } = createMockContext({
      authorization: `Bearer ${env.API_KEY}`,
    });
    apiKeyAuth(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("accepts requests with correct X-API-Key header", () => {
    const { req, res, next } = createMockContext({
      "x-api-key": env.API_KEY,
    });
    apiKeyAuth(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe("Retry Policy and Exponential Backoff", () => {
  it("correctly flags non-retryable and retryable error codes", async () => {
    const { isRetryable } = await import("../src/lib/retry");
    expect(isRetryable("invalid_number")).toBe(false);
    expect(isRetryable("not_on_whatsapp")).toBe(false);
    expect(isRetryable("blocked")).toBe(false);
    expect(isRetryable("rate_limit")).toBe(true);
    expect(isRetryable(undefined)).toBe(true);
  });

  it("calculates exponential backoff with jitter within ±20%", async () => {
    const { getRetryDelay } = await import("../src/lib/retry");
    // Attempt 1: base 5,000ms -> min 4,000, max 6,000
    for (let i = 0; i < 10; i++) {
      const delay = getRetryDelay(1);
      expect(delay).toBeGreaterThanOrEqual(4000);
      expect(delay).toBeLessThanOrEqual(6000);
    }
  });
});
