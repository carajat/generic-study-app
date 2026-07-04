const fs = require('fs'); let c = fs.readFileSync('app.js', 'utf8'); c = c.split('\\').join('\'); fs.writeFileSync('app.js', c);
