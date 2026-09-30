import cron from "node-cron";
import { deleteUnverifiedUsers } from "./deleteUnverifiedUsers";

export class DeleteUnverifiedUsers {
  start(): void {
    cron.schedule("0 * * * *", async () => {
      try {
        const result = await deleteUnverifiedUsers();

        console.log(`Deleted ${result.deletedCount || 0} unverified users`);
      } catch (error) {
        console.error("Error deleting users:", error);
      }
    });
  }
}

export const deleteUnverifiedUsersJob = new DeleteUnverifiedUsers();
