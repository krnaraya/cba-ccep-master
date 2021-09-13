const express = require('express');
const { reportScc, getStandards } = require('../middlewares/reportScc');
const router = express.Router();
const { validateReportRequest } = require('../middlewares/validateReportRequest');

/* GET users listing. */
router.post('/scan', validateReportRequest, reportScc);
router.get('/standards', getStandards);


module.exports = router;
