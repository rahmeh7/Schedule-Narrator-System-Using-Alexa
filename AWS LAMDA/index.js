
const Alexa = require("ask-sdk");
//const https = require("https");
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
const lambda = new AWS.Lambda();
var dynamoDb = new AWS.DynamoDB({apiVersion: '2012-08-10'});


const invocationName = "acro timetable";
function getMemoryAttributes() {   const memoryAttributes = {
       "history":[],


       "launchCount":0,
       "lastUseTimestamp":0,

       "lastSpeechOutput":{},
       };
   return memoryAttributes;
};

const maxHistorySize = 20;  


// 1. Intent Handlers =============================================

const AMAZON_FallbackIntent_Handler =  
{
    canHandle(handlerInput)
    {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.FallbackIntent' ;
    },
    handle(handlerInput) 
    {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let previousSpeech = getPreviousSpeechOutput(sessionAttributes);
        console.log(previousSpeech);
        return responseBuilder
            .speak('Sorry I didnt catch what you said, say help to hear something which you can ask me or try something new ' )       //   + stripSpeak(previousSpeech.outputSpeech))
            .reprompt('try again with something new')      //stripSpeak(previousSpeech.reprompt))
            .getResponse();
    },
};

const AMAZON_CancelIntent_Handler =  
{
    canHandle(handlerInput)
    {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.CancelIntent' ;
    },
    handle(handlerInput) 
    {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();


        let say = 'Okay!, talk to you later ';

        return responseBuilder
            .speak(say)
            .withShouldEndSession(true)
            .getResponse();
    },
};

