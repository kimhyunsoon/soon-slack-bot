pm2 start --name lunch ~/workspace/soon-slack-bot/lunch.js --watch
pm2 start --name stock ~/workspace/soon-slack-bot/stock.js --watch
pm2 monit