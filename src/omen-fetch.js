/* Imports */
import fs from 'fs'
import axios from "axios"
import { calculateStars } from "./stars.js"

/* Definitions */
let graphQLendpoint = 'https://api.thegraph.com/subgraphs/name/protofire/omen'
// https://github.com/protofire/omen-subgraph
// https://thegraph.com/explorer/subgraph/protofire/omen

async function fetchAllContractData() {
  let daysSinceEra = Math.round(Date.now() / (1000 * 24 * 60 * 60)) - 50 // last 30 days
  let response = await axios({
    url: graphQLendpoint,
    method: 'POST',
    headers: ({ 'Content-Type': 'application/json' }),
    data: JSON.stringify(({
      query: `
      {
          fixedProductMarketMakers(first: 1000,
          where: {
          lastActiveDay_gt: ${daysSinceEra}
          }
          ){
            id
            lastActiveDay
            question{
              title
            }
            outcomeSlotCount
            outcomeTokenMarginalPrices
            usdVolume
            usdLiquidityMeasure
            resolutionTimestamp
        }
      }
      `
    })),
  })
    .then(res => res.data)
    .then(res => res.data.fixedProductMarketMakers)
  //console.log(response)
  return response
}

async function fetch_all() {
  let allData = await fetchAllContractData()
  let results = []
  for (let data of allData) {

    if (data.question != null &
      data.usdLiquidityMeasure != '0' &
      data.resolutionTimestamp == null &
      data.question.title != "ssdds") {
      console.log(data)
      //console.log(data.usdLiquidityMeasure)
      let options = data.outcomeTokenMarginalPrices.map((price, slotnum) => {
        let name = `Option ${slotnum}`
        if (data.outcomeTokenMarginalPrices.length == 2 && slotnum == 0) name = "Yes"
        if (data.outcomeTokenMarginalPrices.length == 2 && slotnum == 1) name = "No"
        return ({
          "name": name,
          "probability": Number(price),
          "type": "PROBABILITY"
        })
      })

      let obj = {
        "title": data.question.title,
        "url": "https://omen.eth.link/#/" + data.id,
        "platform": "Omen",
        "options": options,
        "description": "",
        "stars": calculateStars("Omen", ({}))
      }
      console.log(obj)
      results.push(obj)
    }

  }
  return results
}

/* Body */
export async function omen() {
  let result = await fetch_all()
  //console.log(result)
  let string = JSON.stringify(result, null, 2)
  fs.writeFileSync('./data/omen-questions.json', string);
  console.log("Done")
}
//omen()
