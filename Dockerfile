# NexusAI Chatbot Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy app files
COPY . .

# Create data directory
RUN mkdir -p data

# Expose port
EXPOSE 52738

# Start the app
CMD ["node", "server.js"]