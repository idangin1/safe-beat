import { Conversation } from '@grammyjs/conversations';
import { Context, InlineKeyboard } from 'grammy';
import { BotContext } from '../context';
import { ContentMode, ContentPlatform, User } from '../../types';
import { IUserStore } from '../../user-store/store.interface';

const cities: string[] = require('../../../data/cities.json') as string[];

type OnboardingConversation = Conversation<BotContext, Context>;

function buildModeKeyboard(selected: ContentMode[]): InlineKeyboard {
  const btn = (mode: ContentMode) =>
    selected.includes(mode) ? `✅ ${mode}` : mode;
  return new InlineKeyboard()
    .text(btn('מרגיע'), 'mode:מרגיע')
    .text(btn('מצחיק'), 'mode:מצחיק')
    .row()
    .text(btn('ילדים'), 'mode:ילדים')
    .text(btn('קצבי'), 'mode:קצבי')
    .row()
    .text('אישור', 'mode:done');
}

function buildPlatformKeyboard(selected: ContentPlatform[]): InlineKeyboard {
  return new InlineKeyboard()
    .text(selected.includes('youtube') ? '✅ YouTube' : 'YouTube', 'platform:youtube')
    .text(selected.includes('spotify') ? '✅ Spotify' : 'Spotify', 'platform:spotify')
    .row()
    .text('אישור', 'platform:done');
}

export function createOnboardingConversation(store: IUserStore) {
  return async function onboarding(conversation: OnboardingConversation, ctx: Context): Promise<void> {
    const from = ctx.from;
    if (!from) return;

    const chatId = ctx.chat?.id ?? from.id;

    // Step 1: City search loop
    await ctx.reply('מה הישוב שלך? הקלד שם חלקי...');

    let selectedCity = '';
    while (!selectedCity) {
      const update = await conversation.wait();

      if (update.message?.text) {
        const input = update.message.text.trim().toLowerCase();
        const matches = cities.filter(c => c.toLowerCase().includes(input));

        if (matches.length === 0) {
          await update.reply('לא נמצאו תוצאות, נסה שנית');
        } else if (matches.length === 1) {
          selectedCity = matches[0];
        } else {
          const top5 = matches.slice(0, 5);
          const kb = new InlineKeyboard();
          for (const c of top5) {
            kb.row().text(c, `city:${c}`);
          }
          const text = matches.length > 5
            ? `נמצאו ${matches.length} ישובים. הצגת 5 ראשונים — המשך להקליד לסינון:`
            : 'בחר את הישוב שלך:';
          await update.reply(text, { reply_markup: kb });
        }
      } else if (update.callbackQuery?.data?.startsWith('city:')) {
        selectedCity = update.callbackQuery.data.slice('city:'.length);
        await update.answerCallbackQuery();
      }
    }

    // Step 2: Mode multi-select
    let selectedModes: ContentMode[] = [];
    await ctx.reply('איזה תוכן תרצה לקבל? (בחר אחד או יותר)', {
      reply_markup: buildModeKeyboard(selectedModes),
    });

    while (true) {
      const cbCtx = await conversation.waitFor('callback_query:data');
      const data = cbCtx.callbackQuery.data;

      if (data === 'mode:done') {
        if (selectedModes.length === 0) {
          await cbCtx.answerCallbackQuery('בחר לפחות אפשרות אחת');
          continue;
        }
        await cbCtx.answerCallbackQuery();
        break;
      }

      if (data.startsWith('mode:')) {
        const mode = data.slice('mode:'.length) as ContentMode;
        if (selectedModes.includes(mode)) {
          selectedModes = selectedModes.filter(m => m !== mode);
        } else {
          selectedModes.push(mode);
        }
        await cbCtx.editMessageReplyMarkup({ reply_markup: buildModeKeyboard(selectedModes) });
        await cbCtx.answerCallbackQuery();
      } else {
        await cbCtx.answerCallbackQuery();
      }
    }

    // Step 3: Platform multi-select
    let selectedPlatforms: ContentPlatform[] = [];
    await ctx.reply('באיזה פלטפורמה? (בחר אחד או יותר)', {
      reply_markup: buildPlatformKeyboard(selectedPlatforms),
    });

    while (true) {
      const cbCtx = await conversation.waitFor('callback_query:data');
      const data = cbCtx.callbackQuery.data;

      if (data === 'platform:done') {
        if (selectedPlatforms.length === 0) {
          await cbCtx.answerCallbackQuery('בחר לפחות אפשרות אחת');
          continue;
        }
        await cbCtx.answerCallbackQuery();
        break;
      }

      if (data.startsWith('platform:')) {
        const platform = data.slice('platform:'.length) as ContentPlatform;
        if (selectedPlatforms.includes(platform)) {
          selectedPlatforms = selectedPlatforms.filter(p => p !== platform);
        } else {
          selectedPlatforms.push(platform);
        }
        await cbCtx.editMessageReplyMarkup({ reply_markup: buildPlatformKeyboard(selectedPlatforms) });
        await cbCtx.answerCallbackQuery();
      } else {
        await cbCtx.answerCallbackQuery();
      }
    }

    // Step 4: Save & confirm
    const existing = await conversation.external(() => store.getUser(from.id));

    await conversation.external(async () => {
      if (existing?.city && existing.city !== selectedCity) {
        await store.removeUserFromCity(from.id, existing.city);
      }
      const user: User = {
        telegramId: from.id,
        chatId,
        city: selectedCity,
        mode: selectedModes,
        platform: selectedPlatforms,
        subscribedAt: existing?.subscribedAt ?? Date.now(),
        active: true,
        username: from.username,
      };
      await store.saveUser(user);
      await store.addUserToCity(from.id, selectedCity);
    });

    const modesDisplay = selectedModes.join(', ');
    const platformsDisplay = selectedPlatforms
      .map(p => p === 'youtube' ? 'YouTube' : 'Spotify')
      .join(', ');

    await ctx.reply(
      `✅ נרשמת בהצלחה!\n` +
      `ישוב: ${selectedCity}\n` +
      `תוכן: ${modesDisplay}\n` +
      `פלטפורמה: ${platformsDisplay}\n\n` +
      `נאחל ימים שקטים ללא הודעות בערוץ זה 🙏\n` +
      `ניתן להפסיק את השירות בכל רגע באמצעות /stop`,
    );
  };
}
