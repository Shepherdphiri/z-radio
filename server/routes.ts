import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertBroadcastSchema, type WebSocketMessage, type RoomUpdate } from "@shared/schema";

interface WebSocketWithSession extends WebSocket {
  sessionId?: string;
  roomId?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time communication
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store connected clients by room
  const rooms = new Map<string, Set<WebSocketWithSession>>();

  // Broadcast API routes
  app.post("/api/broadcasts", async (req, res) => {
    try {
      const broadcastData = insertBroadcastSchema.parse(req.body);
      const broadcast = await storage.createBroadcast(broadcastData);
      res.json(broadcast);
    } catch (error) {
      res.status(400).json({ error: "Invalid broadcast data" });
    }
  });

  app.get("/api/broadcasts/room/:roomId", async (req, res) => {
    try {
      const { roomId } = req.params;
      const broadcast = await storage.getBroadcastByRoomId(roomId);
      if (!broadcast) {
        return res.status(404).json({ error: "Broadcast not found" });
      }
      res.json(broadcast);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch broadcast" });
    }
  });

  app.patch("/api/broadcasts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const broadcast = await storage.updateBroadcast(id, updates);
      if (!broadcast) {
        return res.status(404).json({ error: "Broadcast not found" });
      }
      res.json(broadcast);
    } catch (error) {
      res.status(500).json({ error: "Failed to update broadcast" });
    }
  });

  app.get("/api/stats", async (req, res) => {
    try {
      const activeBroadcasts = await storage.getActiveBroadcasts();
      const totalListeners = activeBroadcasts.reduce((sum, b) => sum + b.listenerCount, 0);
      
      res.json({
        activeStreams: activeBroadcasts.length,
        totalListeners,
        connectionQuality: "Good", // This would be calculated from actual metrics
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // WebSocket connection handling
  wss.on('connection', (ws: WebSocketWithSession) => {
    ws.sessionId = Math.random().toString(36).substr(2, 9);
    
    ws.on('message', async (message: Buffer) => {
      try {
        const data: WebSocketMessage = JSON.parse(message.toString());
        
        switch (data.type) {
          case 'join-room':
            if (data.roomId) {
              ws.roomId = data.roomId;
              
              if (!rooms.has(data.roomId)) {
                rooms.set(data.roomId, new Set());
              }
              rooms.get(data.roomId)!.add(ws);
              
              // Update listener count
              const broadcast = await storage.getBroadcastByRoomId(data.roomId);
              if (broadcast) {
                const listenerCount = rooms.get(data.roomId)!.size;
                await storage.updateListenerCount(broadcast.id, listenerCount);
                
                // Broadcast room update to all clients in room
                broadcastToRoom(data.roomId, {
                  type: 'room-update',
                  data: { listenerCount, isActive: broadcast.isActive }
                });
              }
            }
            break;
            
          case 'leave-room':
            if (ws.roomId && rooms.has(ws.roomId)) {
              rooms.get(ws.roomId)!.delete(ws);
              
              const broadcast = await storage.getBroadcastByRoomId(ws.roomId);
              if (broadcast) {
                const listenerCount = rooms.get(ws.roomId)!.size;
                await storage.updateListenerCount(broadcast.id, listenerCount);
                
                broadcastToRoom(ws.roomId, {
                  type: 'room-update',
                  data: { listenerCount, isActive: broadcast.isActive }
                });
              }
            }
            break;
            
          case 'offer':
          case 'answer':
          case 'ice-candidate':
            // Forward WebRTC signaling to other peers in the room
            if (ws.roomId) {
              broadcastToRoom(ws.roomId, data, ws);
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', async () => {
      if (ws.roomId && rooms.has(ws.roomId)) {
        rooms.get(ws.roomId)!.delete(ws);
        
        const broadcast = await storage.getBroadcastByRoomId(ws.roomId);
        if (broadcast) {
          const listenerCount = rooms.get(ws.roomId)!.size;
          await storage.updateListenerCount(broadcast.id, listenerCount);
          
          broadcastToRoom(ws.roomId, {
            type: 'room-update',
            data: { listenerCount, isActive: broadcast.isActive }
          });
        }
      }
    });
  });

  function broadcastToRoom(roomId: string, message: WebSocketMessage, excludeWs?: WebSocketWithSession) {
    const roomClients = rooms.get(roomId);
    if (!roomClients) return;
    
    const messageStr = JSON.stringify(message);
    roomClients.forEach((client) => {
      if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  return httpServer;
}
