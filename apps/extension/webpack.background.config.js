const path = require('path');
const webpack = require('webpack');
const Dotenv = require('dotenv-webpack');

module.exports = {
  entry: "./background/index.ts",
  mode: "production",
  module: {
    noParse: /\.wasm$/,
    rules: [
      {
        test: /\.ts?$/,
        use: [
          {
            loader: "ts-loader",
            options: {
              compilerOptions: { noEmit: false },
            },
          },
        ],
        exclude: /node_modules/,
      },
      { // reference: https://github.com/antelle/argon2-browser/blob/d73916b8efad2ef47140a52acd48b166a4ba97bf/examples/webpack/webpack.config.js#L26
        test: /\.wasm$/,
        loader: 'base64-loader',
        type: 'javascript/auto',
      },
    ],
  },
  experiments: {
    asyncWebAssembly: true,
  },
  optimization: {
    // AMO rejects any single JS file larger than 5 MB. Split the bundle into
    // chunks well under that limit. The chunks use webpack's classic
    // array-push runtime so they can be loaded both via importScripts()
    // (Chrome service worker) and as ordered <script> tags (Firefox event
    // page) — see scripts/bundle.js which wires them into the manifest.
    splitChunks: {
      chunks: 'all',
      minSize: 300000,
      maxSize: 3500000,
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          reuseExistingChunk: true,
        },
      },
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    }),
    new Dotenv({
      path: path.join(__dirname, '.env'),
    }),
  ],
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    fallback: {
      fs: false,
      path: false,
      stream: require.resolve('stream-browserify'),
      crypto: require.resolve('crypto-browserify'),
      buffer: require.resolve('buffer'),
    },
  },
  output: {
    // The entry keeps the stable name the manifest's loader points at; every
    // other (split) chunk gets a unique name so multiple chunks never collide.
    filename: (pathData) =>
      pathData.chunk.name === "main" ? "background.js" : "bg-[name]-[id].js",
    chunkFilename: "bg-[name]-[id].js",
    path: path.join(__dirname, "dist"),
    // Explicit publicPath avoids the runtime's document.currentScript probing,
    // which would throw in a service worker (no document).
    publicPath: "",
    clean: false,
  },
};
