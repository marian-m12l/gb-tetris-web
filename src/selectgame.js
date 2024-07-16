import React from 'react';

class SelectGame extends React.Component {
    generateName() {
        var prefixes = [
            "Green",
            "Yellow",
            "Red",
            "Purple",
            "Blue",
            "Orange"
        ]
        var suffixes = [
            "I-Piece",
            "O-Piece",
            "T-Piece",
            "J-Piece",
            "L-Piece",
            "S-Piece",
            "Z-Piece"
        ]

        return prefixes[Math.floor(Math.random() * prefixes.length)] + " " + suffixes[Math.floor(Math.random() * suffixes.length)];
    }

    constructor(props) {
        super(props);
        let username = localStorage.getItem('name') || this.generateName()
        this.state = {
            name: username,
            game_code: "",
            options: {
                randomtype: localStorage.getItem('options.randomtype') || "classic",
                scope: localStorage.getItem('options.scope') || "public"
            }
        };
        props.onLoaded(username)
    }

    nameChangeTimeout = null;
    handleNameChanged(event) {
        // Update player name on server after debounce
        if (this.nameChangeTimeout !== null) {
            clearTimeout(this.nameChangeTimeout);
            this.nameChangeTimeout = null;
        }
        let new_name = event.target.value;
        localStorage.setItem('name', new_name);
        this.setState({
            name: new_name
        })
        this.nameChangeTimeout = setTimeout(() => {
            let new_name = event.target.value;
            // Regenerate random username / remove localStorage if field is empty
            if (new_name === '') {
                localStorage.removeItem('name');
                new_name = this.generateName();
                this.setState({
                    name: new_name
                })
            }
            console.log('Renamed to: ' + new_name)
            this.props.onNameChanged(new_name)
          }, 1000);
    }


    handleGameRandomisationChanged(value) {
        return (event) => {
            localStorage.setItem('options.randomtype', value);
            this.setState({
                options: {
                    ...this.state.options,
                    randomtype: value
                }
            })
        }
    }
    isClassicRandomisation() {
        return this.state.options.randomtype === 'classic';
    }
    isModernRandomisation() {
        return this.state.options.randomtype === 'modern';
    }


    handleGameScopeChanged(value) {
        return (event) => {
            localStorage.setItem('options.scope', value);
            this.setState({
                options: {
                    ...this.state.options,
                    scope: value
                }
            })
        }
    }
    isPublicScope() {
        return this.state.options.scope === 'public';
    }
    isPrivateScope() {
        return this.state.options.scope === 'private';
    }

    handleGameCodeChanged(event) {
        this.setState({
            game_code: event.target.value
        })
    }

    gamesInLobby() {
        return this.props.games.filter(game => game.status === 0)
    }
    gamesInProgress() {
        return this.props.games.filter(game => game.status === 1)
    }
    gamesFinished() {
        return this.props.games.filter(game => game.status === 2)
    }

    gameStatus(game) {
        switch (game.status) {
            case 0:
                return 'In lobby ⏳';
            case 1:
                return 'Started 🟢';
            case 2:
                return 'Finished 🏁';
        }
    }

    userStatus(user) {
        switch (user.state) {
            case 0:
                return 'Alive 🎮';
            case 1:
                return 'Dead 💀';
            case 2:
                return 'Winner 🏆';
        }
    }

