
module.exports = {
  output: {
    filename: 'sense.js'
  },
  mode: 'development',
  context: __dirname,
  entry: './src/sense.js',
  module: {
    rules: [
      {
        test: /\.frag$/,
        use: 'raw-loader'
      },
      {
        test: /\.vert$/,
        use: 'raw-loader'
      }
    ]
  }
}