const AMAZON_HelpIntent_Handler = 
{
    canHandle(handlerInput) 
    {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.HelpIntent' ;
    },
    handle(handlerInput) 
    {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let history = sessionAttributes['history'];
        let intents = getCustomIntents();
        let sampleIntent = randomElement(intents);

        let say = 'You asked for help. '; 

       // let previousIntent = getPreviousIntent(sessionAttributes);
        //if (previousIntent && !handlerInput.requestEnvelope.session.new) {
          //   say += 'Your last intent was ' + previousIntent + '. ';
        // }

        say += ' Here something you can ask me, ' + getSampleUtterance(sampleIntent);

        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const AMAZON_StopIntent_Handler =  
{
    canHandle(handlerInput) 
    {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.StopIntent' ;
    },
    handle(handlerInput) 
    {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();


        let say = 'Okay bye,see you later! ';

        return responseBuilder
            .speak(say)
            .withShouldEndSession(true)
            .getResponse();
    },
};

const AMAZON_NavigateHomeIntent_Handler =  
{
    canHandle(handlerInput) 
    {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.NavigateHomeIntent' ;
    },
    handle(handlerInput)
    {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let say = 'Hello from Rahul';


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const timeTableIntent_Handler = 
{
    canHandle(handlerInput) 
    {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'timeTableIntent' ;
    },
    handle(handlerInput)
    {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        let slotValues = getSlotValues(request.intent.slots); 
         var rp=0;
        if(slotValues.day.heardAs.toString()=='')
        {
            rp=1;
        }
        const str=capitalize(slotValues.teacher.heardAs.toString());
        const str1=slotValues.class.heardAs.toString();
        const str2=capitalize(slotValues.time.heardAs.toString());
        const strd=capitalize(weekday(slotValues.day.heardAs.toString()));
        const str3 =capitalize(slotValues.subject.heardAs.toString());
        console.log(str,str1,str2,str3,strd);
        var caseout='';
        return new Promise((resolve)=>{
            var status='';
            if (slotValues.class.heardAs && slotValues.teacher.heardAs !== '')
            {
               var params = {
 
                 ExpressionAttributeValues: {
                    ':s': {S: str},
                    ':c':{S: str1},
                   ':day':{S:strd}
                  },
                  KeyConditionExpression: 'tname = :s and classroom = :c',
                  ProjectionExpression: 'tname,ctime, classroom,subject,cday',
                   FilterExpression: "cday = :day",
                  TableName: 'Timetable',
                   IndexName: 'tname-classroom-index'
                };
               caseout='1';
            }
            else if (slotValues.time.heardAs && slotValues.teacher.heardAs !== '')
            {
               var params = {
 
                  ExpressionAttributeValues: {
                    ':s': {S: str},
                    ':t':{S: str2},
                    ':d':{S:strd}
                  },
                  KeyConditionExpression: 'tname = :s and ctime = :t',
                  ProjectionExpression: 'tname,ctime, classroom,subject,cday',
                   FilterExpression: 'contains (cday, :d)',
                  TableName: 'Timetable',
                  IndexName: 'tname-ctime-index'
   
                };
               caseout='2';
            }
           else  if (slotValues.time.heardAs && slotValues.class.heardAs !== '')
            {
               var params = {
 
                  ExpressionAttributeValues: {
                    ':s': {S: str1},
                    ':t':{S: str2},
                    ':d':{S:strd}
                  },
                  KeyConditionExpression: 'classroom = :s and ctime = :t',
                  ProjectionExpression: 'tname,ctime, classroom,subject,cday',
                  FilterExpression: 'contains (cday, :d)',
                  TableName: 'Timetable',
                  IndexName: 'classroom-ctime-index'
   
                };
               caseout='3';
            }
      else if (strd && slotValues.class.heardAs !== '' && slotValues.teacher.heardAs ==='' && slotValues.subject.heardAs ==='')
            {
               var params = {
 
                  ExpressionAttributeValues: {
                    ':s': {S: str1},
                    ':d':{S: strd},
                  },
                  KeyConditionExpression: 'classroom = :s',
                  ProjectionExpression: 'tname,ctime, classroom,subject,cday',
                   FilterExpression: 'contains (cday, :d)',
                  TableName: 'Timetable',
                  IndexName: 'classroom-ctime-index'
   
                };
               caseout='4';
            }
            else if (slotValues.subject.heardAs && slotValues.class.heardAs !== '')
            {
               var params = {
 
                 ExpressionAttributeValues: {
                    ':s': {S: str3},
                    ':c':{S: str1},
                   ':day':{S:strd}
                  },
                  KeyConditionExpression: 'subject = :s and classroom = :c',
                  ProjectionExpression: 'tname,ctime, classroom,subject,cday',
                    FilterExpression: 'contains (cday, :day)',
                  TableName: 'Timetable',
                   IndexName: 'classroom-subject-index'
                };
               caseout='5';
            }
            
            dynamoDb.query(params, function(err, data) {
                if (err) {
                console.log("Error", err);
                 } else {
                   var i=0;
                 if(data.Items && data.Items.length){
                 console.log("Success", data.Items);
                 data.Items.forEach(function(element, index, array) {
                 console.log(element.classroom.S + " (" + element.ctime.S + ")");
                 console.log(caseout);
                 if(caseout=='1')
                 {
                     if(i==0)
                 {
                  status +='professor '+element.tname.S+' lecture of '+ element.subject.S +' is scheduled at '+tConvert(element.ctime.S);
                  i+=1;
                 }
                     else
                     {
                         status+=', and '+tConvert(element.ctime.S);
                     }
                 }
                 if(caseout=='2')
                 {
                  status +='At '+tConvert(element.ctime.S)+' , professor '+element.tname.S+' lecture of '+element.subject.S+' is scheduled in '+element.classroom.S+'.';
                  }
                  if(caseout=='3')
                  {
                      status +='At '+tConvert(element.ctime.S)+', professor '+element.tname.S+ ' lecture in '+element.classroom.S+'.';
                  }
                  if(caseout=='4')
                  {
                      status +='At '+tConvert(element.ctime.S)+' , '+element.subject.S+' by professor '+element.tname.S+' ,';
                  }
                  if (caseout=='5')
                  {  if(rp == 0)
                      status +='At '+tConvert(element.ctime.S)+' , ';
                     if (rp==1)
                     status+='professor '+element.tname.S+' take '+element.subject.S+' lecture.';
                  }
                  console.log(status);
                  return resolve(handlerInput.responseBuilder
                  .speak(status)
                  .withShouldEndSession(false)
                  .getResponse());
                         });
                  }
                  else{
                  status='sorry ! , no record found';
                  return resolve(handlerInput.responseBuilder
                  .speak(status)
                  .withShouldEndSession(false)
                  .getResponse());
                  }

                  }
            });
});
           /* get item code===== 
             const params = {
                       Key:{
                      "id":{
                           S: str
                           }
                           },  
             TableName: 'mytime'
            }
            
            dynamoDb.getItem(params, function(err, data) {
            if (err) {
            console.log("error");
                     }
            else {
            if(data.Item){
                 return resolve(handlerInput.responseBuilder
                 .speak(data.Item.ctime.S)
                 .withShouldEndSession(false)
                 .getResponse());
                         }
            else{
                status='not found';
                return resolve(handlerInput.responseBuilder
                .speak(status)
                .withShouldEndSession(false)
                .getResponse());
                }
                 }
     
            });
        }); //getitem code end
        */
     },
};

const LaunchRequest_Handler =  
{
    canHandle(handlerInput) 
    {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'LaunchRequest';
    },
    handle(handlerInput) 
    {
        const responseBuilder = handlerInput.responseBuilder;
        let say = 'welcome to ' + invocationName + ' ! Say help to hear some options.';
        let skillTitle = capitalize(invocationName);
        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .withStandardCard('Welcome!', 
              'To our Timetable skill-, ' + skillTitle,
               welcomeCardImg.smallImageUrl, welcomeCardImg.largeImageUrl)
            .getResponse();
    },
};
const AMAZON_RepeatIntent_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.RepeatIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let previousSpeech = getPreviousSpeechOutput(sessionAttributes);

        return responseBuilder
            .speak('sure, I said, ' + stripSpeak(previousSpeech.outputSpeech))
            .reprompt(stripSpeak(previousSpeech.reprompt))
            .getResponse();
    },
};



const SessionEndedHandler =  
{
    canHandle(handlerInput) 
    {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) 
    {
        console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);
        return handlerInput.responseBuilder.getResponse();
    }
};

const ErrorHandler =  
{
    canHandle() 
    {
        return true;
    },
    handle(handlerInput, error) 
    {
        const request = handlerInput.requestEnvelope.request;

        console.log(`Error handled: ${error.message}`);

        return handlerInput.responseBuilder
            .speak(`Sorry, your skill got this error.  ${error.message} `)
            .reprompt(`Sorry, your skill got this error.  ${error.message} `)
            .getResponse();
    }
};

// 2. Constants ===========================================================================

const APP_ID = "amzn1.ask.skill.e47f1d95-c862-42be-bbda-659bde2e6a09";  

// 3.  Helper Functions ===================================================================
function weekday(strd){
    var d;
   if(strd=="today"|| strd =='')
   {
        d = new Date();
   }
   else {
       if (strd=="tomorrow")
          {
            var d= new Date();
            d.setDate(d.getDate() + 1);
          }
     else{
         return strd;
     }
   }
   //console.log(d);
var weekday = new Array(7);
weekday[0] = "Sunday";
weekday[1] = "Monday";
weekday[2] = "Tuesday";
weekday[3] = "Wednesday";
weekday[4] = "Thursday";
weekday[5] = "Friday";
weekday[6] = "Saturday";

var n = weekday[d.getDay()];
    return n;
}
function tConvert (time) {
  // Check correct time format and split into components
  time = time.toString ().match (/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];

  if (time.length > 1) { // If time format correct
    time = time.slice (1);  // Remove full string match value
    time[5] = +time[0] < 12 ? 'AM' : 'PM'; // Set AM/PM
    time[0] = +time[0] % 12 || 12; // Adjust hours
  }
  return time.join (''); // return adjusted time or original string
}
function capitalize(myString) 
{
     return myString.replace(/(?:^|\s)\S/g, function(a){return a.toUpperCase();} ) ;
}

function randomElement(myArray) 
{ 
    return(myArray[Math.floor(Math.random() * myArray.length)]); 
} 

function stripSpeak(str) 
 { 
     return(str.replace('<speak>', '').replace('</speak>', '')); 
}
 
function getSlotValues(filledSlots) {
     const slotValues = {}; 
     Object.keys(filledSlots).forEach((item) => { 
          const name  = filledSlots[item].name; 
          if (filledSlots[item] && 
              filledSlots[item].resolutions && 
              filledSlots[item].resolutions.resolutionsPerAuthority[0] && 
              filledSlots[item].resolutions.resolutionsPerAuthority[0].status && 
              filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) {
            
                  switch (filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) { 
                     case 'ER_SUCCESS_MATCH': 
                         slotValues[name] = { 
                              heardAs: filledSlots[item].value, 
                              resolved: filledSlots[item].resolutions.resolutionsPerAuthority[0].values[0].value.name, 
                              ERstatus: 'ER_SUCCESS_MATCH' 
                          }; 
                     break; 
                     case 'ER_SUCCESS_NO_MATCH': 
                         slotValues[name] = { 
                              heardAs: filledSlots[item].value, 
                              resolved: '', 
                              ERstatus: 'ER_SUCCESS_NO_MATCH' 
                          }; 
                     break; 
                     default: 
                     break; 
                  } 
        }
        else { 
                slotValues[name] = { 
                heardAs: filledSlots[item].value || '', // may be null 
                resolved: '', 
                ERstatus: '' 
            }; 
        } 
    }, this); 
 
    return slotValues; 
} 
 
function getExampleSlotValues(intentName, slotName) { 
 
    let examples = []; 
    let slotType = ''; 
    let slotValuesFull = []; 
    let intents = model.interactionModel.languageModel.intents; 
    for (let i = 0; i < intents.length; i++) { 
        if (intents[i].name == intentName) { 
            let slots = intents[i].slots; 
            for (let j = 0; j < slots.length; j++) { 
                if (slots[j].name === slotName) { 
                    slotType = slots[j].type; 
 
                } 
            } 
        } 
 
    } 
    let types = model.interactionModel.languageModel.types; 
    for (let i = 0; i < types.length; i++) { 
        if (types[i].name === slotType) { 
            slotValuesFull = types[i].values; 
        } 
    } 
 
    slotValuesFull = shuffleArray(slotValuesFull); 
 
    examples.push(slotValuesFull[0].name.value); 
    examples.push(slotValuesFull[1].name.value); 
    if (slotValuesFull.length > 2) { 
        examples.push(slotValuesFull[2].name.value); 
    } 
 
 
    return examples; 
} 
 
function sayArray(myData, penultimateWord = 'and') { 
    let result = ''; 
 
    myData.forEach(function(element, index, arr) { 
 
        if (index === 0) { 
            result = element; 
        } else if (index === myData.length - 1) { 
            result += ` ${penultimateWord} ${element}`; 
        } else { 
            result += `, ${element}`; 
        } 
    }); 
    return result; 
} 
function supportsDisplay(handlerInput) 
{                                      
    const hasDisplay = 
        handlerInput.requestEnvelope.context && 
        handlerInput.requestEnvelope.context.System && 
        handlerInput.requestEnvelope.context.System.device && 
        handlerInput.requestEnvelope.context.System.device.supportedInterfaces && 
        handlerInput.requestEnvelope.context.System.device.supportedInterfaces.Display; 
 
    return hasDisplay; 
} 
 
 
const welcomeCardImg = { 
    smallImageUrl: "https://s3.amazonaws.com/skill-images-789/cards/card_plane720_480.png", 
    largeImageUrl: "https://s3.amazonaws.com/skill-images-789/cards/card_plane1200_800.png" 
 
 
}; 
 
const DisplayImg1 = { 
    title: 'Jet Plane', 
    url: 'https://s3.amazonaws.com/skill-images-789/display/plane340_340.png' 
}; 
const DisplayImg2 = { 
    title: 'Starry Sky', 
    url: 'https://s3.amazonaws.com/skill-images-789/display/snow.png' 
 
}; 
 
function getCustomIntents() { 
    const modelIntents = model.interactionModel.languageModel.intents; 
 
    let customIntents = []; 
 
 
    for (let i = 0; i < modelIntents.length; i++) { 
        if(modelIntents[i].name.substring(0,7) != "AMAZON." && modelIntents[i].name !== "LaunchRequest" ) { 
            customIntents.push(modelIntents[i]); 
    
        } 
    } 
    return customIntents; 
} 
 
function getSampleUtterance(intent) { 
 
    return randomElement(intent.samples); 
 
} 
 
function getPreviousIntent(attrs) { 
 
    if (attrs.history && attrs.history.length > 1) { 
        return attrs.history[attrs.history.length - 2].IntentRequest; 
 
    } else { 
        return false; 
    } 
 
} 
 
function getPreviousSpeechOutput(attrs) { 
 
    if (attrs.lastSpeechOutput && attrs.history.length > 1) {
        return attrs.lastSpeechOutput; 
 
    } else { 
        return false; 
    } 
 
} 
 
function timeDelta(t1, t2) { 
 
    const dt1 = new Date(t1); 
    const dt2 = new Date(t2); 
    const timeSpanMS = dt2.getTime() - dt1.getTime(); 
    const span = { 
        "timeSpanMIN": Math.floor(timeSpanMS / (1000 * 60 )), 
        "timeSpanHR": Math.floor(timeSpanMS / (1000 * 60 * 60)), 
        "timeSpanDAY": Math.floor(timeSpanMS / (1000 * 60 * 60 * 24)), 
        "timeSpanDesc" : "" 
    }; 
 
 
    if (span.timeSpanHR < 2) { 
        span.timeSpanDesc = span.timeSpanMIN + " minutes"; 
    } else if (span.timeSpanDAY < 2) { 
        span.timeSpanDesc = span.timeSpanHR + " hours"; 
    } else { 
        span.timeSpanDesc = span.timeSpanDAY + " days"; 
    } 
 
 
    return span; 
 
} 
 
 
const InitMemoryAttributesInterceptor = { 
    process(handlerInput) { 
        let sessionAttributes = {}; 
        if(handlerInput.requestEnvelope.session['new']) { 
 
            sessionAttributes = handlerInput.attributesManager.getSessionAttributes(); 
 
            let memoryAttributes = getMemoryAttributes(); 
 
            if(Object.keys(sessionAttributes).length === 0) { 
 
                Object.keys(memoryAttributes).forEach(function(key) {  // initialize all attributes from global list 
 
                    sessionAttributes[key] = memoryAttributes[key]; 
 
                }); 
 
            } 
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes); 
 
 
        } 
    } 
}; 
 
