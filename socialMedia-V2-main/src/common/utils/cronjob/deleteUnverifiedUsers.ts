import { UserRepository } from "../../../DB/repository/user.repository";

export async function deleteUnverifiedUsers() {
  const repository = new UserRepository();
  return repository.deleteMany({
    filter: {
      confirmEmail: { $exists: false },
      createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
}
