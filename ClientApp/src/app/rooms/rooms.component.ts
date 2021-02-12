import { Component, OnInit, OnDestroy, EventEmitter, Output, Input, ViewChild, ElementRef, Renderer2 } from '@angular/core';
import { Message } from 'twilio-chat/lib/Message';
import { Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';
import { NamedRoom, VideoChatService } from '../services/videochat.service';

@Component({
    selector: 'app-rooms',
    styleUrls: ['./rooms.component.css'],
    templateUrl: './rooms.component.html',
})
export class RoomsComponent implements OnInit, OnDestroy {
    @Output() roomChanged = new EventEmitter<string>();
    @Output() miceHandler = new EventEmitter<boolean>();
    @Output() videoHandler = new EventEmitter<boolean>();
    @Output() screenHandler = new EventEmitter<void>();
    @Input() activeRoomName: string;

    @ViewChild('messages', { static: false }) messagesElement: ElementRef;
    @ViewChild('chat-input', { static: false }) chatinputElement: ElementRef;
    private generalChannel;
    chatText: string;

    roomName: string;
    rooms: NamedRoom[];
    isEnableAudio: boolean = true;
    isEnableVideo: boolean = true;

    private subscription: Subscription;

    private messages: Message[] = [];

    constructor(
        private readonly videoChatService: VideoChatService, private renderer: Renderer2) {
    }

    async ngOnInit() {
        await this.updateRooms();
        this.subscription =
            this.videoChatService
                .$roomsUpdated
                .pipe(tap(_ => this.updateRooms()))
                .subscribe();

        this.generalChannel = await this.videoChatService.createOrJoinGeneralChannel();
        // Listen for new messages sent to the channel
        this.generalChannel.on('messageAdded', function (message) {

            //this.printMessage(message.author, message.body);
            
            var user = '<span class="username">' + message.author + '</span>';
            var usermessage = '<span class="message">' + message.body + '<span>';

            var container = document.createElement('div');
            var node = document.createTextNode(message.author + ': ' + message.body);
            container.appendChild(node);

            //var container = document.createElement('<div class="message-container">' + user + usermessage + '</div>');

            const root = document.getElementById('messages') as HTMLElement;

            root.appendChild(container);
        });
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

    onMiceHanlder() {
        this.isEnableAudio = !this.isEnableAudio;
        this.miceHandler.emit(this.isEnableAudio);
    }
    onVideoHanlder() {
        this.isEnableVideo = !this.isEnableVideo;
        this.videoHandler.emit(this.isEnableVideo);
    }

    onCaptureScreen() {
        this.screenHandler.emit();
    }


    // Helper function to print info messages to the chat window
    print(infoMessage, asHtml) {
        //var $msg = $('<div class="info">');
        //if (asHtml) {
        //    $msg.html(infoMessage);
        //} else {
        //    $msg.text(infoMessage);
        //}
        //$chatWindow.append($msg);

        this.renderer.appendChild(this.messagesElement, '<div class="info">' + infoMessage + '</div>');
    }

    // Helper function to print chat message to the chat window
    printMessage(fromUser, message) {
        
        var user = '<span class="username">' + fromUser + '</span>';

        //if (fromUser === username) {
        //    $user.addClass('me');
        //}

        var usermessage = '<span class="message">' + message + '<span>';

        //var $container = $('<div class="message-container">');
        //$container.append($user).append($message);

        this.renderer.appendChild(this.messagesElement, '<div class="message-container">' + user + usermessage + '</div>');
    
        //$chatWindow.append($container);
        //$chatWindow.scrollTop($chatWindow[0].scrollHeight);
    }

    async inputChat(chatText) {
        if (this.generalChannel === undefined) {
            console.log('The Chat Service is not configured. Please check your .env file.');
            return;
        }

        this.generalChannel.sendMessage(chatText);

        this.chatText = '';
    }
}

