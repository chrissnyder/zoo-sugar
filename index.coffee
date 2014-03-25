request = require 'request'
async = require 'async'
colors = require 'colors'
AWS = require 'aws-sdk'
express = require 'express'

projectList = [
  'galaxy_zoo'
  'milky_way'
  'planet_four'
  'plankton'
  'radio'
  'sunspot'
  'wise'
  'worms'
]

numberOfFields = 0
workspace = {}
currentProject = null

s3 = new AWS.S3
  accessKeyId: process.env.AMAZON_ACCESS_KEY_ID
  secretAccessKey: process.env.AMAZON_SECRET_ACCESS_KEY
  region: 'us-east-1'

walkTranslations = (rawTranslations) ->
  if rawTranslations.hasOwnProperty '__field'
    delete rawTranslations['__field']

    for key, value of rawTranslations
      if key in ['en', 'en-us', 'en-US', 'en_US']
        key = 'en'

      unless key of workspace
        workspace[key] = {}

      unless currentProject of workspace[key]
        workspace[key][currentProject] = 0
      
      workspace[key][currentProject] += 1

  else
    walkTranslations value for key, value of rawTranslations

parseProject = (project, cb) ->
  currentProject = project

  apiPath = "https://api.zooniverse.org/projects/#{ project }/translations"
  request apiPath, (err, res, body) ->
    if err or res.statusCode is not 200
      console.log 'Err'
      console.log err, res

    body = JSON.parse body

    walkTranslations body.translation
    cb()


app = express()

app.get '/', (req, res) ->
  res.send 'goto /update_progress'

app.get '/update_progress', (req, res) ->
  async.eachSeries projectList, parseProject, (error) ->
    for lang in Object.keys workspace
      if lang is 'en' then continue

      for project in projectList
        unless project of workspace[lang] then continue

        enKeys = workspace['en'][project] 
        workspace[lang][project] = Math.floor workspace[lang][project] / enKeys * 100

    s3.putObject
      Body: new Buffer JSON.stringify workspace
      Bucket: 'zooniverse-demo'
      Key: "translation-progress.json"
      ACL: 'public-read'
      (err, data) ->
        res.send updated: true

port = process.env.PORT || 3004
app.listen port, ->
  console.log "Listening on #{ port }"
