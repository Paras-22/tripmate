const mongoose = require('mongoose')
const { logger } = require('../utils/logger')

// Here I used the Singleton pattern for the database connection.
// The whole app shares one connection (with its own pool), so calling connectDB
// again only gives back the same connection and never opens a second one.
let connection = null

async function connectDB(uri = process.env.MONGO_URI) {
  if (!connection) {
    connection = mongoose.connect(uri).then((m) => {
      logger.info('MongoDB connected')
      return m.connection
    })
  }
  return connection
}

module.exports = { connectDB }
