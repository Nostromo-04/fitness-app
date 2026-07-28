const crypto = require('crypto');
const db = require('../config/database');
const { normalizeInviteToken } = require('../lib/inviteToken');
const {
  buildWebAppUrl,
  parseStartPayload,
  telegramApiRequest,
  webhookSecret,
} = require('../lib/telegramBot');

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function sendStartMessage(chatId, payload) {
  const inviteToken = normalizeInviteToken(payload);
  let text = 'Откройте приложение, чтобы продолжить.';
  let webAppUrl = buildWebAppUrl(process.env.FRONTEND_URL, null);

  if (payload && !inviteToken) {
    text = 'Ссылка приглашения имеет неверный формат. Попросите тренера создать новую.';
  } else if (inviteToken) {
    const invite = await db.query(
      `SELECT 1 FROM athlete_invites
        WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
       UNION ALL
       SELECT 1 FROM coach_invites
        WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
       LIMIT 1`,
      [tokenHash(inviteToken)]
    );
    if (!invite.rows[0]) {
      text = 'Приглашение недействительно или уже использовано. Попросите тренера создать новое.';
    } else {
      text = 'Приглашение получено. Нажмите кнопку ниже — вход выполнится автоматически.';
      webAppUrl = buildWebAppUrl(process.env.FRONTEND_URL, inviteToken);
    }
  }

  await telegramApiRequest(process.env.TELEGRAM_BOT_TOKEN, 'sendMessage', {
    chat_id: chatId,
    text,
    reply_markup: {
      inline_keyboard: [[{
        text: 'Открыть приложение',
        web_app: { url: webAppUrl },
      }]],
    },
  });
}

const telegramBotController = {
  async webhook(req, res) {
    try {
      const expectedSecret = webhookSecret(process.env.SESSION_SECRET);
      if (req.get('X-Telegram-Bot-Api-Secret-Token') !== expectedSecret) {
        return res.status(401).json({ status: 'error' });
      }

      const message = req.body?.message;
      const payload = parseStartPayload(message?.text);
      if (payload === null || !message?.chat?.id) return res.sendStatus(200);

      await sendStartMessage(message.chat.id, payload);
      return res.sendStatus(200);
    } catch (error) {
      console.error('Ошибка Telegram webhook:', error.message);
      return res.sendStatus(500);
    }
  },
};

module.exports = telegramBotController;
