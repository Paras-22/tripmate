// Here I test routes/auth.js: Google sign in for organisers and the invite code for travellers
const assert = require('node:assert/strict')
const { describe, test } = require('node:test')
const jwt = require('jsonwebtoken')
const { app, request, state, bearer } = require('./setup')

describe('Google sign in (organiser)', () => {
  test('gives an organiser JWT for a good Google credential', async () => {
    const res = await request(app).post('/api/auth/google').send({ credential: 'good-credential' }).expect(200)
    assert.equal(res.body.role, 'organiser')
    assert.equal(res.body.name, 'Test Organiser')
    // Here I open the token and check what is inside it
    const payload = jwt.verify(res.body.token, 'test-secret')
    assert.equal(payload.role, 'organiser')
    assert.equal(payload.sub, 'good-credential')
  })

  test('rejects a bad Google credential', async () => {
    await request(app).post('/api/auth/google').send({ credential: 'fake' }).expect(401)
  })

  test('rejects a request with no credential', async () => {
    await request(app).post('/api/auth/google').send({}).expect(401)
  })
})

describe('invite code join (traveller)', () => {
  // Here small letters work, because the server changes the code to capitals
  test('gives a traveller JWT for this one trip', async () => {
    const res = await request(app).post('/api/auth/join').send({ code: state.trip.inviteCode.toLowerCase() }).expect(200)
    assert.equal(res.body.role, 'traveller')
    assert.equal(jwt.verify(res.body.token, 'test-secret').tripId, state.trip._id)
  })

  test('accepts a code with spaces around it', async () => {
    await request(app).post('/api/auth/join').send({ code: `  ${state.trip.inviteCode}  ` }).expect(200)
  })

  test('rejects a wrong invite code', async () => {
    await request(app).post('/api/auth/join').send({ code: 'WRONG' }).expect(404)
  })

  // Here { "$ne": "" } would mean "any code that is not empty" without protection
  test('blocks NoSQL injection in the invite code', async () => {
    await request(app).post('/api/auth/join').send({ code: { $ne: '' } }).expect(404)
  })
})

describe('JWT checks', () => {
  test('blocks requests with no token', async () => {
    await request(app).get(`/api/trips/${state.trip._id}`).expect(401)
  })

  // Here I try the token tricks an attacker could use
  test('blocks a token that is expired, faked or unsigned', async () => {
    const user = { sub: 'good-credential', role: 'organiser' }
    const expired = jwt.sign(user, 'test-secret', { expiresIn: -10 })
    const faked = jwt.sign(user, 'wrong-secret')
    const unsigned = jwt.sign(user, null, { algorithm: 'none' })

    for (const token of [expired, faked, unsigned]) {
      await request(app).get('/api/trips').set(bearer(token)).expect(401)
    }
  })

  // Here a traveller cannot make themselves an organiser by editing the token
  test('blocks a traveller token that was changed to organiser', async () => {
    const [header, , signature] = state.traveller.split('.')
    const payload = Buffer.from(JSON.stringify({ sub: 'x', role: 'organiser' })).toString('base64url')
    await request(app).get('/api/trips').set(bearer(`${header}.${payload}.${signature}`)).expect(401)
  })
})
