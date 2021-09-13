const axios = require('axios');
const messages = require('../constants/messages');
const https = require('https');
const Url = require('url-parse');
const _ = require('lodash');
require('axios-debug-log');
const acsReportStateMap = require('../constants/acsReportStateMap');
const { post, iamPost } = require('./rest-client');


const createRestInstance = (token, ignoreTls) => {
    return axios.create({
        httpsAgent: new https.Agent({  
            rejectUnauthorized: ignoreTls
        }),
        headers: { 
            Authorization: `Bearer ${token}`,
            REALM: '580b2905826e4ee4ac2c123d34253ef6',
            'Content-Type': 'application/json',
            post: { 'Content-Type': 'text/plain' }
        }
    });
};

const retrieveACSStandards = async (acsToken, acsServerUrl, acsAPIVersion) => {
    const instance = createRestInstance(acsToken, false);
    const baseUrl = `https://${acsServerUrl}/${acsAPIVersion}`;
    const stdRes = await instance.get(`${baseUrl}/compliance/standards`);
    return stdRes.data;
}

const generateACSReport = async (standardId, acsToken, acsServerUrl, acsAPIVersion) => {
    const instance = createRestInstance(acsToken, false);
    try {
        const baseUrl = `https://${acsServerUrl}/${acsAPIVersion}`;
        const clusterReponse = await instance.get(`${baseUrl}/clusters`);
        if (clusterReponse.data && 
            clusterReponse.data.clusters &&
            clusterReponse.data.clusters.length > 0
        ) {
            const clusterObj =  clusterReponse.data.clusters[0];
            const runObj = await instance.post(`${baseUrl}/compliancemanagement/runs`, {
                selection: {
                    clusterId: clusterObj.id,
                    standardId: standardId
                }
            });
            return runObj;
        } else {
            throw new Error(messages.noCluster);
        }
    } catch (fetchReportErr) {
        throw new Error(fetchReportErr);
    }
};


const getAcsScanReportStatus = async (serverUrl, apiVersion, runId, token) => {
    const instance = createRestInstance(token, false);
    try {
        const baseUrl = `https://${serverUrl}/${apiVersion}`;
        const response = await instance.get(`${baseUrl}/compliancemanagement/runstatuses?runIds=${runId}`);
        return response.data;
    } catch(error) {
        throw new Error(error);
    }
};

const getScanReport = async (serverUrl, clusterId, standardId, runId, token) => {
    const instance = createRestInstance(token, false);
    const url = `https://${serverUrl}/v1/compliance/runresults?clusterId=${clusterId}&standardId=${standardId}&runId=${runId}`;
    try {
        const response = await instance.get(url);
        return response.data;
    } catch(error) {
        throw new Error(error);
    }
};

const convertAcsResultsToComplyObjects = (results, standardId) => {
    const resultArr = [];
    if (results) {
        for (const resultId in results) {
            for (const controlId in results[resultId].controlResults) {
                for (const evidenceObj of results[resultId].controlResults[controlId].evidence) {
                    resultArr.push({
                        'Check ID': `ACS ${standardId};1.0`,
                        'State': acsReportStateMap[evidenceObj.state],
                        'Rule ID': `${evidenceObj.message}`
                    });
                }
            }
        }
    }
    return resultArr;
}


const transformAcsReportToSccPayload = async (acsResults, standardId) => {
    const payload = {
        'Computer Name': `ACS-TaCo for ${_.get(acsResults, 'results.domain.cluster.type')}-${_.get(acsResults, 'results.domain.cluster.name')}`,
        'Tanium Client IP Address': _.get(acsResults, 'results.domain.cluster.id'),
        'IP Address': [],
        'Comply - Compliance Findings': [],
        'Count': '1'
    };

    if (acsResults.results.domain && 
        acsResults.results.domain.nodes) {
        for (const key in acsResults.results.domain.nodes) {
            if (acsResults.results.domain.nodes[key].name) {
                payload['IP Address'].push(acsResults.results.domain.nodes[key].name);
            }
        }
    }

    const clusterResults = _.get(acsResults, 'results.clusterResults');
    const nodeResults = _.get(acsResults, 'results.nodeResults');
    const deploymentResults = _.get(acsResults, 'results.deploymentResults');

    if (clusterResults) {
        for (const key in clusterResults.controlResults) {
            for (const evidenceObj of clusterResults.controlResults[key].evidence) {
                payload['Comply - Compliance Findings'].push({
                    'Check ID': `ACS ${standardId};1.0`,
                    'State': acsReportStateMap[evidenceObj.state],
                    'Rule ID': evidenceObj.message
                });
            }
        }
    }

    payload['Comply - Compliance Findings'].push(
        ...convertAcsResultsToComplyObjects(nodeResults, standardId)
    );

    // TODO: inspect which compliance input has violates the scc payload, leading to 500 error...
    const deploymentResultsConvertedArr = convertAcsResultsToComplyObjects(deploymentResults, standardId);
    payload['Comply - Compliance Findings'].push(
        ...deploymentResultsConvertedArr.slice(0, 15)
    );
    return payload;
}

const sendSccReport = async (sccUrl, sccToken, payload) => {
    const iamUrl = new Url(
        `https://iam.cloud.ibm.com/oidc/token?grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${process.env.TANIUM_API_KEY}`);
    const options = {
        hostname: iamUrl.host,
        port: 443,
        path: iamUrl.pathname + iamUrl.query,
        method: 'POST',
    };

    const iamTokenRes = await iamPost(options);

    const data = await post(sccUrl, payload, iamTokenRes.data.access_token);
    return data;
}


module.exports = {
    generateACSReport,
    getAcsScanReportStatus,
    getScanReport,
    transformAcsReportToSccPayload,
    sendSccReport,
    retrieveACSStandards
};