// Here I test the trip CRUD routes in routes/trips.js and who is allowed to use them
const assert = require('node:assert/strict')
const { describe, mock, test } = require('node:test')
const { app, Trip, request, state, bearer, newTrip } = require('../helpers/setup')

const tripUrl = () => `/api/trips/${state.trip._id}`

describe('organiser CRUD', () => {
  // Here CREATE: the server makes the invite code, not the browser
  test('creates a trip with a random 8 character invite code', async () => {
    const res = await request(app).post('/api/trips').set(bearer(state.organiser)).send(newTrip).expect(201)
    assert.match(res.body.inviteCode, /^[A-F0-9]{8}$/)
    assert.notEqual(res.body.inviteCode, state.trip.inviteCode)
  })

  // Here READ: the list only has this organiser's trips, sorted by start date
  test('lists only my trips, sorted by start date', async () => {
    await request(app).post('/api/trips').set(bearer(state.organiser)).send({ ...newTrip, title: 'Earlier', startDate: '2026-12-01', endDate: '2026-12-02' })
    await Trip.create({ ...newTrip, title: 'Not mine', organiserId: 'someone-else', inviteCode: 'FFFF0000' })

    const res = await request(app).get('/api/trips').set(bearer(state.organiser)).expect(200)
    assert.deepEqual(res.body.map((t) => t.title), ['Earlier', 'Japan'])
  })

  test('reads one trip', async () => {
    const res = await request(app).get(tripUrl()).set(bearer(state.organiser)).expect(200)
    assert.equal(res.body.title, 'Japan')
  })

  // Here UPDATE and DELETE
  test('updates and deletes a trip', async () => {
    const res = await request(app).put(tripUrl()).set(bearer(state.organiser)).send({ title: 'Japan 2027' }).expect(200)
    assert.equal(res.body.title, 'Japan 2027')

    await request(app).delete(tripUrl()).set(bearer(state.organiser)).expect(200)
    assert.equal(await Trip.findById(state.trip._id), null)
  })

  test('rejects bad data with a clear message', async () => {
    const res = await request(app).post('/api/trips').set(bearer(state.organiser)).send({ ...newTrip, endDate: '2027-01-01' }).expect(400)
    assert.equal(res.body.error, 'End date must be on or after the start date')
    await request(app).post('/api/trips').set(bearer(state.organiser)).send({ ...newTrip, title: '' }).expect(400)
    await request(app).post('/api/trips').set(bearer(state.organiser)).send({ ...newTrip, startDate: '10/01/2027' }).expect(400)
  })

  // Here the browser could send extra fields, but the server only takes the ones I allow
  test('cannot change the organiser or invite code', async () => {
    const res = await request(app)
      .put(tripUrl())
      .set(bearer(state.organiser))
      .send({ organiserId: 'hacker', inviteCode: 'AAAA0000' })
    assert.equal(res.body.organiserId, 'good-credential')
    assert.equal(res.body.inviteCode, state.trip.inviteCode)
  })

  test('another organiser cannot open this trip', async () => {
    await Trip.updateOne({ _id: state.trip._id }, { organiserId: 'someone-else' })
    await request(app).get(tripUrl()).set(bearer(state.organiser)).expect(403)
  })
})

describe('traveller', () => {
  test('can read the trip but cannot change it', async () => {
    await request(app).get(tripUrl()).set(bearer(state.traveller)).expect(200)
    await request(app).put(tripUrl()).set(bearer(state.traveller)).send({ title: 'x' }).expect(403)
    await request(app).delete(tripUrl()).set(bearer(state.traveller)).expect(403)
  })

  test('cannot read a different trip', async () => {
    const other = await request(app).post('/api/trips').set(bearer(state.organiser)).send(newTrip)
    await request(app).get(`/api/trips/${other.body._id}`).set(bearer(state.traveller)).expect(403)
  })

  test('cannot see the list of all trips', async () => {
    await request(app).get('/api/trips').set(bearer(state.traveller)).expect(403)
  })

  test('cannot create a trip', async () => {
    await request(app).post('/api/trips').set(bearer(state.traveller)).send(newTrip).expect(403)
  })
})

describe('errors', () => {
  test('a wrong trip id gives 404', async () => {
    await request(app).get('/api/trips/not-an-id').set(bearer(state.organiser)).expect(404)
    await request(app).get('/api/trips/000000000000000000000000').set(bearer(state.organiser)).expect(404)
  })

  // Here the error handler hides the details, so attackers learn nothing about the code
  test('an unexpected error gives a simple message and hides the details', async () => {
    const find = mock.method(Trip, 'find', () => {
      throw new Error('database is down at 10.0.0.5')
    })
    const res = await request(app).get('/api/trips').set(bearer(state.organiser)).expect(500)
    find.mock.restore()
    assert.deepEqual(res.body, { error: 'Something went wrong' })
  })
})
