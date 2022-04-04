var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var path = require('path');

var app = express();

//CHANGE VARS

var mongooseName = process.env.MONGOUSER || "db";
var mongoosePass = process.env.MONGOPASS || "pass";
var mongooseHost = process.env.MONGOHOST || "localhost";
var mongoosePort = process.env.MONGOPORT || "35975";
var mongouri = process.env.MONGOURI || "mongodb://" + mongooseName + ":" + mongoosePass + "@" + mongooseHost + ":" + mongoosePort + "/dodskrok";
var defaultPORT = 3000;

/**
 * Connect to MongoDB.
 */
mongoose.connect(mongouri);
mongoose.connection.on('error', function() {
    console.log('MongoDB Connection Error. Please make sure that MongoDB is running.');
    process.exit(1);
});


/**
 * Express configuration.
 */
app.set('port', process.env.PORT || defaultPORT);
app.set('views', path.join(__dirname, 'views'));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: 31557600000
}));
app.use('/bower_components', express.static(__dirname + '/bower_components'));

var Schema = mongoose.Schema;

var profileSchema = new Schema({
    name: String,
    password: String,
    players: [{
        name: String,
    }],
    lists: [{
        title: String,
    }]
});
var Profile = mongoose.model('Profile', profileSchema);

app.get('/', function(req, res) {
    res.render('index');
});

app.get('/changelog', function(req, res) {
    res.render('changelog');
});

app.get('/profiles/search/:query', function(req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    var query = req.params.query;
    Profile.find({
        name: new RegExp(query, 'i')
    }, {
        password: 0
    }, function(err, doc) {
        res.json(doc);
    });

});

app.post('/profiles/save', function(req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    var profileName = req.body.name;
    var profilePass = req.body.password;
    var profilePlayers = req.body.players;
    var profileLists = req.body.lists;

    Profile.findOne({
            name: profileName
        },
        function(err, profile) {
            if (err) {
                res.json({
                    error: 'Error loading from db, try again later'
                });
            }
            if (profile) {
                if (profile.password !== profilePass) {
                    res.json({
                        'error': 'Profilnamnet är upptaget eller så har du skrivit in fel lösenord, försök igen'
                    });
                } else {
                    profile.update({
                        players: profilePlayers,
                        lists: profileLists
                    }, function(err, p) {
                        if (err) {
                            res.json({
                                'error': 'Fel när vi försökte uppdatera din profil'
                            });
                        } else {
                            res.json({
                                'success': 'ok'
                            });
                        }
                    });
                }
            } else {
                Profile.create({
                    name: profileName,
                    password: profilePass,
                    players: profilePlayers,
                    lists: profileLists
                }, function(err, newProfile) {
                    if (err) {
                        res.json({
                            'error': 'Fel när vi försökte skapa profilen, försök igen senare'
                        });
                    } else {
                        res.json({
                            'success': 'ok'
                        });
                    }
                });
            }
        });
});

app.listen(3000, function() {
    console.log('Example app listening on port 3000!');
});
