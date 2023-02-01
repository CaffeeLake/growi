
/* eslint-disable no-undef, no-var, vars-on-top, no-restricted-globals, regex/invalid */
// ignore lint error because this file is js as mongoshell

// ===========================================
// processors for old format
// ===========================================
function drawioProcessor(body) {
  var oldDrawioRegExp = /:::\s?drawio\n(.+?)\n:::/g; // drawio old format
  return body.replace(oldDrawioRegExp, '``` drawio\n$1\n```');
}

function plantumlProcessor(body) {
  var oldPlantUmlRegExp = /@startuml\n([\s\S]*?)\n@enduml/g; // plantUML old format
  return body.replace(oldPlantUmlRegExp, '``` plantuml\n$1\n```');
}

function tsvProcessor(body) {
  var oldTsvTableRegExp = /::: tsv(-h)?\n([\s\S]*?)\n:::/g; // TSV old format
  return body.replace(oldTsvTableRegExp, '``` tsv$1\n$2\n```');
}

function csvProcessor(body) {
  var oldCsvTableRegExp = /::: csv(-h)?\n([\s\S]*?)\n:::/g; // CSV old format
  return body.replace(oldCsvTableRegExp, '``` csv$1\n$2\n```');
}

function bracketlinkProcessor(body) {
  // https://regex101.com/r/btZ4hc/1
  var oldBracketLinkRegExp = /(?<!\[)\[{1}(\/.*?)\]{1}(?!\])/g; // Page Link old format
  return body.replace(oldBracketLinkRegExp, '[[$1]]');
}

// ===========================================
// replace method with processors
// ===========================================
function replaceLatestRevisions(body, processors) {
  var replacedBody = body;
  processors.forEach((processor) => {
    replacedBody = processor(replacedBody);
  });
  return replacedBody;
}


// ===========================================
// main process
// ===========================================

var pagesCollection = db.getCollection('pages');
const revisionsCollection = db.getCollection('revisions');

var operations = [];
var growiSyntaxLinkerProcessor = [];
var userOriginalProcessor = [];

var migrationType = process.env.MIGRATION_TYPE;

var oldFormatProcessors;
switch (migrationType) {
  case 'drawio':
    oldFormatProcessors = [drawioProcessor];
    break;
  case 'plantuml':
    oldFormatProcessors = [plantumlProcessor];
    break;
  case 'tsv':
    oldFormatProcessors = [tsvProcessor];
    break;
  case 'csv':
    oldFormatProcessors = [csvProcessor];
    break;
  case 'bracketlink':
    oldFormatProcessors = [bracketlinkProcessor];
    break;
  case 'v6':
    oldFormatProcessors = [drawioProcessor, plantumlProcessor, tsvProcessor, csvProcessor, bracketlinkProcessor];
    break;
  case undefined:
    throw Error('env var MIGRATION_TYPE is required: document link');
  default:
    throw Error('invalid MIGRATION_TYPE: document link');
}

var batchSize = process.env.BATCH_SIZE ?? 100; // default 100 revisions in 1 bulkwrite
var batchSizeInterval = process.env.BATCH_INTERVAL ?? 3000; // default 3 sec

pagesCollection.find({}).forEach((doc) => {
  if (doc.revision) {
    var revision = revisionsCollection.findOne({ _id: doc.revision });
    var replacedBody = replaceLatestRevisions(revision.body, [...oldFormatProcessors, ...growiSyntaxLinkerProcessor, ...userOriginalProcessor]);
    var operation = {
      updateOne: {
        filter: { _id: revision._id },
        update: {
          $set: { body: replacedBody },
        },
      },
    };
    operations.push(operation);

    // bulkWrite per 100 revisions
    if (operations.length > (batchSize - 1)) {
      revisionsCollection.bulkWrite(operations);
      // sleep time can be set from env var
      sleep(batchSizeInterval);
      operations = [];
    }
  }
});
revisionsCollection.bulkWrite(operations);
print('migration complete!');
