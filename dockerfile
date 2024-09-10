# Use the official Node.js image as a base
FROM node:14

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Compile TypeScript files
RUN tsc

# Command to run the application (adjust as necessary)
CMD ["node", "out/index.js"]
