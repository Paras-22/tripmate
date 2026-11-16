// Here I keep the shared setup for the API tests, so every test file starts the same way.
// Each API test file requires this file first.
const { after, before, beforeEach, mock } = require('node:test')
const mongoose = require('mongoose')
const request = require('supertest')
const { OAuth2Client } = require('google-auth-library')
const { MongoMemoryServer } = require('mongodb-memory-server')

process.env.NODE_ENV = 'test' // here the logger stays quiet during tests
process.env.JWT_SECRET = 'test-secret'
process.env.GOOGLE_CLIENT_ID = 'test-client-id'

// Here I replace the push service, so the tests run without the internet
const sendPush = mock.fn(async () => {})
require.cache[require.resolve('web-push')] = {
  loaded: true,
  exports: { setVapidDetails() {}, sendNotification: sendPush },
}

const app = require('../src/app')
const Trip = require('../src/models/Trip')
const { connectDB } = require('../src/db')

// Here I replace Google: only the credential "good-credential" is accepted
mock.method(OAuth2Client.prototype, 'verifyIdToken', async ({ idToken }) => {
  if (idToken !== 'good-credential') throw new Error('bad')
  return { getPayload: () => ({ sub: idToken, name: 'Test Organiser' }) }
})

const newTrip = { title: 'Japan', destination: 'Tokyo', startDate: '2027-01-10', endDate: '2027-01-15' }
const newActivity = { date: '2027-01-10', time: '09:30', title: 'Flight to Tokyo', type: 'flight' }
const subscription = { endpoint: 'https://push.example/1', keys: { p256dh: 'a', auth: 'b' } }
const bearer = (token) => ({ Authorization: `Bearer ${token}` })

// Here the tests read these after beforeEach has filled them in
const state = { organiser: null, traveller: null, trip: null }

let mongo

// Here I start a MongoDB that lives in memory, so tests never touch the real data
before(async () => {
  mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } })
  await connectDB(mongo.getUri())
})

after(async () => {
  await mongoose.disconnect()
  await mongo.stop()
})

// Here every test starts with one trip, a signed in organiser and a joined traveller
beforeEach(async () => {
  await Trip.deleteMany()
  sendPush.mock.resetCalls()
  sendPush.mock.mockImplementation(async () => {})

  const login = await request(app).post('/api/auth/google').send({ credential: 'good-credential' })
  state.organiser = login.body.token

  const created = await request(app).post('/api/trips').set(bearer(state.organiser)).send(newTrip)
  state.trip = created.body

  const join = await request(app).post('/api/auth/join').send({ code: state.trip.inviteCode.toLowerCase() })
  state.traveller = join.body.token
})

module.exports = { app, Trip, request, state, bearer, sendPush, newTrip, newActivity, subscription }
