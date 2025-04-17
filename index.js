const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const promptBase = `Você é o assistente virtual da Oliveira Imóveis, uma imobiliária portuguesa especializada em atender estrangeiros que desejam comprar ou arrendar um imóvel em Portugal. 
A Oliveira Imóveis oferece suporte jurídico (em parceria com a Easyway to Portugal), relocation, busca de imóveis e atendimento personalizado. 
Use sempre um tom profissional, acolhedor e claro. Nunca invente informações. Em caso de dúvidas jurídicas, direcione o cliente para uma reunião com um consultor.
Links importantes:
- Site: https://www.oliveiraimoveis.pt
- Easyway: https://www.easywaytoportugal.pt
- Questionário: https://landbot.pro/v3/H-1752472-QJQ7HH99G5WN457C/index.html`;

app.post('/webhook', async (req, res) => {
    const userMessage = req.body.Body || '';
    const from = req.body.From || 'Cliente';

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
