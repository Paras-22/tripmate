const mongoose = require('mongoose')

// Here I check dates and times in the same format the browser inputs give me
const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/
const TIME_FORMAT = /^\d{2}:\d{2}$/

// Here I made one activity of the itinerary, like a flight, hotel, tour or meal
const activitySchema = new mongoose.Schema({
  date: { type: String, required: true, match: DATE_FORMAT },
  time: { type: String, match: TIME_FORMAT },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  type: { type: String, enum: ['flight', 'hotel', 'tour', 'meal', 'other'], default: 'other' },
  location: { type: String, trim: true, maxlength: 120 },
  notes: { type: String, trim: true, maxlength: 500 },
})

// Here I save the browser's push subscription so the server can reach that traveller.
// Only https addresses are allowed so nobody can make my server call an internal address.
const subscriptionSchema = new mongoose.Schema(
  {
    endpoint: { type: String, required: true, match: /^https:\/\// },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { _id: false },
)

// Here I made the Trip. Activities live inside the trip because they are always read together.
const tripSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 100 },
  destination: { type: String, required: true, trim: true, maxlength: 100 },
  startDate: { type: String, required: true, match: DATE_FORMAT },
  endDate: {
    type: String,
    required: true,
    match: DATE_FORMAT,
    // Here I stop a trip from ending before it starts
    validate: {
      validator(value) {
        return value >= this.startDate
      },
      message: 'End date must be on or after the start date',
    },
  },
  organiserId: { type: String, required: true, index: true }, // the Google id of the organiser
  inviteCode: { type: String, required: true, unique: true },
  activities: [activitySchema],
  subscriptions: [subscriptionSchema],
})

// Here I remove the private push data every time a trip is sent to the browser
tripSchema.set('toJSON', {
  transform(doc, trip) {
    delete trip.subscriptions
    return trip
  },
})

module.exports = mongoose.model('Trip', tripSchema)
