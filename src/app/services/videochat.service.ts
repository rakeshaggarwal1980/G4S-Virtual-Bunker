import { connect, ConnectOptions, LocalTrack, Room } from 'twilio-video';
import { Client } from 'twilio-chat';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ReplaySubject, Observable } from 'rxjs';

interface AuthToken {
    token: string;
}

export interface NamedRoom {
    id: string;
    name: string;
    maxParticipants?: number;
    participantCount: number;
}

export type Rooms = NamedRoom[];

@Injectable({
    providedIn: 'root'
})
export class VideoChatService {
    $roomsUpdated: Observable<boolean>;

    private chatClient: Client;
    // A handle to the "general" chat channel - the one and only channel we
    // will have in this sample app
    private generalChannel;

    // The server will assign the client a random username - store that value
    // here
    private username: string;

    private roomBroadcast = new ReplaySubject<boolean>();

    constructor(private readonly http: HttpClient) {
        this.$roomsUpdated = this.roomBroadcast.asObservable();
    }

    private async getAuthToken(identity: string) {
        const auth =
            await this.http
                .get<AuthToken>(`api/video/token/` + identity)
                .toPromise();

        return auth.token;
    }

    getAllRooms() {
        return this.http
            .get<Rooms>('api/video/rooms')
            .toPromise();
    }

    async joinOrCreateRoom(name: string, tracks: LocalTrack[]) {
        let room: Room = null;
        try {
            const token = await this.getAuthToken(null);
            room =
                await connect(
                    token, {
                        name,
                        tracks,
                        dominantSpeaker: true
                    } as ConnectOptions);
        } catch (error) {
            console.error(`Unable to connect to Room: ${error.message}`);
        } finally {
            if (room) {
                this.roomBroadcast.next(true);
            }
        }

        return room;
    }

    async refreshToken(identity) {
        console.log('Token about to expire');
        console.log('updated token for chat client');
        const token = await this.getAuthToken(identity);

        this.chatClient.updateToken(token);
    }

    async createOrJoinGeneralChannel() {
        const ADJECTIVES = [
            'Abrasive', 'Brash', 'Callous', 'Daft', 'Eccentric', 'Fiesty', 'Golden',
            'Holy', 'Ignominious', 'Joltin', 'Killer', 'Luscious', 'Mushy', 'Nasty',
            'OldSchool', 'Pompous', 'Quiet', 'Rowdy', 'Sneaky', 'Tawdry',
            'Unique', 'Vivacious', 'Wicked', 'Xenophobic', 'Yawning', 'Zesty',
        ];
        const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
        let name = rand(ADJECTIVES);
        console.log('Joining channel as ' + name);

        try {
            const token = await this.getAuthToken(name);
            console.log('token generated');
            this.chatClient = await Client.create(token);
            console.log('created client');
            await this.chatClient.getSubscribedChannels();
            console.log('getSubscribedChannels success!');
            let channel = await this.chatClient.getChannelByUniqueName('general');
            console.log('getChannelByUniqueName success!');

            this.generalChannel = channel;
            if (this.generalChannel.channelState.status !== "joined") {
                await this.generalChannel.join();
            }
            console.log('Joined channel as ' + name);

            // when the access token is about to expire, refresh it
            this.chatClient.on('tokenAboutToExpire', function () {
                this.refreshToken(name);
            });

            // if the access token already expired, refresh it
            this.chatClient.on('tokenExpired', function () {
                this.refreshToken(name);
            });

        } catch (error) {
            console.error(`Unable to connect to Room: ${error.message}`);
        } finally {
            if (name) {
                this.roomBroadcast.next(true);
            }
        }
        return this.generalChannel;
    }

    nudge() {
        this.roomBroadcast.next(true);
    }
}