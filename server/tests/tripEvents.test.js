// Here I unit test tripEvents.js, my Observer: routes publish a change, observers react to it
const assert = require('node:assert/strict')
const { mock, test } = require('node:test')

process.env.NODE_ENV = 'test' // here the logger stays quiet
const tripEvents = require('../src/tripEvents')

const trip = { id: 't1', title: 'Japan' }

test('every subscribed observer gets the trip and the message', async () => {
  const first = mock.fn(async () => {})
  const second = mock.fn(async () => {})
  tripEvents.subscribe(first)
  tripEvents.subscribe(second)

  await tripEvents.publish(trip, 'New activity: Flight')

  for (const observer of [first, second]) {
    assert.equal(observer.mock.callCount(), 1)
    assert.deepEqual(observer.mock.calls[0].arguments, [trip, 'New activity: Flight'])
  }
})

// Here a broken observer, like a failed push, must not stop the others or crash the route
test('one failing observer does not stop the others', async () => {
  const working = mock.fn(async () => {})
  tripEvents.subscribe(async () => {
    throw new Error('broken observer')
  })
  tripEvents.subscribe(working)

  await assert.doesNotReject(tripEvents.publish(trip, 'Updated: Flight'))
  assert.equal(working.mock.callCount(), 1)
})

// Here publish waits for the observers, so the route can answer after the alerts are sent
test('publish waits until the observers have finished', async () => {
  let finished = false
  tripEvents.subscribe(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20))
    finished = true
  })
  await tripEvents.publish(trip, 'Removed: Flight')
  assert.equal(finished, true)
})
