import { z } from "zod";

export const recordingInput = z.object({
  eventId: z.string().min(1).max(200),
  url: z.string().url().refine(value => {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password &&
      ["vimeo.com", "www.vimeo.com", "player.vimeo.com", "youtube.com", "www.youtube.com", "youtu.be"].includes(url.hostname);
  }, "Use an HTTPS Vimeo or YouTube link"),
  passcode: z.string().max(200).nullable().default(null),
  confirmSend: z.boolean().default(false)
});
