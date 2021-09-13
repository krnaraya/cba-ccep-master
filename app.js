const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const dotenv = require('dotenv');
const timeout = require('connect-timeout');

const indexRouter = require('./routes/index');
const reportSccRouter = require('./routes/report-scc');
const messages = require('./constants/messages');
const { haltOnTimeout } = require('./middlewares/timeout');

dotenv.config();

if (!process.env.ACS_SERVER_URL || 
  !process.env.ACS_API_VERSION ||
  !process.env.SCC_EXCHANGE_PROTOCOL_URL) {
    throw new Error(messages.envMissing);
}

const app = express();

// Server configs
const configTimeout = Number(process.env.MAX_REQ_TIMEOUT);
app.use(timeout(configTimeout ? configTimeout : 500000));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/report-scc', reportSccRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

app.use(haltOnTimeout);

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500).send({
    statusCode: err.status || 500,
    message: err.message ? err.message : res.locals.error,
    error: res.locals.error
  });
  // res.render('error');
});

module.exports = app;
