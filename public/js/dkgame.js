var app = angular.module('dk', ['ngAudio']);

const STABEN = ["General", "BarWerk", "Fadderansvarig", "Spons", "Karaktär", "Kassör", "Tryck", "BokningsWerk", "Nollegrupp & Fadderkul", "Mat & Sittning", "Webb & Info"];
const DGROUP = ["Chief", "Ca$h", "Öl & Bar", "Webb & ÖD", "Werk", "Biljett & U-Lag", "Pr & Event", "Spons", "J^8", "Trykk", "Mat & Sittning", "Pr & Personal"];
const DONNA = ["PrimaDonna", "Kassör", "Spons", "PR & Info", "Mat & Sittning", "Gückel & Aktivitet", "Dekor & Intendent", "Bokning & Event", "Webb & Tryck"];
const STYRET = ["Ordförande", "Kassör", "Vice Ordförande", "Sekreterare", "UtbO", "Aktivitetshanterare", "AMO", "Ledamot"];

app.controller('MenuCtrl', function($scope, $rootScope, $http) {
    $scope.model = {};
    $scope.loadedProfiles = [];
	$scope.defaultProfiles = ['STABEN', 'D-Group', 'Donna', 'Styret', 'Snabbt äventyr'];
    $scope.isLoading = false;
    $scope.$watch('model.search', function(query) {
        if (query) {
            $scope.isLoading = true;
            $http.get('/profiles/search/' + query).success(function(result) {
                $scope.loadedProfiles = result;
            }).error(function(err) {
                console.log(err);
            }).finally(function() {
                $scope.isLoading = false;
            });
        }
    });

    $scope.loadProfile = function(profile) {
        $scope.model.search = profile.name;
        $rootScope.$broadcast('load-profile', profile);
    };

    $scope.profile = function(name) {
        $rootScope.$broadcast('profile', name);
    };

});

app.controller('ChangelogCtrl', function($scope, $rootScope) {

    $scope.changelogs = [
	{
        "version": "3.1.1",
        "changes": [
			{
                "description": "Uppdaterat startprofilen (STABEN)"
            }, 
			{
                "description": "Lagt till några fler standardprofiler"
            },

        ]
    }, 
	{
        "version": "3.1.0",
        "changes": [
			{
                "description": "Kan nu spara profiler"
            },
			{
                "description": "Fixat problem med divar och annat"
            },

        ]
    }, 
	{
        "version": "3.0.2",
        "changes": [
			{
                "description": "La till flames i bakgrunden, kan gömmas i inställningar."
            },

        ]
    }, 
	{
        "version": "3.0.1",
        "changes": [
		{
            "description": "La till profiler (maila ante@dödskrök.se för att få er tillagd)"
        }, 
		{
            "description": "La till Changelog"
        }, 
		{
            "description": "La till versionnummer på spelet"
        }, 
		]
	}, 
	{
        "version": "3.0.0",
        "changes": [{
            "description": "Ny design"
        }, {
            "description": "Uppdaterade slumpgeneratorn till pilar från att färglägga list elementen."
        }, {
            "description": "La till så man kan gömma menyn"
        }, {
            "description": "Countdown timer tills nästa runda, visar hur lång tid det är tills nästa som minsta samt största. Tiden visas fortfarande inte tills nästa runda börjar."
        }, ]
    }];

});


