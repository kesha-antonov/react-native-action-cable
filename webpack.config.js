module.exports = {
  module: {
    loaders: [
      {
        test: /\.coffee$/,
        loaders: ['coffee']
      }
    ]
  },
  resolve: {
    extensions: ['', '.coffee', '.js']
  },
  stats: {
    errorDetails: true
  }
}
