import { Component, OnInit, OnDestroy, EventEmitter, Output, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';
import { NamedRoom, VideoChatService } from '../services/videochat.service';

@Component({
  selector: 'app-rooms',
  template: `
    <div class="jumbotron">
        <h5 class="display-4"><i class="fas fa-video"></i> Rooms</h5>
        <div class="list-group">
            <div class="list-group-item d-flex justify-content-between align-items-center">
                <div class="input-group">
                    <input type="text" class="form-control form-control-lg"
                           placeholder="Room Name" aria-label="Room Name"
                           [(ngModel)]="roomName" (keydown.enter)="onTryAddRoom()">
                    <div class="input-group-append">
                        <button class="btn btn-lg btn-outline-secondary twitter-red"
                                type="button" [disabled]="!roomName"
                                (click)="onAddRoom(roomName)">
                            <i class="far fa-plus-square"></i> Create
                        </button>
                    </div>
                </div>
            </div>
            <div *ngIf="!rooms || !rooms.length" class="list-group-item d-flex justify-content-between align-items-center">
                <p class="lead">
                    Add a room to begin. Other online participants can join or create rooms.
                </p>
            </div>
            <a href="#" *ngFor="let room of rooms"
               (click)="onJoinRoom(room.name)" [ngClass]="{ 'active': activeRoomName === room.name }"
               class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                {{ room.name }}
                <span class="badge badge-primary badge-pill">
                    {{ room.participantCount }} / {{ room.maxParticipants }}
                </span>
            </a>
        </div>
    </div>
  `,
  styles: [
  ]
})

export class RoomsComponent implements OnInit, OnDestroy {
    @Output() roomChanged = new EventEmitter<string>();
    @Input() activeRoomName: string;

    roomName: string;
    rooms: NamedRoom[];

    private subscription: Subscription;

    constructor(
        private readonly videoChatService: VideoChatService) { }

    async ngOnInit() {
        await this.updateRooms();
        this.subscription =
            this.videoChatService
                .$roomsUpdated
                .pipe(tap(_ => this.updateRooms()))
                .subscribe();
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }

    onTryAddRoom() {
        if (this.roomName) {
            this.onAddRoom(this.roomName);
        }
    }

    onAddRoom(roomName: string) {
        this.roomName = null;
        this.roomChanged.emit(roomName);
    }

    onJoinRoom(roomName: string) {
        this.roomChanged.emit(roomName);
    }

    async updateRooms() {
        this.rooms = (await this.videoChatService.getAllRooms()) as NamedRoom[];
    }
}
