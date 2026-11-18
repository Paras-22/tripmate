const { logger } = require('../utils/logger')

// Here I used the Observer pattern. The trip routes only say "this trip changed",
// and every observer that subscribed (push alerts, the logger) reacts to it.
// To add a new reaction later, like an email, I only subscribe one more function
// and do not need to change the routes at all.
const observers = []

function subscribe(observer) {
  observers.push(observer)
}

// Here I wait for all observers, and one failing observer does not stop the others
async function publish(trip, message) {
  const results = await Promise.allSettled(observers.map((observer) => observer(trip, message)))
  for (const result of results) {
    if (result.status === 'rejected') logger.error('Observer failed', { error: result.reason.message })
  }
}

module.exports = { subscribe, publish }
