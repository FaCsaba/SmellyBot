import fs from "node:fs";
import path from "path";

export type ChannelId = string;
export type UserId = string;
export type User = { id: UserId, count: number };

export type Schema = {
    version: 1;
    channels: ChannelId[],
    users: Record<UserId, User>;
}

export class DB {
    public data: Schema = { version: 1, channels: [], users: {} };

    constructor(public filePath: string, public readonly flushToStorageMs: number = 1000 * 60 * 60) {
        this.readFromDisk();
        if (!fs.existsSync(filePath)) {
            const dirname = path.dirname(filePath)   
            fs.mkdirSync(dirname, { recursive: true });
        }
        setInterval(() => this.saveToDisk(), flushToStorageMs);
    }

    public addChannel(channel: ChannelId) {
        console.log("Adding channel", channel);
        if (!(channel in this.data.channels)) this.data.channels.push(channel);
        this.saveToDisk();
    }

    public removeChannel(channel: ChannelId) {
        console.log("Removing channel", channel);
        this.data.channels = this.data.channels.filter(ch => ch != channel);
    }

    public addOrUpdateUser(user: User) {
        console.log("Adding user", user);
        this.data.users[user.id] = user;
        this.saveToDisk();
    }

    public saveToDisk(): void {
        console.log("Saving to disk...");
        fs.writeFileSync(this.filePath, JSON.stringify(this.data));
    }

    public readFromDisk(): void {
        try {
            const a = fs.readFileSync(this.filePath, 'utf-8')
            this.data = JSON.parse(a);
            console.log("Loaded from disk", this.data);
        } catch (error) {
            console.error("Failed to open file, defaulting to initial values.", error);
        }
    }
}