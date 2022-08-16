import fs from 'fs';
import os from 'os';
import fetch from 'node-fetch';
import {getSecret, setSecret} from './aws_secrets.js';
import * as S3 from './s3.js';


const tempFolder = os.tmpdir() + "/";
let tokenInfoFile = 'LegalOneTokenInfo.json'
let legalOneKey;
let tokenInfo;


async function GetTokenExpirationDateAndSecret() {
    let secretParams = {
        SecretId: 'prod/LegalOne'
    }
    console.log("Getting LegalOne Key from Secrets Manager")
    let secretResponse = await getSecret(secretParams);
    try {
        console.log("Reading Token info from /tmp/LegalOneTokenInfo.json")
        let localFile = fs.readFileSync(tempFolder + tokenInfoFile);
        tokenInfo = JSON.parse(localFile)
        console.log("Token info: " + JSON.stringify(tokenInfo))
    } catch (err) {
        console.log("Couldn't read. Downloading file on S3")
        await S3.downloadFileS3(tokenInfoFile, tempFolder).then((result) => {
            if (result) {
                tokenInfo = JSON.parse(result.content);
                console.log("Token info: " + JSON.stringify(tokenInfo))
            }
        }).catch((err) => {
            console.log(err)
        });
    }
    Promise.resolve(secretResponse).then((result) => {
        if (result) {
            legalOneKey = result.THOMSON_REUTERS_TOKEN;
            console.log("LegalOne Key set");
        }
    });
}

async function getToken(forced = false) {
    console.log("Checking LegalOne token. Forced: " + forced + "; Expiration Date: " + tokenInfo.ExpirationDate)
    let tokenExpired = true;
    if (tokenInfo.ExpirationDate !== "") {
        console.log("Checking expiration date")
        let tokenDate = new Date(tokenInfo.ExpirationDate)
        if (tokenDate !== "") {
            tokenExpired = tokenDate < Date.now()
        }
    }
    //check expiration
    if (forced || tokenExpired) {
        console.info(`Getting new token. Forced: ${forced}; Token expired: ${tokenExpired}`)
        let config = {
            method: 'get', headers: {
                'Authorization': 'Basic ' + process.env.THOMSON_REUTERS_AUTH
            }
        }
        const response = await fetch('https://api.thomsonreuters.com/legalone/oauth?grant_type=client_credentials', config);
        let body = await response.json();
        let dt = new Date(parseInt(body.issued_at))
        dt.setSeconds(dt.getSeconds() + parseInt(body.expires_in))
        tokenInfo.ExpirationDate = dt
        fs.writeFileSync(tempFolder + tokenInfoFile, JSON.stringify(tokenInfo))
        await S3.uploadFileS3(tempFolder + tokenInfoFile);
        legalOneKey = body.access_token;
        let params = {
            SecretId: 'prod/LegalOne',
            SecretString: JSON.stringify({'THOMSON_REUTERS_TOKEN': legalOneKey})
        }
        await setSecret(params);
        console.log("Token updated.");
    } else {
        console.info("Token still valid. Using existing token")
    }
    return legalOneKey;
}

export {
    getToken as getLegalOneToken,
    GetTokenExpirationDateAndSecret as GetLegalOneTokenExpirationDate
}