import express from "express";
import home from "@server/routes/home"
import notFound from "@server/routes/not-found"

const app = express()
const port = 3000

// main route
app.get('/', home)

// Any other path should return a 404
app.use(notFound)


app.listen(port, () => console.log(`Example app listening on port ${port}!`))