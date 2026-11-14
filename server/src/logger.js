const fs = require('fs')
const path = require('path')

// Here I made a small logger. Every line has the time and the level,
// it shows in the terminal and is also saved in server/logs/app.log for later checking.
const logFile = path.join(__dirname, '../logs/app.log')
fs.mkdirSync(path.dirname(logFile), { recursive: true })

function write(level, message, extra) {
  // Here the tests set NODE_ENV=test so the test output stays clean
  if (process.env.NODE_ENV === 'test') return
  const line = `${new Date().toISOString()} [${level}] ${message}${extra ? ' ' + JSON.stringify(extra) : ''}`
  if (level === 'ERROR') console.error(line)
  else if (level === 'WARN') console.warn(line)
  else console.log(line)
  fs.appendFile(logFile, line + '\n', () => {})
}

const logger = {
  info: (message, extra) => write('INFO', message, extra),
  warn: (message, extra) => write('WARN', message, extra),
  error: (message, extra) => write('ERROR', message, extra),
}

// Here I log every request with its status code and how long it took
function requestLogger(req, res, next) {
  const start = Date.now()
  res.on('finish', () => {
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'
    logger[level](`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`)
  })
  next()
}

module.exports = { logger, requestLogger }
