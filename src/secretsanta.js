// Description
//   SecretSanta module
//   Stores, retrieves, modifies, and deletes secret santas for hubot.


/**
 * Shuffles array in place. ES6 version
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}


module.exports = function(robot) {
    // private functions

    var getSanta = () => {
        return robot.brain.data.secretsanta || {};
    };

    var save = secretSanta => {
        robot.brain.data.secretsanta = secretSanta;
        robot.brain.emit('save', robot.brain.data);
    };

    // public functions

    this.getSanta = () => {
        const santa = getSanta();
        return Object.assign({}, santa);
    };

    this.isSantasWorkshopOpen = () => {
        return getSanta().userList !== 'undefined';
    };

    this.isPairingDone = () => {
        return getSanta().pairings !== 'undefined';
    };

    this.startSanta = (user, limit) => {
        if (this.isSantasWorkshopOpen()) {
            return false;
        }
        const santa = {
            started: Date.now(),
            initiator: {
                id: user.id,
                name: user.name,
            },
            limit: limit,
            userList: [],
        }
        save(santa);
        return santa;
    };

    this.addSanta = (user, message) => {
        if (!this.isSantasWorkshopOpen()) {
            return false;
        }
        let santa = this.getSanta();
        santa.userList.append({
            user: {
                id: user.id,
                name: user.name,
            },
            message: message,
            joined: Date.now();
        });
        save(santa);
        return santa.userList;
    }

    this.pair = () => {
        let santa = this.getSanta();
        let users = [...santa.userList];
        shuffle(users);
        santa.pairings = {};
        for (let i=0; i<users.length; i++) {
            santa.pairings[users[i]] = {
                recipient: users[(i+1) % users.length],
                santa: users[i == 0 ? users.length-1 : i-1]
            }
        }
        save(santa);
        return santa.pairings
    };

    this.reopen = userId => {
        let santa = this.getSanta();
        if (userId != santa.initiator.id) {
            return false;
        }
        delete santa.pairings;
        save(santa);
        return santa;
    }

    this.getPairedUser = (userId, type) => {
        if (!this.isPairingDone()) {
            return false;
        }
        if (!['recipient', 'santa'].contains(type)]) {
            return false;
        }
        let santa = this.getSanta();
        return santa.pairings[userId][type];
    };

    this.closeSantasShop = () => {
        save({});
    }
};
