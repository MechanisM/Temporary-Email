var express = require('express'),
    io = require('socket.io'),
    _ = require('underscore')._;

var redis = require("redis").createClient();

var app = module.exports = express.createServer();

var checked_email_list = {};

var fab_email_list = function(){
    return {
        messages: [],
        clients: [],
        getAllMessages: function(){
            return _.sortBy(this.messages, function(message){return message.created});
        },
        push_message: function(message) {
            this.messages.push(message);
            this.clients.forEach(function(client){
                client.send(message)
            })
        },
        delete_client: function(client) {
            this.clients = _.reject(this.clients, function(){
                return this.clients === client;
            })
        }
    };
};

redis.subscribe("new_email");
redis.on("message", function (channel, message) {
    console.log("redis channel " + channel + ": " + message);
    var parsed = JSON.parse(message);
    checked_email_list[parsed.to] && checked_email_list[parsed.to].push_message(parsed);
    console.log(checked_email_list)
});

app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.cookieDecoder());
    app.use(express.session({ secret: 'asdfwWds345ssde2' }));
    app.use(app.router);
    app.use(express.favicon(__dirname + '/public/favicon.ico'));
    app.use(express.staticProvider(__dirname + '/public'));
    app.use(express.logger());
    app.use(express.errorHandler());
});

app.dynamicHelpers({
    flash: function(req, res){
        return req.flash();
    }
});
app.helpers({
    title: "Temporary Email"
});

app.get('/', function(req, res){
    res.render('index');
});

app.get('/read/', function(req, res){
    var email = req.query && req.query.email;
    if (!email) {
        res.redirect('/');
        req.flash('info', 'Wrong email');
        return;
    }

    if (!checked_email_list[email]) {
        checked_email_list[email] = fab_email_list();
        setTimeout(function(){
            delete checked_email_list[email];
        }, 1000*60*60);
    }
    var result = checked_email_list[email].getAllMessages();
    console.log(result);
    res.render('mail', {
        locals: {
            title: email + " | Temporary Email",
            data: result,
            email: email
        }
    });
});

app.listen(8389);
console.log("Server listening on port %d", app.address().port);

var io = io.listen(app);
io.on('connection', function(client){
    var email;
    client.on('message', function(message){
        if (message.command == "start_listen"){
            email = message.email;
            checked_email_list[message.email].clients.push(client);
        }
    });
    client.on('disconnect', function(){
        checked_email_list[email] && checked_email_list[email].delete_client(client);
    });
});

function strip_tags (input, allowed) {
    // *     example 1: strip_tags('<p>Kevin</p> <b>van</b> <i>Zonneveld</i>', '<i><b>');
    // *     returns 1: 'Kevin <b>van</b> <i>Zonneveld</i>'
    // *     example 2: strip_tags('<p>Kevin <img src="someimage.png" onmouseover="someFunction()">van <i>Zonneveld</i></p>', '<p>');
    // *     returns 2: '<p>Kevin van Zonneveld</p>'
    // *     example 3: strip_tags("<a href='http://kevin.vanzonneveld.net'>Kevin van Zonneveld</a>", "<a>");
    // *     returns 3: '<a href='http://kevin.vanzonneveld.net'>Kevin van Zonneveld</a>'
    // *     example 4: strip_tags('1 < 5 5 > 1');
    // *     returns 4: '1 < 5 5 > 1'
    // *     example 5: strip_tags('1 <br/> 1');
    // *     returns 5: '1  1'
    // *     example 6: strip_tags('1 <br/> 1', '<br>');
    // *     returns 6: '1  1'
    // *     example 7: strip_tags('1 <br/> 1', '<br><br/>');
    // *     returns 7: '1 <br/> 1'
    allowed = (((allowed || "") + "").toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join(''); // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
    var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,
        commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;
    return input.replace(commentsAndPhpTags, '').replace(tags, function ($0, $1) {
        return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : '';
    });
}