    render() {
        return (

            <div className="connect">
                <h2>Select a username:</h2>
                <input type="text" className="form-control username-input" onChange={this.handleNameChanged.bind(this)} value={this.state.name} />
                <hr/>
                <div className="container">
                    <div className="row">
                        <div className="col-6">
                            <div className="card custom-card">
                                <div className="card-body">
                                    <div className="card-title">
                                        <h4>Create game</h4>
                                    </div>
                                    <div className="card-text">
                                        <div className="card-options">
                                            <h6>Randomisation:</h6>
                                            <div className="btn-group btn-group-toggle" data-toggle="buttons">
                                                <label className={`btn btn-dark ${ this.isClassicRandomisation() ? 'active' : '' }`}>
                                                    <input type="radio" name="randomisation" id="random-classic" autoComplete="off" checked={this.isClassicRandomisation()} onChange={this.handleGameRandomisationChanged("classic")}/> Classic
                                                </label>
                                                <label className={`btn btn-dark ${ this.isModernRandomisation() ? 'active' : '' }`}>
                                                    <input type="radio" name="randomisation" id="random-modern" autoComplete="off" checked={this.isModernRandomisation()} onChange={this.handleGameRandomisationChanged("modern")}/> Modern
                                                </label>
                                            </div>
                                            <h6>Scope:</h6>
                                            <div className="btn-group btn-group-toggle" data-toggle="buttons">
                                                <label className={`btn btn-dark ${ this.isPublicScope() ? 'active' : '' }`}>
                                                    <input type="radio" name="scope" id="scope-public" autoComplete="off" checked={this.isPublicScope()} onChange={this.handleGameScopeChanged("public")}/> Public
                                                </label>
                                                <label className={`btn btn-dark ${ this.isPrivateScope() ? 'active' : '' }`}>
                                                    <input type="radio" name="scope" id="scope-private" autoComplete="off" checked={this.isPrivateScope()} onChange={this.handleGameScopeChanged("private")}/> Private
                                                </label>
                                            </div>
                                        </div>
                                        <button onClick={(e) => this.props.onCreateGame(this.state.options)} className="btn btn-lg btn-secondary game-create-button">Create</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-6">
                            <div className="card custom-card">
                                <div className="card-body">
                                    <div className="card-title">
                                        <h4>Join game</h4>
                                    </div>
                                    <div className="card-text">
                                    <input type="text" className="form-control game-code-input" onChange={this.handleGameCodeChanged.bind(this)} value={this.state.game_code} placeholder="ABCDEF" />
                                        <button onClick={(e) => this.props.onJoinGame(this.state.game_code)} className="btn btn-lg btn-secondary">Join</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {this.gamesInLobby().length > 0 && 
                            <div className="col-12">
                                <div className="card custom-card">
                                    <div className="card-body">
                                        <div className="card-title">
                                            <h4>Games in lobby</h4>
                                        </div>
                                        <div className="card-text">
                                            <div className="container">
                                                {this.gamesInLobby().map(game => (
                                                    <div className="card-options row" key={game.name}>
                                                        <div className="col-3">{game.name}</div>
                                                        <div className="col-4">
                                                            <div className="container">
                                                                {game.users.map(u => (
                                                                    <div className="row" key={u.uuid}>
                                                                        <div className="col-6">{u.name}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="col-2">{game.options.randomtype}</div>
                                                        <div className="col-3"><button onClick={(e) => this.props.onJoinGame(game.name)} className="btn btn-lg btn-secondary">Join</button></div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        }
                        {this.gamesInProgress().length > 0 &&
                            <div className="col-12">
                                <div className="card custom-card">
                                    <div className="card-body">
                                        <div className="card-title">
                                            <h4>Games in progress</h4>
                                        </div>
                                        <div className="card-text">
                                            <div className="container">
                                                {this.gamesInProgress().map(game => (
                                                    <div className="card-options row" key={game.name}>
                                                        <div className="col-3">{game.name}</div>
                                                        <div className="col-7">
                                                            <div className="container">
                                                                {game.users.map(u => (
                                                                    <div className="row" key={u.uuid}>
                                                                        <div className="col-6">{u.name}</div>
                                                                        <div className="col-3">{this.userStatus(u)}</div>
                                                                        <div className="col-3">Level {u.level}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="col-2">{game.options.randomtype}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        }
                        {this.gamesFinished().length > 0 &&
                            <div className="col-12">
                                <div className="card custom-card">
                                    <div className="card-body">
                                        <div className="card-title">
                                            <h4>Finished games</h4>
                                        </div>
                                        <div className="card-text">
                                            <div className="container">
                                                {this.gamesFinished().map(game => (
                                                    <div className="card-options row" key={game.name}>
                                                        <div className="col-3">{game.name}</div>
                                                        <div className="col-7">
                                                            <div className="container">
                                                                {game.users.map(u => (
                                                                    <div className="row" key={u.uuid}>
                                                                        <div className="col-6">{u.name}</div>
                                                                        <div className="col-3">{this.userStatus(u)}</div>
                                                                        <div className="col-3">Level {u.level}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="col-2">{game.options.randomtype}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        }
                    </div>
                </div>
                <hr />
            </div>
        )
    }
}

export { SelectGame };
