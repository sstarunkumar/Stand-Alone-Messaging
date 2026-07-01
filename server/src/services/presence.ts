/**
 * In-memory presence tracking.
 * Swap for Redis (ioredis + presenceService from InfluenceHub) when scaling to multiple servers.
 */

// userId → Set<socketId>
const onlineUsers = new Map<string, Set<string>>();

export function markUserOnline(userId: string, socketId: string): void {
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId)!.add(socketId);
}

export function markUserOffline(userId: string, socketId: string): boolean {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return true;

  sockets.delete(socketId);

  if (sockets.size === 0) {
    onlineUsers.delete(userId);
    return true; // user fully offline
  }
  return false;
}

export function isUserOnline(userId: string): boolean {
  const sockets = onlineUsers.get(userId);
  return !!(sockets && sockets.size > 0);
}
