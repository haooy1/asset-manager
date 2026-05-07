export function startCronJobs() {
  try {
    const { startReminderCron } = require("./reminders");
    startReminderCron();
  } catch {
    // cron not available
  }
}
