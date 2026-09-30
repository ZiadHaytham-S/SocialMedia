import { createServer, type Server } from "node:http";
import express, {
  type Express,
  type Response,
  type Request,
  type NextFunction,
} from "express";
import { Server as SocketServer } from "socket.io";
import { authRouter } from "./modules";
import { globalErrorHandler } from "./middleware";
import { PORT } from "./config/config";
import connectDB from "./DB/connection.db";
import { redisService } from "./common/services";
import { userRouter } from "./modules/user";
import cors from "cors";
import { postRouter } from "./modules/post";
import { commentRouter } from "./modules/comment";
import { storyRouter } from "./modules/story";
import { friendRouter } from "./modules/friend";
import { notificationRouter } from "./modules/notification";
import { messageRouter, mountGraphql, registerMessageSocketHandlers, setMessageSocketServer } from "./modules/message";

function allowedOrigins() {
  return (process.env.FE_ORIGIN ?? "http://localhost:3001,http://localhost:3000")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

async function bootStrap({ cloudflare = false } = {}): Promise<Server> {
  await connectDB({ syncIndexes: !cloudflare, maxPoolSize: cloudflare ? 2 : 10 });
  await redisService.connect();

  const app: Express = express();
  const origins = allowedOrigins();

  app.use(
    express.json(),
    cors({
      origin: origins,
      credentials: true,
    }),
  );
  app.get("/", (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json({ message: "Landing Page" });
  });

  if (!cloudflare) {
    const { deleteUnverifiedUsersJob } = await import("./common/utils/cronjob/index.js");
    deleteUnverifiedUsersJob.start();
  }

  app.use("/auth", authRouter);
  app.use("/user", userRouter);
  app.use("/post", postRouter);
  app.use("/comment", commentRouter);
  app.use("/story", storyRouter);
  app.use("/friend", friendRouter);
  app.use("/notification", notificationRouter);
  app.use("/message", messageRouter);

  await mountGraphql(app);

  app.use(globalErrorHandler);
  app.use("{/*dummy}", (req, res, next) => {
    res.status(404).json({ message: "Invalid Application Routing" });
  });

  const server = createServer(app);
  const io = new SocketServer(server, {
    ...(cloudflare ? { transports: ["polling" as const], allowUpgrades: false } : {}),
    cors: {
      origin: origins,
      credentials: true,
    },
  });

  registerMessageSocketHandlers(io);
  setMessageSocketServer(io);

  server.listen(PORT, () => {
    console.log(`Server Is Running on port ${PORT} ✈️`);
  });
  return server;
}

export default bootStrap;
