const winston = require("winston");
const { Logtail } = require("@logtail/node");
const { LogtailTransport } = require("@logtail/winston");

let logtail;

const level = () => {
  if (process.env.LOG_LEVEL) {
    return process.env.LOG_LEVEL;
  }

  return process.env.LOG_LEVEL === "development" ? "debug" : "info";
};

const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  debug: "white",
};

winston.addColors(colors);

const consoleFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.printf((info) => {
    const message = `[${info.service}] ${info.message}`;
    // This method of applying colour comes from https://stackoverflow.com/a/63104828
    return `${info.timestamp} ${winston.format
      .colorize()
      .colorize(info.level, message)}`;
  })
);

const Logger = winston.createLogger({
  level: level(),
  transports: [new winston.transports.Console({ format: consoleFormat })],
});

// If logtail was configured add it as a transport
if (process.env.LOGTAIL_TOKEN) {
  Logger.debug(`Enabling logging to Logtail`, { service: "logging" });
  logtail = new Logtail(process.env.LOGTAIL_TOKEN);
  Logger.add(new LogtailTransport(logtail, { format: winston.format.json() }));
} else {
  Logger.warn(`Logtail logging not configured`, { service: "logging" });
}

module.exports = Logger;
