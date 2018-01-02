var http = require('https');
var moment = require('moment');
var _ = require('lodash');

moment.locale('de');

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        if (event.session.application.applicationId !== "amzn1.ask.skill.f7a68843-516d-47ea-8438-72c9e3159d66") {
            context.fail("Invalid Application ID");
        }


        if (event.session.new) {
            onSessionStarted({
                requestId: event.request.requestId
            }, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

function api(endpoint, cb) {

    return https.get({
        host: 'www.stadtreinigung-leipzig.de',
        path: '/intern/aek-streetsearch.html?aekApp=1'
    }, function (res) {
        res.setEncoding('utf8');
        var body = '';
        res.on('data', function (d) {
            body += d;
        });
        res.on('end', function () {

            try {
                console.log("data received for " + endpoint);
                console.log("statusCode: ", res.statusCode);
                var parsed = null;
                if (res.statusCode == "200") {
                    var parsed = fastXmlParser.parse(body);
                }
                cb(parsed);
            } catch (err) {
                console.error('Unable to parse response as XML', err);
                throw (err);
            }
        });
    }).on('error', function (err) {
        // handle errors with the request itself
        console.error('Error with the request:', err.message);
        throw (err);
    });

}

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId +
        ", sessionId=" + session.sessionId);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId +
        ", sessionId=" + session.sessionId);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId +
        ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    this.cb = callback;

    switch (intentName) {
        case "getWasteCollectionInfoByDate":

            var requestedDate = moment().format('YYYY-MM-DD');
            if (intent.slots.requestedDate && intent.slots.requestedDate.value) {
                requestedDate = moment(intent.slots.requestedDate.value);
            }

            api(requestedDate, function (result) {

                var cardTitle = 'Müllplan für ' + moment(requestedDate).format('DD.MM.YYYY');
                var shouldEndSession = true;
                var speechOutput = 'Am <say-as interpret-as="date">????' + moment(requestedDate).format('MMDD') + '</say-as> wird ';
                var textOutput = 'Am ' + moment(requestedDate).format('dddd, [den] Do MMMM YYYY ') + ' wird: ';


                if (result == null) {
                    speechOutput += "Für dieses Datum konnte ich keine Informationen abrufen. Wahrscheinlich hat der Server ein Problem.";
                    textOutput += "Für dieses Datum konnte ich keine Informationen abrufen. ";
                    this.cb({}, buildSpeechletResponse(cardTitle, speechOutput, speechOutput, shouldEndSession, textOutput));
                } else {

                    var found = false;

                    var result = JSON.parse(data);
        
                    for (var prop in result) {
                        if (prop !== "special" && _.indexOf(result[prop], 1514934000) > -1) {
                            message += "Es wird die " + getColor(prop) + " Tonne abgeholt. ";
                            found = true;
                        }
                    };
        
                    if (!found) {
                        message += "Es wird keine Tonne abgeholt. ";
                    }
        
                    this.cb({}, buildSpeechletResponse(cardTitle, speechOutput, speechOutput, shouldEndSession, textOutput));
                }

            }.bind(this));
            break;
        case "AMAZON.HelpIntent":
            getWelcomeResponse(callback);
            break;

        case "AMAZON.StopIntent":
        case "AMAZON.CancelIntent":
        default:
            handleSessionEndRequest(callback);
            break;
    }

}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId + ", sessionId=" + session.sessionId);
    // Add cleanup logic here
}

// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var sessionAttributes = {};
    var cardTitle = "Willkommen";
    var speechOutput = "Du kannst mich nach den Müllplan fragen.";
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    var repromptText = "Hier sind einige Beispiele: " +
        "Sag zum Beispiel: Alexa frag die Stadt welche Tonne heute abgeholt wird. " +
        "Du kannst auch Stop sagen, um zu beenden " +
        "So, wie kann ich Dir helfen?";
    var shouldEndSession = false;

    callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession, speechOutput));
}

function handleSessionEndRequest(callback) {
    var cardTitle = ""; //"Session Ended";
    var speechOutput = ""; //"Thank you for trying the Alexa Skills Kit sample. Have a nice day!";
    // Setting this to true ends the session and exits the skill.
    var shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession, null));
}

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession, cardText) {
    return {
        outputSpeech: {
            //            type: "PlainText",
            //            text: output
            type: "SSML",
            ssml: "<speak>" + output + "</speak>"
        },
        card: {
            type: "Simple",
            title: title,
            content: cardText
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}
