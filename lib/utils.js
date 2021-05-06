// Winston logger
const { createLogger, format, transports } = require('winston');

const { combine, printf } = format;
const MYFORMAT = printf((info) => {
  return `${Date(Date.now())} [${info.label}] ${info.level}: ${info.message}`;
});
const LOGGER = createLogger({
  format: combine(MYFORMAT),
  transports: [
    new transports.Console(),
    new transports.File({
      filename: 'combined.log',
    }),
  ],
});

exports.log = (label, level, message) => {
  LOGGER.log({
    label,
    level,
    message,
  });
};
