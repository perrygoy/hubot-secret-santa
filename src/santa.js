// Description:
//    Start a Secret Santa round for your Slack channel! Once everyone has joined,
//    they'll be direct-messaged the person who they will be getting gifts for.
//    You can send messages to your recipient anonymously through the bot!
//
// Commands:
//   !santa start - starts a secret Santa round!
//   !santa join [message] - joins the secret Santa event, with the provided message!
//   !santa setmessage [message] - sets your message for the secret Santa event!
//   !santa match - matches your secret Santa round (and closes joining)!
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
    return msg.message.room[0] == 'D';
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
        if (typeof secretSanta.pairings !== 'undefined') {
            message += '\n';
            secretSanta.santaList.forEach(santa => {
                message += `        <@${santa.user.id}> :gift:=> <@${secretSanta.pairings[santa.user.id].recipient.user.id}>\n`
            });
        } else {
            message += secretSanta.santaList.map(santa => `<@${santa.user.id}>`).join(", ");
            message += '\n    ... but matching did not happen.\n';
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
            message += "If you're ready to begin matching, you can say `!santa match`! Otherwise, new Santas can join by saying `!santa join [message]`, where `[message]` is a message to their Santa!";
        } else {
            message += "You all have been matched with your gift recipients! If you can't remember who will be receiving your holiday cheer and good will, send `!santa` to me in a private message!";
        }
        msg.send(message);
    };

    this.handleStartSanta = (msg, limit) => {
        if (MrsClaus.isSantasWorkshopOpen()) {
            msg.send(':santa: Ho ho ho! My workshop is already open! You can start matching by saying `!santa match`.');
            return;
        }
        if (MrsClaus.isPairingDone()) {
            msg.send(":santa: Ho ho ho! My Santa squad is secretly sending their gifts to their recipients! If they've finished, you'll have to end this round with `!santa end` before starting a new one!");
            return;
        }
        MrsClaus.startSanta(msg.message.user, limit);
        msg.send(":santa: Ho ho ho! Santa's workshop is open to spread holiday cheer! You can join this secret Santa sortie by saying `!santa join [message]`, where `[message]` is a message to your Santa about what you might like to recieve!");
    };

    this.handleSetLimit = (msg, limit) => {
        if (!MrsClaus.isSantasWorkshopOpen()) {
            msg.send(":santa: Ho ho ho! I can't set a limit if my workshop isn't open! You can set the limit when you start a secret Santa by saying `!santa start [limit]`!");
            return;
        }
        const secretSanta = MrsClaus.getSecretSanta();
        if (msg.message.user.id != secretSanta.initiator.id) {
            msg.send(`:santa: Ho ho ho! You're not ${secretSanta.initiator.name}! Only they can change the limit for this event. You wouldn't want to be put on the naughty list, would you?`);
            messageInitiator(`:santa: Ho ho ho! <@${msg.message.user.id}> just tried to change your event's limit to ${limit}! I think you should have a stern talk with them over some warm milk and cookies. :glass_of_milk::cookie:`);
            return;
        }
        MrsClaus.setLimit(msg.message.user.id, limit);
        secretSanta.santaList.forEach(santa => {
            messageUser(santa.user.id, `:santa: Ho ho ho! The initiator of the secret Santa has updated the monetary limit! The new limit is ${limit}. Ask <@${secretSanta.initiator.id}> if you need any help!`);
        });
        msg.send(":santa: Ho ho ho! I've updated the limit and let all the Santas who have already joined know!");
    }

    this.handleJoin = (msg, message) => {
        if (!MrsClaus.isSantasWorkshopOpen()) {
            msg.send(":santa: Ho ho ho! My workshop isn't currently open! You can start a new secret Santa by saying `!santa start`!");
            return;
        }
        const secretSanta = MrsClaus.getSecretSanta();
        if (MrsClaus.isPairingDone()) {
            msg.send(`:santa: Ho ho ho! I'm sorry little one, you missed out on this secret Santa; matches have already gone out! You could try to get <@${secretSanta.initiator.id}> to re-open matches if they say \`!santa reopen\`!`);
            messageInitiator(`:santa: Ho ho ho! It seems little <@${msg.message.user.id}> missed the cutoff and wants to join this secret Santa. If you'd like them to join, you can re-open matches by saying \`!santa reopen\`!\n\n*This would mean all current matches would be broken*, and you would need to say \`!santa match\` again to re-match all your Santas!`);
            return;
        }
        const onlyUpdatedMessage = MrsClaus.isSantaJoined(msg.message.user.id);
        MrsClaus.addSanta(msg.message.user, message);
        if (onlyUpdatedMessage) {
            msg.send(":santa: Ho ho ho! You've already joined, but I've updated your message for you. If you want to update your message in the future, it's easier to say `!santa setmessage [message]`, where `[message]` is what you want to say!");
            return;
        }
        msg.send(":santa: Ho ho ho! You've been added to my list!");
        if (typeof message === 'undefined') {
            messageUser(msg.message.user.id, ":santa: Ho ho ho! You did not include a message to your Santa when you joined!\n\nIf you think of a message to include for your Santa later, you can tell me to write it down using `!santa setmessage [message]`, where `[message]` is the text you want to include!");
        }
        if (msg.message.user.id != secretSanta.initiator.id) {
            messageInitiator(`:santa: Ho ho ho! <@${msg.message.user.id}> has joined your secret Santa! :christmas_tree:`);
        }
    };

    this.handleSetMessage = (msg, message) => {
        if (!MrsClaus.isSantasWorkshopOpen()) {
            msg.send(":santa: Ho ho ho! My workshop isn't currently open! You can start a new secret Santa by saying `!santa start`!");
            return;
        }
        const secretSanta = MrsClaus.getSecretSanta();
        if (!secretSanta.santaList.map(santa => santa.user.id).includes(msg.message.user.id)) {
            msg.send(":santa: Ho ho ho! You haven't joined this secret Santa event yet! If you'd like to join, say `!santa join [message]`, where `[message]` is a message to your Santa!");
            return;
        }
        MrsClaus.setMessage(msg.message.user.id, message);
        msg.send(":santa: Ho ho ho! I've updated my list!");
        if (MrsClaus.isPairingDone()) {
            const match = MrsClaus.getPairedUser(msg.message.user.id, 'santa');
            messageUser(match.id, `:santa: Ho ho ho! Your recipient just updated their message! This is what they had to say:\n>${message}`);
        }
    };

    this.handleMatching = msg => {
        if (!MrsClaus.isSantasWorkshopOpen()) {
            msg.send(":santa: Ho ho ho! My workshop isn't open yet, we're not ready to do matches! You can start a new secret Santa by saying `!santa start`!");
            return;
        }
        if (MrsClaus.isPairingDone()) {
            msg.send(":santa: Ho ho ho! I've already checked my list twice! If you need a reminder of who will be receiving your gift, send me `!santa` in a private message!");
            return;
        }
        const initiator = MrsClaus.getInitiator()
        if (msg.message.user.id != initiator.id) {
            msg.send(`:santa: Ho ho ho! You're not ${initiator.name}! Only they can initiate matching. Remember, patience is a virtue! Ho ho ho!`);
            messageInitiator(`:santa: Ho ho ho! <@${msg.message.user.id}> just tried to initiate matching! You may want to have a little talk with them about the virtues of patience. :wink:`);
            return;
        }
        MrsClaus.pair();
        const secretSanta = MrsClaus.getSecretSanta();
        secretSanta.santaList.forEach(santa => {
            const match = secretSanta.pairings[santa.user.id];
            const message = `>>> ${match.recipient.message}` || "... They did not leave you a message... you can reach out to them by saying `!santa msg recipient [message]`, where `[message]` is what you want me to tell them!";
            messageUser(santa.user.id, `:santa: Ho ho ho! Your lucky recipient is <@${match.recipient.user.id}>! Their message was:\n\n${message}`);
        });
        msg.send(":santa: Ho ho ho! I've checked my list twice and told all my little helpers who will be receiving their gifts of holiday cheer. If you need any reminders of your recipient or their message, send me `!santa` in a private message!");
    }

    this.handleReopening = msg => {
        if (!MrsClaus.isSantasWorkshopOpen()) {
            msg.send(":santa: Ho ho ho! Can't reopen a workshop that hasn't yet been opened! You can start a new secret Santa by saying `!santa start`!");
            return;
        }
        if (!MrsClaus.isPairingDone()) {
            msg.send(":santa: Ho ho ho! Santa's workshop hasn't closed yet! There is still time to join by saying `!santa join [message]`!");
            return;
        }
        const secretSanta = MrsClaus.getSecretSanta();
        if (msg.message.user.id != secretSanta.initiator.id) {
            msg.send(`:santa: Ho ho ho! You're not ${secretSanta.initiator.name}! Only they can reopen my workshop. If you reach out to them, they might be willing to extend a little Christmas cheer, just for you!`);
            messageInitiator(`:santa: Ho ho ho! <@${msg.message.user.id}> just tried to break in to my workshop! They must be bursting with Christmas cheer! If you want to let them in, you can break the current matches with \`!santa reopen\` and let them join. You'll have to do \`!santa match\` again later, though!`);
            return;
        }
        secretSanta.santaList.forEach(santa => {
            messageUser(santa.user.id, `:santa: Ho ho ho! The initiator of the secret Santa has reopened the list! That means your recipient will be changing soon. Ask <@${secretSanta.initiator.id}> if you need any help!`);
        });
        MrsClaus.reopen(msg.message.user.id);
        msg.send(":santa: Ho ho ho! My workshop is opened once again! I've messaged all the Santas to let them know. When you're ready to match again, just say `!santa match`!")
    };

    this.handleMsgUser = (msg, type, text) => {
        if (!MrsClaus.isSantasWorkshopOpen()) {
            msg.send(":santa: Ho ho ho! Not only have matches not been done, my workshop isn't even open! You can start a new secret Santa by saying `!santa start`!");
            return;
        }
        if (!MrsClaus.isPairingDone()) {
            msg.send(":santa: Ho ho ho! I haven't done the matches yet! You can start matching by saying `!santa match`.");
            return;
        }
        const match = MrsClaus.getPairedUser(msg.message.user.id, type);
        const reverseType = type == 'recipient' ? 'santa' : 'recipient';
        const message = `:santa: Ho ho ho! I have a message for you from your ${reverseType}! They said:\n>${text}\n\nIf you'd like to reply, say \`!santa msg ${reverseType} [message]\`, where \`[message]\` is what you'd like to say back!`;
        messageUser(match.user.id, message);
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
            } else if (secretSanta.votesToEnd.includes(msg.message.user.id)) {
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

    robot.hear(/!santa setlimit ([¢$£¥₽€₿]?[0-9]+)/i, msg => {
        this.handleSetLimit(msg, msg.match[1]);
    });

    robot.hear(/!santa join(?: (.*))?/i, msg => {
        this.handleJoin(msg, msg.match[1]);
    });

    robot.hear(/!santa setmessage (.*)/i, msg => {
        this.handleSetMessage(msg, msg.match[1]);
    });

    robot.hear(/!santa (pair|match|hunt)$/i, msg => {
        this.handleMatching(msg);
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