const RequestHistoryInterceptor = { 
    process(handlerInput) { 
 
        const thisRequest = handlerInput.requestEnvelope.request; 
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes(); 
 
        let history =sessionAttributes['history'] || []; 
 
        let IntentRequest = {}; 
        if (thisRequest.type === 'IntentRequest' ) { 
 
            let slots = []; 
 
            IntentRequest = { 
                'IntentRequest' : thisRequest.intent.name 
            }; 
 
            if (thisRequest.intent.slots) { 
 
                for (let slot in thisRequest.intent.slots) { 
                    let slotObj = {}; 
                    slotObj[slot] = thisRequest.intent.slots[slot].value; 
                    slots.push(slotObj); 
                } 
 
                IntentRequest = { 
                    'IntentRequest' : thisRequest.intent.name, 
                    'slots' : slots 
                }; 
 
            } 
 
        } else { 
            IntentRequest = {'IntentRequest' : thisRequest.type}; 
        } 
        if(history.length > maxHistorySize - 1) { 
            history.shift(); 
        } 
        history.push(IntentRequest); 
 
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes); 
 
    } 
 
}; 
 
 
 
 
const RequestPersistenceInterceptor = { 
    process(handlerInput) { 
 
        if(handlerInput.requestEnvelope.session['new']) { 
 
            return new Promise((resolve, reject) => { 
 
                handlerInput.attributesManager.getPersistentAttributes() 
 
                    .then((sessionAttributes) => { 
                        sessionAttributes = sessionAttributes || {}; 
 
 
                        sessionAttributes['launchCount'] += 1; 
 
                        handlerInput.attributesManager.setSessionAttributes(sessionAttributes); 
 
                        handlerInput.attributesManager.savePersistentAttributes() 
                            .then(() => { 
                                resolve(); 
                            }) 
                            .catch((err) => { 
                                reject(err); 
                            }); 
                    }); 
 
            }); 
 
        } // end session['new'] 
    } 
}; 
 
 
const ResponseRecordSpeechOutputInterceptor = { 
    process(handlerInput, responseOutput) { 
 
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes(); 
        let lastSpeechOutput = { 
            "outputSpeech":responseOutput.outputSpeech.ssml, 
            "reprompt":responseOutput.reprompt.outputSpeech.ssml 
        }; 
        sessionAttributes['lastSpeechOutput'] = lastSpeechOutput; 
 
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes); 
 
    } 
}; 
 
