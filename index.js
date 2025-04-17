
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Respostas personalizadas por interesse
const respostasPorInteresse = [
  {
    interesse: "compra",
    palavras: ["comprar", "adquirir", "casa", "imóvel próprio", "apartamento para comprar", "compra de imóvel"],
    resposta: `Excelente escolha! 😊
A Oliveira Imóveis é especializada em ajudar estrangeiros a comprarem imóveis em Portugal, com segurança jurídica e acompanhamento completo.
Para começarmos, preencha nosso questionário: https://landbot.pro/v3/H-1752472-QJQ7HH99G5WN457C/index.html`
  },
  {
    interesse: "arrendamento",
    palavras: ["alugar", "arrendar", "imóvel para alugar", "apartamento para alugar", "preciso de casa para morar"],
    resposta: `Que bom! Ajudamos famílias a chegarem em Portugal com o imóvel garantido, mesmo à distância.
Nosso serviço de arrendamento é completo.
Para começar, preencha nosso questionário: https://landbot.pro/v3/H-1752472-QJQ7HH99G5WN457C/index.html`
  },
  {
    interesse: "visto",
    palavras: ["visto", "documentação", "D7", "D1", "D2", "D3", "D4", "visto procura de trabalho", "nomade digital", "residência", "legalização", "Easyway", "processo consular"],
    resposta: `Claro! A Easyway to Portugal, empresa do grupo Oliveira Imóveis, oferece suporte completo para todos os tipos de visto válidos para Portugal.
Para analisarmos seu caso, mande nos um email com suas duvidas em: contato@easywaytoportugal.pt`
  },
  {
    interesse: "relocation",
    palavras: ["chegar em Portugal", "mudança", "relocation", "transição", "adaptar", "ligar luz", "conta bancária"],
    resposta: `A Oliveira Imóveis cuida da sua chegada: imóvel, ligação de água/luz/gás e conta bancária.
Tudo feito com atenção ao detalhe, mesmo fora do país.
Preencha nosso questionário para atendimento: https://landbot.pro/v3/H-1752472-QJQ7HH99G5WN457C/index.html`
  },
  {
    interesse: "investimento",
    palavras: ["investimento", "investir", "rentabilidade", "imóvel com retorno", "comprar para alugar"],
    resposta: `Atuamos com investidores que buscam imóveis com boa rentabilidade em Portugal.
Preencha nosso questionário para avaliarmos oportunidades: https://landbot.pro/v3/H-1752472-QJQ7HH99G5WN457C/index.html`
  },
  {
    interesse: "pesquisa",
    palavras: ["pesquisando", "em dúvida", "saber mais", "curiosidade"],
    resposta: `Estamos aqui para ajudar você a entender tudo sobre o mercado português.
Mesmo que ainda esteja em fase de pesquisa, preencha o questionário para receber um atendimento direcionado: https://landbot.pro/v3/H-1752472-QJQ7HH99G5WN457C/index.html`
  }
];

// Função que identifica o interesse com base na mensagem
function identificarInteresse(msg) {
  msg = msg.toLowerCase();
  for (let item of respostasPorInteresse) {
    if (item.palavras.some(p => msg.includes(p))) {
      return item.resposta;
    }
  }
  return null;
}

app.post('/webhook', async (req, res) => {
  const userMessage = req.body.Body || '';
  const interesseDetectado = identificarInteresse(userMessage);

  if (interesseDetectado) {
    return res.send(interesseDetectado);
  }

  // Se não identificar o interesse, cai no ChatGPT
  const promptBase = `Você é o assistente virtual da Oliveira Imóveis, uma imobiliária portuguesa especializada em atender estrangeiros que desejam comprar ou arrendar um imóvel em Portugal. 
  Use sempre um tom profissional, acolhedor e claro. Nunca invente informações. Em caso de dúvidas jurídicas, direcione o cliente para uma reunião com um consultor.`;

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
    res.set('Content-Type', 'text/plain');
    res.send(reply);

  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
    res.status(500).send('Erro ao processar a mensagem.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
