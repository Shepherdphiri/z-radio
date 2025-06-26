import { broadcasts, listeners, type Broadcast, type InsertBroadcast, type Listener, type InsertListener } from "@shared/schema";

export interface IStorage {
  // Broadcast operations
  createBroadcast(broadcast: InsertBroadcast): Promise<Broadcast>;
  getBroadcast(id: number): Promise<Broadcast | undefined>;
  getBroadcastByRoomId(roomId: string): Promise<Broadcast | undefined>;
  updateBroadcast(id: number, updates: Partial<Broadcast>): Promise<Broadcast | undefined>;
  deleteBroadcast(id: number): Promise<boolean>;
  getActiveBroadcasts(): Promise<Broadcast[]>;
  
  // Listener operations
  addListener(listener: InsertListener): Promise<Listener>;
  removeListener(sessionId: string): Promise<boolean>;
  getListenersByBroadcast(broadcastId: number): Promise<Listener[]>;
  updateListenerCount(broadcastId: number, count: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private broadcasts: Map<number, Broadcast>;
  private listeners: Map<number, Listener>;
  private currentBroadcastId: number;
  private currentListenerId: number;

  constructor() {
    this.broadcasts = new Map();
    this.listeners = new Map();
    this.currentBroadcastId = 1;
    this.currentListenerId = 1;
  }

  async createBroadcast(insertBroadcast: InsertBroadcast): Promise<Broadcast> {
    const id = this.currentBroadcastId++;
    const broadcast: Broadcast = {
      id,
      roomId: insertBroadcast.roomId,
      title: insertBroadcast.title,
      isActive: insertBroadcast.isActive ?? true,
      listenerCount: insertBroadcast.listenerCount ?? 0,
      audioQuality: insertBroadcast.audioQuality ?? 'high',
      createdAt: new Date(),
    };
    this.broadcasts.set(id, broadcast);
    return broadcast;
  }

  async getBroadcast(id: number): Promise<Broadcast | undefined> {
    return this.broadcasts.get(id);
  }

  async getBroadcastByRoomId(roomId: string): Promise<Broadcast | undefined> {
    return Array.from(this.broadcasts.values()).find(
      (broadcast) => broadcast.roomId === roomId
    );
  }

  async updateBroadcast(id: number, updates: Partial<Broadcast>): Promise<Broadcast | undefined> {
    const broadcast = this.broadcasts.get(id);
    if (!broadcast) return undefined;
    
    const updated = { ...broadcast, ...updates };
    this.broadcasts.set(id, updated);
    return updated;
  }

  async deleteBroadcast(id: number): Promise<boolean> {
    return this.broadcasts.delete(id);
  }

  async getActiveBroadcasts(): Promise<Broadcast[]> {
    return Array.from(this.broadcasts.values()).filter(
      (broadcast) => broadcast.isActive
    );
  }

  async addListener(insertListener: InsertListener): Promise<Listener> {
    const id = this.currentListenerId++;
    const listener: Listener = {
      id,
      broadcastId: insertListener.broadcastId ?? null,
      sessionId: insertListener.sessionId,
      joinedAt: new Date(),
    };
    this.listeners.set(id, listener);
    return listener;
  }

  async removeListener(sessionId: string): Promise<boolean> {
    const listener = Array.from(this.listeners.values()).find(
      (l) => l.sessionId === sessionId
    );
    if (!listener) return false;
    return this.listeners.delete(listener.id);
  }

  async getListenersByBroadcast(broadcastId: number): Promise<Listener[]> {
    return Array.from(this.listeners.values()).filter(
      (listener) => listener.broadcastId === broadcastId
    );
  }

  async updateListenerCount(broadcastId: number, count: number): Promise<void> {
    const broadcast = this.broadcasts.get(broadcastId);
    if (broadcast) {
      broadcast.listenerCount = count;
      this.broadcasts.set(broadcastId, broadcast);
    }
  }
}

export const storage = new MemStorage();