const ResponsePersistenceInterceptor = { 
    process(handlerInput, responseOutput) { 
 
        const ses = (typeof responseOutput.shouldEndSession == "undefined" ? true : responseOutput.shouldEndSession); 
 
        if(ses || handlerInput.requestEnvelope.request.type == 'SessionEndedRequest') { // skill was stopped or timed out 
 
            let sessionAttributes = handlerInput.attributesManager.getSessionAttributes(); 
 
            sessionAttributes['lastUseTimestamp'] = new Date(handlerInput.requestEnvelope.request.timestamp).getTime(); 
 
            handlerInput.attributesManager.setPersistentAttributes(sessionAttributes); 
 
            return new Promise((resolve, reject) => { 
                handlerInput.attributesManager.savePersistentAttributes() 
                    .then(() => { 
                        resolve(); 
                    }) 
                    .catch((err) => { 
                        reject(err); 
                    }); 
 
            }); 
 
        } 
 
    } 
}; 
 
 
function shuffleArray(array) {  // Fisher Yates shuffle! 
 
    let currentIndex = array.length, temporaryValue, randomIndex; 
 
    while (0 !== currentIndex) { 
 
        randomIndex = Math.floor(Math.random() * currentIndex); 
        currentIndex -= 1; 
 
        temporaryValue = array[currentIndex]; 
        array[currentIndex] = array[randomIndex]; 
        array[randomIndex] = temporaryValue; 
    } 
 
    return array; 
}
// 4. Exports handler function and setup ===================================================
const skillBuilder = Alexa.SkillBuilders.custom();
exports.handler = skillBuilder
    .addRequestHandlers(
        timeTableIntent_Handler, 
        LaunchRequest_Handler,
        AMAZON_FallbackIntent_Handler, 
        AMAZON_CancelIntent_Handler, 
        AMAZON_HelpIntent_Handler, 
        AMAZON_StopIntent_Handler, 
        AMAZON_RepeatIntent_Handler, 
        AMAZON_NavigateHomeIntent_Handler,
        SessionEndedHandler
    )
    .addErrorHandlers(ErrorHandler)
    .addRequestInterceptors(InitMemoryAttributesInterceptor)
    .addRequestInterceptors(RequestHistoryInterceptor)

 // .addResponseInterceptors(ResponseRecordSpeechOutputInterceptor)

 //.addRequestInterceptors(RequestPersistenceInterceptor)
 //.addResponseInterceptors(ResponsePersistenceInterceptor)

 // .withTableName("askMemorySkillTable")
  //.withAutoCreateTable(true)

    .lambda();

