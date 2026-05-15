import { getWarrantyReminders, getDocumentReminders, getExpiredWarrantyAssets, getExpiredDocuments } from "@/modules/reminders/services";
import type { ReminderInfo, DocumentReminderInfo } from "@/modules/reminders/services";

/**
 * 每日提醒扫描任务 - 由 node-cron 调度
 * 扫描即将到期（30天内）和已过期的资产及文档，输出日志
 */
export async function runReminderScan() {
  try {
    const [warranty, docs, expiredWarranty, expiredDocs] = await Promise.all([
      getWarrantyReminders(30),
      getDocumentReminders(30),
      getExpiredWarrantyAssets(),
      getExpiredDocuments(),
    ]);

    if (warranty.length > 0) {
      console.warn(`[提醒] ${warranty.length} 台设备维保将在30天内到期:`);
      warranty.forEach((a: ReminderInfo) => {
        console.warn(`  - ${a.assetNo} ${a.name} (${a.branchName ?? "未知分支"}) 剩余 ${a.daysUntilExpiry} 天`);
      });
    }

    if (docs.length > 0) {
      console.warn(`[提醒] ${docs.length} 份安全文档将在30天内到期:`);
      docs.forEach((d: DocumentReminderInfo) => {
        console.warn(`  - ${d.name} (${d.assetNo} ${d.assetName}) 剩余 ${d.daysUntilExpiry} 天`);
      });
    }

    if (expiredWarranty.length > 0) {
      console.warn(`[提醒] ${expiredWarranty.length} 台设备维保已过期:`);
      expiredWarranty.forEach((a: { assetNo: string; name: string; daysSinceExpiry: number }) => {
        console.warn(`  - ${a.assetNo} ${a.name} 已过期 ${a.daysSinceExpiry} 天`);
      });
    }

    if (expiredDocs.length > 0) {
      console.warn(`[提醒] ${expiredDocs.length} 份安全文档已过期`);
    }

    return { warranty, docs, expiredWarranty: expiredWarranty.length, expiredDocs: expiredDocs.length };
  } catch (error) {
    console.error("[提醒] 扫描失败:", error);
    return null;
  }
}

/**
 * 启动定时提醒任务（每天 9:00 执行）
 * 仅在服务端运行时调用
 */
export function startReminderCron() {
  try {
    const cron = require("node-cron");
    cron.schedule("0 9 * * *", () => {
      console.log("[提醒] 开始每日到期扫描...");
      runReminderScan();
    });
    console.log("[提醒] 定时任务已启动（每日 09:00 扫描维保/证书到期）");
  } catch {
    console.log("[提醒] node-cron 未安装或不可用，跳过定时任务");
  }
}
