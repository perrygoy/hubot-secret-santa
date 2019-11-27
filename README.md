hubot-secret-santa
==================

🎅🏻 Ho ho ho! This module allows you to run secret Santa events in your Slack!

    Perry: !santa start $50
    hubot: 🎅🏻 Ho ho ho! Santa's workshop is open to spread holiday cheer! You can join this secret Santa sortie by saying `!santa join [message]`, where `[message]` is a message to your Santa about what you might like to recieve!
    Katy: !santa join "I like socks!"
    hubot: 🎅🏻 Ho ho ho! You've been added to my list!

## Commands

* !santa start - starts a secret Santa round!
* !santa join [message] - joins the secret Santa event, with the provided message!
* !santa setmessage [message] - sets your message for the secret Santa event!
* !santa pair - pairs your secret Santa round (and closes joining)!
* !santa reopen - reopens the secret Santa round for more Santas to join! Only the initiator can do this.
* !santa - tells you some information about the current secret Santa. Gives different information in a direct message!
* !santa msg (recipient|santa) [msg] - (direct message only) sends the message to your recipient or santa through the bot!
* !santa end - ends the current secret Santa! The initiator can do this at any time, or some number of non-initiators can do it.

Uses hubot-brain to keep track of the secret santa round.

## Configuration

There is one configuration value, `HUBOT_SECRET_SANTA_VOTES_TO_END`. That's how many non-initiator users are required to say `!santa end` before the event will end. The default is 3. This is intended to be a failsafe in case the initiator leaves your Slack or is on vacation long enough that another user wants to start a new secret Santa event.

## Add it to your hubot!

Run the following command

    $ npm install hubot-secret-santa --save

Then add `hubot-secret-santa` to the `external-scripts.json` file (you may need to create this file).

    ["hubot-secret-santa"]
