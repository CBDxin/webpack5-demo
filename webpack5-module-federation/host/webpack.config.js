const HtmlWebpackPlugin = require("html-webpack-plugin");
const { ModuleFederationPlugin } = require("webpack").container;
const path = require("path");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

module.exports = {
  entry: "./src/index",
	// entry: "./src/bootstrap",
	mode: "development",
	devtool: "inline-source-map",
	devServer: {
		contentBase: path.join(__dirname, "dist"),
		port: 9000,
	},
	output: {
		path: path.resolve(__dirname, "./dist"),
		filename: "[name].js",
	},
	module: {
		rules: [
			{
				test: /\.jsx?$/,
				loader: "babel-loader",
				exclude: /node_modules/,
				options: {
					presets: ["@babel/preset-react"],
				},
			},
		],
	},
	plugins: [
		new ModuleFederationPlugin({
			name: "host",
			remotes: {
				remote: "remote@http://localhost:9001/remoteEntry.js",
			},
			shared: ["react", "react-dom"],
		}),
		new HtmlWebpackPlugin({
			template: "./public/index.html",
		}),
		new CleanWebpackPlugin(),
	],
	optimization: {
		moduleIds: "named",
		chunkIds: "named",
	},
};
