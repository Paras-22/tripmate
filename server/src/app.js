const path = require('path')
const express = require('express')
const helmet = require('helmet')
const mongoose = require('mongoose')
const authRoutes = require('./routes/auth')
const tripRoutes = require('./routes/trips')
const { logger, requestLogger } = require('./logger')

// Here I stop NoSQL injection, like sending { "$ne": "" } instead of a real value
mongoose.set('sanitizeFilter', true)

const app = express()
const clientFolder = path.join(__dirname, '../../client/dist')

// Here I added the security headers. Google sign in needs its own script, frame and popup.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        scriptSrc: ["'self'", 'https://accounts.google.com/gsi/client'],
        frameSrc: ['https://accounts.google.com/gsi/'],
        connectSrc: ["'self'", 'https://accounts.google.com/gsi/'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://accounts.google.com/gsi/style'],
        upgradeInsecureRequests: null,
      },
    },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    referrerPolicy: { policy: 'no-referrer-when-downgrade' },
  }),
)
app.use(express.json({ limit: '100kb' }))
app.use('/api', requestLogger)

app.use('/api/auth', authRoutes)
app.use('/api/trips', tripRoutes)

// Here the same server gives the built React app, so frontend and API share one address
app.use(express.static(clientFolder))
app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(clientFolder, 'index.html')))

// Here I turn all errors into one simple JSON message
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: Object.values(err.errors)[0].message })
  }
  if (err.name === 'CastError') return res.status(404).json({ error: 'Not found' })
  if (err.status) return res.status(err.status).json({ error: err.message })
  logger.error(err.message, { stack: err.stack })
  res.status(500).json({ error: 'Something went wrong' })
})

module.exports = app
