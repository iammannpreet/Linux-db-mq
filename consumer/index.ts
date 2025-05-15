import amqp from 'amqplib';
import mysql from 'mysql2/promise';

// Configuration
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq_container';
const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || 'mysql_container',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'password',
  database: process.env.MYSQL_DATABASE || 'testdb',
};
const QUEUE_NAME = 'employee_queue';

// Database setup
async function setupDatabase() {
  const connection = await mysql.createConnection(MYSQL_CONFIG);
  
  // Create table if not exists
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS employee (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      age INT,
      location VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('Database setup completed');
  
  return connection;
}

// RabbitMQ consumer
async function startConsumer() {
  // Set up database first
  const db = await setupDatabase();
  console.log('Connected to MySQL');
  // @ts-ignore
  // Connect to RabbitMQ with retry mechanism
  let connection;
  let retries = 5;
  
  while (retries > 0) {
    try {
      connection = await amqp.connect(RABBITMQ_URL);
      break;
    } catch (error) {
      console.log(`Failed to connect to RabbitMQ. Retries left: ${retries}`);
      retries--;
      
      if (retries === 0) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  // Handle connection errors
  //@ts-ignore
  connection.on('error', (err: any) => {
    console.error('RabbitMQ connection error:', err);
    process.exit(1);
  });
  
  // Handle connection close
  //@ts-ignore
  connection.on('close', () => {
    console.log('RabbitMQ connection closed');
    process.exit(0);
  });
  
  // Create a channel
  //@ts-ignore
  const channel = await connection.createChannel();
  
  // Assert queue
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  
  // Set prefetch to process one message at a time
  channel.prefetch(1);
  
  console.log(`Waiting for messages in queue: ${QUEUE_NAME}`);
  
  // Consume messages
  channel.consume(QUEUE_NAME, async (msg: any) => {
    if (msg) {
      try {
        // Parse message content
        const data = JSON.parse(msg.content.toString());
        console.log('Received:', data);
        
        // Validate data
        if (!data.name) {
          console.error('Invalid data: name is required');
          channel.ack(msg); // Acknowledge even invalid messages to avoid queue buildup
          return;
        }
        
        // Insert into database
        await db.execute(
          'INSERT INTO employee (name, age, location) VALUES (?, ?, ?)',
          [data.name, data.age || null, data.location || null]
        );
        
        console.log(`Stored employee: ${data.name}`);
        
        // Acknowledge the message
        channel.ack(msg);
      } catch (error) {
        console.error('Error processing message:', error);
        
        // In production, you might want to implement a dead-letter queue
        // for failed messages instead of just acknowledging them
        channel.ack(msg);
      }
    }
  });
  
  // Handle process termination
  process.on('SIGINT', async () => {
    try {
      await channel.close();
      //@ts-ignore
      await connection.close();
      await db.end();
      console.log('Gracefully shutting down');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  });
}

// Start the consumer
startConsumer().catch((error) => {
  console.error('Failed to start consumer:', error);
  process.exit(1);
});