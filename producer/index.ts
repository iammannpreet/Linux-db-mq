import fs from 'fs';
import csv from 'csv-parser';
import amqp from 'amqplib';

async function publishMessages() {
  const connection = await amqp.connect('amqp://rabbitmq_container');
  const channel = await connection.createChannel();
  const queue = 'employee_queue';

  await channel.assertQueue(queue, { durable: true });

  fs.createReadStream('csv.csv')
    .pipe(csv())
    .on('data', async (row) => {
      const message = JSON.stringify(row);
      console.log('Sending:', message);
      channel.sendToQueue(queue, Buffer.from(message), { persistent: true });
    })
    .on('end', () => {
      console.log('All messages sent.');
      setTimeout(() => connection.close(), 500);
    });
}

publishMessages().catch(console.error);
