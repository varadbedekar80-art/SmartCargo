

require('dotenv').config();

const app = require('./app');

const PORT = Number(process.env.PORT) || 5000;

const server = app.listen(PORT, () => {
  console.log(`Smart Cargo backend running on port ${PORT}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Port ${PORT} is already in use. Stop the other process or configure another PORT.`
    );
  } else {
    console.error('Failed to start Smart Cargo backend:', error.message);
  }

  process.exitCode = 1;
});
