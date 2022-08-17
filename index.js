import * as LO from './LegalOneService.js';
import {GetLegalOneTokenExpirationDate} from './LegalOneAuth.js'
import * as Wrike from './WrikeService.js';
import * as v from 'validate-cnj'

const reProcFolder = /(?<folder>Proc-\d{7}\/\d+|Proc-\d{7})/
const reProcFolderWrongNotation = /(Proc-\d{7})_(\d+)/g
const reProcFolderGlobal = /(?<folder>Proc-\d{7}\/\d+|Proc-\d{7})/g
const reAndamentoRevisãoMarker = /(\s?AR\s?\:|\s?Andamento de Revisão\s?\:|\s?Revisão\s?\:)(?<content>.*)/

export async function handler(event) {
    let response;
    let sns = event.Records[0].Sns;
    let message = sns.Message;
    let messageJson = JSON.parse(message);
    console.log(messageJson);
    if (messageJson[0].eventType !== 'CommentAdded' || !reAndamentoRevisãoMarker.test(messageJson[0].comment.text) || messageJson[0].comment.html.includes('blockquote')) {
        console.log("Skipped");
        response = {
            statusCode: 200,
            body: JSON.stringify('Skipped'),
        };
        return response;
    }
    let LOTokenMethod = GetLegalOneTokenExpirationDate();
    let assigneesMention = '<a class="stream-user-id avatar quasi-contact" rel="@assignees">@assignees</a>';
    let taskId = messageJson[0].taskId;
    let taskCommentId = messageJson[0].commentId;
    let taskCommentMatch = reAndamentoRevisãoMarker.exec(messageJson[0].comment.text);
    let taskCommentAutorId = messageJson[0].eventAuthorId;
    let taskCommentTimestamp = messageJson[0].lastUpdatedDate;
    let taksCommentQuote = `<blockquote data-user="${taskCommentAutorId}" data-entryid="${taskCommentId}" data-entrytype="comment" data-date="${new Date(taskCommentTimestamp).getTime()}">${messageJson[0].comment.text}</blockquote>replaceWithComment<a rel="${taskCommentAutorId}"></a>`
    let getContactResult = Wrike.getContact(taskCommentAutorId);
    let TaskCommentContent = taskCommentMatch.groups.content;
    TaskCommentContent = TaskCommentContent.replace(reProcFolderWrongNotation, '$1/$2');
    console.log("Getting Wrike Task.")
    response = await Wrike.getTask(taskId);
    if (!response.success) {
        let comment = `🤖 RJL-Bot: Não foi possível obter os dados da tarefa para rodar a automação de novo andamento de revisão. Erro: ${response.message}`;
        comment = taksCommentQuote.replace("replaceWithComment", comment);
        response = await Wrike.createTaskComment(taskId, comment, true);
        if (!response.success) {
            console.log(response.message);
        }
    }
    let wrikeTask = response.wrikeTask;
    let wrikeTaskParentIds = [];
    let newComments = [];

    // retrieve folder data for each wrikeTaskParentId and check if it is a folder that starts with the "Proc-"
    let workingFolders = [];
    let errorCount = 0;
    let foundFolders = 0;
    let taskCommentLitigations = [...TaskCommentContent.matchAll(reProcFolderGlobal)];
    if (taskCommentLitigations.length > 0) {
        // for each taskCommentLitigation, get the match group 'folder', search for the folder and add it to the wrikeTaksParentIds array
        let results = async () => {
            return Promise.all(
                taskCommentLitigations.map(async (commentLitigation) => {
                    let folderTitle = commentLitigation.groups.folder;
                    folderTitle = folderTitle.replace(/[\s_]/g, '-');
                    response = await Wrike.searchFolder(folderTitle);
                    if (response.success) {
                        wrikeTaskParentIds.push(response.id);
                    }
                })
            )
        }
        await Promise.resolve(results());
    }
    if (wrikeTaskParentIds.length == 0 ) {
        wrikeTaskParentIds = wrikeTask.parentIds;
    }
    for (let i = 0; i < wrikeTaskParentIds.length; i++) {
        response = await Wrike.getFolder(wrikeTaskParentIds[i]);
        if (response.success && response.data.title.startsWith('Proc-')) {
            foundFolders++;
            let folderData = response.data;
            let folderNovajusId;
            if (folderData.customFields.length > 0) {
                folderNovajusId = parseInt(folderData.customFields.find(x => x.id === 'IEABJD3YJUADBUZU').value);
            } else {
                folderNovajusId = NaN;
            }
            let folderTitle = folderData.title.replace(/[\s_]/g, '-');
            let isMatch = reProcFolder.exec(folderTitle);
            if (isMatch) {
                let newWorkingFolder = {
                    id: folderData.id,
                    title: folderData.title.replace(/[\s_]/g, '/'),
                    novajusId:  isNaN(folderNovajusId) ? null : parseInt(folderNovajusId)
                }
                workingFolders.push(newWorkingFolder);
            } else {
                newComments.push(`Não foi possível adicionar o andamento de revisão à pasta ${wrikeTaskParentIds[i]}. Pasta não encontrada.`);
                errorCount++;
            }
        }
    }
    if (errorCount > 0 && errorCount >= foundFolders) {
        let comment = `🤖 RJL-Bot: Não foi possível adicionar o andamento de revisão. \n${newComments.join('\n')}`;
        comment = taksCommentQuote.replace("replaceWithComment", comment);
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

    if (workingFolders.length == 0) {
        let comment = `🤖 RJL-Bot: Não foi possível adicionar o andamento de revisão. Nenhuma pasta encontrada.`;
        comment = taksCommentQuote.replace("replaceWithComment", comment);
        response = await Wrike.createTaskComment(taskId, comment, false);
        if (!response.success) {
            console.log(response.message);
        }
        console.log("Skipped");
        response = {
            statusCode: 200,
            body: JSON.stringify('Skipped'),
        };
        return response;
    }
    await Promise.resolve(LOTokenMethod);
    // for each workingFolder with novajusId = null, get the novajusId from LegalOne
    for (let i = 0; i < workingFolders.length; i++) {
        if (workingFolders[i].novajusId === null) {
            response = await LO.getLitigationsByCNJOrFolder(workingFolders[i].title);
            if (response.success) {
                let foundId = response.id;
                workingFolders[i].novajusId = foundId;
            } else {
                newComments.push(`Não foi possível adicionar o andamento de revisão à pasta ${workingFolders[i].title}. ${response.content}.`);
            }
        }
    }

    // build newLitigationUpdate payload
    // remove workingFolders titles from TaskCommentContent
    for (let i = 0; i < workingFolders.length; i++) {
        TaskCommentContent = TaskCommentContent.replace(workingFolders[i].title, '').trim().replace(/^,+/g, ' ');
    }
    let authorName = (await getContactResult).success ? (await getContactResult).data.firstName + " " + (await getContactResult).data.lastName : "Anônimo";
    let newAndamentoText = `${authorName}: ${TaskCommentContent}`;
    let newAndamentoNotes = `Comentário criado a partir de tarefa do Wrike: ${wrikeTask.permalink}`;
    let newLitigationUpdatePayload = {
        "typeId": 363,
        "originType": "Manual",
        "isSubType": true,
        "description": newAndamentoText,
        "notes": newAndamentoNotes,
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
        response = await LO.newLitigationUpdate(newLitigationUpdatePayload);
        if (response.success) {
            let newUpdateId = response.id;
            let comment = `🤖 RJL-Bot: Andamento de revisão adicionado à(s) pasta(s): ${workingFolders.map(x => x.title).join(', ')}.\n <a href="https://rj.novajus.com.br/processos/andamentos/details/${newUpdateId}?parentId=${workingFolders[0].novajusId}" >Ver Andamento</a>`;
            comment = taksCommentQuote.replace("replaceWithComment", comment);
            response = await Wrike.createTaskComment(taskId, comment, false);
            if (!response.success) {
                console.log(response.message);
            }
            await Wrike.deleteTaskComment(taskCommentId);
            response = {
                statusCode: 200,
                body: JSON.stringify('Success'),
            };
            return response;
        } else {
            let comment = `🤖 RJL-Bot: Não foi possível adicionar o andamento de revisão à(s) pasta(s) ${workingFolders.map(x => x.title).join(', ')}. ${response.content}.`;
            comment = taksCommentQuote.replace("replaceWithComment", comment);
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