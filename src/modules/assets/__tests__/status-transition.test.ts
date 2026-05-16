import { describe, it, expect, vi } from "vitest";
import { STATUS_TRANSITIONS, ASSET_STATUS, type AssetStatus } from "../types";

// Mock db module to avoid Prisma client initialization
vi.mock("@/lib/db/client", () => ({
  db: {},
}));

import { validateStatusTransition } from "../services";

describe("validateStatusTransition", () => {
  describe("合法状态转移", () => {
    it("IDLE -> BORROWING 应合法", () => {
      expect(validateStatusTransition("IDLE", "BORROWING")).toBe(true);
    });

    it("IDLE -> IN_USE 应合法", () => {
      expect(validateStatusTransition("IDLE", "IN_USE")).toBe(true);
    });

    it("IDLE -> MAINTENANCE 应合法", () => {
      expect(validateStatusTransition("IDLE", "MAINTENANCE")).toBe(true);
    });

    it("IDLE -> SCRAPPED 应合法", () => {
      expect(validateStatusTransition("IDLE", "SCRAPPED")).toBe(true);
    });

    it("BORROWING -> IN_USE 应合法", () => {
      expect(validateStatusTransition("BORROWING", "IN_USE")).toBe(true);
    });

    it("BORROWING -> IDLE 应合法", () => {
      expect(validateStatusTransition("BORROWING", "IDLE")).toBe(true);
    });

    it("IN_USE -> IDLE 应合法", () => {
      expect(validateStatusTransition("IN_USE", "IDLE")).toBe(true);
    });

    it("IN_USE -> MAINTENANCE 应合法", () => {
      expect(validateStatusTransition("IN_USE", "MAINTENANCE")).toBe(true);
    });

    it("IN_USE -> SCRAPPED 应合法", () => {
      expect(validateStatusTransition("IN_USE", "SCRAPPED")).toBe(true);
    });

    it("MAINTENANCE -> IDLE 应合法", () => {
      expect(validateStatusTransition("MAINTENANCE", "IDLE")).toBe(true);
    });

    it("MAINTENANCE -> IN_USE 应合法", () => {
      expect(validateStatusTransition("MAINTENANCE", "IN_USE")).toBe(true);
    });

    it("MAINTENANCE -> SCRAPPED 应合法", () => {
      expect(validateStatusTransition("MAINTENANCE", "SCRAPPED")).toBe(true);
    });
  });

  describe("非法状态转移", () => {
    it("SCRAPPED 不能转移到任何状态", () => {
      for (const status of ASSET_STATUS) {
        if (status === "SCRAPPED") continue;
        expect(validateStatusTransition("SCRAPPED", status)).toBe(false);
      }
    });

    it("IDLE -> IDLE 自身转移应非法", () => {
      expect(validateStatusTransition("IDLE", "IDLE")).toBe(false);
    });

    it("BORROWING -> MAINTENANCE 应非法", () => {
      expect(validateStatusTransition("BORROWING", "MAINTENANCE")).toBe(false);
    });

    it("BORROWING -> SCRAPPED 应非法", () => {
      expect(validateStatusTransition("BORROWING", "SCRAPPED")).toBe(false);
    });

    it("BORROWING -> BORROWING 自身转移应非法", () => {
      expect(validateStatusTransition("BORROWING", "BORROWING")).toBe(false);
    });

    it("IN_USE -> BORROWING 应非法", () => {
      expect(validateStatusTransition("IN_USE", "BORROWING")).toBe(false);
    });

    it("IN_USE -> IN_USE 自身转移应非法", () => {
      expect(validateStatusTransition("IN_USE", "IN_USE")).toBe(false);
    });

    it("MAINTENANCE -> BORROWING 应非法", () => {
      expect(validateStatusTransition("MAINTENANCE", "BORROWING")).toBe(false);
    });

    it("MAINTENANCE -> MAINTENANCE 自身转移应非法", () => {
      expect(validateStatusTransition("MAINTENANCE", "MAINTENANCE")).toBe(false);
    });
  });

  describe("STATUS_TRANSITIONS 完整性检查", () => {
    it("所有资产状态都应该在 STATUS_TRANSITIONS 中有定义", () => {
      for (const status of ASSET_STATUS) {
        expect(STATUS_TRANSITIONS).toHaveProperty(status);
        expect(Array.isArray(STATUS_TRANSITIONS[status])).toBe(true);
      }
    });

    it("STATUS_TRANSITIONS 中的目标状态应该都是有效的 AssetStatus", () => {
      for (const from of ASSET_STATUS) {
        for (const to of STATUS_TRANSITIONS[from]) {
          expect(ASSET_STATUS).toContain(to);
        }
      }
    });

    it("validateStatusTransition 对于无效状态应返回 false", () => {
      expect(validateStatusTransition("INVALID" as AssetStatus, "IDLE")).toBe(false);
    });
  });
});
