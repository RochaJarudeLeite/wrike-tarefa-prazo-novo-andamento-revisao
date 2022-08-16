import {getLegalOneToken} from './LegalOneAuth.js'
import fetch from 'node-fetch'
import fs from 'fs'
import * as v from 'validate-cnj'
import {updateTaskParentFolder} from "./WrikeService.js";


async function getLitigationsByCNJOrFolder(
    value,
    filter = 'folder',
    retry = 0,
    forceToken = false
) {
    let token = await getLegalOneToken(forceToken)
    let config = {
        method: 'get',
        headers: {
            Authorization: 'Bearer ' + token
        }
    }
    let odataFilter = `${filter} eq \'${value}\'`
    let url = `https://api.thomsonreuters.com/legalone/v1/api/rest/Litigations?$filter=${odataFilter}&$expand=participants`
    try {
        const response = await fetch(url, config).then((response) => {
            if (!response.ok) {
                if (retry < 3) {
                    return getLitigationsByCNJOrFolder(
                        value,
                        (retry = retry + 1),
                        (forceToken = true)
                    )
                }
            }
            return response
        })
        if (response.status === 200) {
            let body = await response.json()
            if (body.value.length > 0) {
                const litigation = body.value[0]
                return {
                    success: true,
                    id: litigation.id
                }
            } else {
                return {success: false, content: `Processo ${value} não encontrado.`}
            }
        } else if (response.status === 401) {
            if (retry < 3) {
                return getLitigationsByCNJOrFolder(
                    value,
                    (retry = retry + 1),
                    (forceToken = true)
                )
            }
        } else {
            return {success: false, content: `Pasta não encontrada.`}
        }
    } catch (error) {
        if (retry < 3) {
            return getLitigationsByCNJOrFolder(value, (retry = retry + 1))
        } else {
            return {success: false, content: `Pasta não encontrada. Erro: ` + error}
        }
    }
}


// Get Lawsuit Participants
async function getLawsuitParticipants(
    lawsuitParticipants,
    token = null,
    retry = 3
) {
    if (lawsuitParticipants.length > 0) {
        if (token == null) {
            token = await getLegalOneToken()
        }
        let config = {
            method: 'get',
            headers: {
                Authorization: 'Bearer ' + token
            }
        }
        let participantsInfo = []
        try {
            const results = async () => {
                return Promise.all(
                    lawsuitParticipants.map(async (p) => {
                        if (p.type === 'Customer' || p.type === 'OtherParty') {
                            const response = await fetch(
                                `https://api.thomsonreuters.com/legalone/v1/api/rest/contacts/${p.contactId}`,
                                config
                            ).then((response) => {
                                if (!response.ok) {
                                    if (retry < 3) {
                                        return getLawsuitParticipants(
                                            lawsuitParticipants,
                                            token,
                                            retry + 1
                                        )
                                    }
                                }
                                return response
                            })
                            let body = await response.json()
                            participantsInfo.push({
                                type: p.type,
                                main: p.isMainParticipant,
                                name: body.name,
                                contactId: p.contactId,
                                identificationNumber: body.identificationNumber
                            })
                        }
                    })
                )
            }
            await Promise.resolve(results())
            return participantsInfo
        } catch (error) {
            return ['❌']
        }
    } else {
        return {success: false, content: []}
    }
}

//Get Action Type
async function getActionType(actionTypeId, token = null, retry = 3) {
    if (actionTypeId != null) {
        try {
            if (token == null) {
                token = await getLegalOneToken()
            }
            let config = {
                method: 'get',
                headers: {
                    Authorization: 'Bearer ' + token
                }
            }
            const response = await fetch(
                `https://api.thomsonreuters.com/legalone/v1/api/rest/LitigationActionAppealProceduralIssueTypes/${actionTypeId}`,
                config
            ).then((response) => {
                if (!response.ok) {
                    if (retry < 3) {
                        return getActionType(actionTypeId, token, retry + 1)
                    }
                }
                return response
            })
            let body = await response.json()
            return body.name
        } catch (error) {
            ;('❌')
        }
    } else {
        return 'Não Indicado'
    }
}

//Get State
async function getState(stateId, token = null, retry = 3) {
    if (stateId != null) {
        try {
            if (token == null) {
                token = await getLegalOneToken()
            }
            let config = {
                method: 'get',
                headers: {
                    Authorization: 'Bearer ' + token
                }
            }
            const response = await fetch(
                `https://api.thomsonreuters.com/legalone/v1/api/rest/States/${stateId}`,
                config
            ).then((response) => {
                if (!response.ok) {
                    if (retry < 3) {
                        return getState(stateId, token, retry + 1)
                    }
                }
                return response
            })
            let body = await response.json()
            return body.name
        } catch (error) {
            ;('❌')
        }
    } else {
        return 'Não Indicado'
    }
}

//Create new Litigation Update
async function newLitigationUpdate(payload, retry = 3) {
    if (payload != null) {
        try {
            let token = await getLegalOneToken();
            let config = {
                method: 'post',
                body: JSON.stringify(payload),
                headers: {
                    Authorization: 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            }
            const response = await fetch(
                `https://api.thomsonreuters.com/legalone/v1/api/rest/updates`,
                config
            ).then((response) => {
                if (!response.ok) {
                    if (retry < 3) {
                        return  newLitigationUpdate(payload);
                    }
                }
                return response
            })
            let body = await response.json()
            return {success: true, id: body.id}
        } catch (error) {
            return {success: false, content: '❌'+ error}
        }
    } else {
        return {success: false, content: 'Payload não indicado.'}
    }
}


export {
    getLitigationsByCNJOrFolder,
    newLitigationUpdate
}
