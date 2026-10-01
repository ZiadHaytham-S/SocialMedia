import { connect } from "mongoose";
import { DB_URI } from "../config/config";
import { UserModel } from "./models/user.model";
import { migrateConversationIndex } from "./migrations/conversation-index";

const connectDB = async ({ syncIndexes = true, maxPoolSize = 10 } = {}) => {
  await connect(DB_URI, {
    serverSelectionTimeoutMS: 30000,
    maxPoolSize,
  });
  console.log(`Connected DB Successfully .. 🌸`);
  await migrateConversationIndex();
  if (syncIndexes) {
    await UserModel.syncIndexes();
  }
};
export default connectDB;