const model = {
    "interactionModel": {
        "languageModel": {
            "invocationName": "acro timetable",
            "modelConfiguration": {
                "fallbackIntentSensitivity": {
                    "level": "LOW"
                }
            },
            "intents": [
                {
                    "name": "AMAZON.FallbackIntent",
                    "samples": []
                },
                {
                    "name": "AMAZON.CancelIntent",
                    "samples": []
                },
                {
                    "name": "AMAZON.HelpIntent",
                    "samples": []
                },
                {
                    "name": "AMAZON.StopIntent",
                    "samples": []
                },
                {
                    "name": "AMAZON.NavigateHomeIntent",
                    "samples": []
                },
                {
                    "name": "timeTableIntent",
                    "slots": [
                        {
                            "name": "class",
                            "type": "class"
                        },
                        {
                            "name": "time",
                            "type": "AMAZON.TIME"
                        },
                        {
                            "name": "teacher",
                            "type": "teacher"
                        },
                        {
                            "name": "day",
                            "type": "AMAZON.DayOfWeek"
                        },
                        {
                            "name": "subject",
                            "type": "subject"
                        }
                    ],
                    "samples": [
                        "who teaches {subject} in {class}",
                        "when is {subject} lecture held in {class} on {day}",
                        "whose lecture is in {class} at {time} on {day}",
                        "please tell me the schedule of {class} on {day}",
                        "At what time professor {teacher} lecture is scheduled in {class} on {day}",
                        "when is the lecture of professor {teacher} in {class} on {day}",
                        "where is professor {teacher} lecture at {time} on {day}",
                        "who is going to lecture in {class} at {time} on {day}"
                    ]
                },
                {
                    "name": "AMAZON.RepeatIntent",
                    "samples": []
                }
            ],
            "types": [
                {
                    "name": "class",
                    "values": [
                        {
                            "name": {
                                "value": "cs 4"
                            }
                        },
                        {
                            "name": {
                                "value": "cs 3"
                            }
                        },
                        {
                            "name": {
                                "value": "IT 2"
                            }
                        },
                        {
                            "name": {
                                "value": "ME 1"
                            }
                        },
                        {
                            "name": {
                                "value": "IT 1"
                            }
                        },
                        {
                            "name": {
                                "value": "cs 2"
                            }
                        },
                        {
                            "name": {
                                "value": "cs 1"
                            }
                        }
                    ]
                },
                {
                    "name": "teacher",
                    "values": [
                        {
                            "name": {
                                "value": "sanjay bansal "
                            }
                        },
                        {
                            "name": {
                                "value": "nisha rathi "
                            }
                        },
                        {
                            "name": {
                                "value": "vandana kate "
                            }
                        },
                        {
                            "name": {
                                "value": "kavita Namdeo "
                            }
                        }
                    ]
                },
                {
                    "name": "subject",
                    "values": [
                        {
                            "name": {
                                "value": "IOT"
                            }
                        },
                        {
                            "name": {
                                "value": "AI"
                            }
                        },
                        {
                            "name": {
                                "value": "cyber law  and ethics"
                            }
                        },
                        {
                            "name": {
                                "value": "cloud computing"
                            }
                        },
                        {
                            "name": {
                                "value": "soft computing"
                            }
                        },
                        {
                            "name": {
                                "value": "machine learning"
                            }
                        }
                    ]
                }
            ]
        }
    }
};