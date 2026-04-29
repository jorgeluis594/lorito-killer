import { log } from "@/lib/log";
import type { response } from "@/lib/types";

const DISCORD_CONTENT_LIMIT = 2000;
const DISCORD_API_BASE_URL = "https://discord.com/api/v10";

export const sendDiscordTextNotification = async (
  text: string,
): Promise<response<void>> => {
  if (!text.trim()) {
    return {
      success: false,
      message: "La notificación de Discord no puede estar vacía",
    };
  }

  if (text.length > DISCORD_CONTENT_LIMIT) {
    return {
      success: false,
      message: "La notificación de Discord excede los 2000 caracteres",
    };
  }

  const botToken = process.env["DISCORD_BOT_TOKEN"];
  const channelId = process.env["DISCORD_CHANNEL_ID"];

  if (!botToken || !channelId) {
    log.warn("discord_notification_missing_config", {
      hasBotToken: Boolean(botToken),
      hasChannelId: Boolean(channelId),
    });

    return {
      success: false,
      message: "Faltan variables de entorno para Discord",
    };
  }

  try {
    const discordResponse = await fetch(
      `${DISCORD_API_BASE_URL}/channels/${channelId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: text }),
      },
    );

    if (!discordResponse.ok) {
      const responseBody = await discordResponse.text();

      log.warn("discord_notification_send_failed", {
        status: discordResponse.status,
        statusText: discordResponse.statusText,
        body: responseBody,
      });

      return {
        success: false,
        message: "Error enviando notificación a Discord",
      };
    }

    return { success: true, data: undefined };
  } catch (error) {
    log.error("discord_notification_send_error", {
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      message: "Error enviando notificación a Discord",
    };
  }
};
