
// Vercel Serverless Function — SpeedFlex AI
// Integração com a API da Groq

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const DEFAULT_MODEL = "openai/gpt-oss-20b";

const SYSTEM_PROMPT = `
Você é o assistente virtual oficial da SpeedFlex,
uma assistência técnica especializada em computadores.

SUA IDENTIDADE:
- Você representa a SpeedFlex.
- Seu atendimento deve ser profissional, educado e prestativo.
- Responda sempre em português brasileiro.
- Seja objetivo, claro e natural.

SUAS ESPECIALIDADES:
- Computadores e notebooks.
- Windows e sistemas operacionais.
- Lentidão e travamentos.
- Otimização de computadores.
- Formatação.
- Manutenção preventiva e corretiva.
- Hardware e periféricos.
- Problemas de desempenho.
- Segurança digital.

ATENDIMENTO:
- Entenda o problema antes de sugerir uma solução.
- Faça perguntas simples quando precisar de mais informações.
- Explique os procedimentos passo a passo.
- Utilize linguagem acessível.
- Apresente os serviços da SpeedFlex naturalmente quando forem relevantes.
- Não insista em vendas.

REGRAS:
- Nunca invente preços ou promoções.
- Nunca invente prazos ou garantias.
- Não invente endereço ou telefone.
- Quando não souber alguma informação comercial,
  oriente o cliente a consultar os canais oficiais.
- Não solicite senhas ou informações bancárias.
- Não prometa diagnósticos definitivos sem avaliação técnica.
- Oriente a procurar assistência presencial quando necessário.
- Nunca recomende abrir fontes de alimentação ou
  equipamentos que possam oferecer risco elétrico.

OBJETIVO:
Oferecer uma experiência de atendimento eficiente,
ajudando o cliente a compreender seus problemas
e conhecer as soluções oferecidas pela SpeedFlex.
`;

module.exports = async function handler(req, res) {

  // Aceitar somente requisições POST
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      error: "Método não permitido."
    });
  }

  // Buscar chave privada da Groq
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.error("GROQ_API_KEY não configurada.");

    return res.status(500).json({
      error: "A chave da API da Groq não foi configurada."
    });
  }

  try {

    const body = req.body || {};

    const incomingMessages = Array.isArray(body.messages)
      ? body.messages
      : [];

    // Validar mensagens recebidas
    const messages = incomingMessages

      .filter((item) =>
        item &&
        (
          item.role === "user" ||
          item.role === "assistant"
        ) &&
        typeof item.content === "string" &&
        item.content.trim().length > 0
      )

      .slice(-16)

      .map((item) => ({
        role: item.role,
        content: item.content.trim().slice(0, 5000)
      }));

    if (messages.length === 0) {
      return res.status(400).json({
        error: "Envie uma mensagem para começar."
      });
    }

    // Controle de tempo de resposta
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 25000);

    let groqResponse;

    try {

      // Enviar solicitação para a Groq
      groqResponse = await fetch(GROQ_API_URL, {

        method: "POST",

        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },

        body: JSON.stringify({

          model: process.env.GROQ_MODEL || DEFAULT_MODEL,

          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT
            },
            ...messages
          ],

          max_completion_tokens: 700,

          temperature: 0.6

        }),

        signal: controller.signal

      });

    } finally {
      clearTimeout(timeout);
    }

    // Interpretar resposta
    const data = await groqResponse.json().catch(() => ({}));

    // Verificar erros da Groq
    if (!groqResponse.ok) {

      console.error("Erro Groq:", {
        status: groqResponse.status,
        message: data.error?.message
      });

      if (groqResponse.status === 401) {
        return res.status(502).json({
          error: "Chave da Groq inválida. Verifique a configuração."
        });
      }

      if (groqResponse.status === 429) {
        return res.status(429).json({
          error: "Limite de solicitações atingido. Tente novamente em instantes."
        });
      }

      return res.status(502).json({
        error: "Não foi possível obter uma resposta da IA."
      });
    }

    // Extrair resposta
    const reply = data.choices?.[0]?.message?.content;

    if (
      typeof reply !== "string" ||
      !reply.trim()
    ) {

      console.error("Resposta vazia ou inesperada da Groq.");

      return res.status(502).json({
        error: "A IA retornou uma resposta vazia."
      });
    }

    // Retornar resposta ao site
    return res.status(200).json({
      reply: reply.trim()
    });

  } catch (error) {

    console.error("Erro SpeedFlex AI:", error);

    if (error.name === "AbortError") {
      return res.status(504).json({
        error: "A resposta demorou demais. Tente novamente."
      });
    }

    return res.status(500).json({
      error: "Erro interno ao processar sua mensagem."
    });

  }

};
