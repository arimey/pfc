import * as mediasoupClient from 'mediasoup-client';
//import React from 'react';
//import ReactDOM from 'react-dom';

class mediasoup {
    constructor(socket, idRoom) {
        this.transportSocket = socket;
        this.userType = $("#userType").val();
        this.transportSocket.emit("startMediasoup", idRoom);
        this.stream = new MediaStream();
        this.consumers = new Map();
        this.peers = new Map();
        this.audioProducer = null;
        this.videoPRoducer = null;
        this.audioSent = false;
        this.mediaDevices = {audio: false, video: false};
        this.room = new mediasoupClient.Room(
            {
                requestTimeout : 12000
            });


        this.room.on("request", (request, callback, errback) => {
            this.transportSocket.emit("mediasoupRoomRequest", { peer: this.name, body: request }, (response) => {
                callback(response);
            });
        });

        this.room.on("notify", (notification) => {
            this.transportSocket.emit("mediasoupRoomNotification", { peer: this.name, body: notification });
        });

        this.room.on("newpeer", (peer) => {
            this.handlePeer(peer);
        });

        this.transportSocket.on("peerNotification", (notification) => {
            this.room.receiveNotification(notification);
        });

        this.transportSocket.on("activeProducer", () => {
            if (this.userType === "Profesor") {
                if (this.mediaDevices.audio === true) {
                    if (this.audioSent) {
                        this.audioProducer.resume();
                    }
                    else {
                        this.sendMyStream(this.audioProducer, this.sendTransport);
                        this.audioSent = true;
                    }
                }
                if (this.mediaDevices.video === true) {
                    if (this.videoSent) {
                        this.videoProducer.resume();
                    }
                    else {
                        this.sendMyStream(this.videoProducer, this.sendTransport);
                        this.videoProducer = true;
                    }
                }
            }
            else {
                if (this.mediaDevices.audio === true) {
                    //this.audioProducer.resume();
                    if (this.audioSent) {
                        this.audioProducer.resume();
                    }
                    else {
                        this.sendMyStream(this.audioProducer, this.sendTransport);
                        this.audioSent = true;
                    }
                }
            }
        });

        this.transportSocket.on("desactiveProducer", () => {
            if (this.userType === "Profesor") {
                if (this.mediaDevices.audio === true) {
                    if (this.audioSent) {
                        this.audioProducer.pause();
                    }
                }
            }
            else {
                if (this.mediaDevices.audio === true) {
                    if (this.audioSent) {
                        this.audioProducer.pause();
                    }
                }
            }
        });

        this.room.on("close", () => {
            this.transportSocket.emit("peerLeaving", this.name);
        });



    }

    //Join to the room Server
    //Get devices to stream
    //Create producers
    join() {
        this.name = $("#userName").val();
        this.room.join(this.name)
            .then((peers) => {
                this.recvTransport = this.room.createTransport('recv');
                this.sendTransport = this.room.createTransport('send');
                this.sendTransport.on("stats", (stats) => {
                    console.log("StatsIceSend: " + stats);
                });
                this.sendTransport.on("close", (originator) => {
                    console.log("Closed by: " + originator);
                });
                this.sendTransport.on("connectionstatechange", (connectionstate) => {
                    console.log("SendState: " + connectionstate);
                    if (connectionstate == "connected") {
                    //    this.audioProducer.resume();
                    }
                });
                this.recvTransport.on("stats", (stats) => {
                    console.log("StatsIceRecv: " + stats);
                });
                this.recvTransport.on("close", (originator) => {
                    console.log("Closed by: " + originator);
                });
                this.recvTransport.on("connectionstatechange", (connectionstate) => {
                    console.log("RecvState: " + connectionstate);
                    if (connectionstate == "connected") {
                        //this.audioProducer.resume();
                    }
                });

                for (var peer of peers) {
                    //console.log("PEER");
                    //console.log(peer);

                    this.handlePeer(peer);
                }
            })
            .then(() => {
                return navigator.mediaDevices.enumerateDevices();
            })
            .then((devices) => {
                let mediaDevices = {audio: false, video: false};
                devices.forEach((device) => {
                    if (device.kind == "audioinput") {
                        mediaDevices.audio = true;
                    } else if (device.kind == "videoinput") {
                        mediaDevices.video = true;
                    }
                });
                return mediaDevices;
            })
            .then((mediaDevices) => {
                this.mediaDevices = mediaDevices;
                return navigator.mediaDevices.getUserMedia(mediaDevices);
            })
            .then((stream) => {
                if (this.mediaDevices.audio == true) {
                    var audioTrack = stream.getAudioTracks()[0];
                    this.audioProducer = this.room.createProducer(audioTrack);
                    //this.sendMyStream(this.audioProducer, this.sendTransport);
                    //this.audioProducer.pause();
                }

                if (this.mediaDevices.video == true) {
                    var videoTrack = stream.getVideoTracks()[0];
                    this.videoProducer = this.room.createProducer(videoTrack);
                    //this.sendMyStream(this.videoProducer, this.sendTransport);
                    //this.videoProducer.pause();
                }
            });
        }

        sendMyStream(producer, transport) {
            producer.on("trackended", () => {
                console.log("Termino el track");
            });
            producer.on("handled", () => {
                console.log("transport given to this producer");
            });
            producer.on("stats", (stats) => {
                console.log(stats);
            });
            if (!this.room.canSend('audio')) {
                console.log("CANT SEND AUDIO");
            }
            else {
                producer.send(transport)
                    .then(() => {
                        console.log("sending our stream");
                    })
                    .catch((e) => {
                        console.log(e);
                    })
            }

        }

        quit() {
            this.room.leave();
            /*for (var producer of this.room.producers) {
                producer.close();
            }
            for (var transport of this.room.transports) {
                transport.close();
            }*/
        }

        handlePeer(peer) {
            for (var consumer of peer.consumers) {
                console.log("CONSuMER LIST1");
                console.log(consumer.peer.name);
                this.handleConsumer(consumer);
            }
            //if (peer.name != this.name) {
            peer.on("newconsumer", (consumer) => {
                console.log("CONSuMER EVENT2");
                console.log(consumer.peer.name);
                this.handleConsumer(consumer);
            });
            //}
            peer.on("close", () => {
                console.log("Peer closed");
            });
        }

        handleConsumer(consumer) {
            consumer.receive(this.recvTransport)
            .then((track) => {
                console.log(track);
                let video = document.querySelector('#mediasoupVideo');
                //let audio = new Audio();
                let stream = new MediaStream();
                stream.addTrack(track);
                video.src = window.URL.createObjectURL(stream);
                video.play();
            })
            .catch((error) => {
                console.log(error);
            })
            consumer.on("pause", (originator) => {
                console.log("Paused by: " + originator);
            });
            consumer.on("close", () => {
                console.log("Consumer closed")
            });
        }
}

module.exports = mediasoup;
