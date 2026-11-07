const express = require('express')
const { OAuth2Client } = require('google-auth-library')
const { rateLimit } = require('express-rate-limit')
const Trip = require('../models/Trip')
const { createToken } = require('../middleware/auth')

const router = express.Router()
const googleClient = new OAuth2Client()

// Here I limit login attempts so nobody can keep guessing invite codes
router.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }))

// Here I did the organiser sign in. The browser gets a credential from Google,
// I check it with Google here, and then I give back my own JWT.
router.post('/google', async (req, res) => {
  try {
    // Here the audience check makes sure the credential was made for my app only
    const audience = process.env.GOOGLE_CLIENT_ID
    if (!audience) throw new Error('GOOGLE_CLIENT_ID is missing')

    const ticket = await googleClient.verifyIdToken({
      idToken: String(req.body.credential),
      audience,
    })
    const { sub, name } = ticket.getPayload()
    const user = { sub, name, role: 'organiser' }
    res.json({ ...user, token: createToken(user) })
  } catch {
    res.status(401).json({ error: 'Google sign in failed' })
  }
})

// Here I did the traveller join. A correct invite code gives a traveller JWT for that trip only.
router.post('/join', async (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase()
  const trip = await Trip.findOne({ inviteCode: code })
  if (!trip) return res.status(404).json({ error: 'Invite code not found' })

  const user = { sub: `traveller-${trip.id}`, name: 'Traveller', role: 'traveller', tripId: trip.id }
  res.json({ ...user, token: createToken(user) })
})

module.exports = router
