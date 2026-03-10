import {ContentPlatform} from "../types";

export class AlertMessageBuilder {
    private city?: string;
    private mediaTitle?: string;
    private mediaUrl?: string;
    private includeNightNoise = false;
    private nightNoiseUrl?: string;
    private whiteNoiseByPlatform: Record<ContentPlatform, string> = {
        youtube: 'https://www.youtube.com/watch?v=WUjxmTtVQ9s',
        spotify: 'https://open.spotify.com/track/04boE4u1AupbrGlI62WvoO?si=1b19204860e54e20',
    }

    static create(city: string) {
        const builder = new AlertMessageBuilder();
        builder.city = city;
        return builder;
    }

    withMedia(title: string, url: string): this {
        this.mediaTitle = title;
        this.mediaUrl = url;
        return this;
    }

    withNightNoiseIf(condition: boolean, platform: ContentPlatform[]): this {
        if (condition && platform.length > 0) {
            this.nightNoiseUrl = this.whiteNoiseByPlatform[platform[0]]
            this.includeNightNoise = true;
        }
        return this;
    }

    build(): string {
        if (!this.city) {
            throw new Error("City is required");
        }

        let message = "";

        if (this.mediaTitle && this.mediaUrl) {
            message += `🎧 מקווים ש-[${this.mediaTitle}](${this.mediaUrl}) יעזור לכם לנשום בזמן האזעקה\n`;
        }

        message += `📍 מיקום: ${this.city}\n\n`;

        if (this.includeNightNoise && this.nightNoiseUrl) {
            message += `🌙 [רעש לבן](${this.nightNoiseUrl}) )`;
            message += `שיעזור לכם ולקטנים לישון:\n`;
        }

        message += `נא להיכנס למרחב המוגן.`;

        return message;
    }
}

