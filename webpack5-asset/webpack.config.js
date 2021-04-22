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
	module: {
		rules: [
			{
				test: /\.png$/,
				type: "asset/resource", //对应file-loader
			},
			{
				test: /\.svg$/,
				type: "asset/inline", //对应url-loader 大小<limt 转化为base64
			},
			{
				test: /\.txt$/,
				type: "asset/source", //对应raw-loader
			},
			{
				test: /\.gif$/,
				type: "asset", //
				parser: {
					dataUrlCondition: {
						maxSize: 4 * 1024,
					},
				},
			},
		],
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
