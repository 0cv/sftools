//Utility functions called when executing query stream from Mongoose

async function sendData(ctx, streamName, payload) {
  return await ctx.socket.emit(streamName, payload)
}

export function streamError(err) {
  console.error('error', err)
}

export function streamData(ctx, streamName, arrayData, size, ids, idField) {
  return function(data) {
    arrayData.push(data)
    if (ids && idField) {
      ids.push(data[idField])
    }
    if (arrayData.length > size && streamName) {
      sendData(ctx, streamName, arrayData.splice(0))
    }
  }
}

export function streamClose(ctx, streamName, arrayData, callback) {
  return async function() {
    callback && callback()
    if(streamName) {
      await sendData(ctx, streamName, arrayData)
      await sendData(ctx, streamName, {
        over: streamName
      })
    }
  }
}
