const MongoClient = require('mongodb').MongoClient

// Connect URL
const url = 'mongodb://127.0.0.1:27017'

// Connect to MongoDB
MongoClient.connect(
    url,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true
    },
    (err, client) => {
        if (err) {
            return console.log(err)
        }

        // Specify the database you want to access
        const db = client.db('school')

        console.log(`MongoDB Connected: ${url}`)
    }
)

return