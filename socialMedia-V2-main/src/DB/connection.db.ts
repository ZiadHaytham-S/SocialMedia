import { connect } from "mongoose";
import { DB_URI } from "../config/config";
import { UserModel } from "./models/user.model";

const connectDB = async () => {
  await connect(DB_URI, {
    serverSelectionTimeoutMS: 30000,
    maxPoolSize: 10,
  });
  console.log(`Connected DB Successfully .. 🌸`);
  await UserModel.syncIndexes();
};
export default connectDB;
