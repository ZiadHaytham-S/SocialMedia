import cron from "node-cron";
import { UserRepository } from "../../../DB/repository/user.repository";

export class DeleteUnverifiedUsers {
  private readonly userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  start(): void {
    cron.schedule("0 * * * *", async () => {
      try {
        const result = await this.userRepository.deleteMany({
          filter: {
            confirmEmail: { $exists: false },
            createdAt: {
              $lt: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        });

        console.log(`Deleted ${result.deletedCount || 0} unverified users`);
      } catch (error) {
        console.error("Error deleting users:", error);
      }
    });
  }
}

export const deleteUnverifiedUsersJob = new DeleteUnverifiedUsers();