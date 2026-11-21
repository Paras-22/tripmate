const webpush = require('web-push')
const Trip = require('../models/Trip')
const { logger } = require('../utils/logger')

// Here I send the same message to every traveller who turned on alerts for this trip
async function notifyTravellers(trip, message) {
  webpush.setVapidDetails(
    process.env.VAPID_CONTACT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )

  const payload = JSON.stringify({ title: trip.title, body: message, url: `/trips/${trip.id}` })
  const expired = []

  // Here I make sure one failed phone does not stop the others from getting the message
  await Promise.all(
    trip.subscriptions.map(async ({ endpoint, keys }) => {
      try {
        await webpush.sendNotification({ endpoint, keys }, payload)
      } catch (error) {
        // Here I delete the subscription on 404 and 410, because they mean the browser removed it
        if ([404, 410].includes(error.statusCode)) expired.push(endpoint)
        else logger.warn('Push failed', { status: error.statusCode, error: error.message })
      }
    }),
  )

  if (expired.length) {
    await Trip.updateOne(
      { _id: trip._id },
      { $pull: { subscriptions: { endpoint: { $in: expired } } } },
    )
  }
}

module.exports = { notifyTravellers }
