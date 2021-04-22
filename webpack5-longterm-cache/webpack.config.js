const path = require("path");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
	entry: path.resolve(__dirname, "./index.js"),
	mode: "development",
	output: {
		path: path.resolve(__dirname, "./dist"),
		filename: "[name].[contenthash].js",
	},
	optimization: {
		moduleIds: "deterministic",
		chunkIds: "deterministic",
	},
	devServer: {
		contentBase: path.join(__dirname, "dist"),
		compress: true,
		port: 9000,
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: path.resolve(__dirname, "index.html"),
			filename: "index.html",
		}),
		new CleanWebpackPlugin(),
	],
};
