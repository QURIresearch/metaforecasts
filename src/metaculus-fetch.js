/* Imports */
import axios from "axios"
import fs from 'fs'
import toMarkdown from "./toMarkdown.js"
import { calculateStars } from "./stars.js"

/* Definitions */
let jsonEndPoint = 'https://www.metaculus.com/api2/questions/?page='
let all_questions = [];
let now = new Date().toISOString()

/* Support functions */
async function fetchMetaculusQuestions(next) {
  // Numbers about a given address: how many, how much, at what price, etc.
  let response = await axios(({
    url: next,
    method: 'GET',
    headers: ({ 'Content-Type': 'application/json' })
  }))
    .then(res => res.data)
  console.log(response)
  return response
}


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchMetaculusQuestionDescription(slug) {
  try {
    let response = await axios({
      method: 'get',
      url: "https://www.metaculus.com" + slug
    }).then(response => response.data)
    return response
  } catch (error) {
    console.log(`We encountered some error when attempting to fetch a metaculus page. Trying again`)
    await sleep(10000)
    try {
      let response = await axios({
        method: 'get',
        url: "https://www.metaculus.com" + slug
      }).then(response => response.data)
      return response
    } catch (error) {
      console.log(`We encountered some error when attempting to fetch a metaculus page.`)
      console.log("Error", error)
      throw "Giving up"
    }
  }

}

/* Body */

export async function metaculus() {

  // let metaculusQuestionsInit = await fetchMetaculusQuestions(1)
  // let numQueries = Math.round(Number(metaculusQuestionsInit.count) / 20)
  // console.log(`Downloading... This might take a while. Total number of queries: ${numQueries}`)
  // for (let i = 4; i <= numQueries; i++) { // change numQueries to 10 if one want to just test
  let next = "https://www.metaculus.com/api2/questions/"
  let i = 1
  while(next){
    if (i % 20 == 0) {
      console.log("Sleeping for 5secs")
      await sleep(5000)
    }
    console.log(`Query #${i}`)
    let metaculusQuestions = await fetchMetaculusQuestions(next)
    let results = metaculusQuestions.results;
    for (let result of results) {
      if (
        (result.publish_time < now) &&
        (now < result.resolve_time)
      ) {
        //console.log(result)
        await sleep(1000)
        let questionPage = await fetchMetaculusQuestionDescription(result.page_url)
        let descriptionraw = questionPage.split(`<div class="question__content">`)[1]
        let descriptionprocessed1 = descriptionraw.split("</div>")[0]
        let descriptionprocessed2 = toMarkdown(descriptionprocessed1)
        let description = descriptionprocessed2

        let isbinary = result.possibilities.type == "binary"
        let options = []
        if (isbinary) {
          let probability = Number(result.community_prediction.full.q2)
          options = [
            {
              "name": "Yes",
              "probability": probability,
              "type": "PROBABILITY"
            },
            {
              "name": "No",
              "probability": 1 - probability,
              "type": "PROBABILITY"
            }
          ]
        }
        let interestingInfo = ({
          "title": result.title,
          "url": "https://www.metaculus.com" + result.page_url,
          "platform": "Metaculus",
          "options": options,
          "description": description,
          "numforecasts": result.number_of_predictions,
          "stars": calculateStars("Metaculus", ({ numforecasts: result.number_of_predictions })),
          "resolution_data": {
	    	"publish_time": result.publish_time,
          	"resolution": result.resolution,
          	"close_time": result.close_time,
	  	"resolve_time": result.resolve_time
          	
          }
          //"status": result.status,
          //"publish_time": result.publish_time,
          //"close_time": result.close_time,
          //"type": result.possibilities.type, // We want binary ones here.
          //"last_activity_time": result.last_activity_time,
        })
        if (Number(result.number_of_predictions) >= 10) {
          console.log(interestingInfo)
          all_questions.push(interestingInfo)
        }

      }
    }
    next = metaculusQuestions.next
    i = i+1
  }

  let string = JSON.stringify(all_questions, null, 2)
  fs.writeFileSync('./data/metaculus-questions.json', string);
  console.log("Done")
}
//metaculus()
