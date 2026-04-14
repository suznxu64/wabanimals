
//code from scott's counter code

async function get(counters, key) {
    let docs = await counters.find({collection: key}).toArray();
    let n = docs.length;

    if (n == 1) {
        return docs[0].counter;
    } else if (n == 0) {
        return null;
    } else {
        console.log(`Found multiple (${n}) counters for collection ${key}`);
        docs.forEach((c) => console.log(c));
        throw new Error(`Found multiple (${n}) counters for collection ${key}`);
    }
}

async function init(counters, key) {
    let curr = await get(counters, key);

    if (!curr) {
        let result = await counters.insertOne({collection: key, counter: 1});
        console.log(result);
    }
}

async function reset(counters, key) {
    let query = {collection: key};
    let update = {$set: {counter: 1}};
    let options = {$upsert: true};

    let result = await counters.updateOne(query, update, options);
    console.log(result);
}

async function incr(counters, key) {
    let result = await counters.findOneAndUpdate(
        {collection: key},
        {$inc: {counter: 1}},
        {returnDocument: "after"}
    );

    if (result) {
        return result.counter;
    } else {
        console.log(`no counter found: ${key}`);
    }
}

module.exports = {
    get,
    init,
    incr,
    reset
};