app.controller('DkCtrl', function($scope, $http, $interval, $timeout, ngAudio, $rootScope) {
    var AUDIO_LENGTH = 21000;
    var chromecastAdmin = null;
    $scope.chromecastMode = false;
    $scope.round = 0;
    $scope.playing = false;
    $scope.sound = ngAudio.load("dkSprit.wav");
    $scope.lists = [];
    $scope.model = {};
    $scope.players = [];
    $scope.popup = {};
    $scope.startMin = 1;
    $scope.startMax = 4;
    $scope.popup.show = false;
    $scope.timeSinceLastRound = 0;
    $scope.hideMenu = false;
    setup();
    clock();

    $scope.startGame = function() {
        $scope.playing = true;
        $scope.sound.play();

        var stopPlayers = [];
        angular.forEach($scope.lists, function(list) {
            list.index = Math.floor(Math.random() * $scope.players.length);
            var stopIndex = getStopPlayerIndex(stopPlayers);
            stopPlayers.push(stopIndex);
            list.index = stopIndex;
            var timeoutTimePerJump = AUDIO_LENGTH / (Math.round(AUDIO_LENGTH / (randomTime(1500, 2500) / 1000)) * $scope.players.length);
            rollList(list, stopIndex, timeoutTimePerJump);
        });

        var checkMusic = $interval(function() {
            if (finishedPlaying()) {
                $scope.playing = false;
                $scope.round += 1;
                $interval.cancel(checkMusic);
                randomizeNextRound();
            }
        }, 100);
    };

    var getStopPlayerIndex = function(stopArr) {
        var randomPlayer = Math.floor(Math.random() * $scope.players.length);
        if (stopArr.indexOf(randomPlayer) >= 0 && $scope.players.length > $scope.lists.length) {
            return getStopPlayerIndex(stopArr);
        }
        return randomPlayer;
    };

    function clock() {
        $interval(function() {
            $scope.timeSinceLastRound += 1000;
        }, 1000);
    }

    $scope.saveProfile = function() {
        var data = {
            name: $scope.model.profileName,
            password: $scope.model.profilePass,
            players: $scope.players,
            lists: $scope.lists
        };

        $http.post('profiles/save', data).success(function(res) {
            if (res.error) {
                $scope.savingError = res.error;
            } else {
                $scope.closePopup();
            }
        }).error(function(err) {
            console.error(err);
        });
    };

    $scope.selected = function(index, listIndex) {
        if ($scope.playing)
            return;
        if (index == $scope.lists[listIndex].index)
            return 'active';
    };

    $scope.getMinTimeLeft = function() {
        var time = $scope.startMin * 60 - ($scope.timeSinceLastRound / 1000);
        if (time < 0) {
            return 0;
        }
        return time;
    };

    $scope.getMaxTimeLeft = function() {
        var time = $scope.startMax * 60 - ($scope.timeSinceLastRound / 1000);
        if (time < 0) {
            return 0;
        }
        return time;
    };

    $scope.removePlayer = function(playerIndex) {
        $scope.players.splice(playerIndex, 1);
    };
    $scope.removeList = function(listIndex) {
        $scope.lists.splice(listIndex, 1);
    };

    $scope.addPlayerBox = function() {
        $rootScope.blackout = true;
        $scope.popup.show = true;
        $scope.popup.type = 'new-player';
    };
    $scope.newListItem = function() {
        if ($scope.listitem !== "" && $scope.listitem !== undefined) {
            $scope.lists.push({
                'title': $scope.listitem,
                'index': -1
            });
            $scope.listitem = "";
        }
    };

    $scope.newPlayer = function() {
        if ($scope.playername !== "" && $scope.playername !== undefined) {
            $scope.players.push({
                'name': $scope.playername
            });
            $scope.playername = "";
        }
        $scope.closePopup();
    };

    $scope.showPopupHelp = function() {
        $rootScope.blackout = true;
        $scope.popup.show = true;
        $scope.popup.type = 'help';
    };
    $scope.showSettings = function() {
        $rootScope.blackout = true;
        $scope.popup.show = true;
        $scope.popup.type = 'settings';
    };
    $scope.saveProfilePopup = function() {
        $rootScope.blackout = true;
        $scope.popup.show = true;
        $scope.popup.type = 'save-profile';
    };
    $scope.closePopup = function() {
        $rootScope.blackout = false;
        $scope.popup.show = false;
    };

    function nextIndex(list, callback) {
        list.index += 1;
        if (list.index > $scope.players.length - 1) {
            list.index = 0;
        }
        callback();
    }

    $scope.arrowPosition = function(list) {
        var marginTop = -3;
        var titleHeight = 60;
        var itemHeight = 50;
        var pos = titleHeight + (itemHeight * list.index) + marginTop;
        return {
            'top': pos + 'px'
        };
    };

    function rollList(list, playerStopIndex, timeoutTimer) {
        if ($scope.playing) {
            $timeout(function() {
                if ($scope.playing) {
                    nextIndex(list, function() {
                        rollList(list, playerStopIndex, timeoutTimer);
                    });
                }
            }, timeoutTimer);
        } else {
            //console.log('Setting', list, "to", playerStopIndex);
            //list.index = playerStopIndex;
        }
    }

    function finishedPlaying() {
        if ($scope.sound.remaining <= 0.8) {
            return true;
        }
        return false;
    }

    function randomizeNextRound() {
        var nextTime = randomTime($scope.startMin * 60, $scope.startMax * 60);
        $scope.timeSinceLastRound = 0;
        $timeout(function() {
            $scope.startGame();
        }, nextTime);
    }

    /* Gets a random time between min and max in seconds */
    function randomTime(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min) * 1000;
    }

    function setup() {
        populate(STABEN);
    }

    $scope.$on('load-profile', function(event, profile) {
        $scope.playing = false;
        $scope.round = 0;
        $scope.sound.stop();

        $scope.players = [];
        $scope.lists = [];
        $scope.players = profile.players;
        angular.forEach(profile.lists, function(list) {
            $scope.lists.push({
                'title': list.title,
                'index': -1
            });
        });
    });

    $scope.$on('profile', function(event, data) {
        $scope.playing = false;
        $scope.round = 0;
        $scope.sound.stop();

        if (data == 'STABEN') {
			populate(STABEN);
        } else if (data == 'D-Group') {
			populate(DGROUP);
        } else if (data == 'Donna') {
			populate(DONNA);
        } else if (data == 'Styret') {
			populate(STYRET);
        } else if (data == 'Snabbt äventyr') {
			populateMahaad();
		}
    });

	function populate(playerNames) {
		$scope.players = [];
		populateLists();

		playerNames.forEach(function (item, index) {
			$scope.players.push({
				'name': item
			})
		});
	}

    function populateMahaad() {
        $scope.players = [];
		$scope.lists = [];
		$scope.startMin = 2;
		$scope.startMax = 5;

        $scope.players.push({
            'name': "Värden"
        });
        $scope.players.push({
            'name': "Orson"
        });
        $scope.players.push({
            'name': "Servitören"
        });
        $scope.players.push({
            'name': "Regissören"
        });

        $scope.lists.push({
            'title': "Svep 1 enhet",
            index: -1
        });
        $scope.lists.push({
            'title': "Ge bort 1 enhet",
            index: -1
        });
        $scope.lists.push({
            'title': "MAHAAD!",
            index: -1
        });
        $scope.lists.push({
            'title': "Mer hud!",
            index: -1
        });
	}

    function populateLists() {
		$scope.lists = [];
        $scope.lists.push({
            'title': "Ta 5 klunkar",
            index: -1
        });
        $scope.lists.push({
            'title': "Ge bort 5 klunkar",
            index: -1
        });
        $scope.lists.push({
            'title': "Svep en enhet",
            index: -1
        });
    }

    var setupChromecast = function() {
        castReceiverManager.onSenderDisconnected = function(event) {
            if (window.castReceiverManager.getSenders().length === 0 && event.reason == cast.receiver.system.DisconnectReason.REQUESTED_BY_SENDER) {
                console.log("0 senders left, shutting down");
                window.close();
            }
        };
        castReceiverManager.onSenderConnected = function(event) {
            if (window.castReceiverManager.getSenders().length < 2) {
                chromecastAdmin = event.data;
                messageBus.send(event.data, "initialize");
            } else {
                messageBus.send(event.data, "not_admin");
            }
        };

        messageBus.onMessage = function(event) {
            var data = event.data;
            messageBus.send(event.senderId, event.data);

            // Ignore messages from other users than admin
            if (event.senderId != chromecastAdmin) {
                messageBus.send(event.senderId, "not_admin");
                return;
            }

            if (data.add_mission) {
                addMission(data.add_mission);
                castReceiverManager.setApplicationState("Mission " + name + " added");
                $scope.listitem = name;
                $scope.newListItem();
            }

            if (data.remove_mission) {
                castReceiverManager.setApplicationState("Mission removed");
                $scope.removeList(data.remove_mission);
            }

            if (data.add_player) {
                castReceiverManager.setApplicationState("Player " + name + " added");
                scope.playername = name;
                scope.newPlayer();
            }

            if (data.remove_player) {
                castReceiverManager.setApplicationState("Player removed");
                $scope.removePlayer(data.remove_player);
            }

            if (data.time_min) {
                scope.startMin = parseInt(data.time_min, 10);
            }

            if (data.time_max) {
                scope.startMin = parseInt(data.time_max, 10);
            }

            if (data.action == "play") {
                castReceiverManager.setApplicationState("Playing");

                $scope.startGame();
            }

            if (data.action == "pause") {
                //TODO pauseGame();
            }

            if (data.action == "initialize") {
                $scope.chromecastMode = true;
                $rootScope.hideMenu = true;
            }
        };

        castReceiverManager.start();
    };

    if (window.location.protocol === "https:") {
        var namespace = 'urn:x-cast:com.jacobandersson.dodskrok';
        var castReceiverManager = cast.receiver.CastReceiverManager.getInstance();
        var messageBus = castReceiverManager.getCastMessageBus(namespace, 'JSON');
        setupChromecast();
    }
});
