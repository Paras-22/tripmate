// Here I test the activity CRUD routes in routes/trips.js
const assert = require('node:assert/strict')
const { describe, test } = require('node:test')
const mongoose = require('mongoose')
const { app, request, state, bearer, newActivity } = require('../helpers/setup')

const activitiesUrl = () => `/api/trips/${state.trip._id}/activities`
const addActivity = (body = newActivity, token = state.organiser) =>
  request(app).post(activitiesUrl()).set(bearer(token)).send(body)

describe('organiser CRUD', () => {
  // Here I test CREATE, READ, UPDATE and DELETE of one activity, step by step
  test('creates, reads, updates and deletes an activity', async () => {
    const created = await addActivity().expect(201)
    const activity = created.body.activities[0]
    assert.equal(activity.title, 'Flight to Tokyo')

    const read = await request(app).get(`/api/trips/${state.trip._id}`).set(bearer(state.organiser))
    assert.equal(read.body.activities.length, 1)

    const updated = await request(app).put(`${activitiesUrl()}/${activity._id}`).set(bearer(state.organiser)).send({ time: '10:15' }).expect(200)
    assert.equal(updated.body.activities[0].time, '10:15')
    assert.equal(updated.body.activities[0].title, 'Flight to Tokyo') // here I check the other fields stay the same

    const deleted = await request(app).delete(`${activitiesUrl()}/${activity._id}`).set(bearer(state.organiser)).expect(200)
    assert.equal(deleted.body.activities.length, 0)
  })

  // Here I check the server checks the date too, because a request can skip my React form
  test('rejects an activity outside the trip dates', async () => {
    const res = await addActivity({ ...newActivity, date: '2027-02-01' }).expect(400)
    assert.equal(res.body.error, 'The activity date must be inside the trip dates')
  })

  test('accepts the first and the last day of the trip', async () => {
    await addActivity({ ...newActivity, date: '2027-01-10' }).expect(201)
    await addActivity({ ...newActivity, date: '2027-01-15' }).expect(201)
  })

  test('rejects a wrong time, type or a missing title', async () => {
    await addActivity({ ...newActivity, time: '9am' }).expect(400)
    await addActivity({ ...newActivity, type: 'party' }).expect(400)
    await addActivity({ ...newActivity, title: '' }).expect(400)
  })

  test('gives type "other" when no type is sent', async () => {
    const res = await addActivity({ date: '2027-01-11', title: 'Free time' }).expect(201)
    assert.equal(res.body.activities[0].type, 'other')
  })

  test('an activity id that does not exist gives 404', async () => {
    const missing = new mongoose.Types.ObjectId()
    await request(app).put(`${activitiesUrl()}/${missing}`).set(bearer(state.organiser)).send({ time: '10:00' }).expect(404)
    await request(app).delete(`${activitiesUrl()}/${missing}`).set(bearer(state.organiser)).expect(404)
  })
})

describe('traveller', () => {
  test('cannot add, change or remove activities', async () => {
    const created = await addActivity()
    const id = created.body.activities[0]._id

    await addActivity(newActivity, state.traveller).expect(403)
    await request(app).put(`${activitiesUrl()}/${id}`).set(bearer(state.traveller)).send({ time: '11:00' }).expect(403)
    await request(app).delete(`${activitiesUrl()}/${id}`).set(bearer(state.traveller)).expect(403)
  })
})
