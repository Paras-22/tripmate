// Here I test push.js and the subscribe route.
// The real push service is replaced in setup.js, so sendPush only records each call.
const assert = require('node:assert/strict')
const { describe, test } = require('node:test')
const { app, Trip, request, state, bearer, sendPush, newActivity, subscription } = require('../helpers/setup')

const subscribe = (body = subscription) =>
  request(app).post(`/api/trips/${state.trip._id}/subscribe`).set(bearer(state.traveller)).send(body)
const addActivity = () =>
  request(app).post(`/api/trips/${state.trip._id}/activities`).set(bearer(state.organiser)).send(newActivity)

describe('subscribe route', () => {
  test('saves the subscription of the traveller', async () => {
    await subscribe().expect(201)
    assert.equal((await Trip.findById(state.trip._id)).subscriptions.length, 1)
  })

  // Here I check http addresses are blocked, so nobody can make my server call an internal address
  test('rejects a non-https address', async () => {
    await subscribe({ ...subscription, endpoint: 'http://localhost:27017' }).expect(400)
  })

  // Here I check the push addresses stay private, like phone numbers
  test('never sends the push data back to the browser', async () => {
    await subscribe()
    const res = await request(app).get(`/api/trips/${state.trip._id}`).set(bearer(state.traveller))
    assert.equal(res.body.subscriptions, undefined)
  })
})

describe('sending alerts', () => {
  // Here I check subscribing twice from one phone does not give two alerts
  test('sends one alert when the itinerary changes, even after subscribing twice', async () => {
    await subscribe()
    await subscribe()
    await addActivity()
    assert.equal(sendPush.mock.callCount(), 1)
  })

  test('the alert has the trip title, the change and the link to the trip', async () => {
    await subscribe()
    await addActivity()
    const payload = JSON.parse(sendPush.mock.calls[0].arguments[1])
    assert.deepEqual(payload, {
      title: 'Japan',
      body: 'New activity: Flight to Tokyo',
      url: `/trips/${state.trip._id}`,
    })
  })

  test('tells travellers before the trip is deleted', async () => {
    await subscribe()
    await request(app).delete(`/api/trips/${state.trip._id}`).set(bearer(state.organiser)).expect(200)
    assert.match(sendPush.mock.calls[0].arguments[1], /cancelled/)
  })

  test('sends nothing when nobody turned on alerts', async () => {
    await addActivity()
    assert.equal(sendPush.mock.callCount(), 0)
  })

  // Here I check one phone failing does not stop the alert for the others
  test('one broken phone does not stop the alert for the others', async () => {
    await subscribe()
    await subscribe({ ...subscription, endpoint: 'https://push.example/2' })
    sendPush.mock.mockImplementationOnce(async () => {
      throw Object.assign(new Error('push service down'), { statusCode: 500 })
    })
    await addActivity().expect(201)
    assert.equal(sendPush.mock.callCount(), 2)
    assert.equal((await Trip.findById(state.trip._id)).subscriptions.length, 2) // here I keep the phone, because a 500 is not a dead phone
  })

  // Here I check 404 and 410 delete the subscription, because they mean the browser removed it
  test('removes subscriptions that have expired', async () => {
    await subscribe()
    sendPush.mock.mockImplementation(async () => {
      throw Object.assign(new Error('gone'), { statusCode: 410 })
    })
    await addActivity()
    assert.equal((await Trip.findById(state.trip._id)).subscriptions.length, 0)
  })
})
