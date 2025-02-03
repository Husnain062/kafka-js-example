const express = require('express');
const { Kafka } = require('kafkajs');
const path = require('path');

const app = express();
const port = 3000;

// --- Kafka Setup ---
const kafka = new Kafka({
  clientId: 'bff',
  brokers: ['localhost:9092']
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'bff-group' });

(async () => {
  await producer.connect();
  await consumer.connect();
  // Subscribe to the responses topic where microservices post updates.
  await consumer.subscribe({ topic: 'order-responses', fromBeginning: true });

  consumer.run({
    eachMessage: async ({ message }) => {
      // For each message from microservices, broadcast to connected SSE clients.
      const data = message.value.toString();
      console.log('Received update from microservice:', data);
      broadcastSSE(data);
    },
  });
})();

// --- SSE Setup ---
let clients = [];
function broadcastSSE(data) {
  clients.forEach(res => res.write(`data: ${data}\n\n`));
}

// --- Express Routes ---

// Serve the frontend static file
app.use(express.static(path.join(__dirname, '../frontend')));

// Endpoint to create a new order
app.post('/order', async (req, res) => {
  // For demo purposes, the order is simply an object with a random id.
  const order = { id: Math.floor(Math.random() * 10000), createdAt: Date.now() };

  // Publish the order event to Kafka topic 'orders'
  await producer.send({
    topic: 'orders',
    messages: [{ value: JSON.stringify(order) }],
  });

  res.json({ message: 'Order submitted', order });
});

// Endpoint for Server-Sent Events (SSE)
app.get('/events', (req, res) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Add this client to the list
  clients.push(res);

  // Remove client on connection close
  req.on('close', () => {
    clients = clients.filter(client => client !== res);
  });
});

app.listen(port, () => {
  console.log(`BFF server listening on http://localhost:${port}`);
});
