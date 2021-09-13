const haltOnTimeout = (req, res, next) => {
   if (!req.timeout) {
       next();
   }
};

module.exports = {
    haltOnTimeout
};