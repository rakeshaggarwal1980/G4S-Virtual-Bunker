import { Component, ViewChild, OnInit } from '@angular/core';
import { Room, LocalTrack, LocalVideoTrack, LocalAudioTrack, RemoteParticipant } from 'twilio-video';
import { RoomsComponent } from '../rooms/rooms.component';
import { CameraComponent } from '../camera/camera.component';
import { SettingsComponent } from '../settings/settings.component';
import { ParticipantsComponent } from '../participants/participants.component';
import { VideoChatService } from '../services/videochat.service';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

@Component({
    selector: 'app-home',
    styleUrls: ['./home.component.css'],
  template: `
    <div class="grid-container">
        <div class="grid-bottom-right">
            <a href="https://twitter.com/davidpine7" target="_blank"><i class="fab fa-twitter"></i> @davidpine7</a>
        </div>
        <div class="grid-left">
            <app-rooms #rooms (roomChanged)="onRoomChanged($event)"
                       [activeRoomName]="!!activeRoom ? activeRoom.name : null"></app-rooms>
        </div>
        <div class="grid-content">
            <app-camera #camera [style.display]="!!activeRoom ? 'none' : 'block'"></app-camera>
            <app-participants #participants
                              (leaveRoom)="onLeaveRoom($event)"
                              (participantsChanged)="onParticipantsChanged($event)"
                              [style.display]="!!activeRoom ? 'block' : 'none'"
                              [activeRoomName]="!!activeRoom ? activeRoom.name : null"></app-participants>
        </div>
        <div class="grid-right">
            <app-settings #settings (settingsChanged)="onSettingsChanged($event)"></app-settings>
        </div>
        <div class="grid-top-left">
            <a href="https://www.twilio.com/video" target="_blank">
                Powered by Twilio
            </a>
        </div>
    </div>
  `,
  styles: [
  ]
})
export class HomeComponent implements OnInit {
    @ViewChild('rooms', { static: false }) rooms: RoomsComponent;
    @ViewChild('camera', { static: false }) camera: CameraComponent;
    @ViewChild('settings', { static: false }) settings: SettingsComponent;
    @ViewChild('participants', { static: false }) participants: ParticipantsComponent;

    activeRoom: Room;

    private notificationHub: HubConnection;

    constructor(
        private readonly videoChatService: VideoChatService) { }

    async ngOnInit() {
        const builder =
            new HubConnectionBuilder()
                .configureLogging(LogLevel.Information)
                .withUrl(`${location.origin}/notificationHub`);

        this.notificationHub = builder.build();
        this.notificationHub.on('RoomsUpdated', async updated => {
            if (updated) {
                await this.rooms.updateRooms();
            }
        });
        await this.notificationHub.start();
    }

    async onSettingsChanged(deviceInfo: MediaDeviceInfo) {
        await this.camera.initializePreview(deviceInfo);
    }

    async onLeaveRoom(_: boolean) {
        if (this.activeRoom) {
            this.activeRoom.disconnect();
            this.activeRoom = null;
        }

        this.camera.finalizePreview();
        const videoDevice = this.settings.hidePreviewCamera();
        this.camera.initializePreview(videoDevice);

        this.participants.clear();
    }

    async onRoomChanged(roomName: string) {
        if (roomName) {
            if (this.activeRoom) {
                this.activeRoom.disconnect();
            }

            this.camera.finalizePreview();
            const tracks = await this.settings.showPreviewCamera();

            this.activeRoom =
                await this.videoChatService
                    .joinOrCreateRoom(roomName, tracks);

            this.participants.initialize(this.activeRoom.participants);
            this.registerRoomEvents();

            this.notificationHub.send('RoomsUpdated', true);
        }
    }

    onParticipantsChanged(_: boolean) {
        this.videoChatService.nudge();
    }

    private registerRoomEvents() {
        this.activeRoom
            .on('disconnected',
                (room: Room) => room.localParticipant.tracks.forEach(publication => this.detachLocalTrack(publication.track)))
            .on('participantConnected',
                (participant: RemoteParticipant) => this.participants.add(participant))
            .on('participantDisconnected',
                (participant: RemoteParticipant) => this.participants.remove(participant))
            .on('dominantSpeakerChanged',
                (dominantSpeaker: RemoteParticipant) => this.participants.loudest(dominantSpeaker));
    }

    private detachLocalTrack(track: LocalTrack) {
        if (this.isDetachable(track)) {
            track.detach().forEach(el => el.remove());
        }
    }

    private isDetachable(track: LocalTrack): track is LocalAudioTrack | LocalVideoTrack {
        return !!track
            && ((track as LocalAudioTrack).detach !== undefined
                || (track as LocalVideoTrack).detach !== undefined);
    }
}