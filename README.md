# RabbitMQ Employee Data Processing System

A complete data processing system that reads employee data from CSV files, sends messages to a RabbitMQ queue, and stores the data in a MySQL database.

## Architecture

This project consists of four main components:

1. **MySQL Database**: Stores employee data
2. **RabbitMQ**: Message broker for reliable communication
3. **Producer Service**: Reads CSV data and sends messages to RabbitMQ
4. **Consumer Service**: Processes messages from RabbitMQ and stores them in MySQL

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Producer  │ => │  RabbitMQ   │ => │  Consumer   │ => ┌─────────────┐
│ (CSV Reader)│    │ (Message    │    │ (Message    │    │   MySQL     │
│             │    │  Broker)    │    │  Processor) │    │ (Database)  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## Prerequisites

- Docker and Docker Compose (v3.8+)
- Git (for cloning the repository)

## Getting Started

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd employee-data-processor
   ```

2. Create or modify the CSV file (optional):
   ```
   name,age,location
   John Doe,28,Toronto
   Jane Smith,34,Vancouver
   ```

3. Start the application:
   ```bash
   docker-compose up -d
   ```

### Monitoring

- Access the RabbitMQ management interface at: http://localhost:15672/
  - Username: guest
  - Password: guest

- Connect to MySQL database:
  - Host: localhost
  - Port: 3306
  - Username: root
  - Password: password
  - Database: testdb

## Structure

```
.
├── consumer/
│   ├── Dockerfile
│   ├── index.ts
│   ├── package.json
│   └── tsconfig.json
├── producer/
│   ├── Dockerfile
│   ├── csv.csv
│   ├── index.ts
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml
└── README.md
```

## Features

- **Reliable Message Processing**: Uses RabbitMQ for resilient message delivery
- **Data Validation**: Validates input data before storing
- **Containerized Setup**: Easy deployment with Docker
- **Health Checks**: Built-in health checks for services
- **Error Handling**: Comprehensive error handling and retry mechanisms
- **Graceful Shutdown**: Proper cleanup of resources on shutdown

## Configuration

The application can be configured using environment variables in the `docker-compose.yml` file:

### Producer Service

| Variable | Description | Default |
|----------|-------------|---------|
| RABBITMQ_URL | RabbitMQ connection URL | amqp://guest:guest@rabbitmq_container |
| CSV_FILE_PATH | Path to the CSV file | /app/csv.csv |

### Consumer Service

| Variable | Description | Default |
|----------|-------------|---------|
| RABBITMQ_URL | RabbitMQ connection URL | amqp://guest:guest@rabbitmq_container |
| MYSQL_HOST | MySQL host | mysql_container |
| MYSQL_USER | MySQL username | root |
| MYSQL_PASSWORD | MySQL password | password |
| MYSQL_DATABASE | MySQL database name | testdb |

## How It Works

1. The Producer reads employee data from a CSV file.
2. It sends each record as a message to the RabbitMQ queue with proper validation.
3. The Consumer service listens to the RabbitMQ queue.
4. When a message is received, it validates the data and stores it in the MySQL database.

## Database Schema

```sql
CREATE TABLE employee (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  age INT,
  location VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

## Development

### Local Development

To run the services locally for development:

1. Install dependencies in both the producer and consumer folders:
   ```bash
   cd producer
   npm install
   cd ../consumer
   npm install
   ```

2. Run in development mode:
   ```bash
   # For producer
   cd producer
   npm run dev
   
   # For consumer
   cd consumer
   npm run dev
   ```

### Adding More Data

To process additional data, you can:

1. Modify the `producer/csv.csv` file with new employee records
2. Restart the producer service:
   ```bash
   docker-compose restart producer
   ```

## Troubleshooting

### Common Issues

1. **Services not starting**:
   - Check logs: `docker-compose logs -f <service-name>`
   - Ensure RabbitMQ and MySQL are healthy: `docker-compose ps`

2. **Database connection issues**:
   - Verify MySQL is running: `docker-compose ps mysql`
   - Check credentials in docker-compose.yml

3. **RabbitMQ connection issues**:
   - Verify RabbitMQ is running: `docker-compose ps rabbitmq`
   - Check management interface: http://localhost:15672/

## License

[MIT License](LICENSE)
