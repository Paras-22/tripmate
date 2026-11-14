const crypto = require('crypto')
const express = require('express')
const Trip = require('../models/Trip')
const { requireAuth, requireOrganiser, loadTrip } = require('../middleware/auth')
const tripEvents = require('../tripEvents')

const router = express.Router()

// Here I protect every trip route with the JWT check
router.use(requireAuth)

// Here I only take the fields I allow, so the browser cannot change organiserId or inviteCode
function pick(body, fields) {
  return Object.fromEntries(fields.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]))
}
const TRIP_FIELDS = ['title', 'destination', 'startDate', 'endDate']
const ACTIVITY_FIELDS = ['date', 'time', 'title', 'type', 'location', 'notes']

// READ: all trips of this organiser
router.get('/', requireOrganiser, async (req, res) => {
  res.json(await Trip.find({ organiserId: req.user.sub }).sort('startDate'))
})

// CREATE: new trip with a random invite code
router.post('/', requireOrganiser, async (req, res) => {
  const trip = await Trip.create({
    ...pick(req.body, TRIP_FIELDS),
    organiserId: req.user.sub,
    inviteCode: crypto.randomBytes(4).toString('hex').toUpperCase(),
  })
  res.status(201).json(trip)
})

// READ: one trip. Organiser and travellers can both see it.
router.get('/:id', loadTrip, (req, res) => {
  res.json(req.trip)
})

// UPDATE: trip details
router.put('/:id', requireOrganiser, loadTrip, async (req, res) => {
  req.trip.set(pick(req.body, TRIP_FIELDS))
  await req.trip.save()
  await tripEvents.publish(req.trip, 'The trip details were updated')
  res.json(req.trip)
})

// DELETE: whole trip. I tell the travellers first because the subscriptions go with it.
router.delete('/:id', requireOrganiser, loadTrip, async (req, res) => {
  await tripEvents.publish(req.trip, 'This trip was cancelled')
  await req.trip.deleteOne()
  res.json({ message: 'Trip deleted' })
})

// CREATE: new activity in the itinerary
router.post('/:id/activities', requireOrganiser, loadTrip, async (req, res) => {
  req.trip.activities.push(pick(req.body, ACTIVITY_FIELDS))
  await req.trip.save()
  await tripEvents.publish(req.trip, `New activity: ${req.trip.activities.at(-1).title}`)
  res.status(201).json(req.trip)
})

// UPDATE: one activity
router.put('/:id/activities/:activityId', requireOrganiser, loadTrip, async (req, res) => {
  const activity = req.trip.activities.id(req.params.activityId)
  if (!activity) return res.status(404).json({ error: 'Activity not found' })

  activity.set(pick(req.body, ACTIVITY_FIELDS))
  await req.trip.save()
  await tripEvents.publish(req.trip, `Updated: ${activity.title}`)
  res.json(req.trip)
})

// DELETE: one activity
router.delete('/:id/activities/:activityId', requireOrganiser, loadTrip, async (req, res) => {
  const activity = req.trip.activities.id(req.params.activityId)
  if (!activity) return res.status(404).json({ error: 'Activity not found' })

  const { title } = activity
  activity.deleteOne()
  await req.trip.save()
  await tripEvents.publish(req.trip, `Removed: ${title}`)
  res.json(req.trip)
})

// Here the traveller's browser saves its push subscription for this trip.
// I remove the old copy first so one phone never gets the same alert twice.
router.post('/:id/subscribe', loadTrip, async (req, res) => {
  const { endpoint, keys } = req.body
  const others = req.trip.subscriptions.filter((saved) => saved.endpoint !== endpoint)
  req.trip.subscriptions = [...others, { endpoint, keys }]
  await req.trip.save()
  res.status(201).json({ message: 'Alerts turned on' })
})

module.exports = router
