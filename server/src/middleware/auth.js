const jwt = require('jsonwebtoken')
const Trip = require('../models/Trip')

// Here I wrote the filters of my Intercepting Filter chain (see routes/trips.js)

// Here I made one helper that creates the JWT for both organisers and travellers
function createToken(user) {
  return jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '30d' })
}

// Here I check the JWT on every protected request and put the user on req.user
function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
    next()
  } catch {
    res.status(401).json({ error: 'Please sign in again' })
  }
}

// Here I did the role-based access: only organisers can pass this check
function requireOrganiser(req, res, next) {
  if (req.user.role !== 'organiser') {
    return res.status(403).json({ error: 'Only the organiser can do this' })
  }
  next()
}

// Here I load the trip and make sure this user belongs to it.
// An organiser must own the trip, a traveller must have joined it with the invite code.
async function loadTrip(req, res, next) {
  const trip = await Trip.findById(req.params.id)
  if (!trip) return res.status(404).json({ error: 'Trip not found' })

  const isOwner = req.user.role === 'organiser' && trip.organiserId === req.user.sub
  const hasJoined = req.user.role === 'traveller' && req.user.tripId === trip.id
  if (!isOwner && !hasJoined) {
    return res.status(403).json({ error: 'You are not part of this trip' })
  }

  req.trip = trip
  next()
}

module.exports = { createToken, requireAuth, requireOrganiser, loadTrip }
