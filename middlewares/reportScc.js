const standards = require("../constants/standards");
const { generateACSReport, getAcsScanReportStatus, getScanReport,transformAcsReportToSccPayload, retrieveACSStandards } = require("../utils/reportScc");
const messages = require("../constants/messages");
const acsRunState = require("../constants/acsRunState");
const { sendSccReport } = require("../utils/reportScc");
const { StatusCode } = require('status-code-enum');

const getStandards = async (req, res, next) => {
    const standards = await retrieveACSStandards( 
        process.env.STACKROX_API_TOKEN,
        process.env.ACS_SERVER_URL,
        process.env.ACS_API_VERSION);
    console.log(standards);
    res.send(standards);
}

const logger = (context, message) => {
    console.log(context, new Date().toUTCString() + '\n' + message);
}

const reportScc = async (req, res, next) => {
    const context = '[middelware/reportScc]';
    try {
        const generateAcsReponse = await generateACSReport(req.body.standardId, 
            process.env.STACKROX_API_TOKEN,
            process.env.ACS_SERVER_URL,
            process.env.ACS_API_VERSION
        );

        logger(context, ' 1. ACS report scanning triggered');

        if (!generateAcsReponse.data.startedRuns || 
            generateAcsReponse.data.startedRuns.length === 0) {
            next({
                status: StatusCode.ServerErrorInternal,
                message: messages.runIdNotFound
            });
        }

        const interval = setInterval(async () => {
            try {
                const getScanResponse= await getAcsScanReportStatus(
                    process.env.ACS_SERVER_URL,
                    process.env.ACS_API_VERSION,
                    generateAcsReponse.data.startedRuns[0].id,
                    process.env.STACKROX_API_TOKEN,
                );

                logger(context, ' 2. ACS report scanning checked\n' + JSON.stringify(getScanResponse, null, 2));
                
                if (getScanResponse.runs && getScanResponse.runs.length > 0) {
                    if (getScanResponse.runs[0].state === acsRunState.FINISHED) {
                        clearInterval(interval);
                        const report = await getScanReport(
                            process.env.ACS_SERVER_URL,
                            getScanResponse.runs[0].clusterId,
                            req.body.standardId,
                            getScanResponse.runs[0].id,
                            process.env.STACKROX_API_TOKEN
                        );
                        logger(context, ' 3. ACS report scanning FINISHED');
                        const sccPayload = await transformAcsReportToSccPayload(
                            report,
                            req.body.standardId                        
                        );
                        logger(context, ' 4. ACS result translated into SCC payload');
                        // need to recreate iamToken from taniunApiKey
                        const sendSccReportResponse = await sendSccReport(
                            process.env.SCC_EXCHANGE_PROTOCOL_URL,
                            req.body.iamToken, // not used
                            sccPayload
                        );
                        logger(context, ' 5. SCC report sent\n' + JSON.stringify(sendSccReportResponse, null, 2));
                        if (sendSccReportResponse.statusCode === 201) {
                            res.send({
                                sccResponse: sendSccReportResponse.data,
                                sccPayload: sccPayload
                            });
                        } else {
                            next(sendSccReportResponse.data);
                        }
                        
                    }
                }
            } catch(reportSccErr) {
                next(reportSccErr);
            }
        }, 1000);

    } catch(reportSccErr) {
        next(reportSccErr);
    }
}

module.exports = {
    reportScc, getStandards
};