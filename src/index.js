import React from 'react';
import ReactDOM from 'react-dom';


import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.js';
import 'bootstrap/dist/js/bootstrap.bundle'
import './index.css';

import { GBLink } from './gblink.js';
import { GBWebsocket } from './gbwebsocket.js';
import { Lobby } from './lobby.js';
import { SelectGame } from './selectgame.js';
import { InGame } from './ingame.js';

global.jQuery = require('jquery');
require('bootstrap');

function buf2hex(buffer) { // buffer is an ArrayBuffer
  return [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join('');
}

class Players extends React.Component {
  constructor(props) {
    super(props);
  }


  render() {
    return <div className="container">
      <div className="row">
        {this.props.users.map((user, index) => (
          <div className="col-3">
            <h4>{user.name}</h4>
            <p>{user.level}!</p>
          </div>
        ))}
      </div>
    </div>
    
  }
}


// yes yes JS is sooo asynchronous, we get it, you vape
function sleep(ms) {
  var start = new Date().getTime(), expire = start + ms;
  while (new Date().getTime() < expire) { }
  return;
}

class OnlineTetris extends React.Component {
  SONG_A   = "1C"
  SONG_B   = "1D"
  SONG_C   = "1E"
  SONG_OFF = "1F"

  StateConnect = "Connect"; // Select USB device
  StateConnecting = "Connecting"; // Connect to USB device
  StateConnectingTetris = "ConnectingTetris"; // Attempt to connect to tetris
  StateSelectMusic = "SelectMusic";
  StateSelectHandicap = "SelectHandicap";
  StateJoiningGame = "JoiningGame";
  StateLobby = "Lobby";
  StateStartingGame = "StartingGame";
  StateJoinGame = "SelectJoinGame";
  StateInGame = "InGame";

  constructor(props) {
    super(props);
    this.state = {
      state: this.StateConnect,
      music: this.SONG_A,
      name: "Foo",
      game_code: "",
      users: [],
      options: {},
      level: 0,
      difficulty: 0,
      uuid: "",
      admin: false,
      games: []
    }
    this.gblink = new GBLink();
  }

  handleConnectClick() {
    this.gblink.init().then(() => {
      console.log("Usb connected, updating status.");
      this.setState({
        state: this.StateConnectingTetris
      });
      this.attemptTetrisConnection();
    }).catch(c => {
      console.log("CATTTCH");
      this.setState({
        state: this.StateConnect
      });
    });
  }

  updateLevel(level) {
    if(this.state.level !== level) {
      console.log("Level increased!");
      console.log(level);
      this.setState({
        level: level
      });
      this.gb.sendLevel(level);
    }
  }

  // This timer will run as soon as the music selection is started.
  // It will stop automatically when our state is not 'select music' anymore.
  startMusicTimer() {
    setTimeout(() => {
      console.log("Sending music")
      if(this.state.state === this.StateSelectMusic) {
        console.log("Music sent")
        this.gblink.sendMusic(this.state.music);
        this.startMusicTimer();
      } else {
        console.log("invalid state")
      }
    }, 100);
  }

  // Same as startMusicTimer, but will send a fake difficulty constantly and read it back.
  startHandicapTimer() {
    setTimeout(() => {
      console.log("Handicap timer");
      if(this.state.state === this.StateSelectHandicap) {
        console.log("Sending handicap");
        var selectedDifficulty = this.gblink.sendAndReadHandicap();
        console.log("Selected difficulty:");
        console.log(selectedDifficulty);
        this.setState({
          difficulty: selectedDifficulty
        })
        this.startHandicapTimer();
      } else {
        console.log("Invalid state, stopping handicap timer.");
      }
    }, 100);
  }

  startGameTimer() {
    setTimeout(() => {
      this.gblink.gameLoop().then(value => {
        if (value !== null) {
          if(value < 20) {
            this.updateLevel(value);
          } else if((value >= 0x80) && (value <= 0x85)) { // lines sent
            console.log("Sending lines!");
            this.gb.sendLines(0x83);
          }
          else if(value === 0xaa) { // we lost...
            this.setState({
              state: this.StateFinished
            });
            this.gb.sendDead();
          } else if(value === 0xFF) { //screen is filled after loss
            this.gblink.sendLossScreen();
          }
          
        }
        this.startGameTimer();
      })
    }, 100);
  }

  attemptTetrisConnection() {
    console.log("Attempt connection...");
    this.gblink.attemptTetrisConnection().then(connected => {
      if (connected) {
        console.log("SUCCESS!\n");
        this.setState({
          state: this.StateSelectMusic
        });
        this.startMusicTimer();
      } else {
        console.log("Fail");
        setTimeout(() => {
          this.attemptTetrisConnection();
        }, 100);
      }
    },
    error => {
      console.log("ERROR");
      console.log(error);
    });
  }

  handleMusicSelected() {
    this.gblink.sendMusicSelected();
    this.setState({
      state: this.StateSelectHandicap
    });
  }

  handleLobbyLoaded(name) {
    // Open websocket connection and list games
    console.log("Opening websocket");
    console.log(name);
    this.setState({
      name: name
    })
    this.gb = GBWebsocket.connect(name);
    // Callbacks
    this.gb.onconnected = (gb) => {
      // Connected. Poll games...
      this.pollLobby.bind(this)();
    }
    this.gb.onuserinfo = this.gbUserInfo.bind(this);
    this.gb.onlobbyinfoupdate = (gb) => {
      //console.log("Lobby update");
      //console.log(gb.games);
      this.setState({
        games: gb.games
      })
    }
  }

  pollLobby() {
    console.log("Polling games...");
    // Stop polling when leaving lobby screen
    if (this.state.state === this.StateSelectHandicap) {
      this.gb.sendListMessage();
      setTimeout(
        this.pollLobby.bind(this),
        5000
      );
    }
  }

  handleRename(name) {
    console.log("Rename player");
    console.log(name);
    this.setState({
      name: name
    })
    this.gb.sendRenameMessage(name);
  }

  handleCreateGame(options) {
    console.log("Create new game");
    console.log(options)
    this.setState({
      state: this.StateJoiningGame
    })
    this.setGbCallbacks();
    this.gb.sendCreateMessage(options);
  }

  handleJoinGame(game_code) {
    console.log("Join game");
    console.log(game_code);
    this.setState({
      state: this.StateJoiningGame,
      game_code: game_code
    })
    this.setGbCallbacks();
    this.gb.sendJoinMessage(game_code);
  }

  setGbCallbacks() {
    this.gb.ongamejoined = this.gbGameJoined.bind(this);
    this.gb.oninfoupdate = this.gbInfoUpdate.bind(this);
    this.gb.ongamestart = this.gbGameStart.bind(this);
    this.gb.ongameupdate = this.gbGameUpdate.bind(this);
    this.gb.ongameend = this.gbGameEnd.bind(this);
    this.gb.onuserinfo = this.gbUserInfo.bind(this);
    this.gb.onlines = this.gbLines.bind(this);
    this.gb.onwin = this.gbWin.bind(this);
  }

  testCreate() {
    console.log("testing websocket");
    this.gb = GBWebsocket.initiateGame(this.state.name);
    this.setGbCallbacks();
    this.setState({
      admin: true
    });
  }

  testJoin() {
    console.log("testing websocket");
    this.gb = GBWebsocket.joinGame(this.state.name, this.state.game_code);
    this.setGbCallbacks();
    this.setState({
      admin: false
    });
  }

  testUpdate() {
    var level = this.state.level;
    level += 1;
    this.setState({
      level: level
    });
    this.gb.sendLevel(level)
  }

  testStart() {
    this.gb.sendStart();
  }
  
  gbGameJoined(gb) {
    console.log("We're connected!");
    console.log(gb.users)
    this.setState({
      game_code: gb.game_name,
      users: gb.users,
      state: this.StateLobby
    });
  }

  gbGameStart(gb) {
    console.log(this);
    console.log("Got game start.")

    this.gblink.startGame(gb.tiles);
    
    // Wait 3 seconds and then start game
    setTimeout(() => {
      this.setState({
        state: this.StateInGame
      });
      this.startGameTimer();
    }, 2000)
    
  }

  gbGameUpdate(gb) {
    console.log("game update");
  }

  gbGameEnd(gb) {
    console.log("game end");
  }
  
  gbUserInfo(gb) {
    console.log("userinfo");
    this.setState({
      uuid: gb.uuid
    })
  }

  gbInfoUpdate(gb) {
    console.log(this);
    console.log("Got game update.")
    console.log(gb.users)
    console.log(gb.options)
    console.log(gb.admin)
    console.log(gb.admin === this.state.uuid)
    this.setState({
      game_code: gb.game_name,
      users: gb.users,
      options: gb.options,
      admin: (gb.admin === this.state.uuid)
    });
  }

  gbLines(gb, lines) {
    console.log("lines");
    this.gblink.sendLines(lines);
  }

  gbWin(gb) {
    console.log("WIN!");
    this.gblink.sendWin();
  }

  setMusic(music) {
    this.setState({
      music: music
    });
  }

  handleNameChanged(event) {
    this.setState({
      name: event.target.value
    })
  }


  handleGameCodeChanged(event) {
    this.setState({
      game_code: event.target.value
    })
  }

  handleStartGame() {
    console.log("Starting game!");
    this.gb.sendStart();
    this.setState({
      state: this.StateStartingGame
    });
  }

  render() {
    if (navigator.usb || this.gblink.mocking) {
      if (this.state.state === this.StateConnect) {
        return (

          <div className="connect">
            <img src={process.env.PUBLIC_URL + '/images/animation.gif'} className="gameboy" />
            <h2 className="cover-heading">Tetrilink</h2>
            <p className="lead">Connect your Game Boy, boot Tetris, and start playing with your friends!</p>
            <hr />
            <h4>Connect your Game Boy</h4>
            <p>Connect your Game Boy with the USB to Game Link adapter and click "connect".</p>
            <button onClick={(e) => this.handleConnectClick()} className="btn btn-lg btn-secondary">Connect</button>
            <br/>
            <small>Version: 0.2</small>
          </div>
        )
      } else if (this.state.state === this.StateConnecting) {
        return (
          <div className="connect">
            <h2>Connecting...</h2>
          </div>
        )

      } else if (this.state.state === this.StateConnectingTetris) {
        return (
          <div className="connect">
            <h2>Connecting to Tetris...</h2>
            <p>Ensure your Game Boy is turned on and in the Tetris main menu.</p>
          </div>
        )

      } else if (this.state.state === this.StateSelectMusic) {
        return (
          <div className="connect">
            <h2>Connection established!</h2>
            <h4>Choose your tunes:</h4>

            <button onClick={(e) => this.setMusic(this.SONG_A)} className="musicButton btn btn-lg btn-secondary">MUSIC A</button>
            <button onClick={(e) => this.setMusic(this.SONG_B)} className="musicButton btn btn-lg btn-secondary">MUSIC B</button><br/>
            <hr/>
            <button onClick={(e) => this.setMusic(this.SONG_C)} className="musicButton btn btn-lg btn-secondary">MUSIC C</button>
            <button onClick={(e) => this.setMusic(this.SONG_OFF)} className="musicButton btn btn-lg btn-secondary">MUSIC OFF</button><br/>
            <p>(Though obviously A is the best...)</p>
            <br/>
            <button onClick={(e) => this.handleMusicSelected()} className="btn btn-lg btn-secondary">Next</button>
          </div>
        )
      } else if(this.state.state === this.StateSelectHandicap) {
        return (
          <div className="connect">
            <SelectGame onLoaded={(name) => this.handleLobbyLoaded(name)} onCreateGame={(options) => this.handleCreateGame(options)} onJoinGame={(code) => this.handleJoinGame(code)} games={this.state.games} onNameChanged={(name) => this.handleRename(name)} />
          </div>)
      } else if(this.state.state === this.StateJoiningGame) {
        return(<div className="connect">
          <h2>Connecting to game server...</h2>
        </div>)
      } else if(this.state.state === this.StateLobby) {
        return(<div className="connect">
          {/* <h2>In lobby :)</h2> */}
          <Lobby game_code={this.state.game_code} users={this.state.users} uuid={this.state.uuid} admin={this.state.admin} options={this.state.options} onStartGame={() => this.handleStartGame()} />
        </div>)
      } else if(this.state.state === this.StateStartingGame) {
        return(<div className="connect">
          <h2>Starting game...</h2>
        </div>)

      } else if(this.state.state === this.StateInGame) {
        return(<div className="connect">

          <InGame game_code={this.state.game_code} users={this.state.users} uuid={this.state.uuid} admin={this.state.admin} />
        </div>)
        
      } else if(this.state.state === this.StateJoinGame) {
        return (
          <div className="connect">
            <h2>Select a username</h2>
            <input type="text" onChange={this.handleNameChanged.bind(this)} value={this.state.name} />
            <hr/>
            <h3>Join a game? Enter the game code here:</h3>
            <input type="text" onChange={this.handleGameCodeChanged.bind(this)} value={this.state.game_code} placeholder="Game code"/>
            <button onClick={(e) => this.testJoin()} className="btn btn-lg btn-secondary">Join game</button>
            <hr/>
            <button onClick={(e) => this.testCreate()} className="btn btn-lg btn-secondary">Create new game</button>
          </div>
        )
      } else if(this.state.state === this.StateFinished) {
        return (<div className="connect">
          <InGame game_code={this.state.game_code} users={this.state.users} admin={this.state.admin} uuid={this.state.uuid} />
            <h2>Game finished!</h2>
            {/* <p>Unfortunately you need to reboot your Game Boy and refresh the page to try again.</p>
            <p>This is because stacksmashing is freaking lazy.</p> */}
            </div>)
      } else {
        return (
          <div>Invalid state {this.state.state}</div>
        )
      }
    } else {
      return (
        <h2>Sorry, your browser does not support WebUSB!</h2>
      )
    }
  }
}

// ========================================

ReactDOM.render(
  <OnlineTetris />,
  document.getElementById('root')
);
