// Função serverless do Vercel. Fica disponível automaticamente em: /api/solicitacoes
// Usa a variável de ambiente DATABASE_URL (connection string do Neon).
// Opcionalmente envia um e-mail de notificação via Resend (RESEND_API_KEY + ADMIN_EMAIL).

const { neon } = require('@neondatabase/serverless');

const TIPOS = {
  'lentidao': 'PC lento / travando',
  'nao-liga': 'Não liga / desliga sozinho',
  'virus': 'Vírus ou malware',
  'upgrade': 'Upgrade de peças (memória, SSD)',
  'outro': 'Outro'
};

async function enviarEmailNotificacao({ nome, telefone, tipo, descricao }) {
  // Se as variáveis não estiverem configuradas, simplesmente não envia (sem quebrar o resto).
  if (!process.env.RESEND_API_KEY || !process.env.ADMIN_EMAIL) return;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'SpeedFlex <onboarding@resend.dev>',
        to: [process.env.ADMIN_EMAIL],
        subject: `Nova solicitação: ${nome}`,
        html: `
          <h2>Nova solicitação de atendimento</h2>
          <p><b>Nome:</b> ${nome}</p>
          <p><b>Telefone:</b> ${telefone}</p>
          <p><b>Tipo de problema:</b> ${TIPOS[tipo] || tipo}</p>
          <p><b>Descrição:</b><br>${descricao}</p>
        `
      })
    });
  } catch (err) {
    // Falha ao notificar não deve derrubar o salvamento da solicitação.
    console.error('Erro ao enviar e-mail de notificação:', err);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { nome, telefone, tipo, descricao } = req.body || {};

  if (!nome || !telefone || !tipo || !descricao) {
    return res.status(400).json({ error: 'Preencha todos os campos.' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    await sql`
      INSERT INTO solicitacoes (nome, telefone, tipo_problema, descricao)
      VALUES (${nome}, ${telefone}, ${tipo}, ${descricao})
    `;
    await enviarEmailNotificacao({ nome, telefone, tipo, descricao });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Erro ao gravar solicitação:', err);
    return res.status(500).json({ error: 'Não foi possível salvar a solicitação. Tente novamente.' });
  }
};
