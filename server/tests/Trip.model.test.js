// Here I unit test the rules in models/Trip.js.
// validate() checks a trip without saving it, so no database is needed.
const assert = require('node:assert/strict')
const { describe, test } = require('node:test')
const Trip = require('../src/models/Trip')

const goodTrip = {
  title: 'Japan',
  destination: 'Tokyo',
  startDate: '2027-01-10',
  endDate: '2027-01-15',
  organiserId: 'owner',
  inviteCode: 'A1B2C3D4',
}

// Here I give back the error message for one field, or undefined when the field is fine
async function errorFor(data, field) {
  const error = await new Trip(data).validate().catch((err) => err)
  return error?.errors[field]?.message
}

describe('trip rules', () => {
  test('a correct trip has no errors', async () => {
    await assert.doesNotReject(new Trip(goodTrip).validate())
  })

  test('title and destination are required', async () => {
    assert.ok(await errorFor({ ...goodTrip, title: '' }, 'title'))
    assert.ok(await errorFor({ ...goodTrip, destination: undefined }, 'destination'))
  })

  test('the title can have at most 100 characters', async () => {
    assert.ok(await errorFor({ ...goodTrip, title: 'a'.repeat(101) }, 'title'))
    assert.equal(await errorFor({ ...goodTrip, title: 'a'.repeat(100) }, 'title'), undefined)
  })

  // Here the spaces are removed before saving
  test('spaces around the title are removed', async () => {
    assert.equal(new Trip({ ...goodTrip, title: '  Japan  ' }).title, 'Japan')
  })

  test('dates must look like 2027-01-10', async () => {
    assert.ok(await errorFor({ ...goodTrip, startDate: '10/01/2027' }, 'startDate'))
  })

  test('the trip cannot end before it starts', async () => {
    assert.equal(await errorFor({ ...goodTrip, endDate: '2027-01-09' }, 'endDate'), 'End date must be on or after the start date')
    assert.equal(await errorFor({ ...goodTrip, endDate: '2027-01-10' }, 'endDate'), undefined)
  })
})

describe('activity rules', () => {
  const withActivity = (activity) => ({ ...goodTrip, activities: [{ date: '2027-01-11', title: 'Tour', ...activity }] })

  test('a correct activity has no errors', async () => {
    await assert.doesNotReject(new Trip(withActivity({ time: '09:30', type: 'tour' })).validate())
  })

  test('the date must be inside the trip', async () => {
    assert.equal(await errorFor(withActivity({ date: '2027-01-20' }), 'activities.0.date'), 'The activity date must be inside the trip dates')
  })

  test('the time must look like 09:30', async () => {
    assert.ok(await errorFor(withActivity({ time: '9.30am' }), 'activities.0.time'))
  })

  test('the type must be one of the five types', async () => {
    assert.ok(await errorFor(withActivity({ type: 'party' }), 'activities.0.type'))
    assert.equal(new Trip(withActivity({})).activities[0].type, 'other')
  })

  test('notes can have at most 500 characters', async () => {
    assert.ok(await errorFor(withActivity({ notes: 'x'.repeat(501) }), 'activities.0.notes'))
  })
})

describe('push subscription rules', () => {
  test('the address must start with https', async () => {
    const data = { ...goodTrip, subscriptions: [{ endpoint: 'http://inside', keys: { p256dh: 'a', auth: 'b' } }] }
    assert.ok(await errorFor(data, 'subscriptions.0.endpoint'))
  })

  // Here toJSON is what Express uses when it sends a trip to the browser
  test('subscriptions are removed when the trip is sent to the browser', async () => {
    const trip = new Trip({ ...goodTrip, subscriptions: [{ endpoint: 'https://push.example/1', keys: { p256dh: 'a', auth: 'b' } }] })
    assert.equal(trip.toJSON().subscriptions, undefined)
    assert.equal(trip.subscriptions.length, 1)
  })
})
