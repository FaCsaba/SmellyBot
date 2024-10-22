import fs from "node:fs";
import path from "path";

export type ChannelId = string;
export type UserId = string;
export type MessageId = string;
export type Password = string;
export type User = { id: UserId; count: number; };
export type UserGeneratedPassword = { userId: UserId; messageId: MessageId, password: Password; }

export type SchemaV1 = {
    version: 1;
    channels: ChannelId[];
    users: Record<UserId, User>;
}

export type SchemaV2 = {
    version: 2;
    channels: ChannelId[];
    showerChannels: ChannelId[];
    users: Record<UserId, User>;
}

export type SchemaV3 = {
    version: 3;
    channels: ChannelId[];
    showerChannels: ChannelId[];
    users: Record<UserId, User>;
    passwords: UserGeneratedPassword[];
}

export type Schema = SchemaV1 | SchemaV2 | SchemaV3;

export class DB {
    public data: SchemaV3 = { version: 3, channels: [], showerChannels: [], users: {}, passwords: [] };

    constructor(public filePath: string) {
        this.readFromDisk();
        if (!fs.existsSync(filePath)) {
            const dirname = path.dirname(filePath)
            fs.mkdirSync(dirname, { recursive: true });
        }
    }

    public addChannel(channel: ChannelId) {
        console.log("Adding channel", channel);
        if (!this.data.channels.includes(channel)) this.data.channels.push(channel);
        this.saveToDisk();
    }

    public addShowerChannel(channel: ChannelId) {
        console.log("Adding shower channel", channel);
        if (!this.data.showerChannels.includes(channel)) this.data.showerChannels.push(channel);
        this.saveToDisk();
    }

    public addOrUpdateUser(user: User) {
        console.log("Adding user", user);
        this.data.users[user.id] = user;
        this.saveToDisk();
    }

    public addPassword(userId: UserId, messageId: MessageId, password: Password) {
        console.log("Adding password", password);
        this.data.passwords.push({ userId, messageId, password });
        this.saveToDisk();
    }

    public removePassword(messageId: MessageId) {
        console.log("Removing password with messageId", messageId);
        this.data.passwords = this.data.passwords.filter((password) => password.messageId !== messageId);
        this.saveToDisk();
    }

    public saveToDisk(): void {
        console.log("Saving to disk...");
        fs.writeFileSync(this.filePath, JSON.stringify(this.data));
    }

    public readFromDisk(): void {
        try {
            const a = fs.readFileSync(this.filePath, 'utf-8')
            const data: Schema = JSON.parse(a);

            console.log("Loaded from disk", data);

            if (data.version === 1) {
                this.data.channels = data.channels ?? [];
                this.data.users = data.users ?? {};
            } else if (data.version === 2) {
                this.data.channels = data.channels ?? [];
                this.data.showerChannels = data.showerChannels ?? [];
                this.data.users = data.users ?? {};
            } else if (data.version === 3) {
                this.data.channels = data.channels ?? [];
                this.data.showerChannels = data.showerChannels ?? [];
                this.data.users = data.users ?? {};
                this.data.passwords = data.passwords ?? [];
            } else {
                throw new Error("Unknown db file version.");
            }
        } catch (error) {
            console.error("Failed to open file, defaulting to initial values.", error);
        }
    }
}