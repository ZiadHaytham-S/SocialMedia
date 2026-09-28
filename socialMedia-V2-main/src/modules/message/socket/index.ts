import type { Server as SocketServer } from "socket.io";
import { TokenService } from "../../../common/services";
import { TokenTypeEnum } from "../../../common/enums";
import { UnauthorizedException } from "../../../common/exceptions";
import { markUserOffline, markUserOnline, refreshUserPresence } from "./presence";

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

    socket.on("join:conversation", (conversationId: string) => {
      if (typeof conversationId === "string" && conversationId.trim()) {
        void socket.join(`conversation:${conversationId}`);
      }
    });

    socket.on("leave:conversation", (conversationId: string) => {
      if (typeof conversationId === "string" && conversationId.trim()) {
        void socket.leave(`conversation:${conversationId}`);
      }
    });

    socket.on("typing:start", (payload: { conversationId?: string }) => {
      if (!payload?.conversationId) {
        return;
      }

      socket.to(`conversation:${payload.conversationId}`).emit("typing", {
        conversationId: payload.conversationId,
        userId,
        isTyping: true,
      });
    });

    socket.on("typing:stop", (payload: { conversationId?: string }) => {
      if (!payload?.conversationId) {
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
      void markUserOffline(userId);
      io.emit("presence:update", { userId, online: false });
    });
  });
}
