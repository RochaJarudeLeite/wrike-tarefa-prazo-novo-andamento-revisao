import fs from "fs";
import * as index from "./index.js";

// Event test
// read from json file

let file = fs.readFileSync('SNS_Payload.json', 'utf8');
let message = [
    {
        commentId: 'IEABJD3YIMUETUXJ',
        comment: {
            text: 'AR: Distribuição de carta precatória no juízo deprecado visando a citação do devedor. Custas da distribuição recolhidas (p.2-4) e custas de TDE (p.41-42) recolhidas.',
            html: 'AR: Distribuição de carta precatória no juízo deprecado visando a citação do devedor. Custas da distribuição recolhidas (p.2-4) e custas de TDE (p.41-42) recolhidas.'
        },
        taskId: 'IEABJD3YKQ4FCY6R',
        webhookId: 'IEABJD3YJAABGIAX',
        eventAuthorId: 'KUAF2S3C',
        eventType: 'CommentAdded',
        lastUpdatedDate: '2022-08-29T14:19:12Z'
    }
]
let event = JSON.parse(file);
event.Records[0].Sns.Message = event.Records[0].Sns.Message.replace('replaceWithMessage', JSON.stringify(message));
await index.handler(event);