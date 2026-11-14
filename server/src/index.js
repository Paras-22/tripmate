// Here the .env file stays in the server folder, one level above src
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const mongoose = require('mongoose')
const app = require('./app')

// Here I connect to the MongoDB replica set first and only then start the server
async function start() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('MongoDB connected')

  const port = process.env.PORT || 5000
  app.listen(port, () => console.log(`TripMate running on http://localhost:${port}`))
}

start().catch((error) => {
  console.error(error)
  process.exit(1)
})
