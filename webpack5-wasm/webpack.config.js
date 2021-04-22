const path = require("path");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
	entry: path.resolve(__dirname, "./index.js"),
	mode: "development",
	devtool: "inline-source-map",
	output: {
		path: path.resolve(__dirname, "./dist"),
		filename: "main.js",
	},
	devServer: {
		contentBase: path.join(__dirname, "dist"),
		compress: true,
		port: 9000,
	},
	experiments: {
		asyncWebAssembly: true,
	},
	module: {
		rules: [
			{
				test: /\.wasm$/,
				type: "webassembly/async",
			},
		],
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: path.resolve(__dirname, "index.html"),
			filename: "index.html",
		}),
		new CleanWebpackPlugin(),
	],
};
