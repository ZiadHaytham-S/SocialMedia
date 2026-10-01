import type { Server as SocketServer } from "socket.io";
import { TokenService } from "../../../common/services";
import { TokenTypeEnum } from "../../../common/enums";
import { UnauthorizedException } from "../../../common/exceptions";
import { markUserOffline, markUserOnline, refreshUserPresence } from "./presence";
import { ConversationModel } from "../../../DB/models/conversation.model";
import { Types } from "mongoose";

export function registerMessageSocketHandlers(io: SocketServer) {
  const tokenService = new TokenService();

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;

      if (!token) {
        throw new UnauthorizedException("Missing socket auth token");
      }

      const { user } = await tokenService.decodedToken({
        token,
        tokenType: TokenTypeEnum.ACCESS,
      });

      socket.data.userId = user._id.toString();
      next();
    } catch (error) {
      next(error instanceof Error ? error : new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    void markUserOnline(userId);

    void socket.join(`user:${userId}`);

    io.emit("presence:update", { userId, online: true });

    socket.on("join:conversation", async (conversationId: string) => {
      if (typeof conversationId !== "string" || !/^[a-f\d]{24}$/i.test(conversationId)) return;
      try {
        const conversation = await ConversationModel.exists({
          _id: new Types.ObjectId(conversationId), participants: new Types.ObjectId(userId),
        });
        if (conversation && socket.connected) await socket.join(`conversation:${conversationId}`);
      } catch (error) {
        console.warn("Failed to authorize conversation subscription", error);
      }
    });

    socket.on("leave:conversation", (conversationId: string) => {
      if (typeof conversationId === "string" && conversationId.trim()) {
        void socket.leave(`conversation:${conversationId}`);
      }
    });

    socket.on("typing:start", (payload: { conversationId?: string }) => {
      if (!payload?.conversationId || !socket.rooms.has(`conversation:${payload.conversationId}`)) {
        return;
      }

      socket.to(`conversation:${payload.conversationId}`).emit("typing", {
        conversationId: payload.conversationId,
        userId,
        isTyping: true,
      });
    });

    socket.on("typing:stop", (payload: { conversationId?: string }) => {
      if (!payload?.conversationId || !socket.rooms.has(`conversation:${payload.conversationId}`)) {
        return;
      }

      socket.to(`conversation:${payload.conversationId}`).emit("typing", {
        conversationId: payload.conversationId,
        userId,
        isTyping: false,
      });
    });

    socket.on("presence:ping", () => {
      void refreshUserPresence(userId);
    });

    socket.on("disconnect", () => {
      // A second tab/device can still be connected to the same account.
      if (io.sockets.adapter.rooms.get(`user:${userId}`)?.size) return;
      void markUserOffline(userId);
      io.emit("presence:update", { userId, online: false });
    });
  });
}
