const http = require("http")
const path = require("path")
const fse = require("fs-extra")
const multiparty = require("multiparty")

const server = http.createServer()
const UPLOAD_DIR = path.resolve(__dirname, "./", "target") // 大文件存储目录

const resolvePost = req =>
  new Promise(resolve => {
    let chunk = ""
    req.on("data", data => {
      console.log('data', data, '90')
        chunk += data
      })
    console.log(chunk, 'chunk')
    req.on("end", () => {
      resolve(JSON.parse(chunk))
    })
})

const mergeFileChunk = async (filePath, filename) => {
  const chunkDir = `${UPLOAD_DIR}\\${filename}`
  const chunkPaths = await fse.readdir(chunkDir)
  try {
    await fse.writeFile(filePath.split('.')[0], "")
  } catch (e) {
    console.log(e)
  }
  chunkPaths.forEach(chunkPath => {
    fse.appendFileSync(filePath.split('.')[0], fse.readFileSync(`${chunkDir}/${chunkPath}`))
    fse.unlinkSync(`${chunkDir}/${chunkPath}`)
  })
  fse.rmdirSync(chunkDir) // 合并后删除保存切片的目录
}

server.on("request", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Headers", "*")
  if (req.method === "OPTIONS") {
    res.status = 200
    res.end()
    return
  }

  console.log(req.url, 'req.url')

  if (req.url === "/merge") {
    const data = await resolvePost(req)
    const {filename} = data
    const filePath = `${UPLOAD_DIR}\\${filename}`
    console.log(`filename: ${filename}, filePath: ${filePath}`)
    await mergeFileChunk(filePath, filename)
    res.end(
      JSON.stringify({
        code: 0,
        message: "file merged success"
      })
    )
  }

  if (req.url === '/upload-file') {
    // 使用 multiparty 包处理前端传来的 FormData
    // 在 multiparty.parse 的回调中，files 参数保存了 FormData 中文件，fields 参数保存了 FormData 中非文件的字段
    const multipart = new multiparty.Form()

    multipart.parse(req, async (err, fields, files) => {
      if (err) {
        return
      }
      const [chunk] = files.chunk
      const [hash] = fields.hash
      // const [filename] = fields.filename
      const [index] = fields.index
      const chunkDir = path.resolve(UPLOAD_DIR, hash)

      // 切片目录不存在，创建切片目录
      if (!fse.existsSync(chunkDir)) {
        await fse.mkdirs(chunkDir)
      }

      // fs-extra 专用方法，类似 fs.rename 并且跨平台
      // fs-extra 的 rename 方法 windows 平台会有权限问题
      try {
        await fse.move(chunk.path, `${chunkDir}/${index}`)
        fse.remove(chunk.path, function () {
          console.log('delete')
        })
      } catch (err) {
        console.log(err)
      }
      res.end("received file chunk")
    })
  }
})

server.listen(8080, () => console.log("正在监听 8080 端口"))