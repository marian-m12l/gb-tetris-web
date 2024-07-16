import React from 'react';

import {Player} from './player.js';

class InGame extends React.Component {
    // Needs to be in sync with server
    STATE_ALIVE = 0
    STATE_DEAD = 1
    STATE_WINNER = 2

    render() {
        return (
            <div>
                <h2>In Game: {this.props.game_code}</h2>
                <div className="container">
                    <div className="row justify-content-center">
                            {this.props.users.map((user, index) => (
                                <Player key={`lobby-${user.uuid}`} user={user} current={user.uuid === this.props.uuid} />
                        ))}
                    </div>
                </div>
            </div>
        )
    }
}

export { InGame };
