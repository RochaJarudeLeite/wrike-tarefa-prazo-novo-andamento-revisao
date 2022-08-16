import {getSecret} from './aws_secrets.js';

let params = {
    SecretId: 'prod/wrike'
}

let wrikeToken;

async function GetToken(forced = false) {
    try {
        if (wrikeToken == null) {
            let secretString = await getSecret(params)
            let token = secretString.wrikeKey
            wrikeToken = token;
            console.log(`Wrike token set.`)
        }
    } catch (error) {
        console.log("Erro ao obter a chave do wrike: "+ error)
    }
    return wrikeToken
}

export {GetToken as GetWrikeToken}