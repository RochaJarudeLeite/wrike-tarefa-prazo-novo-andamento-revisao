import {GetWrikeToken} from './WrikeAuth.js'
import {wrikeToken} from './WrikeAuth.js'
import fetch from 'node-fetch'

let tempLitigationFolderId = "IEABJD3YI44HKA7O";
let novajusIdCustomField = "IEABJD3YJUADBUZU";


async function getTask(taskId) {
    let config = {
        method: 'get',
        headers: {
            Authorization: 'Bearer ' + wrikeToken
        }
    }
    let url = `https://www.wrike.com/api/v4/tasks/${taskId}`
    try {
        const response = await fetch(url, config).then((response) => {
            return response
        })
        if (response.status === 200) {
            let body = await response.json();
            let data = body.data;
            if (data.length > 0) {
                return {"success": true, "wrikeTask": data[0]};
            } else {
                return {"success": true, "wrikeTask": null};
            }
        } else {
            return {"success": false, "message": "Erro ao obter dados da tarefa."};
        }
    } catch (error) {
        return {"success": false, "message": "Erro: " + error};
    }
}

async function getFolder(folderId) {
    let config = {
        method: 'get',
        headers: {
            Authorization: 'Bearer ' + wrikeToken
        }
    }
    let url = `https://www.wrike.com/api/v4/folders/${folderId}`
    try {
        const response = await fetch(url, config).then((response) => {
            return response
        })
        if (response.status === 200) {
            let body = await response.json();
            let data = body.data;
            if (data.length > 0) {
                return {"success": true, "data": data[0]};
            }
        } else {
            let message = `Erro ao obter os dados da pasta ${folderId}.`;
            return {"success": false, "message": message};
        }
    } catch (error) {
        let message = `Erro ao obter os dados da pasta ${folderId}.`;
        return {"success": false, "message": `${message}: ${error}`};
    }
}

async function getContact(contactId) {
    let config = {
        method: 'get',
        headers: {
            Authorization: 'Bearer ' + wrikeToken
        }
    }
    let url = `https://www.wrike.com/api/v4/contacts/${contactId}`
    try {
        const response = await fetch(url, config).then((response) => {
            return response
        })
        if (response.status === 200) {
            let body = await response.json();
            let data = body.data;
            if (data.length > 0) {
                return {"success": true, "data": data[0]};
            }
        } else {
            let message = `Erro ao obter os dados do autor do comentário ${contactId}.`;
            return {"success": false, "message": message};
        }
    } catch (error) {
        let message = `Erro ao obter os dados do autor do comentário ${contactId}.`;
        return {"success": false, "message": `${message}: ${error}`};
    }
}

async function createTaskComment(taskId, comment, isPlainText = false) {
    let config = {
        method: 'post',
        headers: {
            Authorization: 'Bearer ' + wrikeToken
        }
    }
    let url = `https://www.wrike.com/api/v4/tasks/${taskId}/comments?text=${comment}&plainText=${isPlainText}`
    try {
        const response = await fetch(url, config).then((response) => {
            return response
        })
        if (response.status === 200) {
            let body = await response.json();
            let data = body.data;
            if (data.length > 0) {
                return {"success": true};
            }
        } else {
            return {"success": false, "message": "Erro criar comentário na tarefa."};
        }
    } catch (error) {
        return {"success": false, "message": "Erro criar comentário na tarefa: " + error};
    }
}

async function deleteTaskComment(commentId) {
    let config = {
        method: 'delete',
        headers: {
            Authorization: 'Bearer ' + wrikeToken
        }
    }
    let url = `https://www.wrike.com/api/v4/comments/${commentId}`
    try {
        const response = await fetch(url, config).then((response) => {
            return response
        })
        if (response.status === 200) {
            let body = await response.json();
            let data = body.data;
            if (data.length > 0) {
                return {"success": true};
            }
        } else {
            return {"success": false, "message": "Erro criar deletar comentário."};
        }
    } catch (error) {
        return {"success": false, "message": "Erro ao deletar comentário: " + error};
    }
}

async function searchFolder(folderTitle) {
    folderTitle = folderTitle.replaceAll('/', '_');
    let config = {
        method: 'post',
        headers: {
            Authorization: 'Bearer ' + wrikeToken
        }
    }
    let url = `https://www.wrike.com/api/v4/ediscovery_search?scopes=["folder","project"]&terms=["${folderTitle}"]`
    try {
        const response = await fetch(url, config).then((response) => {
            return response
        })
        if (response.status === 200) {
            let body = await response.json();
            let data = body.data;
            if (data.length > 0) {
                return {"success": true, "id": data[0].id};
            } else {
                return {"success": true, "id": null};
            }
        } else {
            return {"success": false, "message": "Erro ao obter dados."};
        }
    } catch (error) {
        return {"success": false, "message": "Erro: " + error};
    }
}

async function createFolder(folderTitle, novajusId) {
    folderTitle = folderTitle.replaceAll('/', '_');
    let config = {
        method: 'post',
        headers: {
            Authorization: 'Bearer ' + wrikeToken
        }
    }
    let novajusIdCustomField = {"id":novajusIdCustomField,"value":`${novajusId}`};
    let url = `https://www.wrike.com/api/v4/folders/${tempLitigationFolderId}/folders?title=${folderTitle}&customFields=[${novajusIdCustomField}]`
    try {
        const response = await fetch(url, config).then((response) => {
            return response
        })
        if (response.status === 200) {
            let body = await response.json();
            let data = body.data;
            if (data.length > 0) {
                return {"success": true, "id": data[0].id};
            }
        } else {
            return {"success": false, "message": "Erro ao criar pasta."};
        }
    } catch (error) {
        return {"success": false, "message": "Erro ao criar pasta: " + error};
    }
}

export {
    getTask,
    searchFolder,
    getFolder,
    createFolder,
    createTaskComment,
    getContact,
    deleteTaskComment,
    novajusIdCustomField
}
