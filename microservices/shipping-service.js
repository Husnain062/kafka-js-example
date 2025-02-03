const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'shipping-service',
  brokers: ['localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'shipping-group' });
const producer = kafka.producer();

(async () => {
  await consumer.connect();
  await producer.connect();
  await consumer.subscribe({ topic: 'orders', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const order = JSON.parse(message.value.toString());
      console.log('Shipping Service processing order:', order.id);
      
      // Simulate shipping calculation delay
      setTimeout(async () => {
        const response = {
          service: 'Shipping Service',
          orderId: order.id,
          status: 'Shipping scheduled'
        };
        // Publish response to Kafka
        await producer.send({
          topic: 'order-responses',
          messages: [{ value: JSON.stringify(response) }],
        });
        console.log(`Shipping Service processed order ${order.id}`);
      }, 1500);
    }
  });
})();
