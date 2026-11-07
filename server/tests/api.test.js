const assert = require('node:assert/strict')
const { after, before, beforeEach, describe, mock, test } = require('node:test')
const mongoose = require('mongoose')
const request = require('supertest')
const { OAuth2Client } = require('google-auth-library')
const { MongoMemoryServer } = require('mongodb-memory-server')

process.env.JWT_SECRET = 'test-secret'
process.env.GOOGLE_CLIENT_ID = 'test-client-id'

// Here I replace Google and the push service so the tests run without the internet
const sendPush = mock.fn(async () => {})
require.cache[require.resolve('web-push')] = {
  loaded: true,
  exports: { setVapidDetails() {}, sendNotification: sendPush },
}
const app = require('../app')
const Trip = require('../models/Trip')

mock.method(OAuth2Client.prototype, 'verifyIdToken', async ({ idToken }) => {
  if (idToken !== 'good-credential') throw new Error('bad')
  return { getPayload: () => ({ sub: idToken, name: 'Test Organiser' }) }
})

const newTrip = { title: 'Japan', destination: 'Tokyo', startDate: '2027-01-10', endDate: '2027-01-15' }
const newActivity = { date: '2027-01-10', time: '09:30', title: 'Flight to Tokyo', type: 'flight' }
const subscription = { endpoint: 'https://push.example/1', keys: { p256dh: 'a', auth: 'b' } }

let mongo, organiser, trip, traveller

const bearer = (token) => ({ Authorization: `Bearer ${token}` })

before(async () => {
  mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } })
  await mongoose.connect(mongo.getUri())
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
  organiser = login.body.token

  const created = await request(app).post('/api/trips').set(bearer(organiser)).send(newTrip)
  trip = created.body

  const join = await request(app).post('/api/auth/join').send({ code: trip.inviteCode.toLowerCase() })
  traveller = join.body.token
})

describe('sign in', () => {
  test('rejects a bad Google credential', async () => {
    await request(app).post('/api/auth/google').send({ credential: 'fake' }).expect(401)
  })

  test('rejects a wrong invite code', async () => {
    await request(app).post('/api/auth/join').send({ code: 'WRONG' }).expect(404)
  })

  test('blocks NoSQL injection in the invite code', async () => {
    await request(app).post('/api/auth/join').send({ code: { $ne: '' } }).expect(404)
  })

  test('blocks requests with no token', async () => {
    await request(app).get(`/api/trips/${trip._id}`).expect(401)
  })
})

describe('organiser CRUD', () => {
  test('creates, reads, updates and deletes an activity', async () => {
    const url = `/api/trips/${trip._id}/activities`

    const added = await request(app).post(url).set(bearer(organiser)).send(newActivity).expect(201)
    const id = added.body.activities[0]._id

    const read = await request(app).get(`/api/trips/${trip._id}`).set(bearer(organiser))
    assert.equal(read.body.activities.length, 1)

    const edited = await request(app).put(`${url}/${id}`).set(bearer(organiser)).send({ title: 'Flight' })
    assert.equal(edited.body.activities[0].title, 'Flight')
    assert.equal(edited.body.activities[0].time, '09:30')

    const removed = await request(app).delete(`${url}/${id}`).set(bearer(organiser))
    assert.equal(removed.body.activities.length, 0)
  })

  test('updates and deletes a trip', async () => {
    const url = `/api/trips/${trip._id}`

    const edited = await request(app).put(url).set(bearer(organiser)).send({ title: 'Japan 2027' })
    assert.equal(edited.body.title, 'Japan 2027')

    await request(app).delete(url).set(bearer(organiser)).expect(200)
    await request(app).get(url).set(bearer(organiser)).expect(404)
  })

  test('rejects bad data', async () => {
    await request(app)
      .post('/api/trips')
      .set(bearer(organiser))
      .send({ ...newTrip, endDate: '2027-01-01' })
      .expect(400)
  })

  test('cannot change the organiser or invite code', async () => {
    const res = await request(app)
      .put(`/api/trips/${trip._id}`)
      .set(bearer(organiser))
      .send({ organiserId: 'hacker', inviteCode: 'HACKED' })
    assert.equal(res.body.organiserId, trip.organiserId)
    assert.equal(res.body.inviteCode, trip.inviteCode)
  })

  test('another organiser cannot open this trip', async () => {
    await Trip.updateOne({ _id: trip._id }, { organiserId: 'someone-else' })
    await request(app).get(`/api/trips/${trip._id}`).set(bearer(organiser)).expect(403)
  })
})

describe('traveller', () => {
  test('can read the trip but cannot change it', async () => {
    const url = `/api/trips/${trip._id}`
    await request(app).get(url).set(bearer(traveller)).expect(200)
    await request(app).put(url).set(bearer(traveller)).send({ title: 'x' }).expect(403)
    await request(app).delete(url).set(bearer(traveller)).expect(403)
    await request(app).post(`${url}/activities`).set(bearer(traveller)).send(newActivity).expect(403)
  })

  test('cannot read a different trip', async () => {
    const other = await request(app).post('/api/trips').set(bearer(organiser)).send(newTrip)
    await request(app).get(`/api/trips/${other.body._id}`).set(bearer(traveller)).expect(403)
  })
})

describe('push notifications', () => {
  const subscribe = () =>
    request(app).post(`/api/trips/${trip._id}/subscribe`).set(bearer(traveller)).send(subscription)
  const addActivity = () =>
    request(app).post(`/api/trips/${trip._id}/activities`).set(bearer(organiser)).send(newActivity)

  test('sends one alert when the itinerary changes, even after subscribing twice', async () => {
    await subscribe()
    await subscribe()
    await addActivity()
    assert.equal(sendPush.mock.callCount(), 1)
    assert.match(sendPush.mock.calls[0].arguments[1], /Flight to Tokyo/)
  })

  test('removes subscriptions that have expired', async () => {
    await subscribe()
    sendPush.mock.mockImplementation(async () => {
      throw Object.assign(new Error('gone'), { statusCode: 410 })
    })
    await addActivity()
    assert.equal((await Trip.findById(trip._id)).subscriptions.length, 0)
  })

  test('keeps push data private and rejects non-https addresses', async () => {
    await subscribe()
    const res = await request(app).get(`/api/trips/${trip._id}`).set(bearer(traveller))
    assert.equal(res.body.subscriptions, undefined)

    await request(app)
      .post(`/api/trips/${trip._id}/subscribe`)
      .set(bearer(traveller))
      .send({ ...subscription, endpoint: 'http://localhost:27017' })
      .expect(400)
  })
})
