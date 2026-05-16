import { describe, it, expect } from "vitest";
import {
  validateCancelApproval,
  validateReviewApproval,
  validateExecuteApproval,
  resolveAssetStatusAfterExecution,
  validateApprovalStatusTransition,
  APPROVAL_STATUS_TRANSITIONS,
} from "../validators";
import { APPROVAL_STATUSES, APPROVAL_TYPES } from "../types";

describe("审批流状态流转", () => {
  describe("validateApprovalStatusTransition", () => {
    it("PENDING -> APPROVED 应合法", () => {
      expect(validateApprovalStatusTransition("PENDING", "APPROVED")).toBe(true);
    });

    it("PENDING -> REJECTED 应合法", () => {
      expect(validateApprovalStatusTransition("PENDING", "REJECTED")).toBe(true);
    });

    it("PENDING -> CANCELLED 应合法", () => {
      expect(validateApprovalStatusTransition("PENDING", "CANCELLED")).toBe(true);
    });

    it("APPROVED -> EXECUTED 应合法", () => {
      expect(validateApprovalStatusTransition("APPROVED", "EXECUTED")).toBe(true);
    });

    it("PENDING -> EXECUTED 应非法（不能跳过审批直接执行）", () => {
      expect(validateApprovalStatusTransition("PENDING", "EXECUTED")).toBe(false);
    });

    it("REJECTED 不能转移到任何状态（终态）", () => {
      for (const status of APPROVAL_STATUSES) {
        expect(validateApprovalStatusTransition("REJECTED", status)).toBe(false);
      }
    });

    it("EXECUTED 不能转移到任何状态（终态）", () => {
      for (const status of APPROVAL_STATUSES) {
        expect(validateApprovalStatusTransition("EXECUTED", status)).toBe(false);
      }
    });

    it("CANCELLED 不能转移到任何状态（终态）", () => {
      for (const status of APPROVAL_STATUSES) {
        expect(validateApprovalStatusTransition("CANCELLED", status)).toBe(false);
      }
    });

    it("APPROVED -> PENDING 应非法（不可回退）", () => {
      expect(validateApprovalStatusTransition("APPROVED", "PENDING")).toBe(false);
    });

    it("所有审批状态都应在状态转换表中有定义", () => {
      for (const status of APPROVAL_STATUSES) {
        expect(APPROVAL_STATUS_TRANSITIONS).toHaveProperty(status);
      }
    });
  });

  describe("validateCancelApproval", () => {
    it("审批单不存在时应返回错误", () => {
      const result = validateCancelApproval({ approval: null, applicantId: "user1" });
      expect(result.valid).toBe(false);
      expect(result.error).toBe("审批单不存在");
    });

    it("非申请人撤销时应返回错误", () => {
      const result = validateCancelApproval({
        approval: { applicantId: "user1", status: "PENDING" },
        applicantId: "user2",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe("仅申请人可撤销自己的申请");
    });

    it("非 PENDING 状态撤销时应返回错误", () => {
      const result = validateCancelApproval({
        approval: { applicantId: "user1", status: "APPROVED" },
        applicantId: "user1",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe("仅待审批状态的申请可撤销");
    });

    it("已驳回的申请不能撤销", () => {
      const result = validateCancelApproval({
        approval: { applicantId: "user1", status: "REJECTED" },
        applicantId: "user1",
      });
      expect(result.valid).toBe(false);
    });

    it("已执行的申请不能撤销", () => {
      const result = validateCancelApproval({
        approval: { applicantId: "user1", status: "EXECUTED" },
        applicantId: "user1",
      });
      expect(result.valid).toBe(false);
    });

    it("申请人撤销自己的 PENDING 申请应成功", () => {
      const result = validateCancelApproval({
        approval: { applicantId: "user1", status: "PENDING" },
        applicantId: "user1",
      });
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe("validateReviewApproval", () => {
    it("审批单不存在时应返回错误", () => {
      const result = validateReviewApproval({ approval: null, decision: "APPROVED" });
      expect(result.valid).toBe(false);
      expect(result.error).toBe("审批单不存在");
    });

    it("非 PENDING 状态审批时应返回错误", () => {
      const result = validateReviewApproval({
        approval: { status: "APPROVED", type: "BORROW", asset: { status: "BORROWING" } },
        decision: "APPROVED",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe("该审批已处理，无法重复操作");
    });

    it("通过 BORROW 类型审批时，资产必须为 BORROWING 状态", () => {
      const result = validateReviewApproval({
        approval: { status: "PENDING", type: "BORROW", asset: { status: "IDLE" } },
        decision: "APPROVED",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("资产状态异常");
    });

    it("通过 BORROW 类型审批时，资产为 BORROWING 状态应成功", () => {
      const result = validateReviewApproval({
        approval: { status: "PENDING", type: "BORROW", asset: { status: "BORROWING" } },
        decision: "APPROVED",
      });
      expect(result.valid).toBe(true);
    });

    it("驳回 BORROW 类型审批时，不需要检查资产状态", () => {
      const result = validateReviewApproval({
        approval: { status: "PENDING", type: "BORROW", asset: { status: "IDLE" } },
        decision: "REJECTED",
      });
      expect(result.valid).toBe(true);
    });

    it("通过 RETURN 类型审批不需要检查资产状态", () => {
      const result = validateReviewApproval({
        approval: { status: "PENDING", type: "RETURN", asset: { status: "IN_USE" } },
        decision: "APPROVED",
      });
      expect(result.valid).toBe(true);
    });

    it("通过 SCRAP 类型审批不需要检查资产状态", () => {
      const result = validateReviewApproval({
        approval: { status: "PENDING", type: "SCRAP", asset: { status: "IN_USE" } },
        decision: "APPROVED",
      });
      expect(result.valid).toBe(true);
    });
  });

  describe("validateExecuteApproval", () => {
    it("审批单不存在时应返回错误", () => {
      const result = validateExecuteApproval({ approval: null });
      expect(result.valid).toBe(false);
      expect(result.error).toBe("审批单不存在");
    });

    it("非 APPROVED 状态不能执行", () => {
      const result = validateExecuteApproval({ approval: { status: "PENDING" } });
      expect(result.valid).toBe(false);
      expect(result.error).toBe("只能执行已审批通过的单据");
    });

    it("REJECTED 状态不能执行", () => {
      const result = validateExecuteApproval({ approval: { status: "REJECTED" } });
      expect(result.valid).toBe(false);
    });

    it("EXECUTED 状态不能重复执行", () => {
      const result = validateExecuteApproval({ approval: { status: "EXECUTED" } });
      expect(result.valid).toBe(false);
    });

    it("APPROVED 状态可以执行", () => {
      const result = validateExecuteApproval({ approval: { status: "APPROVED" } });
      expect(result.valid).toBe(true);
    });
  });

  describe("resolveAssetStatusAfterExecution", () => {
    it("BORROW 执行后资产状态变为 IN_USE，不清除分配人", () => {
      const result = resolveAssetStatusAfterExecution("BORROW");
      expect(result).toEqual({ status: "IN_USE", clearAssignedUser: false });
    });

    it("RETURN 执行后资产状态变为 IDLE，清除分配人", () => {
      const result = resolveAssetStatusAfterExecution("RETURN");
      expect(result).toEqual({ status: "IDLE", clearAssignedUser: true });
    });

    it("TRANSFER 执行后资产状态变为 IDLE，清除分配人", () => {
      const result = resolveAssetStatusAfterExecution("TRANSFER");
      expect(result).toEqual({ status: "IDLE", clearAssignedUser: true });
    });

    it("SCRAP 执行后资产状态变为 SCRAPPED，清除分配人", () => {
      const result = resolveAssetStatusAfterExecution("SCRAP");
      expect(result).toEqual({ status: "SCRAPPED", clearAssignedUser: true });
    });

    it("所有审批类型都应有对应的资产状态变更", () => {
      for (const type of APPROVAL_TYPES) {
        const result = resolveAssetStatusAfterExecution(type);
        expect(result).not.toBeNull();
        expect(result!.status).toBeTruthy();
      }
    });
  });
});
