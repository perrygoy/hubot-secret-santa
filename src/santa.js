// Description:
//    Start a Secret Santa round for your Slack channel! Once everyone has joined,
//    they'll be direct-messaged the person who they will be getting gifts for.
//    You can send messages to your recipient anonymously through the bot!
//
// Commands:
//   !santa start - starts a secret Santa round!
//   !santa join [message]
//   !santa pair - pairs your secret Santa round (and closes joining)!
//   !santa reopen - reopens the secret Santa round for more Santas to join! Only the initiator can do this.
//   !santa - tells you some information about the current secret Santa. Gives different information in a direct message!
//   !santa msg (recipient|santa) [msg] - (direct message only) sends the message to your recipient or santa through the bot!
//   !santa end - ends the current secret Santa! The initiator can do this at any time, or some number of non-initiators can do it.
//
// Author:
//   Perry Goy https://github.com/perrygoy


const SecretSantaMod = require('./secretsanta');
const SANTAS_TO_END = process.env.HUBOT_SECRET_SANTA_VOTES_TO_END || 3;


function isDm(msg) {
    return msg.message.channel[0] == 'D';
}


module.exports = function(robot) {
    const NiceList = new SecretSantaMod(robot);

    // helpers

    messageUser = (userId, message) => {
        robot.messageRoom(userId, message);
    };

    messageInitiator = message => {
        if (!NiceList.isSantasWorkshopOpen()) {
            return;
        }
        const initiator = NiceList.getInitiator();
        messageUser(initiator.id, message);
    };

    getClosingMessage = santa => {
        let message = ":santa: Ho ho ho! I hope everyone had a wonderful holiday, full of cheer and good will! Here are some stats about this secret Santa:\n\n";
        message += `*Date Started:* ${new Date(santa.started).toLocaleDateString()}\n`;
        message += `*Initiator*: <@${santa.initiator.id}>\n`;
        message += `*Santas*: `;
        if (NiceList.isPairingDone()) {
            message += '\n';
            santa.userList.forEach(user => {
                message += `    <@${user.id}> :gift:=> <@${santa.pairings[user.id].recipient.id}>\n`
            });
        } else {
            message += santa.userList.forEach(user => `<@${user.id}>`).join(", ");
            message += '\n    ... but pairing did not happen.\n';
        }
        message += "\nUntil next year! Happy holidaaays!";
        return message;
    }

    // handlers

    this.dmDenial = msg => {
        msg.send(":santa: Ho ho ho! I can only do that in a direct message!");
    }

    this.handleUserSantaDetails = msg => {
        if (!NiceList.isSantasWorkshopOpen()) {
            msg.send(":santa: Ho ho ho! I don't have much to tell you; my workshop isn't open yet! If you want to start a secret Santa, you can say `!santa start [limit]`, where `[limit]` is the money limit for your Santas' gifts!");
            return;
        }
        const santa = NiceList.getSanta();
        let message = ":santa: Ho ho ho! Here's what I can tell you about this secret Santa:\n\n";
        if (!NiceList.isPairingDone()) {
            message += "... well, I can only tell you that ";
            if (santa.limit === 'undefined') {
                message += "there was no gift limit set. Ho ho ho!";
            } else {
                message += `the gift limit is ${santa.limit}. Ho ho ho!`;
            }
        } else {
            const recipient = NiceList.getPairedUser(msg.message.user.id, 'recipient');
            message += `    *Gift Limit*: ${santa.limit === 'undefined' ? 'None!' : santa.limit}\n`;
            message += `    *Your Recipient*: <@${recipient.id}>\n`;
            message += `    *Your Recipient's message*: ${recipient.message === 'undefined' ? "... They didn't give one!" : recipient.message}`;
        }
        msg.send(message);
    };

    this.handleChannelSantaDetails = msg => {
        if (!NiceList.isSantasWorkshopOpen()) {
            msg.send(":santa: Ho ho ho! I don't have much to tell you; my workshop isn't open yet! If you want to start a secret Santa, you can say `!santa start [limit]`, where `[limit]` is the money limit for your Santas' gifts!");
            return;
        }
        const santa = NiceList.getSanta();
        let message = ":santa: Ho ho ho! Here's what I can tell you about this secret Santa:\n\n";
        message += `    *Initiated By*: ${santa.initiator.name}\n`;
        message += `    *Initiated On*: ${new Date(santa.started).toLocaleDateString()}\n`
        message += `    *Gift Limit*: ${santa.limit === 'undefined' ? 'None!' : santa.limit}\n`;
        message += `    *Santas*: ${santa.userList.map(user => user.name).join(', ')}.\n\n`;
        if (!NiceList.isPairingDone()) {
            message += "If you're ready to begin pairing, you can say `!santa pair`! Otherwise, new Santas can join by saying `!santa join [message]`, where `[message]` is a message to their Santa!";
        } else {
            message += "You all have been paired with your gift recipients! If you can't remember who will be receiving your holiday cheer and good will, send `!santa` to me in a private message!";
        }
        msg.send(message);
    };

    this.handleStartSanta = (msg, limit) => {
        if (NiceList.isSantasWorkshopOpen()) {
            msg.send(':santa: Ho ho ho! My workshop is already open! You can start pairing by saying `!santa pair`.');
            return;
        }
        if (NiceList.isPairingDone()) {
            msg.send(":santa: Ho ho ho! My Santa squad is secretly sending their gifts to their recipients! If they've finished, you'll have to end this round with `!santa end` before starting a new one!");
            return;
        }
        NiceList.startSanta(msg.message.user, limit);
        msg.send(":santa: Ho ho ho! Santa's workshop is open to spread holiday cheer! You can join this secret Santa sortie by saying `!santa join [message]`, where `[message]` is a message to your Santa about what you might like to recieve! You can also send ");
    }

    this.handleJoin = (msg, message) => {
        if (!NiceList.isSantasWorkshopOpen()) {
            msg.send(":santa: Ho ho ho! My workshop isn't currently open! You can start a new secret Santa by saying `!santa start`!");
            return;
        }
        const santa = NiceList.getSanta();
        if (NiceList.isPairingDone()) {
            msg.send(`:santa: Ho ho ho! I'm sorry little one, you missed out on this secret Santa; pairings have already gone out! You could try to get <@${santa.initiator.id}> to re-open pairings if they say \`!santa reopen\`!`);
            messageInitiator(`:santa: Ho ho ho! It seems little <@${msg.message.user.id}> missed the cutoff and wants to join this secret Santa. If you'd like them to join, you can re-open pairings by saying \`!santa reopen\`!\n\n*This would mean all current pairings would be broken*, and you would need to say \`!santa pair\` again to re-pair all your Santas!`);
            return;
        }
        NiceList.addSanta(msg.message.user, message);
        let response = ":santa: Ho ho ho! You've been added to my list!";
        if (santa.limit !== 'undefined') {
            response += " There was no monetary limit set for this secret Santa! :moneybag::present::moneybag:";
        } else {
            response += ` The limit for this secret Santa is ${santa.limit}!`;
        }
        if (message === 'undefined') {
            response += "\nHowever, you did not include a message to your Santa!\n\nIf you think of a message to include for your Santa later, you can tell me to write it down using `!santa setmessage [message]`, where `[message]` is the text you want to include!";
        }
        msg.send(response);
        messageInitiator(`:santa: Ho ho ho! <@${@msg.message.user.id}> has joined your secret Santa! :christmas_tree:`);
    }

    this.handlePairing = msg => {
        if (NiceList.isPairingDone()) {
            msg.send(":santa: Ho ho ho! I've already checked my list twice! If you need a reminder of who will be receiving your gift, send me `!santa` in a private message!");
            return;
        }
        NiceList.pair();
        const santa = NiceList.getSanta();
        santa.userList.forEach(user => {
            const pair = santa.pairings[user.id];
            const message = `>>> ${pair.recipientMessage}` || "... They did not leave you a message... you can reach out to them by saying `!santa msg recipient [message]`, where `[message]` is what you want me to tell them!";
            messageUser(user.id, `:santa: Ho ho ho! Your lucky recipient is <@${pair.recipient.id}>! Their message was:\n\n${message}`);
        });
        msg.send(":santa: Ho ho ho! I've checked my list twice and told all my little helpers who will be receiving their gifts of holiday cheer. If you need any reminders of your recipient or their message, send me `!santa` in a private message!");
    }

    this.handleReopening = msg => {
        if (!NiceList.isPairingDone()) {
            msg.send(":santa: Ho ho ho! Santa's workshop hasn't closed yet! There is still time to join by saying `!santa join [message]`!");
            return;
        }
        const santa = NiceList.getSanta();
        if (msg.message.user.id != santa.initiator.id) {
            msg.send(`:santa: Ho ho ho! You're not ${santa.initiator.name}! Only they can reopen my workshop. You wouldn't want to be put on the naughty list, would you?`);
            messageInitiator(`:santa: Ho ho ho! <@${msg.message.user.id}> just tried to break in to my workshop! I think you should have a stern talk with them over some warm milk and cookies. :glass_of_milk::cookie:`);
            return;
        }
        santa.userList.forEach(user => {
            messageUser(user.id, `:santa: Ho ho ho! The initiator of the secret Santa has reopened the list! That means your recipient will be changing soon. Ask <@${santa.initiator.id}> if you need any help!`);
        });
        NiceList.reopen(msg.message.user.id);
    }

    this.handleMsgUser = (msg, type, text) => {
        if (!NiceList.isPairingDone()) {
            msg.send(":santa: Ho ho ho! I haven't done the pairings yet! You can start pairing by saying `!santa pair`.");
            return;
        }
        const pair = NiceList.getPairedUser(sender, type);
        const message = `:santa: Ho ho ho! I have a message for you from your ${pair.type}! They said:\n>${text}`;
        messageUser(pair.id, message);
        msg.send(`:santa: Ho ho ho! Consider it delivered! I'll let you know if they reply!`);
    };

    this.handleEnd = msg => {
        const santa = NiceList.getSanta();
        if (!NiceList.isSantasWorkshopOpen()) {
            msg.send(":santa: Ho ho ho! My workshop is already closed!");
            return;
        }
        const santa = NiceList.getSanta();
        if (msg.message.user.id != santa.initiator.id) {
            if (santa.votesToEnd === 'undefined' && SANTAS_TO_END > 1){
                msg.send(`:santa: Ho ho ho! While only ${santa.initiator.name} can end the festivities outright, if ${SANTAS_TO_END} people all want to end this secret Santa, we'll be finished! Your vote has been counted, we just need ${SANTAS_TO_END - 1} more.`);
                return;
            } else if (santa.votesToEnd.contains(msg.message.user.id)) {
                msg.send(`:santa: Ho ho ho! I've checked my list, and you've already voted! You don't want to be added to the naughty list, do you?`);
                return;
            } else if (santa.votesToEnd.length - SANTAS_TO_END > 0) {
                msg.send(`:santa: Ho ho ho! Another Santa's running out of holiday cheer! Just ${SANTAS_TO_END - santa.votesToEnd.length} more to go before this secret Santa closes shop!`);
                return;
            } else {
                msg.send(`:santa: Ho ho ho! Time to clear out for the Easter Bunny. Closing up shop!`);
            }
        }
        msg.send(getClosingMessage(santa));
        NiceList.closeSantasShop();
    };

    // responses

    robot.hear(/!santa$/i, msg => {
        if (isDm(msg)) {
            this.handleUserSantaDetails(msg);
        } else {
            this.handleChannelSantaDetails(msg);
        }
    });

    robot.hear(/!santa start(?: ([¢$£¥₽€₿]?[0-9]+)?)$/i, msg => {
        this.handleStartSanta(msg, msg.match[1]);
    });

    robot.hear(/!santa join(?: (.*))?$/i, msg => {
        this.handleJoin(msg, msg.match[1]);
    });

    robot.hear(/!santa pair$/i, msg => {
        this.handlePairing(msg);
    });

    robot.hear(/!santa reopen$/i, msg => {
        this.handleReopening(msg);
    });

    robot.hear(/^!santa msg.*$/i, msg => {
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
