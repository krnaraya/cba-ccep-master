const { StatusCode } = require('status-code-enum');
const messages = require('../constants/messages');
const standards = require('../constants/standards');

const validateReportRequest = (req, res, next) => {
    if (!req.body.standardId) {
        next({
            status: StatusCode.ClientErrorBadRequest,
            message: messages.standardIdMissing
        })
        return;
    }
    // if (!standards.hasOwnProperty(req.body.standardId)) {
    //     next({
    //         status: StatusCode.ClientErrorBadRequest,
    //         message: messages.standardIdUnavailable
    //     });
    //     return;
    // }
    // if (!req.body.acsApiToken || !req.body.iamToken) {
    //     next({
    //         status: StatusCode.ClientErrorBadRequest,
    //         message: messages.tokenMissing
    //     });
    //     return;
    // }
    next()
};

module.exports = {
    validateReportRequest
}