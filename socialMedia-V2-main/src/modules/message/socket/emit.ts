import type { Server as SocketServer } from "socket.io";

let socketServer: SocketServer | null = null;

export function setSocketServer(io: SocketServer) {
  socketServer = io;
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  socketServer?.to(`user:${userId}`).emit(event, payload);
}

export function emitToConversation(conversationId: string, event: string, payload: unknown) {
  socketServer?.to(`conversation:${conversationId}`).emit(event, payload);
}
