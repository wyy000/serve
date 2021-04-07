const fse = require("fs-extra")
const fs = require("fs")

let content = ''
// Array.from({length: 3000000}).forEach(it => content += ('\n' + String(Math.random())))
Array.from({length: 3000000}).forEach(it => content += String(Math.random()) + '\r\n')

// fse.writeFile()
fs.writeFile('./test.txt', content, function () {
})
