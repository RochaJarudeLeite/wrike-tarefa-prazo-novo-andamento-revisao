import * as LO from './LegalOneService.js';
import {GetLegalOneTokenExpirationDate} from './LegalOneAuth.js'
import * as Wrike from './WrikeService.js';
import * as v from 'validate-cnj'

const reProcFolder = /(?<folder>Proc-\d{7}\/\d+|Proc-\d{7})/

export async function handler(event) {
    let sns = event.Records[0].Sns;
    let message = sns.Message;
    let messageJson = JSON.parse(message);
    console.log(messageJson);
    if (messageJson[0].eventType !== 'TaskCustomFieldChanged' || messageJson[0].customFieldId !== 'IEABJD3YJUADB6VV') {
        let response = {
            statusCode: 200,
            body: JSON.stringify('Skipped'),
        };
        return response;
    }
    let LOTokenMethod = GetLegalOneTokenExpirationDate();
    let assigneesMention = '<a class="stream-user-id avatar quasi-contact" rel="@assignees">@assignees</a>';
    let taskId = messageJson[0].taskId;
    let newAndamentoText = messageJson[0].value;
    let response = await Wrike.getTask(taskId);
    if (!response.success) {
        let comment = `${assigneesMention} Não foi possível obter os dados da tarefa para rodar a automação de novo andamento de revisão. Erro: ${response.message}`;
        response = await Wrike.createTaskComment(taskId, comment, true);
        if (!response.success) {
            console.log(response.message);
        }
    }
    let wrikeTask = response.wrikeTask;
    let wrikeTaskParentIds = wrikeTask.parentIds;
    let newComments = [];

    // retrieve folder data for each wrikeTaskParentId and check if it is a folder that starts with the "Proc-"
    let workingFolders = [];
    let errorCount = 0;
    let foundFolders = 0;
    for (let i = 0; i < wrikeTaskParentIds.length; i++) {
        let response = await Wrike.getFolder(wrikeTaskParentIds[i]);
        if (response.success && response.data.title.startsWith('Proc-')) {
            foundFolders++;
            let folderData = response.data;
            let folderNovajusIdCustomField;
            let folderNovajusId;
            if (folderData.customFields.length > 0) {
                folderNovajusId = folderData.customFields.find(x => x.id === 'IEABJD3YJUADBUZU').value;
            } else {
                folderNovajusId = null;
            }
            let folderTitle = folderData.title.replace(/[\s_]/g, '-');
            let isMatch = reProcFolder.exec(folderTitle);
            if (isMatch) {
                let newWorkingFolder = {
                    id: folderData.id,
                    title: folderData.title.replace(/[\s_]/g, '/'),
                    novajusId: folderNovajusId !== null ? parseInt(folderNovajusId) : null
                }
                workingFolders.push(newWorkingFolder);
            } else {
                newComments.push(`Não foi possível adicionar o andamento de revisão à pasta ${wrikeTaskParentIds[i]}. Pasta não encontrada.`);
                errorCount++;
            }
        }
    }
    if (errorCount > 0 && errorCount >= foundFolders) {
        let comment = `${assigneesMention} Não foi possível adicionar o andamento de revisão. \n${newComments.join('\n')}`;
        response = await Wrike.createTaskComment(taskId, comment, false);
        if (!response.success) {
            console.log(response.message);
        }
        let response = {
            statusCode: 200,
            body: JSON.stringify('Error'),
        };
        return response;
    }

    if (workingFolders.length == 0) {
        let comment = `${assigneesMention} Não foi possível adicionar o andamento de revisão. Nenhuma pasta encontrada.`;
        response = await Wrike.createTaskComment(taskId, comment, false);
        if (!response.success) {
            console.log(response.message);
        }
        let response = {
            statusCode: 200,
            body: JSON.stringify('Skipped'),
        };
        return response;
    }

    // for each workingFolder with novajusId = null, get the novajusId from LegalOne
    for (let i = 0; i < workingFolders.length; i++) {
        if (workingFolders[i].novajusId === null) {
            let response = await LO.getLitigationsByCNJOrFolder(workingFolders[i].title);
            if (response.success) {
                let foundId = response.id;
                workingFolders[i].novajusId = foundId;
            } else {
                newComments.push(`Não foi possível adicionar o andamento de revisão à pasta ${workingFolders[i].title}. ${response.content}.`);
            }
        }
    }

    // build newLitigationUpdate payload
    let newLitigationUpdatePayload = {
        "typeId": 363,
        "originType": "Manual",
        "isSubType": true,
        "description": newAndamentoText,
        "isConfidential": false,
        "date": new Date().toJSON(),
        "relationships": []
    }

    for (let i = 0; i < workingFolders.length; i++) {
        if (workingFolders[i].novajusId !== null) {
            let newLitigationUpdateRelationship = {
                "linkId": workingFolders[i].novajusId,
                "linkType": "Litigation"
            }
            newLitigationUpdatePayload.relationships.push(newLitigationUpdateRelationship);
        }
    }

    if (newLitigationUpdatePayload.relationships.length > 0) {
        let response = await LO.newLitigationUpdate(newLitigationUpdatePayload);
        if (response.success) {
            let newUpdateId = response.id;
            let comment = `${assigneesMention} Andamento de revisão adicionado às pastas ${workingFolders.map(x => x.title).join(', ')}.\n <a href="https://rj.novajus.com.br/processos/andamentos/details/${newUpdateId}?parentId=${workingFolders[0].novajusId}" >Ver Andamento</a>`;
            response = await Wrike.createTaskComment(taskId, comment, false);
            if (!response.success) {
                console.log(response.message);
            }
            response = {
                statusCode: 200,
                body: JSON.stringify('Success'),
            };
            return response;
        } else {
            let comment = `${assigneesMention} Não foi possível adicionar o andamento de revisão às pastas ${workingFolders.map(x => x.title).join(', ')}. ${response.content}.`;
            if (errorCount > 0) {
                comment += `\nOcoreram os seguintes erros na inclusão do andamento de revisão. \n${newComments.join('\n')}`;
            }
            response = await Wrike.createTaskComment(taskId, comment, false);
            if (!response.success) {
                console.log(response.message);
            }
            response = {
                statusCode: 200,
                body: JSON.stringify('Error'),
            };
            return response;
        }
    }
    response = {
        statusCode: 200,
        body: JSON.stringify('Done'),
    };
    return response;
}
