import { describe, test, expect } from "vitest";

function validateLogin(email, password) {
  if (!email || !password) {
    return false;
  }

  if (!email.includes("@")) {
    return false;
  }

  if (password.length < 6) {
    return false;
  }

  return true;
}

describe("2. Login validation works", () => {
  test("rejects empty email and password", () => {
    expect(validateLogin("", "")).toBe(false);
  });

  test("rejects invalid email", () => {
    expect(
      validateLogin("invalid-email", "password123")
    ).toBe(false);
  });

  test("rejects short password", () => {
    expect(
      validateLogin("driver@riskroute.co.za", "123")
    ).toBe(false);
  });

  test("accepts valid login details", () => {
    expect(
      validateLogin(
        "driver@riskroute.co.za",
        "password123"
      )
    ).toBe(true);
  });
});