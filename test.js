import fs from "fs";
import * as index from "./index.js";

// Event test
// read from json file

let file = fs.readFileSync('SNS_Payload.json', 'utf8');
let message = [
    {
        commentId: 'IEABJD3YIMUELJ62',
        comment: {
            text: 'AR: Proc-0002201 Devedor não citado (p. 35). Diante da não citação no endereço inicial iniciou-se a fase de localização do devedor. Requerimento de pesquisa de endereço via Bacenjud, Infojud, Renajud e Siel (p. 40). Requerimento solicitando a citação nos endereços disponibilizados (p. 49) - negativos (p.52).\n' +
                'Requerimento solicitando a expedição de ofícios as empresas de telefonia e concessionárias de serviços públicos (p. 55). Decisão (p. 56) deferindo o pedido.\n' +
                'Respostas dos ofícios (p. 69-72).Requerimento solicitando a localização de endereço via app´s de entrega (p. 75-77). Decisão (p.80) deferiu a autorização de email as empresas. Requerimento comprovando o envio dos emails as empresas (p.82-83). Após a juntada das respostas dos ofícios, diligenciar nos endereços disponibilizados e/ou aplicar roteiro visando a localização do devedor.',
            html: 'AR: Proc-0002201 Devedor não citado (p. 35). Diante da não citação no endereço inicial iniciou-se a fase de localização do devedor. Requerimento de pesquisa de endereço via Bacenjud, Infojud, Renajud e Siel (p. 40). Requerimento solicitando a citação nos endereços disponibilizados (p. 49) - negativos (p.52).<br />Requerimento solicitando a expedição de ofícios as empresas de telefonia e concessionárias de serviços públicos (p. 55).  Decisão (p. 56) deferindo o pedido. <br />Respostas dos ofícios (p. 69-72).Requerimento solicitando a localização de endereço via app´s de entrega (p. 75-77).  Decisão (p.80) deferiu a autorização de email as empresas. Requerimento comprovando o envio dos emails as empresas (p.82-83). Após a juntada das respostas dos ofícios, diligenciar nos endereços disponibilizados e/ou aplicar roteiro visando a localização do devedor. '
        },
        taskId: 'IEABJD3YKQ4I5DYH',
        webhookId: 'IEABJD3YJAABGIAX',
        eventAuthorId: 'KUAF2S3C',
        eventType: 'CommentAdded',
        lastUpdatedDate: '2022-08-26T14:43:07Z'
    }
]
let event = JSON.parse(file);
event.Records[0].Sns.Message = event.Records[0].Sns.Message.replace('replaceWithMessage', JSON.stringify(message));
await index.handler(event);

