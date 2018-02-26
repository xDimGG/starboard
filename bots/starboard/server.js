const app = require('express')();

app.use('/', (req, res) => res.send([
  'The site will be done soon™ (i\'m just working on the bot for now)!',
  'There\'s a support server where you can motivate me to finish the site <a href="https://discord.gg/MZCKAtF">here</a>.',
  'And the bot can be added using <a href="https://discordapp.com/oauth2/authorize?client_id=349626729226305537&scope=bot&permissions=8">this link</a>.',
].join('<br>')));

app.listen(8000);
