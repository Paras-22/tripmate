// Here I unit test the filters in middleware/auth.js on their own.
// I give them a fake request and response, so no server or database is needed.
const assert = require('node:assert/strict')
const { describe, mock, test } = require('node:test')

process.env.JWT_SECRET = 'test-secret'
const Trip = require('../src/models/Trip')
const { createToken, requireAuth, requireOrganiser, loadTrip } = require('../src/middleware/auth')

// Here a fake response remembers the status and the JSON it was given
function fakeResponse() {
  const res = { statusCode: 200, body: null }
  res.status = (code) => {
    res.statusCode = code
    return res
  }
  res.json = (body) => {
    res.body = body
    return res
  }
  return res
}

describe('createToken', () => {
  test('makes a JWT that requireAuth accepts, with the user inside', () => {
    const token = createToken({ sub: 'u1', role: 'organiser' })
    const req = { headers: { authorization: `Bearer ${token}` } }
    const next = mock.fn()
    requireAuth(req, fakeResponse(), next)
    assert.equal(next.mock.callCount(), 1)
    assert.equal(req.user.sub, 'u1')
  })
})

describe('requireAuth', () => {
  test('stops a request with no token with 401', () => {
    const res = fakeResponse()
    const next = mock.fn()
    requireAuth({ headers: {} }, res, next)
    assert.equal(res.statusCode, 401)
    assert.equal(next.mock.callCount(), 0) // here the request never reaches the route
  })

  test('stops a token with a wrong signature with 401', () => {
    const res = fakeResponse()
    requireAuth({ headers: { authorization: 'Bearer abc.def.ghi' } }, res, mock.fn())
    assert.equal(res.body.error, 'Please sign in again')
  })
})

describe('requireOrganiser', () => {
  test('lets an organiser through', () => {
    const next = mock.fn()
    requireOrganiser({ user: { role: 'organiser' } }, fakeResponse(), next)
    assert.equal(next.mock.callCount(), 1)
  })

  test('stops a traveller with 403', () => {
    const res = fakeResponse()
    const next = mock.fn()
    requireOrganiser({ user: { role: 'traveller' } }, res, next)
    assert.equal(res.statusCode, 403)
    assert.equal(next.mock.callCount(), 0)
  })
})

describe('loadTrip', () => {
  const trip = { id: 't1', organiserId: 'owner' }

  // Here I replace the database call with a fake one that gives back my trip
  async function runLoadTrip(user, found = trip) {
    const findById = mock.method(Trip, 'findById', async () => found)
    const req = { params: { id: 't1' }, user }
    const res = fakeResponse()
    const next = mock.fn()
    await loadTrip(req, res, next)
    findById.mock.restore()
    return { req, res, next }
  }

  test('lets the owner through and puts the trip on req.trip', async () => {
    const { req, next } = await runLoadTrip({ role: 'organiser', sub: 'owner' })
    assert.equal(next.mock.callCount(), 1)
    assert.equal(req.trip, trip)
  })

  test('lets a traveller of this trip through', async () => {
    const { next } = await runLoadTrip({ role: 'traveller', tripId: 't1' })
    assert.equal(next.mock.callCount(), 1)
  })

  test('stops another organiser with 403', async () => {
    const { res, next } = await runLoadTrip({ role: 'organiser', sub: 'someone-else' })
    assert.equal(res.statusCode, 403)
    assert.equal(next.mock.callCount(), 0)
  })

  test('stops a traveller of a different trip with 403', async () => {
    const { res } = await runLoadTrip({ role: 'traveller', tripId: 't2' })
    assert.equal(res.statusCode, 403)
  })

  test('gives 404 when the trip does not exist', async () => {
    const { res } = await runLoadTrip({ role: 'organiser', sub: 'owner' }, null)
    assert.equal(res.statusCode, 404)
    assert.equal(res.body.error, 'Trip not found')
  })
})
