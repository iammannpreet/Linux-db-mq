import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import amqp from 'amqplib';

// Configuration
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq_container';
const QUEUE_NAME = 'employee_queue';
const CSV_FILE_PATH = process.env.CSV_FILE_PATH || 'csv.csv';

// Interface for our CSV data
interface Employee {
  name: string;
  age: string;
  location: string;
  [key: string]: string; // For any other columns that might be in the CSV
}

async function publishMessages() {
  // Connect to RabbitMQ with retry mechanism
  let connection: amqp.Connection | null = null;
  let retries = 5;
  
  while (retries > 0) {
    try {
      console.log(`Attempting to connect to RabbitMQ at ${RABBITMQ_URL}`);
      //@ts-ignore
      connection = await amqp.connect(RABBITMQ_URL);
      console.log('Connected to RabbitMQ');
      break;
    } catch (error) {
      console.log(`Failed to connect to RabbitMQ. Retries left: ${retries}`);
      retries--;
      
      if (retries === 0) {
        throw new Error(`Could not connect to RabbitMQ at ${RABBITMQ_URL}: ${error}`);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  // Ensure connection was established
  if (!connection) {
    throw new Error('Failed to establish connection to RabbitMQ');
  }
  
  // Create a channel
  //@ts-ignore
  const channel = await connection.createChannel();
  
  // Assert queue
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  
  // Verify CSV file exists
  const csvFilePath = path.resolve(CSV_FILE_PATH);
  if (!fs.existsSync(csvFilePath)) {
    throw new Error(`CSV file not found at path: ${csvFilePath}`);
  }
  
  console.log(`Reading from CSV file: ${csvFilePath}`);
  
  // Keep track of messages sent
  let messageCount = 0;
  
  // Create a promise to track when all messages have been sent
  const processingComplete = new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row: Employee) => {
        try {
          // Clean and validate data
          const cleanedRow = {
            name: row.name ? row.name.trim() : '',
            age: row.age ? parseInt(row.age, 10) : null,
            location: row.location ? row.location.trim() : ''
          };
          
          // Validate required fields
          if (!cleanedRow.name) {
            console.warn('Skipping row with missing name:', row);
            return;
          }
          
          const message = JSON.stringify(cleanedRow);
          console.log('Sending:', message);
          
          // Publish message with persistent delivery mode
          channel.sendToQueue(QUEUE_NAME, Buffer.from(message), { 
            persistent: true,
            contentType: 'application/json'
          });
          
          messageCount++;
        } catch (error) {
          console.error('Error processing row:', row, error);
        }
      })
      .on('end', () => {
        console.log(`CSV processing complete. ${messageCount} messages sent.`);
        resolve();
      })
      .on('error', (error) => {
        console.error('Error reading CSV:', error);
        reject(error);
      });
  });
  
  // Wait for CSV processing to complete
  await processingComplete;
  
  // Allow time for all messages to be sent before closing
  console.log('Waiting for all messages to be confirmed...');
  setTimeout(async () => {
    try {
      await channel.close();
      // Use non-null assertion since we've checked connection isn't null above
      //@ts-ignore
      await connection!.close();
      console.log('Connection closed');
    } catch (error) {
      console.error('Error closing connection:', error);
    }
  }, 1000);
}

// Start the producer
publishMessages().catch((error) => {
  console.error('Failed to publish messages:', error);
  process.exit(1);
});