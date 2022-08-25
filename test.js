import fs from "fs";
import * as index from "./index.js";

// Event test
// read from json file

let file = fs.readFileSync('SNS_Payload.json', 'utf8');
let message = [
    {
        commentId: 'IEABJD3YIMUEE3TG',
        comment: {
            text: 'AR: Executada devidamente citada(fl. 102) não se manifestou nos autos. A Sentença julgou procedente a ação monitória (fl. 104-107) com condenação do réu em honorários advocatícios (10%). Foi requerido Cumprimento de Sentença (fl. 109-112). Proferida Decisão (fl. 114-116) evoluindo o processo para fase de cumprimento de sentença e determinando a intimação do executado para pagamento voluntário no prazo de 15 dias. AR de intimação retornou negativo - "Ausente" (fl. 118). @Victor Andrade cumprir com o pedido de presunção de intimação e pesquisa de ativos financeiros via Sisbajud.',
            html: 'AR: Executada devidamente <b>citada</b>(fl. 102) não se manifestou nos autos. A <b>Sentença</b> julgou procedente a ação monitória (fl. 104-107) com condenação do réu em honorários advocatícios (10%). Foi requerido <b>Cumprimento de Sentença</b> (fl. 109-112). Proferida <b>Decisão </b>(fl. 114-116) evoluindo o processo para fase de cumprimento de sentença e determinando a intimação do executado para pagamento voluntário no prazo de 15 dias. <b>AR de intimação</b> retornou negativo - &#34;Ausente&#34; (fl. 118). &#64;Victor Andrade cumprir com o pedido de presunção de intimação e pesquisa de ativos financeiros via Sisbajud.'
        },
        taskId: 'IEABJD3YKQ4M45WL',
        webhookId: 'IEABJD3YJAABGIAX',
        eventAuthorId: 'KUACQE4M',
        eventType: 'CommentAdded',
        lastUpdatedDate: '2022-08-25T16:11:11Z'
    }
]
let event = JSON.parse(file);
event.Records[0].Sns.Message = event.Records[0].Sns.Message.replace('replaceWithMessage', JSON.stringify(message));
await index.handler(event);

