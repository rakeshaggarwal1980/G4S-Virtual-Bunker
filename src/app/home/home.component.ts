import { Component, ViewChild, OnInit, Renderer2, ElementRef, AfterViewInit } from '@angular/core';
import { Room, LocalTrack, LocalVideoTrack, LocalAudioTrack, RemoteParticipant } from 'twilio-video';
import { Client } from 'twilio-chat';
import { RoomsComponent } from '../rooms/rooms.component';
import { CameraComponent } from '../camera/camera.component';
import { SettingsComponent } from '../settings/settings.component';
import { ParticipantsComponent } from '../participants/participants.component';
import { VideoChatService } from '../services/videochat.service';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';


@Component({
    selector: 'app-home',
    styleUrls: ['./home.component.css'],
    templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit, AfterViewInit {
    @ViewChild('rooms', { static: false }) rooms: RoomsComponent;
    @ViewChild('camera', { static: false }) camera: CameraComponent;
    @ViewChild('settings', { static: false }) settings: SettingsComponent;
    @ViewChild('participants', { static: false }) participants: ParticipantsComponent;

    @ViewChild('screenp', { static: false }) previewElement: ElementRef;

    activeRoom: Room;

    //screenTrack: LocalVideoTrack;
    private videoTrack: LocalVideoTrack;

    private notificationHub: HubConnection;
    private generalChannel;


    constructor(
        private readonly videoChatService: VideoChatService, private readonly renderer: Renderer2) { }

    async ngOnInit() {
        const builder =
            new HubConnectionBuilder()
                .configureLogging(LogLevel.Information)
              //  .withUrl(`${location.origin}/notificationHub`);
           .withUrl("https://localhost:44314/notificationHub");
        this.notificationHub = builder.build();
        this.notificationHub.on('RoomsUpdated', async updated => {
            if (updated) {
                await this.rooms.updateRooms();
            }
        });
        await this.notificationHub.start();
    }

    async ngAfterViewInit() {
        if (this.previewElement && this.previewElement.nativeElement) {
            //await this.initializeDevice();
        }
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

    handleTrackDisabled(track) {
        track.on('disabled', () => {
            /* Hide the associated <video> element and show an avatar image. */
        });
    }

    onVideoHanlder(isEnableVideo: boolean) {
        //this.activeRoom.participants.forEach(participant => {
        //    participant.tracks.forEach(publication => {
        //        if (publication.isSubscribed) {
        //            //handleTrackDisabled(publication.track);

        //            publication.track.on('disabled', () => {
        //                /* Hide the associated <video> element and show an avatar image. */
        //            });
        //        }

        //        publication.on('subscribed',
        //            function handleTrackDisabled(track) {
        //                track.on('disabled', () => {
        //                    /* Hide the associated <video> element and show an avatar image. */
        //                });
        //            }
        //        );
        //    });
        //});

        this.activeRoom.localParticipant.videoTracks.forEach(publication => {
            if (!isEnableVideo) {

                publication.track.enable(false);

                publication.track.stop();
                publication.unpublish();
                const attachedElements = publication.track.detach();
                attachedElements.forEach(element => element.remove());

            }
            else
                publication.track.enable();
        });

        //this.activeRoom.localParticipant.videoTracks.forEach(publication => {
        //    if (this.isDetachable(publication.track)) {

        //        this.activeRoom.localParticipant.unpublishTrack(publication.track);

        //        publication.track.stop();

        //        publication.unpublish();

        //        publication.track.disable();

        //        publication.track.detach().forEach(el => el.remove());


        //    }


        //publication.track.stop();
        //const attachedElements = publication.track.detach();
        //attachedElements.forEach(element => element.remove());
        //this.activeRoom.localParticipant.unpublishTrack(publication.track);

        //});

        //this.camera.removeVideo();
    }

    async captureScreen() {
        try {
            // Create and preview your local screen.
            this.videoTrack = await this.createScreenTrack(720, 1280);
            const videoElement = this.videoTrack.attach();

            this.activeRoom.localParticipant.publishTrack(this.videoTrack);

            //this.renderer.setStyle(videoElement, 'height', '80%');
            //this.renderer.setStyle(videoElement, 'width', '80%');
            //this.renderer.appendChild(this.previewElement.nativeElement, videoElement);

            // Show the "Capture Screen" button after screen capture stops.
            this.videoTrack.on('stopped', function () {

                alert('Stopped!!')

            });
            // Show the "Stop Capture Screen" button.
            //toggleButtons();
        } catch (e) {


            alert(e.message);
        }
    };

    /**
     * Create a LocalVideoTrack for your screen. You can then share it
     * with other Participants in the Room.
     * @param {number} height - Desired vertical resolution in pixels
     * @param {number} width - Desired horizontal resolution in pixels
     * @returns {Promise<LocalVideoTrack>}
     */
    createScreenTrack(height, width) {
        if (typeof navigator === 'undefined'
            || !navigator.mediaDevices) {
            return null;
        }
        // @ts-ignore
        return navigator.mediaDevices.getDisplayMedia({
            video: {
                height: height,
                width: width
            }
        }).then(function (stream) {
            return new LocalVideoTrack(stream.getVideoTracks()[0]);
        });
    }


    onMiceHanlder(isEnableAudio: boolean) {
        this.activeRoom.localParticipant.audioTracks.forEach(publication => {
            if (!isEnableAudio)
                publication.track.disable();
            else
                publication.track.enable();
        });
    }

    private registerRoomEvents() {
        this.activeRoom
            .on('disconnected', (room: Room) => {
                room.localParticipant.tracks.forEach(publication => this.detachLocalTrack(publication.track))
            })
            .on('participantConnected',
                (participant: RemoteParticipant) => { this.participants.add(participant) })
            .on('participantDisconnected',
                (participant: RemoteParticipant) => { this.participants.remove(participant) })
            .on('dominantSpeakerChanged',
                (dominantSpeaker: RemoteParticipant) => { this.participants.loudest(dominantSpeaker) });
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