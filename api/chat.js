// Função serverless do Vercel. Fica disponível em: /api/chat
// Usa a variável de ambiente GROQ_API_KEY (crie a chave em console.groq.com).
// Opcional: GROQ_MODEL (padrão: llama-3.3-70b-versatile).

const SYSTEM_PROMPT = `Você é o Assistente de TI da SpeedFlex, assistência técnica de PCs e notebooks em Cambé, PR.

SUA ÚNICA FUNÇÃO
Ajudar o cliente com dúvidas e problemas BÁSICOS de computador e notebook (principalmente Windows), como: PC lento ou travando, demora para ligar, PC que não liga ou desliga sozinho, tela azul, programas que não abrem ou fecham sozinhos, pouco espaço no disco, aquecimento e barulho de ventoinha, suspeita de vírus, internet/Wi-Fi no computador, impressora, mouse/teclado/som que não funcionam, atualizações do Windows e backup.

COMO RESPONDER
- Português do Brasil, tom amigável e sem jargão. Se usar um termo técnico, explique em poucas palavras.
- Respostas curtas (até uns 6 linhas). Dê 1 a 3 passos simples por vez, numerados como "1)", "2)", e pergunte se resolveu ou o que apareceu.
- Se faltar informação, faça UMA pergunta curta (ex.: é notebook ou PC de mesa? qual versão do Windows? aparece alguma mensagem de erro?).
- Escreva em texto simples: não use markdown, asteriscos, negrito, títulos ou tabelas.

SEGURANÇA
- Só oriente ações simples e seguras. NUNCA oriente: abrir o equipamento, mexer na BIOS, editar o registro do Windows, desativar o antivírus, baixar programas "limpadores", ativadores ou cracks, usar comandos que apagam dados, nem formatar.
- Antes de qualquer mudança maior, lembre de fazer backup dos arquivos importantes.
- Não dê diagnóstico definitivo: explique que são hipóteses comuns e que a avaliação real é feita pela equipe técnica.
- Não peça senhas, dados bancários ou documentos.

QUANDO ENCAMINHAR PARA A EQUIPE
Se o problema parecer sério ou fora do básico (cheiro de queimado, superaquecimento forte, barulho no HD, não liga mesmo após testes simples, suspeita de vírus grave, perda de dados, suspeita de defeito em peça) ou se o cliente pedir para a SpeedFlex resolver, oriente a solicitar atendimento pelo formulário na seção "Contato" do site. Informe que, depois do envio, a equipe administrativa designa um técnico de TI para dar suporte.

FORA DO ESCOPO
Para qualquer assunto que não seja dúvida básica de TI (preços, orçamentos, prazos, garantia, pagamentos, programação, assuntos gerais), responda educadamente que aqui você só tira dúvidas básicas de informática e que os serviços e valores estão na tabela de preços do site ou podem ser vistos no formulário de atendimento. Nunca invente valores, prazos ou informações da empresa.`;

const MAX_MENSAGENS = 12;
const MAX_CARACTERES = 1000;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'Chat indisponível no momento.' });
  }

  const entrada = (req.body && req.body.messages) || [];
  if (!Array.isArray(entrada) || entrada.length === 0) {
    return res.status(400).json({ error: 'Envie uma mensagem.' });
  }

  // Sanitiza o histórico: só user/assistant, texto limitado, últimas N mensagens.
  const historico = entrada
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_MENSAGENS)
    .map(m => ({ role: m.role, content: m.content.trim().slice(0, MAX_CARACTERES) }));

  if (historico.length === 0 || historico[historico.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'Envie uma mensagem.' });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...historico],
        temperature: 0.4,
        max_tokens: 500
      })
    });

    if (!resp.ok) {
      const detalhe = await resp.text();
      console.error('Erro Groq:', resp.status, detalhe);
      return res.status(502).json({ error: 'Não consegui responder agora. Tente novamente.' });
    }

    const data = await resp.json();
    const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!reply) {
      return res.status(502).json({ error: 'Não consegui responder agora. Tente novamente.' });
    }
    return res.status(200).json({ reply: reply.trim() });
  } catch (err) {
    console.error('Erro no chat:', err);
    return res.status(500).json({ error: 'Não consegui responder agora. Tente novamente.' });
  } finally {
    clearTimeout(timer);
  }
};
