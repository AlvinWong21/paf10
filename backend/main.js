require('dotenv').config()
const morgan = require('morgan')
const express = require('express')
const multer = require('multer')
const AWS = require('aws-sdk')
const path = require('path')
const mysql = require('mysql2/promise')
const sha1 = require('sha1')
const { MongoClient } = require('mongodb')
const fs = require('fs')

const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000

const pool = mysql.createPool({
	host: process.env.DB_HOST,
	port: process.env.DB_PORT,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_SCHEMA,
	connectionLimit: process.env.DB_CONN_LIMIT,
	timezone: '+08:00'
})

const SQL_LOGIN_AUTH = `SELECT COUNT(*) FROM user WHERE user_id=? && password=?;`
const app = express()
const upload = multer({dest: path.join(__dirname, "/uploads/")})

const MONGO_URL = "mongodb://localhost:27017"
const MONGO_DB = 'shareContent'
const MONGO_COLLECTION = 'submitted'
const mongoClient = new MongoClient(MONGO_URL, {useNewUrlParser: true, useUnifiedTopology: true})

const spacesEndpoint = new AWS.Endpoint(process.env.AWS_S3_HOSTNAME);
const AWS_S3_ACCESS_KEY_ID= process.env.AWS_S3_ACCESSKEY_ID;
const AWS_S3_SECRET_ACCESSKEY= process.env.AWS_S3_SECRET_ACCESSKEY;
const AWS_S3_BUCKET_NAME=process.env.AWS_S3_BUCKET_NAME;

const s3 = new AWS.S3({
    endpoint: spacesEndpoint,
    accessKeyId: AWS_S3_ACCESS_KEY_ID,
    secretAccessKey: AWS_S3_SECRET_ACCESSKEY
})

const readFile = (path) => new Promise((resolve,reject) => {
    fs.readFile(path, (err, buffer) => {
        if(err == null){
            console.log("readFile resolved")
            resolve(buffer)
        }
        else{
            console.log("readFile rejected")
            reject(err)
        }
    })
})

const putImage = (file, buffer) => new Promise((resolve, reject) => {
    const params = {
        Bucket: AWS_S3_BUCKET_NAME,
        Key: file.filename,
        Body: buffer,
        ContentType: file.mimetype,
        ContentLength: file.size,
        ACL: "public-read"
    }
    s3.putObject(params, (err, result) => {
        if(err == null) {
            resolve(result)
        }
        else{
            reject(err)
        }
    })
})

app.use(express.urlencoded({ extended: true}))
app.use(express.json())
app.use(morgan('combined'))

app.post('/login', async (req, res) => {
	console.log(req.body)
	const username = req.body.username
	const password = sha1(req.body.password)
	console.log(username, password)

	const conn = await pool.getConnection()

	try {
		const result = await conn.query(SQL_LOGIN_AUTH, [username, password])
		console.log("Login verification: ", result[0][0]['COUNT(*)']) 
		const loginResult = result[0][0]['COUNT(*)']
		if (loginResult === 1) {
			res.status(200).type('application/json').json({"status": "login successful"})
		}
		else {
			res.status(401).type('application/json').json({"status": "login failed"})
		}
	}catch(e) {
		res.status(500).type('application/json').json({"Error querying to SQL database for login authentication": e})
		console.error()
	}finally {
		conn.release()
	}
})

app.post('/share', upload.single('imageFile'), async (req, res) => {
	console.log(req.body)
	console.log(req.file)
	const username = req.body.username
	const password = sha1(req.body.password)
	const conn = await pool.getConnection()

	try {
		const result = await conn.query(SQL_LOGIN_AUTH, [username, password])
		console.log("Sharing verification: ", result[0][0]['COUNT(*)']) 
		const loginResult = result[0][0]['COUNT(*)']
		if (loginResult !== 1) {
			res.status(401).type('application/json').json({"status": "login failed"})
		}
		console.log("User verication passed.")

		const buffer = await readFile(req.file.path)
		await putImage(req.file, buffer)

		const submitResult = await mongoClient.db(MONGO_DB)
		.collection(MONGO_COLLECTION)
		.insertOne({
			title: req.body.title,
			comments: req.body.comments,
			imageRef: req.file.filename,
			timestamp: new Date()
		})
		console.log(submitResult)
		const documentId = submitResult['insertedId']
		console.log(documentId)

		fs.unlink(req.file.path, (err) => { })

		res.status(200).type('application/json').json({"Upload successful": `Document ID ${documentId}`})
	}catch(e) {
		res.status(500).type('application/json').json({"Error querying to SQL database for login authentication": e})
	}finally {
		conn.release()
	}
})

app.use(express.static(__dirname + '/frontend'))

const p0 = (async () => {
	const conn = await pool.getConnection()
	console.log("Testing connection to SQL database...")
	await conn.ping()
	console.log("SQL database is alive.")
	conn.release()
	return true
})()

const p1 = (async () => {
	await mongoClient.connect()
	console.log("MongoDB connected.")
	return true
})()

Promise.all([p0, p1])
	.then((result) => {
		app.listen(PORT, () => {
			console.info(`Application started on port ${PORT} at ${new Date()}.`)
		})
	})

