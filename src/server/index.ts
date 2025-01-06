import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { MediaServer } from './MediaServer';
import { types as mediasoupTypes } from 'mediasoup';

interface WebSocketMessage {
  type: string;
  data: any;
}

interface Client {
  id: string;
  ws: WebSocket;
  roomId?: string;
  producerIds: Set<string>;
  consumerIds: Set<string>;
}

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const mediaServer = new MediaServer();
const clients = new Map<string, Client>();

// מידלוור לטיפול בשגיאות
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// טיפול בחיבור WebSocket חדש
wss.on('connection', async (ws: WebSocket) => {
  const clientId = `client-${Date.now()}-${Math.random()}`;
  const client: Client = {
    id: clientId,
    ws,
    producerIds: new Set(),
    consumerIds: new Set(),
  };

  clients.set(clientId, client);

  console.log(`Client connected [id:${clientId}]`);

  // טיפול בהודעות מהלקוח
  ws.on('message', async (message: string) => {
    try {
      const { type, data } = JSON.parse(message) as WebSocketMessage;

      switch (type) {
        case 'join-room':
          await handleJoinRoom(client, data);
          break;

        case 'leave-room':
          await handleLeaveRoom(client);
          break;

        case 'get-router-capabilities':
          await handleGetRouterCapabilities(client, data);
          break;

        case 'create-transport':
          await handleCreateTransport(client, data);
          break;

        case 'connect-transport':
          await handleConnectTransport(client, data);
          break;

        case 'produce':
          await handleProduce(client, data);
          break;

        case 'consume':
          await handleConsume(client, data);
          break;

        case 'resume-consumer':
          await handleResumeConsumer(client, data);
          break;

        case 'close-producer':
          await handleCloseProducer(client, data);
          break;

        default:
          console.warn(`Unknown message type: ${type}`);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      sendError(client, 'Error processing message');
    }
  });

  // טיפול בניתוק
  ws.on('close', () => {
    handleClientDisconnect(client);
  });
});

// פונקציות טיפול בהודעות
async function handleJoinRoom(client: Client, { roomId }: { roomId: string }) {
  try {
    if (client.roomId) {
      throw new Error('Client already in a room');
    }

    let room = await mediaServer.createRoom(roomId).catch(() => null);
    if (!room) {
      // החדר כבר קיים
      room = { id: roomId } as any;
    }

    client.roomId = roomId;
    broadcastToRoom(roomId, {
      type: 'new-peer',
      data: { peerId: client.id },
    }, client.id);

    send(client, {
      type: 'joined-room',
      data: { roomId },
    });
  } catch (error) {
    console.error('Error joining room:', error);
    sendError(client, 'Error joining room');
  }
}

async function handleLeaveRoom(client: Client) {
  try {
    if (!client.roomId) {
      throw new Error('Client not in a room');
    }

    const roomId = client.roomId;
    await cleanupClient(client);

    broadcastToRoom(roomId, {
      type: 'peer-left',
      data: { peerId: client.id },
    }, client.id);

    send(client, {
      type: 'left-room',
      data: { roomId },
    });
  } catch (error) {
    console.error('Error leaving room:', error);
    sendError(client, 'Error leaving room');
  }
}

async function handleGetRouterCapabilities(client: Client, data: any) {
  try {
    if (!client.roomId) {
      throw new Error('Client not in a room');
    }

    const room = await mediaServer.createRoom(client.roomId);
    send(client, {
      type: 'router-capabilities',
      data: { rtpCapabilities: room.router.rtpCapabilities },
    });
  } catch (error) {
    console.error('Error getting router capabilities:', error);
    sendError(client, 'Error getting router capabilities');
  }
}

async function handleCreateTransport(client: Client, data: any) {
  try {
    if (!client.roomId) {
      throw new Error('Client not in a room');
    }

    const { transport, params } = await mediaServer.createWebRtcTransport(client.roomId, client.id);

    send(client, {
      type: 'transport-created',
      data: {
        id: transport.id,
        iceParameters: params.iceParameters,
        iceCandidates: params.iceCandidates,
        dtlsParameters: params.dtlsParameters,
        sctpParameters: params.sctpParameters,
      },
    });
  } catch (error) {
    console.error('Error creating transport:', error);
    sendError(client, 'Error creating transport');
  }
}

async function handleConnectTransport(
  client: Client,
  { transportId, dtlsParameters }: { transportId: string; dtlsParameters: mediasoupTypes.DtlsParameters }
) {
  try {
    if (!client.roomId) {
      throw new Error('Client not in a room');
    }

    await mediaServer.connectTransport(client.roomId, client.id, dtlsParameters);

    send(client, {
      type: 'transport-connected',
      data: { transportId },
    });
  } catch (error) {
    console.error('Error connecting transport:', error);
    sendError(client, 'Error connecting transport');
  }
}

async function handleProduce(
  client: Client,
  {
    transportId,
    kind,
    rtpParameters,
  }: {
    transportId: string;
    kind: mediasoupTypes.MediaKind;
    rtpParameters: mediasoupTypes.RtpParameters;
  }
) {
  try {
    if (!client.roomId) {
      throw new Error('Client not in a room');
    }

    const producerId = await mediaServer.produce(
      client.roomId,
      client.id,
      transportId,
      kind,
      rtpParameters
    );

    client.producerIds.add(producerId);

    send(client, {
      type: 'producer-created',
      data: { producerId },
    });

    // הודעה לכל המשתתפים בחדר על ה-producer החדש
    broadcastToRoom(client.roomId, {
      type: 'new-producer',
      data: {
        producerId,
        peerId: client.id,
        kind,
      },
    }, client.id);
  } catch (error) {
    console.error('Error producing:', error);
    sendError(client, 'Error producing');
  }
}

async function handleConsume(
  client: Client,
  {
    producerId,
    rtpCapabilities,
  }: {
    producerId: string;
    rtpCapabilities: mediasoupTypes.RtpCapabilities;
  }
) {
  try {
    if (!client.roomId) {
      throw new Error('Client not in a room');
    }

    const { consumer, params } = await mediaServer.consume(
      client.roomId,
      client.id,
      producerId,
      rtpCapabilities
    );

    client.consumerIds.add(consumer.id);

    send(client, {
      type: 'consumer-created',
      data: {
        consumerId: consumer.id,
        producerId: params.producerId,
        kind: params.kind,
        rtpParameters: params.rtpParameters,
      },
    });
  } catch (error) {
    console.error('Error consuming:', error);
    sendError(client, 'Error consuming');
  }
}

async function handleResumeConsumer(client: Client, { consumerId }: { consumerId: string }) {
  try {
    if (!client.roomId) {
      throw new Error('Client not in a room');
    }

    // כאן צריך להוסיף לוגיקה להפעלת ה-consumer

    send(client, {
      type: 'consumer-resumed',
      data: { consumerId },
    });
  } catch (error) {
    console.error('Error resuming consumer:', error);
    sendError(client, 'Error resuming consumer');
  }
}

async function handleCloseProducer(client: Client, { producerId }: { producerId: string }) {
  try {
    if (!client.roomId) {
      throw new Error('Client not in a room');
    }

    client.producerIds.delete(producerId);

    // כאן צריך להוסיף לוגיקה לסגירת ה-producer

    send(client, {
      type: 'producer-closed',
      data: { producerId },
    });

    broadcastToRoom(client.roomId, {
      type: 'producer-closed',
      data: {
        producerId,
        peerId: client.id,
      },
    }, client.id);
  } catch (error) {
    console.error('Error closing producer:', error);
    sendError(client, 'Error closing producer');
  }
}

async function handleClientDisconnect(client: Client) {
  try {
    await cleanupClient(client);
    clients.delete(client.id);
    console.log(`Client disconnected [id:${client.id}]`);
  } catch (error) {
    console.error('Error handling client disconnect:', error);
  }
}

async function cleanupClient(client: Client) {
  if (client.roomId) {
    // סגירת כל ה-producers וה-consumers של הלקוח
    for (const producerId of client.producerIds) {
      // כאן צריך להוסיף לוגיקה לסגירת ה-producer
    }
    for (const consumerId of client.consumerIds) {
      // כאן צריך להוסיף לוגיקה לסגירת ה-consumer
    }
    client.producerIds.clear();
    client.consumerIds.clear();
    client.roomId = undefined;
  }
}

// פונקציות עזר לשליחת הודעות
function send(client: Client, message: WebSocketMessage) {
  if (client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(message));
  }
}

function sendError(client: Client, error: string) {
  send(client, {
    type: 'error',
    data: { error },
  });
}

function broadcastToRoom(roomId: string, message: WebSocketMessage, excludeClientId?: string) {
  for (const [clientId, client] of clients) {
    if (client.roomId === roomId && clientId !== excludeClientId) {
      send(client, message);
    }
  }
}

// אתחול השרת
async function initialize() {
  try {
    await mediaServer.initialize();
    
    const port = process.env.PORT || 3000;
    server.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

// טיפול בסגירת השרת
async function cleanup() {
  console.log('Cleaning up server...');
  
  // סגירת כל החיבורים
  for (const client of clients.values()) {
    client.ws.close();
  }
  clients.clear();

  // ניקוי MediaSoup
  await mediaServer.cleanup();

  // סגירת השרת
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
}

// טיפול בסיום תהליך
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// הפעלת השרת
initialize(); 