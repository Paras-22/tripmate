// Here I unit test the rules in models/Trip.js.
// validateSync checks a trip without saving it, so no database is needed.
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
function errorFor(data, field) {
  return new Trip(data).validateSync()?.errors[field]?.message
}

describe('trip rules', () => {
  test('a correct trip has no errors', () => {
    assert.equal(new Trip(goodTrip).validateSync(), undefined)
  })

  test('title and destination are required', () => {
    assert.ok(errorFor({ ...goodTrip, title: '' }, 'title'))
    assert.ok(errorFor({ ...goodTrip, destination: undefined }, 'destination'))
  })

  test('the title can have at most 100 characters', () => {
    assert.ok(errorFor({ ...goodTrip, title: 'a'.repeat(101) }, 'title'))
    assert.equal(errorFor({ ...goodTrip, title: 'a'.repeat(100) }, 'title'), undefined)
  })

  // Here the spaces are removed before saving
  test('spaces around the title are removed', () => {
    assert.equal(new Trip({ ...goodTrip, title: '  Japan  ' }).title, 'Japan')
  })

  test('dates must look like 2027-01-10', () => {
    assert.ok(errorFor({ ...goodTrip, startDate: '10/01/2027' }, 'startDate'))
  })

  test('the trip cannot end before it starts', () => {
    assert.equal(errorFor({ ...goodTrip, endDate: '2027-01-09' }, 'endDate'), 'End date must be on or after the start date')
    assert.equal(errorFor({ ...goodTrip, endDate: '2027-01-10' }, 'endDate'), undefined)
  })
})

describe('activity rules', () => {
  const withActivity = (activity) => ({ ...goodTrip, activities: [{ date: '2027-01-11', title: 'Tour', ...activity }] })

  test('a correct activity has no errors', () => {
    assert.equal(new Trip(withActivity({ time: '09:30', type: 'tour' })).validateSync(), undefined)
  })

  test('the date must be inside the trip', () => {
    assert.equal(errorFor(withActivity({ date: '2027-01-20' }), 'activities.0.date'), 'The activity date must be inside the trip dates')
  })

  test('the time must look like 09:30', () => {
    assert.ok(errorFor(withActivity({ time: '9.30am' }), 'activities.0.time'))
  })

  test('the type must be one of the five types', () => {
    assert.ok(errorFor(withActivity({ type: 'party' }), 'activities.0.type'))
    assert.equal(new Trip(withActivity({})).activities[0].type, 'other')
  })

  test('notes can have at most 500 characters', () => {
    assert.ok(errorFor(withActivity({ notes: 'x'.repeat(501) }), 'activities.0.notes'))
  })
})

describe('push subscription rules', () => {
  test('the address must start with https', () => {
    const data = { ...goodTrip, subscriptions: [{ endpoint: 'http://inside', keys: { p256dh: 'a', auth: 'b' } }] }
    assert.ok(errorFor(data, 'subscriptions.0.endpoint'))
  })

  // Here toJSON is what Express uses when it sends a trip to the browser
  test('subscriptions are removed when the trip is sent to the browser', () => {
    const trip = new Trip({ ...goodTrip, subscriptions: [{ endpoint: 'https://push.example/1', keys: { p256dh: 'a', auth: 'b' } }] })
    assert.equal(trip.toJSON().subscriptions, undefined)
    assert.equal(trip.subscriptions.length, 1)
  })
})
