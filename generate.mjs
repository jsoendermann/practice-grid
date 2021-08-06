import TOML from '@iarna/toml'
import fs from 'fs-extra'
import canvasPkg from 'canvas'
const { createCanvas } = canvasPkg
import moment from 'moment'
import chroma from 'chroma-js'

const START = '2021-07-18'
const END = '2023-01-18'
const NUM_WEEKS = 80
const MARGIN_TOP = 20
const MARGIN_LEFT = 0 // 25
const MARGIN_BETWEEN_BOXES = 5
const WIDTH = 1088
const BOX_SIZE =
  (WIDTH -
    MARGIN_LEFT -
    MARGIN_BETWEEN_BOXES * (NUM_WEEKS + 1) +
    MARGIN_BETWEEN_BOXES +
    3) /
  NUM_WEEKS
const HEIGHT = MARGIN_TOP + 7 * (BOX_SIZE + MARGIN_BETWEEN_BOXES) - 3

const COLOR = '#333' // '#3D2048'

const addDays = (day, numberOfDays) =>
  moment.utc(day).add(numberOfDays, 'day').format('YYYY-MM-DD')

const nextDay = day => addDays(day, 1)

const hourMinuteDiff = (later, earlier) => {
  const [lh, lm] = later.split(':')
  const [eh, em] = earlier.split(':')

  const l = Number(lh) * 60 + Number(lm)
  const e = Number(eh) * 60 + Number(em)

  return l - e
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  if (typeof stroke === 'undefined') {
    stroke = true
  }
  if (typeof radius === 'undefined') {
    radius = 5
  }
  if (typeof radius === 'number') {
    radius = { tl: radius, tr: radius, br: radius, bl: radius }
  } else {
    var defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 }
    for (var side in defaultRadius) {
      radius[side] = radius[side] || defaultRadius[side]
    }
  }
  ctx.beginPath()
  ctx.moveTo(x + radius.tl, y)
  ctx.lineTo(x + width - radius.tr, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr)
  ctx.lineTo(x + width, y + height - radius.br)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height)
  ctx.lineTo(x + radius.bl, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl)
  ctx.lineTo(x, y + radius.tl)
  ctx.quadraticCurveTo(x, y, x + radius.tl, y)
  ctx.closePath()
  if (fill) {
    ctx.fill()
  }
  if (stroke) {
    ctx.stroke()
  }
}

// console.log(BOX_SIZE)

const contentStr = await fs.readFile('../piano-practice-data/data.toml')
const content = TOML.parse(contentStr)

const dayToDuration = {}

for (const session of content.practiceSessions) {
  if (session.endDate) {
    throw new Error('endDate is not yet supported')
  }

  const sessionDuration = hourMinuteDiff(session.endTime, session.startTime)

  if (dayToDuration[session.startDate]) {
    dayToDuration[session.startDate] += sessionDuration
  } else {
    dayToDuration[session.startDate] = sessionDuration
  }
}

const min = 0 // Math.min(...Object.values(dayToDuration))
const max = 45 // Math.max(...Object.values(dayToDuration))

const sum = nums => nums.reduce((a, b) => a + b, 0)
const avg = nums => sum(nums) / nums.length

console.log(
  `Average daily session length: ${avg(Object.values(dayToDuration))} mins`,
)

const canvas = createCanvas(WIDTH, HEIGHT, 'svg')
const ctx = canvas.getContext('2d')
// ctx.scale(2, 2)

// ctx.fillStyle = 'blue'
// ctx.fillRect(0, 0, WIDTH, HEIGHT)

ctx.font = '9px serif'
ctx.textBaseline = 'middle'

const WEEKDAYS = [
  ['Mon', 0],
  ['Wed', 2],
  ['Fri', 4],
  ['Sun', 6],
]
ctx.fillStyle = '#999'
ctx.textAlign = 'start'
// for (const [str, ind] of WEEKDAYS) {
//   ctx.fillText(
//     str,
//     0,
//     MARGIN_TOP + ind * (BOX_SIZE + MARGIN_BETWEEN_BOXES) + BOX_SIZE / 2,
//   )
// }

const today = moment().format('YYYY-MM-DD')
let day = START
let week = 0
let dayOfWeekIndex = 6 // First day was a Sunday (week starts on monday)
while (day <= END) {
  const x = MARGIN_LEFT + week * (BOX_SIZE + MARGIN_BETWEEN_BOXES)
  const y = MARGIN_TOP + dayOfWeekIndex * (BOX_SIZE + MARGIN_BETWEEN_BOXES)

  if (dayToDuration[day] > 0) {
    const alpha = (dayToDuration[day] - min) / max
    ctx.strokeStyle = chroma(COLOR).alpha(alpha).darken(0.2).hex()
    ctx.fillStyle = chroma(COLOR).alpha(alpha).hex()
  } else if (day <= today) {
    ctx.strokeStyle = chroma('#ccc').darken(0.2).hex()
    ctx.fillStyle = '#ccc'
  } else {
    ctx.strokeStyle = chroma('#e0e0e0').darken(0.2).hex()
    ctx.fillStyle = '#e0e0e0'
  }
  roundRect(ctx, x, y, BOX_SIZE, BOX_SIZE, 1, true, true)
  ctx.fillRect(x, y, BOX_SIZE, BOX_SIZE)

  const date = moment.utc(day)
  // console.log(date.date())
  if (date.date() === 1) {
    const monthStr = date.format('MMM')
    ctx.fillStyle = '#999'
    ctx.textAlign = 'center'
    ctx.fillText(monthStr, x + BOX_SIZE / 2, MARGIN_TOP / 2)
  }

  day = nextDay(day)

  if (dayOfWeekIndex === 6) {
    dayOfWeekIndex = 0
    week++
  } else {
    dayOfWeekIndex++
  }
}

// ctx.fillRect(25, 25, 100, 100)

fs.writeFileSync('out.svg', canvas.toBuffer())
// const out = fs.createWriteStream('./test.png')
// const stream = canvas.createPNGStream()
// stream.pipe(out)
// out.on('finish', () => console.log('The PNG file was created.'))
