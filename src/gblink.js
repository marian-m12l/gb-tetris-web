import { Serial } from './serial.js';

class GBLink {
    
    constructor() {
        if (process.env.REACT_APP_MOCK_ADAPTER) {
            console.log("Mocking USB adapter")
            this.mocking = true;
        } else {
            console.log("Using USB adapter")
            this.mocking = false;
            this.serial = new Serial();
        }
    }

    init() {
        if (this.mocking) {
            return new Promise((resolve) => resolve(true));
        } else {
            return this.serial.getDevice().then(() => true);
        }
    }

    attemptTetrisConnection() {
        if (this.mocking) {
            return new Promise((resolve) => resolve(true));
        } else {
            this.serial.sendHex("29");
            return this.serial.readHex(64).then(result => (result === "55"));
        }
    }

    sendMusic(music) {
        if (!this.mocking) {
            this.serial.sendHex(music);
            this.serial.read(64);
        }
    }

    sendAndReadHandicap() {
        if (this.mocking) {
            return 1;
        } else {
            // Just send a fake handicap
            this.serial.sendHex("00");
            return this.serial.read(1)[0];
        }
    }

    gameLoop() {
        if (this.mocking) {
            return new Promise((resolve) => resolve(4));    // Level 4
        } else {
            this.serial.bufSendHex("02", 10); // fixed level
            var data = this.serial.read(64).then( result => {
                var data = result.data.buffer;
                if(data.length > 1) {
                    console.log("Data too long");
                    console.log(data.length);
                    // We ignore if we still have old data in the buffer.
                    return null;
                } else {
                    return (new Uint8Array(data))[0];
                }
            })
        }
    }

    sendLossScreen() {
        if (!this.mocking) {
            this.serial.bufSendHex("43", 10);
        }
    }

    sendMusicSelected() {
        if (!this.mocking) {
            this.serial.sendHex("50");
            this.serial.read(64);
        }
    }

    startGame(tiles) {
        if (!this.mocking) {
            // step 1: start game message
            this.serial.bufSendHex("60", 150);
            // step 2: Send master indication
            this.serial.bufSendHex("29", 4);

            console.log("Sending unknown bytes");
            // step 3: send 100 unknown bytes
            for(var i=0; i < 100; i++) {
                this.serial.bufSendHex("83", 4);
            }

            // step 4: send master again
            this.serial.bufSendHex("29", 8);
            console.log("Sending tiles");
            // step 5: send tiles
            for(var i=0; i < tiles.length; i++) {
                this.serial.bufSend(new Uint8Array([tiles[i]]), 4);
                // this.serial.read(64);
                // sleep(3);
            }

            // step 6: and go
            this.serial.bufSendHex("30", 70);
            this.serial.bufSendHex("00", 70);
            this.serial.bufSendHex("02", 70);
            this.serial.bufSendHex("02", 70);
            this.serial.bufSendHex("20", 70);
        }
    }

    sendLines(lines) {
        if (!this.mocking) {
            this.serial.bufSend(new Uint8Array([lines]), 10);
        }
    }

    sendWin() {
        if (!this.mocking) {
            this.serial.bufSendHex("AA", 50); // aa indicates BAR FULL
            this.serial.bufSendHex("02", 50); // ffffinish
            this.serial.bufSendHex("02", 50); // ffffinish
            this.serial.bufSendHex("02", 50); // ffffinish
            this.serial.bufSendHex("43", 50); // go to final screen. nice.
        }
    }

}

export { GBLink };
