import { describe, expect, it } from "vitest";
import {
  ADMIN_WHATSAPP,
  SUPER_ADMIN_WHATSAPP,
  isAdmin,
  isSuperAdmin,
} from "../domain/admins";

describe("admins", () => {
  it("isAdmin com WhatsApp de admin retorna true", () => {
    expect(isAdmin({ whatsapp: ADMIN_WHATSAPP[0] })).toBe(true);
  });

  it("isAdmin com WhatsApp de super admin retorna true", () => {
    expect(isAdmin({ whatsapp: SUPER_ADMIN_WHATSAPP[0] })).toBe(true);
  });

  it("isAdmin com WhatsApp desconhecido retorna false", () => {
    expect(isAdmin({ whatsapp: "27900000000" })).toBe(false);
  });

  it("isSuperAdmin com WhatsApp de super admin retorna true", () => {
    expect(isSuperAdmin({ whatsapp: SUPER_ADMIN_WHATSAPP[0] })).toBe(true);
  });

  it("isSuperAdmin com WhatsApp de admin comum retorna false", () => {
    expect(isSuperAdmin({ whatsapp: ADMIN_WHATSAPP[0] })).toBe(false);
  });

  it("isAdmin e isSuperAdmin com user null retornam false", () => {
    expect(isAdmin(null)).toBe(false);
    expect(isSuperAdmin(null)).toBe(false);
  });
});
