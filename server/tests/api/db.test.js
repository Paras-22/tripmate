// Here I test db.js, the Singleton that gives one shared MongoDB connection
const assert = require('node:assert/strict')
const { test } = require('node:test')
const mongoose = require('mongoose')
require('../helpers/setup') // here I let setup.js connect once first
const { connectDB } = require('../../src/config/db')

test('gives back the same single connection every time (Singleton)', async () => {
  const first = await connectDB()
  const second = await connectDB()
  assert.equal(first, second)
  assert.equal(first, mongoose.connection)
})

// Here I check even a different address does not open a second connection
test('does not open a second connection for another address', async () => {
  const again = await connectDB('mongodb://localhost:1/other')
  assert.equal(again, mongoose.connection)
  assert.equal(mongoose.connections.filter((c) => c.readyState === 1).length, 1)
})
