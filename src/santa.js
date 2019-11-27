// Description:
//    Start a Secret Santa round for your Slack channel! Once everyone has joined,
//    they'll be direct-messaged the person who they will be getting gifts for.
//    You can send messages to your recipient anonymously through the bot!
//
// Commands:
//   !santa start - starts a secret Santa round!
//   !santa join [message] - joins the secret Santa event, with the provided message!
//   !santa setmessage [message] - sets your message for the secret Santa event!
//   !santa pair - pairs your secret Santa round (and closes joining)!
//   !santa reopen - reopens the secret Santa round for more Santas to join! Only the initiator can do this.
//   !santa - tells you some information about the current secret Santa. Gives different information in a direct message!
//   !santa msg (recipient|santa) [msg] - (direct message only) sends the message to your recipient or santa through the bot!
//   !santa end - ends the current secret Santa! The initiator can do this at any time, or some number of non-initiators can do it.
//
// Author:
//   Perry Goy https://github.com/perrygoy


const SecretSantaMod = require('./mrsclaus');
const SANTAS_TO_END = process.env.HUBOT_SECRET_SANTA_VOTES_TO_END || 3;


function isDm(msg) {
    return msg.message.channel[0] == 'D';
}


module.exports = function(robot) {
    const MrsClaus = new SecretSantaMod(robot);

    // helpers

    messageUser = (userId, message) => {
        robot.messageRoom(userId, message);
    };

    messageInitiator = message => {
        if (!MrsClaus.isSantasWorkshopOpen()) {
            return;
        }
        const secretSanta = MrsClaus.getSecretSanta();
        messageUser(secretSanta.initiator.id, message);
    };

    getClosingMessage = secretSanta => {
        let message = ":santa: Ho ho ho! I hope everyone had a wonderful holiday, full of cheer and good will! Here are some stats about this secret Santa:\n\n";
        message += `    *Date Started:* ${new Date(secretSanta.started).toLocaleDateString()}\n`;
        message += `    *Initiator*: <@${secretSanta.initiator.id}>\n`;
        message += `    *Santas*: `;
        if (MrsClaus.isPairingDone()) {
            message += '\n';
            secretSanta.santaList.forEach(santa => {
                message += `        <@${santa.user.id}> :gift:=> <@${secretSanta.pairings[santa.user.id].recipient.user.id}>\n`
            });
        } else {
            message += secretSanta.santaList.map(santa => `<@${santa.user.id}>`).join(", ");
            message += '\n    ... but pairing did not happen.\n';
        }
        message += "\nUntil next year! Happy holidaaays!";
        return message;
    };

    // handlers

    this.dmDenial = msg => {
        msg.send(":santa: Ho ho ho! I can only do that in a direct message!");
    };

    this.handleUserSantaDetails = msg => {
        if (!MrsClaus.isSantasWorkshopOpen()) {
            msg.send(":santa: Ho ho ho! I don't have much to tell you; my workshop isn't open yet! If you want to start a secret Santa, you can say `!santa start [limit]`, where `[limit]` is the money limit for your Santas' gifts!");
            return;
        }
        const secretSanta = MrsClaus.getSecretSanta();
        let message = ":santa: Ho ho ho! Here's what I can tell you about this secret Santa:\n\n";
        if (!MrsClaus.isPairingDone()) {
            message += "... well, I can only tell you that ";
            if (typeof secretSanta.limit === 'undefined') {
                message += "there was no gift limit set. Ho ho ho!";
            } else {
                message += `the gift limit is ${secretSanta.limit}. Ho ho ho!`;
            }
        } else {
            const recipient = MrsClaus.getPairedUser(msg.message.user.id, 'recipient');
            message += `    *Gift Limit*: ${typeof secretSanta.limit === 'undefined' ? 'None!' : secretSanta.limit}\n`;
            message += `    *Your Recipient*: <@${recipient.user.id}>\n`;
            message += `    *Your Recipient's message*: ${typeof recipient.message === 'undefined' ? "... They didn't give one!" : recipient.message}`;
        }
        msg.send(message);
    };

    this.handleChannelSantaDetails = msg => {
        if (!MrsClaus.isSantasWorkshopOpen()) {
            msg.send(":santa: Ho ho ho! I don't have much to tell you; my workshop isn't open yet! If you want to start a secret Santa, you can say `!santa start [limit]`, where `[limit]` is the money limit for your Santas' gifts!");
            return;
        }
        const secretSanta = MrsClaus.getSecretSanta();
        let message = ":santa: Ho ho ho! Here's what I can tell you about this secret Santa:\n\n";
        message += `    *Initiated By*: ${secretSanta.initiator.name}\n`;
        message += `    *Initiated On*: ${new Date(secretSanta.started).toLocaleDateString()}\n`
        message += `    *Gift Limit*: ${typeof secretSanta.limit === 'undefined' ? 'None!' : secretSanta.limit}\n`;
        message += `    *Santas*: ${secretSanta.santaList.map(santa => santa.user.name).join(', ')}.\n\n`;
        if (!MrsClaus.isPairingDone()) {
            message += "If you're ready to begin pairing, you can say `!santa pair`! Otherwise, new Santas can join by saying `!santa join [message]`, where `[message]` is a message to their Santa!";
        } else {
            message += "You all have been paired with your gift recipients! If you can't remember who will be receiving your holiday cheer and good will, send `!santa` to me in a private message!";
        }
        msg.send(message);
    };

    this.handleStartSanta = (msg, limit) => {
        if (MrsClaus.isSantasWorkshopOpen()) {
            msg.send(':santa: Ho ho ho! My workshop is already open! You can start pairing by saying `!santa pair`.');
            return;
        }
        if (MrsClaus.isPairingDone()) {
            msg.send(":santa: Ho ho ho! My Santa squad is secretly sending their gifts to their recipients! If they've finished, you'll have to end this round with `!santa end` before starting a new one!");
            return;
        }
        MrsClaus.startSanta(msg.message.user, limit);
        msg.send(":santa: Ho ho ho! Santa's workshop is open to spread holiday cheer! You can join this secret Santa sortie by saying `!santa join [message]`, where `[message]` is a message to your Santa about what you might like to recieve!");
    };

    this.handleJoin = (msg, message) => {
        if (!MrsClaus.isSantasWorkshopOpen()) {
            msg.send(":santa: Ho ho ho! My workshop isn't currently open! You can start a new secret Santa by saying `!santa start`!");
            return;
        }
        const secretSanta = MrsClaus.getSecretSanta();
        if (MrsClaus.isPairingDone()) {
            msg.send(`:santa: Ho ho ho! I'm sorry little one, you missed out on this secret Santa; pairings have already gone out! You could try to get <@${secretSanta.initiator.id}> to re-open pairings if they say \`!santa reopen\`!`);
            messageInitiator(`:santa: Ho ho ho! It seems little <@${msg.message.user.id}> missed the cutoff and wants to join this secret Santa. If you'd like them to join, you can re-open pairings by saying \`!santa reopen\`!\n\n*This would mean all current pairings would be broken*, and you would need to say \`!santa pair\` again to re-pair all your Santas!`);
            return;
        }
        MrsClaus.addSanta(msg.message.user, message);
        msg.send(":santa: Ho ho ho! You've been added to my list!");
        if (typeof message === 'undefined') {
            messageUser(msg.message.user.id, ":santa: Ho ho ho! You did not include a message to your Santa when you joined!\n\nIf you think of a message to include for your Santa later, you can tell me to write it down using `!santa setmessage [message]`, where `[message]` is the text you want to include!");
        }
        messageInitiator(`:santa: Ho ho ho! <@${msg.message.user.id}> has joined your secret Santa! :christmas_tree:`);
    };

    this.handleSetMessage = (msg, message) => {
        if (!MrsClaus.isSantasWorkshopOpen()) {
            msg.send(":santa: Ho ho ho! My workshop isn't currently open! You can start a new secret Santa by saying `!santa start`!");
            return;
        }
        const secretSanta = MrsClaus.getSecretSanta();
        if (!secretSanta.santaList.forEach(santa => santa.user.id).contains(msg.message.user.id)) {
            msg.send(":santa: Ho ho ho! You haven't joined this secret Santa event yet! If you'd like to join, say `!santa join [message]`, where `[message]` is a message to your Santa!");
            return;
        }
        MrsClaus.setMessage(msg.message.user.id, message);
        msg.send(":santa: Ho ho ho! I've updated my list!");
        if (MrsClaus.isPairingDone()) {
            const pair = MrsClaus.getPairedUser(msg.message.user.id, 'santa');
            messageUser(pair.id, `:santa: Ho ho ho! Your recipient just updated their message! This is what they had to say:\n>${message}`);
        }
    };

    this.handlePairing = msg => {
        if (MrsClaus.isPairingDone()) {
            msg.send(":santa: Ho ho ho! I've already checked my list twice! If you need a reminder of who will be receiving your gift, send me `!santa` in a private message!");
            return;
        }
        MrsClaus.pair();
        const secretSanta = MrsClaus.getSecretSanta();
        secretSanta.santaList.forEach(santa => {
            const pair = secretSanta.pairings[santa.user.id];
            const message = `>>> ${pair.recipient.message}` || "... They did not leave you a message... you can reach out to them by saying `!santa msg recipient [message]`, where `[message]` is what you want me to tell them!";
            messageUser(santa.user.id, `:santa: Ho ho ho! Your lucky recipient is <@${pair.recipient.user.id}>! Their message was:\n\n${message}`);
        });
        msg.send(":santa: Ho ho ho! I've checked my list twice and told all my little helpers who will be receiving their gifts of holiday cheer. If you need any reminders of your recipient or their message, send me `!santa` in a private message!");
    }

    this.handleReopening = msg => {
        if (!MrsClaus.isPairingDone()) {
            msg.send(":santa: Ho ho ho! Santa's workshop hasn't closed yet! There is still time to join by saying `!santa join [message]`!");
            return;
        }
        const secretSanta = MrsClaus.getSecretSanta();
        if (msg.message.user.id != secretSanta.initiator.id) {
            msg.send(`:santa: Ho ho ho! You're not ${secretSanta.initiator.name}! Only they can reopen my workshop. You wouldn't want to be put on the naughty list, would you?`);
            messageInitiator(`:santa: Ho ho ho! <@${msg.message.user.id}> just tried to break in to my workshop! I think you should have a stern talk with them over some warm milk and cookies. :glass_of_milk::cookie:`);
            return;
        }
        secretSanta.santaList.forEach(santa => {
            messageUser(santa.user.id, `:santa: Ho ho ho! The initiator of the secret Santa has reopened the list! That means your recipient will be changing soon. Ask <@${secretSanta.initiator.id}> if you need any help!`);
        });
        MrsClaus.reopen(msg.message.user.id);
    };

    this.handleMsgUser = (msg, type, text) => {
        if (!MrsClaus.isPairingDone()) {
            msg.send(":santa: Ho ho ho! I haven't done the pairings yet! You can start pairing by saying `!santa pair`.");
            return;
        }
        const pair = MrsClaus.getPairedUser(sender, type);
        const message = `:santa: Ho ho ho! I have a message for you from your ${pair.type}! They said:\n>${text}`;
        messageUser(pair.id, message);
        msg.send(`:santa: Ho ho ho! Consider it delivered! I'll let you know if they reply!`);
    };

    this.handleEnd = msg => {
        if (!MrsClaus.isSantasWorkshopOpen()) {
            msg.send(":santa: Ho ho ho! My workshop is already closed!");
            return;
        }
        const secretSanta = MrsClaus.getSecretSanta();
        if (msg.message.user.id != secretSanta.initiator.id) {
            if (typeof secretSanta.votesToEnd === 'undefined' && SANTAS_TO_END > 1){
                msg.send(`:santa: Ho ho ho! While only ${secretSanta.initiator.name} can end the festivities outright, if ${SANTAS_TO_END} people all want to end this secret Santa, we'll be finished! Your vote has been counted, we just need ${SANTAS_TO_END - 1} more.`);
                MrsClaus.addVoteToEnd(msg.message.user.id);
                return;
            } else if (secretSanta.votesToEnd.contains(msg.message.user.id)) {
                msg.send(`:santa: Ho ho ho! I've checked my list, and you've already voted! You don't want to be added to the naughty list, do you?`);
                return;
            } else if (SANTAS_TO_END - secretSanta.votesToEnd.length - 1 > 0) {
                msg.send(`:santa: Ho ho ho! Another Santa's running out of holiday cheer! Just ${SANTAS_TO_END - secretSanta.votesToEnd.length - 1} more to go before this secret Santa closes shop!`);
                MrsClaus.addVoteToEnd(msg.message.user.id);
                return;
            } else {
                msg.send(`:santa: Ho ho ho! Time to clear out for the Easter Bunny. Closing up shop!`);
            }
        }
        MrsClaus.closeSantasShop();
        msg.send(getClosingMessage(secretSanta));
    };

    // responses

    robot.hear(/!santa$/i, msg => {
        if (isDm(msg)) {
            this.handleUserSantaDetails(msg);
        } else {
            this.handleChannelSantaDetails(msg);
        }
    });

    robot.hear(/!santa start(?: ([¢$£¥₽€₿]?[0-9]+))?/i, msg => {
        this.handleStartSanta(msg, msg.match[1]);
    });

    robot.hear(/!santa join(?: (.*))?/i, msg => {
        this.handleJoin(msg, msg.match[1]);
    });

    robot.hear(/!santa setmessage (.*)/i, msg => {
        this.handleSetMessage(msg, msg.match[1]);
    });

    robot.hear(/!santa pair$/i, msg => {
        this.handlePairing(msg);
    });

    robot.hear(/!santa reopen$/i, msg => {
        this.handleReopening(msg);
    });

    robot.hear(/^!santa msg.*/i, msg => {
        this.dmDenial(msg);
    });

    robot.respond(/!santa msg (recipient|santa) (.*)/i, msg => {
        if (!isDm(msg)) {
            this.dmDenial(msg);
            return;
        }
        this.handleMsgUser(msg, msg.match[1], msg.match[2]);
    });

    robot.hear(/!santa end/i, msg => {
        this.handleEnd(msg);
    });
};
