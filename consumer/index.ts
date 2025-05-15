import amqp from 'amqplib';
import mysql from 'mysql2/promise';

async function startConsumer() {
  const connection = await amqp.connect('amqp://rabbitmq_container');
  const channel = await connection.createChannel();
  const queue = 'employee_queue';

  await channel.assertQueue(queue, { durable: true });

  const db = await mysql.createConnection({
    host: 'mysql_container',
    user: 'root',
    password: 'password',
    database: 'testdb',
  });

  console.log('Waiting for messages...');
  channel.consume(queue, async (msg) => {
    if (msg) {
      const data = JSON.parse(msg.content.toString());
      console.log('Received:', data);

      await db.execute(
        'INSERT INTO employee (name, age, location) VALUES (?, ?, ?)',
        [data.name, data.age, data.location]
      );

      channel.ack(msg);
    }
  });
}

startConsumer().catch(console.error);
