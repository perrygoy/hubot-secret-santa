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

    var getSecretSanta = () => {
        return robot.brain.data.secretsanta || {};
    };

    var save = secretSanta => {
        robot.brain.data.secretsanta = secretSanta;
        robot.brain.emit('save', robot.brain.data);
    };

    // public functions

    this.getSecretSanta = () => {
        const secretSanta = getSecretSanta();
        return Object.assign({}, secretSanta);
    };

    this.isSantasWorkshopOpen = () => {
        return typeof getSecretSanta().santaList !== 'undefined';
    };

    this.isPairingDone = () => {
        return typeof getSecretSanta().pairings !== 'undefined';
    };

    this.startSanta = (user, limit) => {
        if (this.isSantasWorkshopOpen()) {
            return false;
        }
        const secretSanta = {
            started: Date.now(),
            initiator: {
                id: user.id,
                name: user.name,
            },
            limit: limit,
            santaList: [],
        }
        save(secretSanta);
        return secretSanta;
    };

    this.addSanta = (user, message) => {
        if (!this.isSantasWorkshopOpen()) {
            return false;
        }
        let secretSanta = this.getSecretSanta();
        let santaIndex = secretSanta.findIndex(santa => santa.user.id == user.id)
        if (santaIndex > -1) {
            secretSanta.santaList[santaIndex].message = message;
        } else {
            secretSanta.santaList.push({
                user: {
                    id: user.id,
                    name: user.name,
                },
                message: message,
                joined: Date.now(),
            });
        }
        save(secretSanta);
        return secretSanta.santaList;
    };

    this.setMessage = (userId, message) => {
        if (!this.isSantasWorkshopOpen()) {
            return false;
        }
        let secretSanta = this.getSecretSanta();
        for (let santa of secretSanta.santaList) {
            if (santa.user.id == userId) {
                santa.message = message;
            }
        }
        save(secretSanta);
        return true;
    };

    this.pair = () => {
        let secretSanta = this.getSecretSanta();
        let santas = [...secretSanta.santaList];
        shuffle(santas);
        secretSanta.pairings = {};
        for (let i=0; i<santas.length; i++) {
            secretSanta.pairings[santas[i].user.id] = {
                recipient: santas[(i+1) % santas.length],
                santa: santas[i == 0 ? santas.length-1 : i-1]
            }
        }
        save(secretSanta);
        return secretSanta.pairings
    };

    this.reopen = userId => {
        let secretSanta = this.getSecretSanta();
        if (userId != secretSanta.initiator.id) {
            return false;
        }
        delete secretSanta.pairings;
        save(secretSanta);
        return secretSanta;
    };

    this.getPairedUser = (userId, type) => {
        if (!this.isPairingDone()) {
            return false;
        }
        if (!['recipient', 'santa'].includes(type)) {
            return false;
        }
        const secretSanta = this.getSecretSanta();
        const pairedId = secretSanta.pairings[userId][type].user.id;
        return secretSanta.santaList.filter(santa => santa.user.id == pairedId)[0];
    };

    this.addVoteToEnd = userId => {
        if (!this.isSantasWorkshopOpen()) {
            return false;
        }
        let secretSanta = this.getSecretSanta();
        if (typeof secretSanta.votesToEnd === 'undefined') {
            secretSanta.votesToEnd = [];
        }
        secretSanta.votesToEnd.push(userId);
        save(secretSanta);
    };

    this.closeSantasShop = () => {
        save({});
    };
};
