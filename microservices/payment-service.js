const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'payment-service',
  brokers: ['localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'payment-group' });
const producer = kafka.producer();

(async () => {
  await consumer.connect();
  await producer.connect();
  await consumer.subscribe({ topic: 'orders', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const order = JSON.parse(message.value.toString());
      console.log('Payment Service processing order:', order.id);
      
      // Simulate payment processing delay
      setTimeout(async () => {
        const response = {
          service: 'Payment Service',
          orderId: order.id,
          status: 'Payment processed'
        };
        // Publish response to Kafka
        await producer.send({
          topic: 'order-responses',
          messages: [{ value: JSON.stringify(response) }],
        });
        console.log(`Payment Service processed order ${order.id}`);
      }, 1000);
    }
  });
})();
