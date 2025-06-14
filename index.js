const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = "appoCIKfvPfmf7NZX";
const AIRTABLE_TABLE_ID = "tbl7xTeM5BNHhRDGZ";

const FRASE_SITE = "olá! gostaria de saber mais sobre os serviços da oliveira imóveis";
const FRASE_INSTAGRAM = "olá! encontrei vocês no instagram e gostaria de saber mais sobre os serviços da oliveira imóveis";

const respostasPorInteresse = [
  {
    interesse: "compra",
    palavras: ["comprar", "adquirir", "casa", "imóvel próprio", "apartamento para comprar", "compra de imóvel"],
    resposta: `Excelente escolha! 😊 A Oliveira Imóveis é especializada em ajudar estrangeiros a comprarem imóveis em Portugal com segurança jurídica e total acompanhamento. Como posso te ajudar hoje?`
  },
  {
    interesse: "arrendamento",
    palavras: ["alugar", "arrendar", "imóvel para alugar", "apartamento para alugar", "preciso de casa para morar"],
    resposta: `Entendido! Ajudamos muitas famílias a encontrarem seu imóvel ideal mesmo à distância. Que tipo de imóvel você está buscando?`
  },
  {
    interesse: "visto",
    palavras: ["visto", "documentação", "D1", "D2", "D3", "D4", "D7", "visto procura de trabalho", "nomade digital", "residência", "legalização", "Easyway", "processo consular"],
    resposta: `Ótimo! A Easyway to Portugal, empresa do nosso grupo, oferece suporte completo em vistos. Me conta um pouco mais do seu caso para podermos orientar melhor.`
  },
  {
    interesse: "relocation",
    palavras: ["chegar em Portugal", "mudança", "relocation", "transição", "adaptar", "ligar luz", "conta bancária"],
    resposta: `Perfeito! Ajudamos com toda a parte de chegada em Portugal. Você já tem uma data prevista para o embarque?`
  },
  {
    interesse: "investimento",
    palavras: ["investimento", "investir", "rentabilidade", "imóvel com retorno", "comprar para alugar"],
    resposta: `Excelente! Atuamos com investidores de vários países. Posso te mostrar alguns exemplos recentes ou te explicar como funciona.`
  },
  {
    interesse: "pesquisa",
    palavras: ["pesquisando", "em dúvida", "saber mais", "curiosidade", "serviços", "me explique", "como funciona", "quero entender"],
    resposta: `Sem problema! Posso te explicar tudo sobre como funciona o nosso serviço e o mercado imobliário em Portugal. Pode me perguntar à vontade.`
  }
];

function identificarInteresse(msg) {
  msg = msg.toLowerCase();
  for (let item of respostasPorInteresse) {
    if (item.palavras.some(p => msg.includes(p))) {
      return item;
    }
  }
  return null;
}

async function salvarOuAtualizarLead(numero, mensagem, interesse = "", fonte = "") {
  try {
    const encodedNumber = encodeURIComponent(numero);
    const urlBusca = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}?filterByFormula={Numero}='${numero}'`;
    const resBusca = await axios.get(urlBusca, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`
      }
    });

    const now = new Date().toISOString();
    const interesseFinal = interesse || resBusca.data.records[0]?.fields?.Interesse || "";
    const fonteFinal = fonte || resBusca.data.records[0]?.fields?.Fonte || "";

    const payload = {
      fields: {
        Numero: numero,
        UltimaMensagem: mensagem,
        Interesse: interesseFinal || "Não identificado",
        Fonte: fonteFinal || "Não informado",
        DataAtualizacao: now
      }
    };

    if (resBusca.data.records.length > 0) {
      const recordId = resBusca.data.records[0].id;
      await axios.patch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}/${recordId}`, payload, {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
    } else {
      await axios.post(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`, payload, {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
    }
  } catch (err) {
    console.error("Erro ao salvar/atualizar no Airtable:", err.response?.data || err.message);
  }
}

app.post('/webhook', async (req, res) => {
  const userMessage = req.body.Body || '';
  const numero = req.body.From || 'desconhecido';
  const lowerMessage = userMessage.trim().toLowerCase();

  if (lowerMessage === FRASE_SITE) {
    await salvarOuAtualizarLead(numero, userMessage, "compra", "Site");
    return res.send("Olá! Que bom ter você aqui 😊 Vi que você veio através do nosso site. Pode me contar um pouco do que está buscando?");
  }

  if (lowerMessage === FRASE_INSTAGRAM) {
    await salvarOuAtualizarLead(numero, userMessage, "compra", "Instagram");
    return res.send("Olá! Que bom que chegou até nós pelo Instagram! 💬 Me conta como podemos te ajudar. Está procurando imóvel, visto, ou quer entender melhor o processo?");
  }

  const interesseDetectado = identificarInteresse(userMessage);

  if (interesseDetectado) {
    await salvarOuAtualizarLead(numero, userMessage, interesseDetectado.interesse);
    return res.send(interesseDetectado.resposta);
  }

  const promptBase = `Você é o assistente virtual da Oliveira Imóveis, uma imobiliária portuguesa especializada em atender estrangeiros que desejam comprar ou arrendar um imóvel em Portugal ou na Catalunha, região da Espanha. Use sempre um tom profissional, acolhedor e claro. Nunca invente informações. Em caso de dúvidas jurídicas, direcione o cliente para uma reunião com um consultor.`;

  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: promptBase },
        { role: 'user', content: userMessage }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const reply = response.data.choices[0].message.content;
    await salvarOuAtualizarLead(numero, userMessage);
    res.set('Content-Type', 'text/plain');
    res.send(reply);
  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
    res.status(500).send('Erro ao processar a mensagem.');
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
